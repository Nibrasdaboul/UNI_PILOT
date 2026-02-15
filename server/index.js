import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initDb } from './db.js';
import { authRouter } from './routes/auth.js';
import { catalogRouter } from './routes/catalog.js';
import { studentRouter } from './routes/student.js';
import { adminRouter } from './routes/admin.js';
import { plannerRouter } from './routes/planner.js';
import { authMiddleware } from './middleware/auth.js';
import { db } from './db.js';
import {
  computeFinalMarkFromItems,
  computeSemesterGpa,
  computeSemesterPercent,
  computeCGPA,
  computeCumPercent,
  markToLetter,
  markToGpaPoints,
  getGradeStatus,
} from './lib/gradeUtils.js';

initDb();

// Ensure default admin and student exist (e.g. first deploy on Render, or missing admin)
(function seedDefaultUsers() {
  const insert = db.prepare(`
    INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)
  `);
  const hasAdmin = db.prepare("SELECT 1 FROM users WHERE email = 'admin@unipilot.local'").get();
  const hasStudent = db.prepare("SELECT 1 FROM users WHERE email = 'student@unipilot.local'").get();
  if (!hasAdmin) {
    insert.run('admin@unipilot.local', bcrypt.hashSync('Admin123!', 10), 'Admin', 'admin');
    console.log('Created default admin: admin@unipilot.local / Admin123!');
  }
  if (!hasStudent) {
    insert.run('student@unipilot.local', bcrypt.hashSync('Student123!', 10), 'Student', 'student');
    console.log('Created default student: student@unipilot.local / Student123!');
  }
})();

// Recalculate final mark for a student_course from grade_items and update student_courses.current_grade
function recalcCourseGrade(studentCourseId) {
  const items = db.prepare('SELECT score, max_score, weight FROM grade_items WHERE student_course_id = ?').all(studentCourseId);
  const finalMark = computeFinalMarkFromItems(items);
  db.prepare('UPDATE student_courses SET current_grade = ? WHERE id = ?').run(finalMark ?? null, studentCourseId);
  return finalMark;
}

// When total weight >= 100%, finalize course: add credits to completed (pass) or carried (fail)
function maybeFinalizeCourse(studentCourseId, userId) {
  const uid = Number(userId);
  const course = db.prepare('SELECT id, user_id, credit_hours, current_grade, finalized_at FROM student_courses WHERE id = ?').get(studentCourseId);
  if (!course || Number(course.user_id) !== uid) return;
  if (course.finalized_at != null) return; // already finalized
  const items = db.prepare('SELECT weight FROM grade_items WHERE student_course_id = ?').all(studentCourseId);
  const totalWeight = items.reduce((s, i) => s + (Number(i.weight) || 0), 0);
  const finalMark = course.current_grade;
  if (totalWeight < 99.5 || finalMark == null) return; // allow 99.5 for float rounding
  applyFinalize(studentCourseId, uid, course, finalMark);
}

// Apply finalize: set finalized_at, passed, and update academic record (used by manual finalize and maybeFinalizeCourse)
function applyFinalize(studentCourseId, uid, course, finalMark) {
  const passed = (Number(finalMark) ?? 0) >= 50 ? 1 : 0;
  db.prepare('UPDATE student_courses SET finalized_at = datetime("now"), passed = ? WHERE id = ?').run(passed, studentCourseId);
  const creditHours = Number(course.credit_hours) || 0;
  if (creditHours <= 0) return;
  let record = db.prepare('SELECT * FROM student_academic_record WHERE user_id = ?').get(uid);
  if (!record) {
    db.prepare('INSERT INTO student_academic_record (user_id, cgpa, cumulative_percent, total_credits_completed, total_credits_carried) VALUES (?, 0, 0, 0, 0)').run(uid);
    record = db.prepare('SELECT * FROM student_academic_record WHERE user_id = ?').get(uid);
  }
  const cgpaOld = Number(record.cgpa) || 0;
  const cumPercentOld = Number(record.cumulative_percent) || 0;
  const creditsCompletedOld = Number(record.total_credits_completed) || 0;
  const creditsCarriedOld = Number(record.total_credits_carried) || 0;
  if (passed) {
    const gpaPoints = markToGpaPoints(finalMark);
    const cgpaNew = computeCGPA(cgpaOld, creditsCompletedOld, gpaPoints, creditHours);
    const cumPercentNew = computeCumPercent(cumPercentOld, creditsCompletedOld, finalMark, creditHours);
    const newCompleted = creditsCompletedOld + creditHours;
    db.prepare('UPDATE student_academic_record SET cgpa = ?, cumulative_percent = ?, total_credits_completed = ?, updated_at = datetime("now") WHERE user_id = ?')
      .run(cgpaNew, cumPercentNew, newCompleted, uid);
  } else {
    const newCarried = creditsCarriedOld + creditHours;
    db.prepare('UPDATE student_academic_record SET total_credits_carried = ?, updated_at = datetime("now") WHERE user_id = ?')
      .run(newCarried, uid);
  }
}

