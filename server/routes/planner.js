import { Router } from 'express';
import { db } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { getGradeStatus } from '../lib/gradeUtils.js';
import * as groq from '../ai/groq.js';

export const plannerRouter = Router();

function getCourseRiskScore(grade) {
  if (grade == null) return 2;
  const g = Number(grade);
  if (g >= 80) return 0;
  if (g >= 70) return 1;
  if (g >= 60) return 2;
  return 3;
}

/** Parse body.student_course_id to integer or null (handles '', undefined, NaN). */
function parseOptionalCourseId(val) {
  if (val == null || val === '') return null;
  const n = parseInt(val, 10);
  return Number.isNaN(n) ? null : n;
}

// ---------- Events CRUD ----------
plannerRouter.get('/events', authMiddleware, (req, res) => {
  const rows = db.prepare(`
    SELECT e.id, e.user_id, e.student_course_id, e.title, e.description,
           e.start_date, e.end_date, e.start_time, e.end_time, e.event_type, e.completed, e.created_at,
           sc.course_name
    FROM planner_events e
    LEFT JOIN student_courses sc ON sc.id = e.student_course_id
    WHERE e.user_id = ?
    ORDER BY e.start_date ASC, e.start_time ASC
  `).all(req.user.id);
  return res.json(rows);
});