// Manual finalize: student clicks "انتهى" — recalc grade then finalize (no weight requirement)
function finalizeCourseManually(courseId, userId) {
  const uid = Number(userId);
  const course = db.prepare('SELECT id, user_id, credit_hours, current_grade, finalized_at FROM student_courses WHERE id = ?').get(courseId);
  if (!course || Number(course.user_id) !== uid) return { ok: false, code: 404 };
  if (course.finalized_at != null) return { ok: true, already: true };
  recalcCourseGrade(courseId);
  const updated = db.prepare('SELECT current_grade FROM student_courses WHERE id = ?').get(courseId);
  const finalMark = updated?.current_grade != null ? Number(updated.current_grade) : null;
  if (finalMark == null) return { ok: false, code: 400, message: 'Enter at least one grade before marking course as finished.' };
  applyFinalize(courseId, uid, { ...course, credit_hours: course.credit_hours }, finalMark);
  return { ok: true };
}

// Recommendation messages for app notes (Arabic)
const RECOMMENDATIONS = {
  high_risk_ar: 'توصية: علامتك في هذه المادة منخفضة جداً. ننصحك بمراجعة المحتوى وزيادة ساعات الدراسة والاستعانة بالمراجع أو الأستاذ.',
  at_risk_ar: 'توصية: علامتك تحتاج تحسيناً. ننصحك بمراجعة الدروس والتركيز على النقاط الضعيفة لرفع المعدل.',
  general_ar: 'لديك أكثر من مادة تحتاج تركيزاً. ننصحك بترتيب أولويات المراجعة وزيادة ساعات الدراسة للمواد الحرجة.',
};

// Encouraging messages for every note — so high achievers keep it up, low achievers stay motivated
const ENCOURAGEMENT = {
  safe: '💪 تشجيع: مستواك ممتاز. حافظ على هذا الانضباط والجدية، أنت على الطريق الصحيح.',
  normal: '✨ تشجيع: أداؤك جيد. واصل المراجعة والمثابرة لتحافظ على تقدمك وتطوّره.',
  at_risk: '🌟 تشجيع: لا تستسلم. كل تحسن يبدأ بخطوة؛ ركّز على نقاط التحسين وستلاحظ الفرق.',
  high_risk: '❤️ تشجيع: الإحباط طبيعي، لكنك أقوى منه. خذ وقتك، راجع خطوة بخطوة، ونحن معك.',
};

// Upsert app note for a course: status + recommendation when low + encouragement for all
function upsertAppNoteForCourse(userId, studentCourseId, courseName, finalMark) {
  const status = getGradeStatus(finalMark);
  const statusLabels = { safe: 'آمن', normal: 'وضع عادي', at_risk: 'خطر', high_risk: 'خطر عالي' };
  const letter = finalMark != null ? markToLetter(finalMark) : '—';
  let content = finalMark != null
    ? `المادة: ${courseName}. العلامة: ${finalMark}، التقدير: ${letter}. الوضع: ${statusLabels[status] || status}.`
    : `المادة: ${courseName}. لم تُدخل علامات بعد.`;
  if (finalMark != null) {
    if (status === 'high_risk' || status === 'at_risk') {
      const rec = status === 'high_risk' ? RECOMMENDATIONS.high_risk_ar : RECOMMENDATIONS.at_risk_ar;
      content += '\n\n' + rec;
    }
    content += '\n\n' + (ENCOURAGEMENT[status] || ENCOURAGEMENT.normal);
  }
  const existing = db.prepare('SELECT id FROM notes WHERE user_id = ? AND student_course_id = ? AND type = ?').get(userId, studentCourseId, 'app');
  if (existing) {
    db.prepare('UPDATE notes SET content = ?, created_at = datetime("now") WHERE id = ?').run(content, existing.id);
  } else {
    db.prepare('INSERT INTO notes (user_id, student_course_id, content, type) VALUES (?, ?, ?, ?)').run(userId, studentCourseId, content, 'app');
  }
}