plannerRouter.post('/events', authMiddleware, (req, res) => {
  const b = req.body || {};
  const studentCourseId = parseOptionalCourseId(b.student_course_id);
  if (studentCourseId != null) {
    const ok = db.prepare('SELECT id FROM student_courses WHERE id = ? AND user_id = ?').get(studentCourseId, req.user.id);
    if (!ok) return res.status(400).json({ detail: 'Invalid course' });
  }
  const title = (b.title || '').trim() || 'Event';
  const startDate = b.start_date || new Date().toISOString().slice(0, 10);
  const endDate = b.end_date || startDate;
  const startTime = b.start_time || '09:00';
  const endTime = b.end_time || '11:00';
  const eventType = ['exam', 'study', 'project', 'other'].includes(b.event_type) ? b.event_type : 'study';
  const r = db.prepare(`
    INSERT INTO planner_events (user_id, student_course_id, title, description, start_date, end_date, start_time, end_time, event_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.user.id, studentCourseId, title, b.description || null, startDate, endDate, startTime, endTime, eventType);
  const row = db.prepare(`
    SELECT e.id, e.student_course_id, e.title, e.description, e.start_date, e.end_date, e.start_time, e.end_time, e.event_type, e.completed, e.created_at, sc.course_name
    FROM planner_events e LEFT JOIN student_courses sc ON sc.id = e.student_course_id WHERE e.id = ?
  `).get(r.lastInsertRowid);
  return res.status(201).json(row);
});

plannerRouter.get('/events/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = db.prepare(`
    SELECT e.*, sc.course_name FROM planner_events e
    LEFT JOIN student_courses sc ON sc.id = e.student_course_id
    WHERE e.id = ? AND e.user_id = ?
  `).get(id, req.user.id);
  if (!row) return res.status(404).json({ detail: 'Not found' });
  return res.json(row);
});

plannerRouter.patch('/events/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const existing = db.prepare('SELECT id FROM planner_events WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!existing) return res.status(404).json({ detail: 'Not found' });
  const b = req.body || {};
  const row = db.prepare('SELECT * FROM planner_events WHERE id = ?').get(id);
  const studentCourseId = b.student_course_id !== undefined ? parseOptionalCourseId(b.student_course_id) : row.student_course_id;
  if (studentCourseId != null) {
    const ok = db.prepare('SELECT id FROM student_courses WHERE id = ? AND user_id = ?').get(studentCourseId, req.user.id);
    if (!ok) return res.status(400).json({ detail: 'Invalid course' });
  }
  const title = b.title !== undefined ? (b.title || 'Event').trim() : row.title;
  const startDate = b.start_date ?? row.start_date;
  const endDate = b.end_date ?? row.end_date;
  const startTime = b.start_time ?? row.start_time;
  const endTime = b.end_time ?? row.end_time;
  const eventType = ['exam', 'study', 'project', 'other'].includes(b.event_type) ? b.event_type : row.event_type;
  const completed = b.completed !== undefined ? (b.completed ? 1 : 0) : row.completed;
  db.prepare(`
    UPDATE planner_events SET student_course_id=?, title=?, description=?, start_date=?, end_date=?, start_time=?, end_time=?, event_type=?, completed=?
    WHERE id = ?
  `).run(studentCourseId, title, b.description !== undefined ? b.description : row.description, startDate, endDate, startTime, endTime, eventType, completed, id);
  const updated = db.prepare(`
    SELECT e.*, sc.course_name FROM planner_events e LEFT JOIN student_courses sc ON sc.id = e.student_course_id WHERE e.id = ?
  `).get(id);
  return res.json(updated);
});

plannerRouter.delete('/events/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const existing = db.prepare('SELECT id FROM planner_events WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!existing) return res.status(404).json({ detail: 'Not found' });
  db.prepare('DELETE FROM planner_events WHERE id = ? AND user_id = ?').run(id, req.user.id);
  return res.status(200).json({ deleted: true });
});

// ---------- Tasks CRUD ----------
plannerRouter.get('/tasks', authMiddleware, (req, res) => {
  const date = req.query.date;
  let sql = `
    SELECT t.id, t.user_id, t.student_course_id, t.title, t.due_date, t.due_time, t.priority, t.completed, t.source, t.sort_order, t.created_at, sc.course_name
    FROM planner_tasks t LEFT JOIN student_courses sc ON sc.id = t.student_course_id WHERE t.user_id = ?
  `;
  const params = [req.user.id];
  if (date) {
    sql += ' AND t.due_date = ?';
    params.push(date);
  }
  sql += ' ORDER BY t.sort_order ASC, t.priority DESC, t.id ASC';
  const rows = db.prepare(sql).all(...params);
  return res.json(rows);
});

plannerRouter.post('/tasks', authMiddleware, (req, res) => {
  const b = req.body || {};
  const studentCourseId = parseOptionalCourseId(b.student_course_id);
  if (studentCourseId != null) {
    const ok = db.prepare('SELECT id FROM student_courses WHERE id = ? AND user_id = ?').get(studentCourseId, req.user.id);
    if (!ok) return res.status(400).json({ detail: 'Invalid course' });
  }
  const title = (b.title || '').trim() || 'Task';
  const dueDate = b.due_date || new Date().toISOString().slice(0, 10);
  const priority = Math.min(5, Math.max(1, parseInt(b.priority, 10) || 3));
  const source = b.source === 'app' ? 'app' : 'student';
  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), 0) FROM planner_tasks WHERE user_id = ?').get(req.user.id);
  const sortOrder = (maxOrder && maxOrder['COALESCE(MAX(sort_order), 0)']) + 1;
  const r = db.prepare(`
    INSERT INTO planner_tasks (user_id, student_course_id, title, due_date, due_time, priority, source, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.user.id, studentCourseId, title, dueDate, b.due_time || null, priority, source, sortOrder);
  const row = db.prepare(`
    SELECT t.*, sc.course_name FROM planner_tasks t LEFT JOIN student_courses sc ON sc.id = t.student_course_id WHERE t.id = ?
  `).get(r.lastInsertRowid);
  return res.status(201).json(row);
});

plannerRouter.patch('/tasks/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const existing = db.prepare('SELECT id FROM planner_tasks WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!existing) return res.status(404).json({ detail: 'Not found' });
  const b = req.body || {};
  const row = db.prepare('SELECT * FROM planner_tasks WHERE id = ?').get(id);
  if (b.completed !== undefined) {
    db.prepare('UPDATE planner_tasks SET completed = ? WHERE id = ?').run(b.completed ? 1 : 0, id);
  }
  if (b.title !== undefined || b.due_date !== undefined || b.due_time !== undefined || b.priority !== undefined || b.student_course_id !== undefined) {
    const studentCourseId = b.student_course_id !== undefined ? parseOptionalCourseId(b.student_course_id) : row.student_course_id;
    const title = b.title !== undefined ? (b.title || 'Task').trim() : row.title;
    const dueDate = b.due_date ?? row.due_date;
    const dueTime = b.due_time !== undefined ? b.due_time : row.due_time;
    const priority = b.priority !== undefined ? Math.min(5, Math.max(1, parseInt(b.priority, 10) || 3)) : row.priority;
    db.prepare('UPDATE planner_tasks SET student_course_id=?, title=?, due_date=?, due_time=?, priority=? WHERE id = ?')
      .run(studentCourseId, title, dueDate, dueTime, priority, id);
  }
  const updated = db.prepare(`
    SELECT t.*, sc.course_name FROM planner_tasks t LEFT JOIN student_courses sc ON sc.id = t.student_course_id WHERE t.id = ?
  `).get(id);
  return res.json(updated);
});

plannerRouter.delete('/tasks/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const existing = db.prepare('SELECT id FROM planner_tasks WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!existing) return res.status(404).json({ detail: 'Not found' });
  db.prepare('DELETE FROM planner_tasks WHERE id = ? AND user_id = ?').run(id, req.user.id);
  return res.status(200).json({ deleted: true });
});

// ---------- Daily: events + tasks for a date ----------
plannerRouter.get('/daily', authMiddleware, (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const events = db.prepare(`
    SELECT e.id, e.student_course_id, e.title, e.description, e.start_date, e.end_date, e.start_time, e.end_time, e.event_type, e.completed, e.created_at, sc.course_name
    FROM planner_events e LEFT JOIN student_courses sc ON sc.id = e.student_course_id
    WHERE e.user_id = ? AND e.start_date <= ? AND e.end_date >= ?
    ORDER BY e.start_time
  `).all(req.user.id, date, date);
  const tasks = db.prepare(`
    SELECT t.id, t.student_course_id, t.title, t.due_date, t.due_time, t.priority, t.completed, t.source, t.sort_order, sc.course_name
    FROM planner_tasks t LEFT JOIN student_courses sc ON sc.id = t.student_course_id
    WHERE t.user_id = ? AND t.due_date = ?
    ORDER BY t.sort_order ASC, t.priority DESC
  `).all(req.user.id, date);
  return res.json({ date, events, tasks });
});