// Upsert a general app note (no course) for overall recommendation
function upsertGeneralAppNote(userId, contentAr) {
  const existing = db.prepare('SELECT id FROM notes WHERE user_id = ? AND type = ? AND student_course_id IS NULL').get(userId, 'app');
  if (existing) {
    db.prepare('UPDATE notes SET content = ?, created_at = datetime("now") WHERE id = ?').run(contentAr, existing.id);
  } else {
    db.prepare('INSERT INTO notes (user_id, student_course_id, content, type) VALUES (?, NULL, ?, ?)').run(userId, contentAr, 'app');
  }
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRouter);
app.use('/api/catalog', catalogRouter);
app.use('/api/student', studentRouter);
app.use('/api/admin', adminRouter);
app.use('/api/planner', plannerRouter);

app.get('/api/dashboard/summary', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const coursesList = db.prepare(`
    SELECT id, course_name, course_code, current_grade, credit_hours, finalized_at, passed FROM student_courses WHERE user_id = ?
  `).all(userId);
  const record = db.prepare('SELECT cgpa, cumulative_percent, total_credits_completed, total_credits_carried FROM student_academic_record WHERE user_id = ?').get(userId);
  const creditsCompleted = record ? Number(record.total_credits_completed) || 0 : 0;
  const creditsCarried = record ? Number(record.total_credits_carried) || 0 : 0;
  const cgpaFromRecord = record ? Number(record.cgpa) || 0 : 0;
  const cumPercentFromRecord = record ? Number(record.cumulative_percent) || 0 : 0;
  const currentSemesterCourses = coursesList.filter((c) => c.finalized_at == null);
  const coursesWithMark = currentSemesterCourses.map((c) => ({ ...c, final_mark: c.current_grade }));
  const semesterGpa = computeSemesterGpa(coursesWithMark);
  const semesterPercent = computeSemesterPercent(coursesWithMark);
  const creditsCurrent = currentSemesterCourses.reduce((s, c) => s + (Number(c.credit_hours) || 0), 0);
  const cgpa = computeCGPA(cgpaFromRecord, creditsCompleted, semesterGpa, creditsCurrent);
  const cumulativePercent = computeCumPercent(cumPercentFromRecord, creditsCompleted, semesterPercent, creditsCurrent);
  const avgProgress = coursesList.length ? coursesList.reduce((s, c) => s + (c.current_grade || 0), 0) / coursesList.length : 0;
  const finalizedPassed = coursesList.filter((c) => c.finalized_at != null && c.passed === 1);
  const finalizedFailed = coursesList.filter((c) => c.finalized_at != null && c.passed === 0);
  const completed_courses = finalizedPassed.map((c) => ({
    course_name: c.course_name,
    course_code: c.course_code,
    percent: c.current_grade != null ? Number(c.current_grade) : null,
    gpa_points: c.current_grade != null ? markToGpaPoints(c.current_grade) : null,
    letter_grade: c.current_grade != null ? markToLetter(c.current_grade) : null,
  }));
  const carried_courses = finalizedFailed.map((c) => ({
    course_name: c.course_name,
    course_code: c.course_code,
    percent: c.current_grade != null ? Number(c.current_grade) : null,
    gpa_points: c.current_grade != null ? markToGpaPoints(c.current_grade) : null,
    letter_grade: c.current_grade != null ? markToLetter(c.current_grade) : null,
  }));
  return res.json({
    pending_tasks: 0,
    today_sessions: 0,
    courses_count: coursesList.length,
    avg_progress: avgProgress,
    upcoming_tasks: [],
    semester_gpa: semesterGpa,
    cgpa,
    semester_percent: semesterPercent,
    cumulative_percent: cumulativePercent,
    credits_completed: creditsCompleted,
    credits_carried: creditsCarried,
    credits_current: creditsCurrent,
    completed_courses,
    carried_courses,
    courses: coursesList.map((c) => ({
      id: c.id,
      course_name: c.course_name,
      course_code: c.course_code,
      current_grade: c.current_grade,
      credit_hours: c.credit_hours,
      progress: c.current_grade || 0,
      grade_status: getGradeStatus(c.current_grade),
      finalized_at: c.finalized_at,
      passed: c.passed,
    })),
  });
});

app.get('/api/courses/:courseId', authMiddleware, (req, res) => {
  const id = parseInt(req.params.courseId, 10);
  const row = db.prepare('SELECT * FROM student_courses WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!row) return res.status(404).json({ detail: 'Not found' });
  return res.json(row);
});

app.post('/api/courses/:courseId/finalize', authMiddleware, (req, res) => {
  const courseId = parseInt(req.params.courseId, 10);
  const result = finalizeCourseManually(courseId, req.user.id);
  if (result.code === 404) return res.status(404).json({ detail: 'Not found' });
  if (result.code === 400) return res.status(400).json({ detail: result.message || 'Add at least one grade before marking as finished.' });
  return res.json({ finalized: true, already: result.already || false });
});

app.get('/api/courses/:courseId/modules', authMiddleware, (req, res) => res.json([]));
app.post('/api/courses/:courseId/modules', authMiddleware, (req, res) => res.status(201).json({ id: 1, title: req.body?.title, description: req.body?.description }));

// Grades CRUD
app.get('/api/courses/:courseId/grades', authMiddleware, (req, res) => {
  const courseId = parseInt(req.params.courseId, 10);
  const row = db.prepare('SELECT id FROM student_courses WHERE id = ? AND user_id = ?').get(courseId, req.user.id);
  if (!row) return res.status(404).json({ detail: 'Not found' });
  const items = db.prepare('SELECT id, item_type, title, score, max_score, weight, created_at FROM grade_items WHERE student_course_id = ? ORDER BY created_at').all(courseId);
  return res.json(items);
});
app.post('/api/courses/:courseId/grades', authMiddleware, (req, res) => {
  const courseId = parseInt(req.params.courseId, 10);
  const row = db.prepare('SELECT id, user_id, course_name FROM student_courses WHERE id = ? AND user_id = ?').get(courseId, req.user.id);
  if (!row) return res.status(404).json({ detail: 'Not found' });
  const b = req.body || {};
  const itemType = b.item_type || 'quiz';
  const title = b.title || 'Grade';
  const score = Number(b.score) ?? 0;
  const maxScore = Number(b.max_score) ?? 100;
  const weight = Number(b.weight) ?? 0;
  const stmt = db.prepare('INSERT INTO grade_items (student_course_id, item_type, title, score, max_score, weight) VALUES (?, ?, ?, ?, ?, ?)');
  const r = stmt.run(courseId, itemType, title, score, maxScore, weight);
  const id = r.lastInsertRowid;
  const finalMark = recalcCourseGrade(courseId);
  upsertAppNoteForCourse(req.user.id, courseId, row.course_name, finalMark);
  maybeFinalizeCourse(courseId, req.user.id);
  const item = db.prepare('SELECT id, item_type, title, score, max_score, weight, created_at FROM grade_items WHERE id = ?').get(id);
  return res.status(201).json(item);
});
app.patch('/api/grades/:id', authMiddleware, (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id) || id < 1) return res.status(400).json({ detail: 'Invalid grade id' });
  const item = db.prepare('SELECT gi.id, gi.student_course_id, sc.user_id, sc.course_name FROM grade_items gi JOIN student_courses sc ON sc.id = gi.student_course_id WHERE gi.id = ?').get(id);
  if (!item) return res.status(404).json({ detail: 'Grade not found' });
  const userId = Number(req.user.id);
  const ownerId = Number(item.user_id);
  if (userId !== ownerId) return res.status(404).json({ detail: 'Not found' });
  const b = req.body || {};
  if (b.item_type != null) db.prepare('UPDATE grade_items SET item_type = ? WHERE id = ?').run(b.item_type, id);
  if (b.title != null) db.prepare('UPDATE grade_items SET title = ? WHERE id = ?').run(b.title, id);
  if (b.score != null) db.prepare('UPDATE grade_items SET score = ? WHERE id = ?').run(Number(b.score), id);
  if (b.max_score != null) db.prepare('UPDATE grade_items SET max_score = ? WHERE id = ?').run(Number(b.max_score), id);
  if (b.weight != null) db.prepare('UPDATE grade_items SET weight = ? WHERE id = ?').run(Number(b.weight), id);
  const finalMark = recalcCourseGrade(item.student_course_id);
  upsertAppNoteForCourse(req.user.id, item.student_course_id, item.course_name, finalMark);
  maybeFinalizeCourse(item.student_course_id, req.user.id);
  const updated = db.prepare('SELECT id, item_type, title, score, max_score, weight, created_at FROM grade_items WHERE id = ?').get(id);
  return res.json(updated);
});
app.delete('/api/grades/:id', authMiddleware, (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id) || id < 1) return res.status(400).json({ detail: 'Invalid grade id' });
  const item = db.prepare('SELECT gi.id, gi.student_course_id, sc.user_id, sc.course_name FROM grade_items gi JOIN student_courses sc ON sc.id = gi.student_course_id WHERE gi.id = ?').get(id);
  if (!item) return res.status(404).json({ detail: 'Grade not found' });
  const userId = Number(req.user.id);
  const ownerId = Number(item.user_id);
  if (userId !== ownerId) return res.status(404).json({ detail: 'Not found' });
  db.prepare('DELETE FROM grade_items WHERE id = ?').run(id);
  const finalMark = recalcCourseGrade(item.student_course_id);
  upsertAppNoteForCourse(req.user.id, item.student_course_id, item.course_name, finalMark);
  maybeFinalizeCourse(item.student_course_id, req.user.id);
  return res.status(204).send();
});