// ---------- Smart plan generator: AI-first (grades, weak areas), fallback to risk-based ----------
plannerRouter.post('/generate-plan', authMiddleware, async (req, res) => {
  const b = req.body || {};
  const fromDate = b.from_date || new Date().toISOString().slice(0, 10);
  const toDate = b.to_date || fromDate;
  const userId = req.user.id;
  const dateStr = fromDate;
  const lang = b.lang === 'ar' ? 'ar' : 'en';
  const courses = db.prepare(`
    SELECT id, course_name, course_code, current_grade, target_grade FROM student_courses WHERE user_id = ?
  `).all(userId);
  const events = db.prepare(`
    SELECT id, student_course_id, title, start_date, end_date, start_time, event_type
    FROM planner_events WHERE user_id = ? AND start_date <= ? AND end_date >= ?
  `).all(userId, toDate, fromDate);
  const courseIds = new Set(courses.map(c => c.id));
  let generated = [];

  if (groq.isConfigured()) {
    try {
      const coursesContext = courses.map(c => {
        const g = c.current_grade != null ? Number(c.current_grade) : null;
        const tg = c.target_grade != null ? Number(c.target_grade) : 85;
        const weak = g != null && tg != null && g < tg;
        return `id: ${c.id}, name: ${c.course_name}, current_grade: ${g != null ? g + '%' : 'none'}, target: ${tg}%, weak: ${weak}`;
      }).join('\n');
      const eventsContext = events.length
        ? events.map(e => `${e.title} (${e.start_date} ${e.start_time || ''}, ${e.event_type})`).join(', ')
        : (lang === 'ar' ? 'لا أحداث' : 'none');
      const prompt = lang === 'ar'
        ? `أنت مستشار جدولة دراسية. الطالب لديه المواد التالية ويريد جدولة لليوم ${dateStr}.\nالمواد:\n${coursesContext}\nأحداث اليوم/الفترة: ${eventsContext}\nاعطِ قائمة مهام مرتبة حسب الأولوية (التركيز على المواد الضعيفة والامتحانات القريبة). ردّ بصيغة JSON فقط، مصفوفة: [{"student_course_id": رقم_المادة, "title": "عنوان المهمة بالعربية"}] بدون أي نص آخر. استخدم فقط أرقام المواد المعطاة.`
        : `You are a study scheduling coach. The student has these courses and wants a plan for ${dateStr}.\nCourses:\n${coursesContext}\nEvents for the day/period: ${eventsContext}\nGive a prioritized list of tasks (focus on weak grades and upcoming exams). Reply with JSON only: [{"student_course_id": number, "title": "task title"}] using only the course ids above. No other text.`;
      const raw = await groq.chat([{ role: 'user', content: prompt }], 'You output only valid JSON array. No markdown, no explanation.');
      const cleaned = raw.replace(/^```json?\s*|\s*```$/g, '').trim();
      const arr = JSON.parse(cleaned);
      if (Array.isArray(arr) && arr.length > 0) {
        let order = 0;
        for (const item of arr) {
          const cid = item.student_course_id != null ? parseInt(item.student_course_id, 10) : null;
          const title = (item.title && String(item.title).trim()) || (lang === 'ar' ? 'مراجعة' : 'Review');
          if (cid != null && courseIds.has(cid)) {
            const existing = db.prepare('SELECT id FROM planner_tasks WHERE user_id = ? AND due_date = ? AND student_course_id = ? AND source = ?')
              .get(userId, dateStr, cid, 'app');
            if (!existing) {
              const course = courses.find(c => c.id === cid);
              const priority = course ? Math.max(1, 5 - getCourseRiskScore(course.current_grade)) : 3;
              const r = db.prepare(`
                INSERT INTO planner_tasks (user_id, student_course_id, title, due_date, due_time, priority, completed, source, sort_order)
                VALUES (?, ?, ?, ?, NULL, ?, 0, 'app', ?)
              `).run(userId, cid, title, dateStr, priority, order++);
              const row = db.prepare(`
                SELECT t.*, sc.course_name FROM planner_tasks t LEFT JOIN student_courses sc ON sc.id = t.student_course_id WHERE t.id = ?
              `).get(r.lastInsertRowid);
              generated.push(row);
            }
          }
        }
      }
    } catch (e) {
      console.error('Planner generate-plan AI error:', e);
    }
  }

  if (generated.length === 0) {
    const riskScore = (c) => getCourseRiskScore(c.current_grade);
    const coursesSorted = [...courses].sort((a, b) => riskScore(b) - riskScore(a));
    let order = 0;
    for (const c of coursesSorted) {
      const title = `مراجعة: ${c.course_name}`;
      const existing = db.prepare('SELECT id FROM planner_tasks WHERE user_id = ? AND due_date = ? AND student_course_id = ? AND source = ?')
        .get(userId, dateStr, c.id, 'app');
      if (!existing) {
        const r = db.prepare(`
          INSERT INTO planner_tasks (user_id, student_course_id, title, due_date, due_time, priority, completed, source, sort_order)
          VALUES (?, ?, ?, ?, NULL, ?, 0, 'app', ?)
        `).run(userId, c.id, title, dateStr, 5 - riskScore(c), order++);
        const row = db.prepare(`
          SELECT t.*, sc.course_name FROM planner_tasks t LEFT JOIN student_courses sc ON sc.id = t.student_course_id WHERE t.id = ?
        `).get(r.lastInsertRowid);
        generated.push(row);
      }
    }
  }

  return res.status(201).json({
    generated,
    message: generated.length ? (lang === 'ar' ? 'تم إنشاء المخطط حسب الأولويات والعلامات.' : 'Plan generated based on priorities and grades.') : (lang === 'ar' ? 'لا مهام جديدة لهذا اليوم.' : 'No new tasks for this day.'),
  });
});