// Notes — sync app notes for all graded courses and general recommendation, then return list
app.get('/api/notes', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const type = req.query.type; // 'student' | 'app' | omit for all

  // Sync app notes: ensure every course with a grade has an up-to-date app note (with recommendations)
  const gradedCourses = db.prepare('SELECT id, course_name, current_grade FROM student_courses WHERE user_id = ? AND current_grade IS NOT NULL').all(userId);
  let atRiskCount = 0;
  for (const c of gradedCourses) {
    upsertAppNoteForCourse(userId, c.id, c.course_name, c.current_grade);
    const status = getGradeStatus(c.current_grade);
    if (status === 'at_risk' || status === 'high_risk') atRiskCount++;
  }
  if (atRiskCount >= 2) {
    const generalContent = RECOMMENDATIONS.general_ar + '\n\n' + ENCOURAGEMENT.high_risk;
    upsertGeneralAppNote(userId, generalContent);
  } else {
    db.prepare('DELETE FROM notes WHERE user_id = ? AND type = ? AND student_course_id IS NULL').run(userId, 'app');
  }

  let sql = 'SELECT n.id, n.student_course_id, n.content, n.type, n.created_at FROM notes n WHERE n.user_id = ?';
  const params = [userId];
  if (type === 'student' || type === 'app') {
    sql += ' AND n.type = ?';
    params.push(type);
  }
  sql += ' ORDER BY n.created_at DESC';
  const rows = db.prepare(sql).all(...params);
  const courseIds = [...new Set(rows.map(r => r.student_course_id).filter(Boolean))];
  const names = {};
  if (courseIds.length) {
    const courses = db.prepare('SELECT id, course_name FROM student_courses WHERE id IN (' + courseIds.join(',') + ')').all();
    courses.forEach(c => { names[c.id] = c.course_name; });
  }
  const list = rows.map(r => ({ ...r, course_name: r.student_course_id ? names[r.student_course_id] : null }));
  return res.json(list);
});
app.post('/api/notes', authMiddleware, (req, res) => {
  const b = req.body || {};
  const content = b.content || '';
  const studentCourseId = b.student_course_id != null ? parseInt(b.student_course_id, 10) : null;
  if (studentCourseId != null) {
    const ok = db.prepare('SELECT id FROM student_courses WHERE id = ? AND user_id = ?').get(studentCourseId, req.user.id);
    if (!ok) return res.status(404).json({ detail: 'Course not found' });
  }
  const r = db.prepare('INSERT INTO notes (user_id, student_course_id, content, type) VALUES (?, ?, ?, ?)').run(req.user.id, studentCourseId, content, 'student');
  const row = db.prepare('SELECT id, student_course_id, content, type, created_at FROM notes WHERE id = ?').get(r.lastInsertRowid);
  return res.status(201).json(row);
});
app.patch('/api/notes/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = db.prepare('SELECT id, type FROM notes WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!row) return res.status(404).json({ detail: 'Not found' });
  if (row.type !== 'student') return res.status(403).json({ detail: 'Only student notes can be edited' });
  const content = req.body?.content;
  if (content != null) db.prepare('UPDATE notes SET content = ? WHERE id = ?').run(content, id);
  const updated = db.prepare('SELECT id, student_course_id, content, type, created_at FROM notes WHERE id = ?').get(id);
  return res.json(updated);
});
app.delete('/api/notes/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = db.prepare('SELECT id FROM notes WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!row) return res.status(404).json({ detail: 'Not found' });
  db.prepare('DELETE FROM notes WHERE id = ?').run(id);
  return res.status(204).send();
});