// ---------- Suggest next task: AI-first (grades, weak areas, today's progress), fallback to rule-based ----------
plannerRouter.post('/suggest-next', authMiddleware, async (req, res) => {
  const date = req.body?.date || req.query?.date || new Date().toISOString().slice(0, 10);
  const userId = req.user.id;
  const lang = req.body?.lang === 'ar' || req.query?.lang === 'ar' ? 'ar' : 'en';
  const courses = db.prepare('SELECT id, course_name, current_grade, target_grade FROM student_courses WHERE user_id = ?').all(userId);
  const courseIds = new Set(courses.map(c => c.id));
  const dayTasks = db.prepare(`
    SELECT id, student_course_id, title, completed, source FROM planner_tasks
    WHERE user_id = ? AND due_date = ?
  `).all(userId, date);
  const maxOrder = dayTasks.length ? Math.max(...dayTasks.map(t => t.sort_order ?? 0)) : 0;

  if (groq.isConfigured()) {
    try {
      const coursesContext = courses.map(c => {
        const g = c.current_grade != null ? Number(c.current_grade) : null;
        const tg = c.target_grade != null ? Number(c.target_grade) : 85;
        const weak = g != null && tg != null && g < tg;
        return `id: ${c.id}, name: ${c.course_name}, current_grade: ${g != null ? g + '%' : 'none'}, target: ${tg}%, weak: ${weak}`;
      }).join('\n');
      const tasksContext = dayTasks.map(t => `- ${t.title} (course_id: ${t.student_course_id ?? 'none'}, completed: ${t.completed})`).join('\n') || (lang === 'ar' ? 'لا مهام' : 'none');
      const prompt = lang === 'ar'
        ? `أنت مستشار جدولة. الطالب لديه المواد التالية ولهذا اليوم ${date} المهام: ${tasksContext}\nالمواد:\n${coursesContext}\nاقترح مهمة واحدة فقط كخطوة تالية (مثلاً مراجعة مادة ضعيفة أو تمارين إضافية). ردّ بصيغة JSON فقط: {"student_course_id": رقم_المادة, "title": "عنوان المهمة بالعربية"} بدون أي نص آخر. استخدم فقط أرقام المواد المعطاة. إن كان اليوم مكتملاً أو لا حاجة لمهمة، رد: {"student_course_id": null, "title": null}.`
        : `You are a study coach. The student has these courses and for ${date} these tasks: ${tasksContext}\nCourses:\n${coursesContext}\nSuggest exactly one next task (e.g. review weak course or extra practice). Reply with JSON only: {"student_course_id": number, "title": "task title"} using only the course ids above. If the day is complete or no task needed, reply: {"student_course_id": null, "title": null}.`;
      const raw = await groq.chat([{ role: 'user', content: prompt }], 'You output only valid JSON object. No markdown, no explanation.');
      const cleaned = raw.replace(/^```json?\s*|\s*```$/g, '').trim();
      const obj = JSON.parse(cleaned);
      const cid = obj.student_course_id != null ? parseInt(obj.student_course_id, 10) : null;
      const title = (obj.title && String(obj.title).trim()) || null;
      if (cid != null && courseIds.has(cid) && title) {
        const course = courses.find(c => c.id === cid);
        const priority = course ? Math.max(1, 5 - getCourseRiskScore(course.current_grade)) : 3;
        const r = db.prepare(`
          INSERT INTO planner_tasks (user_id, student_course_id, title, due_date, due_time, priority, completed, source, sort_order)
          VALUES (?, ?, ?, ?, NULL, ?, 0, 'app', ?)
        `).run(userId, cid, title, date, priority, maxOrder + 1);
        const row = db.prepare(`
          SELECT t.*, sc.course_name FROM planner_tasks t LEFT JOIN student_courses sc ON sc.id = t.student_course_id WHERE t.id = ?
        `).get(r.lastInsertRowid);
        return res.status(201).json({ suggested: row, message: lang === 'ar' ? 'تم اقتراح المهمة التالية.' : 'Next task suggested.' });
      }
    } catch (e) {
      console.error('Planner suggest-next AI error:', e);
    }
  }

  const riskScore = (c) => getCourseRiskScore(c.current_grade);
  const coursesSorted = [...courses].sort((a, b) => riskScore(b) - riskScore(a));
  const appTasksByCourse = {};
  dayTasks.filter(t => t.source === 'app').forEach(t => {
    const cid = t.student_course_id ?? 'general';
    if (!appTasksByCourse[cid]) appTasksByCourse[cid] = [];
    appTasksByCourse[cid].push(t);
  });
  for (const c of coursesSorted) {
    const appForCourse = appTasksByCourse[c.id] || [];
    const allCompleted = appForCourse.length > 0 && appForCourse.every(t => t.completed);
    if (appForCourse.length === 0) {
      const r = db.prepare(`
        INSERT INTO planner_tasks (user_id, student_course_id, title, due_date, due_time, priority, completed, source, sort_order)
        VALUES (?, ?, ?, ?, NULL, ?, 0, 'app', ?)
      `).run(userId, c.id, `مراجعة: ${c.course_name}`, date, Math.max(1, 5 - riskScore(c)), maxOrder + 1);
      const row = db.prepare(`
        SELECT t.*, sc.course_name FROM planner_tasks t LEFT JOIN student_courses sc ON sc.id = t.student_course_id WHERE t.id = ?
      `).get(r.lastInsertRowid);
      return res.status(201).json({ suggested: row, message: 'New task suggested.' });
    }
    if (allCompleted && appForCourse.length > 0) {
      const r = db.prepare(`
        INSERT INTO planner_tasks (user_id, student_course_id, title, due_date, due_time, priority, completed, source, sort_order)
        VALUES (?, ?, ?, ?, NULL, ?, 0, 'app', ?)
      `).run(userId, c.id, `تمارين إضافية: ${c.course_name}`, date, Math.max(1, 5 - riskScore(c)), maxOrder + 1);
      const row = db.prepare(`
        SELECT t.*, sc.course_name FROM planner_tasks t LEFT JOIN student_courses sc ON sc.id = t.student_course_id WHERE t.id = ?
      `).get(r.lastInsertRowid);
      return res.status(201).json({ suggested: row, message: 'Follow-up task suggested.' });
    }
  }
  return res.status(200).json({ suggested: null, message: 'No new suggestion for now.' });
});