// Analytics
app.get('/api/analytics', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const coursesList = db.prepare(`
    SELECT id, course_name, course_code, current_grade, credit_hours, finalized_at, passed FROM student_courses WHERE user_id = ?
  `).all(userId);
  const record = db.prepare('SELECT cgpa, cumulative_percent, total_credits_completed, total_credits_carried FROM student_academic_record WHERE user_id = ?').get(userId);
  const creditsCompleted = record ? Number(record.total_credits_completed) || 0 : 0;
  const creditsCarried = record ? Number(record.total_credits_carried) || 0 : 0;
  const cgpaFromRecord = record ? Number(record.cgpa) || 0 : 0;
  const cumPercentFromRecord = record ? Number(record.cumulative_percent) || 0 : 0;
  const currentSemesterCourses = coursesList.filter((c) => c.finalized_at == null);
  const coursesWithMark = currentSemesterCourses.map((c) => ({ ...c, final_mark: c.current_grade }));
  const semesterGpa = computeSemesterGpa(coursesWithMark);
  const semesterPercent = computeSemesterPercent(coursesWithMark);
  const creditsCurrent = currentSemesterCourses.reduce((s, c) => s + (Number(c.credit_hours) || 0), 0);
  const cgpa = computeCGPA(cgpaFromRecord, creditsCompleted, semesterGpa, creditsCurrent);
  const cumulativePercent = computeCumPercent(cumPercentFromRecord, creditsCompleted, semesterPercent, creditsCurrent);
  const courses = coursesList.map(c => ({
    id: c.id,
    course_name: c.course_name,
    course_code: c.course_code,
    credit_hours: c.credit_hours,
    final_mark: c.current_grade,
    letter: c.current_grade != null ? markToLetter(c.current_grade) : null,
    gpa_points: c.current_grade != null ? markToGpaPoints(c.current_grade) : null,
    status: getGradeStatus(c.current_grade),
  }));
  return res.json({
    courses,
    semester_gpa: semesterGpa,
    semester_percent: semesterPercent,
    cgpa,
    cumulative_percent: cumulativePercent,
    credits_completed: creditsCompleted,
    credits_carried: creditsCarried,
    credits_current: creditsCurrent,
  });
});
app.get('/api/courses/:courseId/chat', authMiddleware, (req, res) => res.json([]));
app.post('/api/courses/:courseId/chat', authMiddleware, (req, res) => res.status(201).send());
app.delete('/api/courses/:courseId/chat', authMiddleware, (req, res) => res.status(204).send());
app.post('/api/ai/course_chat', authMiddleware, (req, res) => res.json({ content: 'AI reply placeholder' }));
app.get('/api/tasks/upcoming', authMiddleware, (req, res) => {
  const date = new Date().toISOString().slice(0, 10);
  const tasks = db.prepare(`
    SELECT t.id, t.title, t.due_date, t.completed, sc.course_name FROM planner_tasks t
    LEFT JOIN student_courses sc ON sc.id = t.student_course_id
    WHERE t.user_id = ? AND t.due_date >= ? ORDER BY t.due_date LIMIT 20
  `).all(req.user.id, date);
  return res.json(tasks.map(t => ({ ...t, status: t.completed ? 'completed' : 'pending' })));
});
app.get('/api/insights/predictions', authMiddleware, (req, res) => res.json([]));
app.patch('/api/auth/settings', authMiddleware, (req, res) => {
  const b = req.body || {};
  if (b.full_name) db.prepare('UPDATE users SET full_name = ? WHERE id = ?').run(b.full_name, req.user.id);
  const user = db.prepare('SELECT id, email, full_name, role FROM users WHERE id = ?').get(req.user.id);
  return res.json(user);
});
app.post('/api/ai/summarize', authMiddleware, (req, res) => res.json({ summary: 'Summary placeholder' }));
app.post('/api/ai/generate_flashcards', authMiddleware, (req, res) => res.json({ flashcards: [] }));
app.post('/api/ai/generate_quiz', authMiddleware, (req, res) => res.json({ quiz: [] }));

// Serve built frontend (for Render: one service serves both API + static site)
const __dirname = dirname(fileURLToPath(import.meta.url));
const distPath = join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ detail: 'Not found' });
  res.sendFile(join(distPath, 'index.html'), (err) => {
    if (err) res.status(404).send('Not found');
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`UniPilot API running on port ${PORT}`);
  console.log(`Auth: POST /api/auth/register, POST /api/auth/login, GET /api/auth/me`);
  console.log(`Catalog: GET/POST /api/catalog/courses, PATCH/DELETE /api/catalog/courses/:id`);
  console.log(`Student: GET/POST/DELETE /api/student/courses`);
});