// ---------- Compare: app-suggested vs student plan (with AI comparison) ----------
plannerRouter.get('/compare', authMiddleware, async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const lang = req.query.lang === 'ar' ? 'ar' : 'en';
  const appTasks = db.prepare(`
    SELECT t.*, sc.course_name FROM planner_tasks t LEFT JOIN student_courses sc ON sc.id = t.student_course_id
    WHERE t.user_id = ? AND t.due_date = ? AND t.source = 'app' ORDER BY t.sort_order, t.priority DESC
  `).all(req.user.id, date);
  const studentTasks = db.prepare(`
    SELECT t.*, sc.course_name FROM planner_tasks t LEFT JOIN student_courses sc ON sc.id = t.student_course_id
    WHERE t.user_id = ? AND t.due_date = ? AND t.source = 'student' ORDER BY t.sort_order, t.priority DESC
  `).all(req.user.id, date);

  let ai_comparison = null;
  if (groq.isConfigured()) {
    try {
      const appList = appTasks.map(t => t.title + (t.course_name ? ` (${t.course_name})` : '')).join(', ') || (lang === 'ar' ? 'لا مهام' : 'none');
      const stuList = studentTasks.map(t => t.title + (t.course_name ? ` (${t.course_name})` : '')).join(', ') || (lang === 'ar' ? 'لا مهام' : 'none');
      const prompt = lang === 'ar'
        ? `قارن بين جدولين لطالب لليوم ${date}:\nجدول التطبيق المقترح: ${appList}\nجدول الطالب: ${stuList}\nاعطِ تحليلاً مختصراً: ما نقاط التطابق؟ ما الموجود عند التطبيق وليس عند الطالب (وماذا يعني)؟ ما الموجود عند الطالب وليس عند التطبيق؟ وتوصية عملية واحدة. فقرة واحدة بالعربية.`
        : `Compare two schedules for a student on ${date}:\nApp suggested plan: ${appList}\nStudent plan: ${stuList}\nGive a short analysis: overlaps, what the app has that the student does not (and why it matters), what the student has that the app does not, and one practical recommendation. One paragraph in English.`;
      ai_comparison = await groq.chat([{ role: 'user', content: prompt }], 'You are UniPilot planner. Respond only with the comparison, no preamble.');
    } catch (e) {
      console.error('Planner compare AI error:', e);
    }
  }

  return res.json({ date, app_plan: appTasks, student_plan: studentTasks, ai_comparison });
});

// ---------- Feedback: detailed review of student's plan (rule-based + AI) ----------
plannerRouter.get('/feedback', authMiddleware, async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const lang = req.query.lang === 'ar' ? 'ar' : 'en';
  const userId = req.user.id;
  const courses = db.prepare('SELECT id, course_name, current_grade, target_grade FROM student_courses WHERE user_id = ?').all(userId);
  const events = db.prepare(`
    SELECT id, student_course_id, title, start_date, start_time, end_time, event_type FROM planner_events
    WHERE user_id = ? AND start_date <= ? AND end_date >= ?
  `).all(userId, date, date);
  const examEvents = db.prepare(`
    SELECT student_course_id, start_date, event_type FROM planner_events
    WHERE user_id = ? AND event_type = 'exam' AND start_date >= ?
  `).all(userId, date);
  const allDayTasks = db.prepare(`
    SELECT t.*, sc.course_name FROM planner_tasks t LEFT JOIN student_courses sc ON sc.id = t.student_course_id
    WHERE t.user_id = ? AND t.due_date = ?
  `).all(userId, date);
  const studentTasks = allDayTasks.filter(t => t.source === 'student');
  const appTasks = allDayTasks.filter(t => t.source === 'app');
  const completedCount = allDayTasks.filter(t => t.completed).length;
  const totalCount = allDayTasks.length;
  const examDates = {};
  examEvents.forEach(e => {
    if (e.student_course_id && (!examDates[e.student_course_id] || e.start_date < examDates[e.student_course_id])) examDates[e.student_course_id] = e.start_date;
  });
  const risk = (c) => getCourseRiskScore(c.current_grade);
  const riskLabelAr = (r) => (r >= 3 ? 'حرجة' : r === 2 ? 'تحتاج تركيز' : r === 1 ? 'جيدة' : 'ممتازة');
  const riskLabelEn = (r) => (r >= 3 ? 'at risk' : r === 2 ? 'needs focus' : r === 1 ? 'good' : 'excellent');
  const recommendedOrder = [...courses]
    .filter(c => studentTasks.some(t => t.student_course_id === c.id))
    .sort((a, b) => {
      const ra = risk(a), rb = risk(b);
      if (ra !== rb) return rb - ra;
      const ea = examDates[a.id] || '9999-99-99', eb = examDates[b.id] || '9999-99-99';
      return ea.localeCompare(eb);
    });
  const studentOrder = [...new Set(studentTasks.map(t => t.student_course_id).filter(Boolean))];
  const feedback = [];
  const details = [];

  if (totalCount > 0) {
    details.push({
      title_ar: 'تقدم المهام',
      title_en: 'Task progress',
      body_ar: `أنجزت ${completedCount} من ${totalCount} مهمة لهذا اليوم (${Math.round((completedCount / totalCount) * 100)}%).${completedCount >= totalCount ? ' أحسنت! اكتمل جدول اليوم.' : ` بقي ${totalCount - completedCount} مهمة.`}`,
      body_en: `You completed ${completedCount} of ${totalCount} tasks for this day (${Math.round((completedCount / totalCount) * 100)}%).${completedCount >= totalCount ? ' Well done! Day plan is complete.' : ` ${totalCount - completedCount} tasks remaining.`}`,
    });
  }

  if (courses.some(c => risk(c) >= 2)) {
    const atRisk = courses.filter(c => risk(c) >= 2).map(c => ({ name: c.course_name, grade: c.current_grade, risk: risk(c) }));
    details.push({
      title_ar: 'مواد تحتاج تركيز',
      title_en: 'Courses that need focus',
      body_ar: atRisk.map(c => `"${c.name}" (العلامة الحالية: ${c.grade != null ? c.grade + '%' : 'لم تُحدد بعد'} — ${riskLabelAr(c.risk)}).`).join(' '),
      body_en: atRisk.map(c => `"${c.name}" (current grade: ${c.grade != null ? c.grade + '%' : 'not set'} — ${riskLabelEn(c.risk)}).`).join(' '),
    });
  }

  if (recommendedOrder.length >= 2) {
    const recFirst = recommendedOrder[0];
    const stuFirst = studentOrder[0];
    if (stuFirst !== recFirst?.id) {
      const recCourse = courses.find(c => c.id === recFirst);
      if (recCourse) {
        const reason = risk(recCourse) >= 2
          ? `المادة "${recCourse.course_name}" أكثر حراجة (علامة منخفضة أو غير محددة).`
          : examDates[recFirst] ? `امتحان "${recCourse.course_name}" أقرب من غيرها.` : null;
        if (reason) {
          feedback.push({ type: 'priority', course_name: recCourse.course_name, reason, recommendation: `ننصحك أن تبدأ بـ "${recCourse.course_name}" أولاً.` });
          details.push({
            title_ar: 'ترتيب الأولويات',
            title_en: 'Priority order',
            body_ar: reason + ' ننصحك أن تبدأ بهذه المادة أولاً.',
            body_en: `"${recCourse.course_name}" should come first (${risk(recCourse) >= 2 ? 'lower grade or not set' : 'exam date is soonest'}). We recommend starting with this course.`,
          });
        }
      }
    } else {
      details.push({
        title_ar: 'ترتيب الأولويات',
        title_en: 'Priority order',
        body_ar: 'ترتيبك منطقي: بدأت بالمادة الأكثر أولوية. واصل بنفس النهج.',
        body_en: 'Your order makes sense: you started with the highest-priority course. Keep it up.',
      });
    }
  }

  if (Object.keys(examDates).length > 0) {
    const names = Object.entries(examDates).map(([cid, d]) => {
      const c = courses.find(x => x.id === parseInt(cid, 10));
      return c ? `${c.course_name} (${d})` : null;
    }).filter(Boolean);
    if (names.length) {
      feedback.push({ type: 'exam', recommendation: `لديك امتحانات قادمة: ${names.join('، ')}. ركّز على التحضير حسب قرب الموعد.` });
      details.push({
        title_ar: 'الامتحانات القادمة',
        title_en: 'Upcoming exams',
        body_ar: `لديك امتحانات في: ${names.join('، ')}. خصص وقتاً للمراجعة قبل كل تاريخ.`,
        body_en: `You have exams on: ${names.join(', ')}. Allocate review time before each date.`,
      });
    }
  }

  if (events.length > 0) {
    details.push({
      title_ar: 'أحداث اليوم',
      title_en: "Today's events",
      body_ar: `لديك ${events.length} حدث/أحداث لهذا اليوم. تأكد من توزيع الوقت بين الأحداث والمهام.`,
      body_en: `You have ${events.length} event(s) today. Make sure to balance time between events and tasks.`,
    });
  }

  if (details.length === 0 && totalCount === 0) {
    details.push({
      title_ar: 'لا مهام لهذا اليوم',
      title_en: 'No tasks for this day',
      body_ar: 'لم تضف مهام أو أحداثاً. اضف حدثاً من زر "إضافة حدث" أو أنشئ مخططاً مقترحاً من "إنشاء مخطط ذكي".',
      body_en: 'No tasks or events for this day. Add an event or generate a smart plan to get started.',
    });
  }

  const summary = feedback.length
    ? feedback.map(f => f.recommendation || f.reason).join(' ')
    : (totalCount > 0
      ? (completedCount >= totalCount ? 'أحسنت! اكتملت مهام اليوم. يمكنك طلب مهام إضافية عند إكمال المهام المقترحة.' : 'ترتيبك جيد. ركّز على إنجاز المهام حسب الأولوية.')
      : 'ترتيبك منطقي. واصل التنظيم حسب أولوياتك.');

  let ai_feedback = null;
  if (groq.isConfigured()) {
    try {
      const eventsText = events.map(e => `- ${e.title} (${e.start_time}${e.end_time ? '-' + e.end_time : ''}, ${e.event_type})`).join('\n');
      const tasksText = allDayTasks.map(t => `- ${t.title}${t.course_name ? ' [' + t.course_name + ']' : ''} ${t.completed ? '(مكتملة)' : '(متبقية)'}`).join('\n');
      const coursesText = courses.map(c => `- ${c.course_name}: ${c.current_grade != null ? c.current_grade + '%' : 'لا علامة'}, هدف: ${c.target_grade || 85}%, أولوية: ${riskLabelAr(risk(c))}`).join('\n');
      const prompt = lang === 'ar'
        ? `أنت مستشار أكاديمي. الطالب لديه الجدول التالي لليوم ${date}:\nأحداث: ${events.length ? eventsText : 'لا أحداث'}\nمهام: ${totalCount ? tasksText : 'لا مهام'}\nمواده وعلاماته: ${coursesText}\nأنجز ${completedCount} من ${totalCount} مهمة.\nاطلب رأياً مفصلاً جداً: نقاط القوة في الجدول، نقاط التحسين، ترتيب الأولويات حسب العلامات والامتحانات، ونصائح عملية محددة. اكتب بالعربية فقرة أو فقرتين واضحة ومفصلة.`
        : `You are an academic coach. The student has this schedule for ${date}:\nEvents: ${events.length ? eventsText : 'none'}\nTasks: ${totalCount ? tasksText : 'none'}\nTheir courses and grades: ${coursesText}\nThey completed ${completedCount} of ${totalCount} tasks.\nGive a very detailed feedback: strengths of the plan, what to improve, priority order based on grades and exams, and specific actionable tips. Write one or two clear, detailed paragraphs in English.`;
      ai_feedback = await groq.chat([{ role: 'user', content: prompt }], 'You are UniPilot planner coach. Respond only with the requested feedback, no preamble.');
    } catch (e) {
      console.error('Planner feedback AI error:', e);
    }
  }

  return res.json({ date, feedback, summary, details, ai_feedback });
});
