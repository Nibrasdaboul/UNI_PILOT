import axios from 'axios';
import { createContext, useContext, useEffect, useState } from 'react';

const getApiUrl = () => {
  const env = import.meta.env.VITE_BACKEND_URL || '';
  if (env && env.trim() !== '') return env.trim();
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
    return 'http://localhost:3001';
  return '';
};
const API_URL = getApiUrl();
const DEMO_MODE = !API_URL || API_URL.trim() === '';

const DEMO_CATALOG_KEY = 'unipilot_demo_catalog';
const DEMO_STUDENT_COURSES_KEY = 'unipilot_demo_student_courses';
const DEMO_USER_KEY = 'unipilot_demo_user';
const DEMO_USERS_LIST_KEY = 'unipilot_demo_users_list';
const DEMO_NOTES_KEY = 'unipilot_demo_notes';
const DEMO_GRADE_ITEMS_KEY = 'unipilot_demo_grade_items';
const DEMO_MODULES_KEY = 'unipilot_demo_modules';
const DEMO_ACADEMIC_RECORD_KEY = 'unipilot_demo_academic_record';
const DEMO_PLANNER_EVENTS_KEY = 'unipilot_demo_planner_events';
const DEMO_PLANNER_TASKS_KEY = 'unipilot_demo_planner_tasks';

function getDemoPlannerEvents() {
  const email = getDemoCurrentUserEmail();
  try {
    const raw = localStorage.getItem(DEMO_PLANNER_EVENTS_KEY);
    const byUser = raw ? JSON.parse(raw) : {};
    return Array.isArray(byUser[email]) ? byUser[email] : [];
  } catch {
    return [];
  }
}
function setDemoPlannerEvents(list) {
  const email = getDemoCurrentUserEmail();
  if (!email) return;
  try {
    const raw = localStorage.getItem(DEMO_PLANNER_EVENTS_KEY);
    const byUser = raw ? JSON.parse(raw) : {};
    byUser[email] = list;
    localStorage.setItem(DEMO_PLANNER_EVENTS_KEY, JSON.stringify(byUser));
  } catch {}
}
function getDemoPlannerTasks() {
  const email = getDemoCurrentUserEmail();
  try {
    const raw = localStorage.getItem(DEMO_PLANNER_TASKS_KEY);
    const byUser = raw ? JSON.parse(raw) : {};
    return Array.isArray(byUser[email]) ? byUser[email] : [];
  } catch {
    return [];
  }
}
function setDemoPlannerTasks(list) {
  const email = getDemoCurrentUserEmail();
  if (!email) return;
  try {
    const raw = localStorage.getItem(DEMO_PLANNER_TASKS_KEY);
    const byUser = raw ? JSON.parse(raw) : {};
    byUser[email] = list;
    localStorage.setItem(DEMO_PLANNER_TASKS_KEY, JSON.stringify(byUser));
  } catch {}
}

function getDemoCatalog() {
  try {
    const raw = localStorage.getItem(DEMO_CATALOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function setDemoCatalog(list) {
  localStorage.setItem(DEMO_CATALOG_KEY, JSON.stringify(list));
}
function getDemoCurrentUserEmail() {
  try {
    const raw = sessionStorage.getItem(DEMO_USER_KEY);
    return raw ? JSON.parse(raw).email : null;
  } catch {
    return null;
  }
}
function getDemoStudentCourses() {
  const email = getDemoCurrentUserEmail();
  try {
    const raw = localStorage.getItem(DEMO_STUDENT_COURSES_KEY);
    let byUser = raw ? JSON.parse(raw) : {};
    if (Array.isArray(byUser)) {
      byUser = { [email || '_legacy']: byUser };
      localStorage.setItem(DEMO_STUDENT_COURSES_KEY, JSON.stringify(byUser));
    }
    const list = Array.isArray(byUser[email]) ? byUser[email] : [];
    return list;
  } catch {
    return [];
  }
}
function setDemoStudentCourses(list) {
  const email = getDemoCurrentUserEmail();
  if (!email) return;
  try {
    const raw = localStorage.getItem(DEMO_STUDENT_COURSES_KEY);
    let byUser = raw ? JSON.parse(raw) : {};
    if (Array.isArray(byUser)) byUser = { [email]: byUser };
    byUser[email] = list;
    localStorage.setItem(DEMO_STUDENT_COURSES_KEY, JSON.stringify(byUser));
  } catch {}
}
function getDemoUsersList() {
  try {
    const raw = localStorage.getItem(DEMO_USERS_LIST_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const arr = Array.isArray(list) ? list : [];
    if (arr.length === 0) {
      return [
        { id: 1, email: 'admin@unipilot.local', full_name: 'Admin', role: 'admin' },
        { id: 2, email: 'student@unipilot.local', full_name: 'Student', role: 'student' },
      ];
    }
    return arr;
  } catch {
    return [];
  }
}
function setDemoUsersList(list) {
  try {
    localStorage.setItem(DEMO_USERS_LIST_KEY, JSON.stringify(list));
  } catch {}
}
function getDemoNotes() {
  const email = getDemoCurrentUserEmail();
  try {
    const raw = localStorage.getItem(DEMO_NOTES_KEY);
    const byUser = raw ? JSON.parse(raw) : {};
    return Array.isArray(byUser[email]) ? byUser[email] : [];
  } catch {
    return [];
  }
}
function setDemoNotes(list) {
  const email = getDemoCurrentUserEmail();
  if (!email) return;
  try {
    const raw = localStorage.getItem(DEMO_NOTES_KEY);
    const byUser = raw ? JSON.parse(raw) : {};
    byUser[email] = list;
    localStorage.setItem(DEMO_NOTES_KEY, JSON.stringify(byUser));
  } catch {}
}
function getDemoGradeItems() {
  const email = getDemoCurrentUserEmail();
  try {
    const raw = localStorage.getItem(DEMO_GRADE_ITEMS_KEY);
    const byUser = raw ? JSON.parse(raw) : {};
    const byCourse = byUser[email] || {};
    if (typeof byCourse !== 'object' || byCourse === null) return {};
    const out = {};
    for (const key of Object.keys(byCourse)) {
      const val = byCourse[key];
      out[key] = Array.isArray(val) ? val : [];
    }
    return out;
  } catch {
    return {};
  }
}
function setDemoGradeItems(byCourse) {
  const email = getDemoCurrentUserEmail();
  if (!email) return;
  try {
    localStorage.setItem(DEMO_GRADE_ITEMS_KEY, JSON.stringify({ [email]: byCourse }));
  } catch {}
}
function getDemoModules() {
  const email = getDemoCurrentUserEmail();
  try {
    const raw = localStorage.getItem(DEMO_MODULES_KEY);
    const byUser = raw ? JSON.parse(raw) : {};
    const byCourse = byUser[email];
    return typeof byCourse === 'object' && byCourse !== null ? byCourse : {};
  } catch {
    return {};
  }
}
function setDemoModules(byCourse) {
  const email = getDemoCurrentUserEmail();
  if (!email) return;
  try {
    const raw = localStorage.getItem(DEMO_MODULES_KEY);
    const byUser = raw ? JSON.parse(raw) : {};
    byUser[email] = byCourse;
    localStorage.setItem(DEMO_MODULES_KEY, JSON.stringify(byUser));
  } catch {}
}
function getDemoAcademicRecord() {
  const email = getDemoCurrentUserEmail();
  try {
    const raw = localStorage.getItem(DEMO_ACADEMIC_RECORD_KEY);
    const byUser = raw ? JSON.parse(raw) : {};
    const r = byUser[email];
    return r ? { credits_completed: Number(r.credits_completed) || 0, credits_carried: Number(r.credits_carried) || 0 } : { credits_completed: 0, credits_carried: 0 };
  } catch {
    return { credits_completed: 0, credits_carried: 0 };
  }
}
function setDemoAcademicRecord(record) {
  const email = getDemoCurrentUserEmail();
  if (!email) return;
  try {
    const raw = localStorage.getItem(DEMO_ACADEMIC_RECORD_KEY);
    const byUser = raw ? JSON.parse(raw) : {};
    byUser[email] = { credits_completed: record.credits_completed, credits_carried: record.credits_carried };
    localStorage.setItem(DEMO_ACADEMIC_RECORD_KEY, JSON.stringify(byUser));
  } catch {}
}
function maybeFinalizeDemoCourses() {
  const email = getDemoCurrentUserEmail();
  if (!email) return;
  const courses = getDemoStudentCourses();
  const byCourse = getDemoGradeItems();
  const record = getDemoAcademicRecord();
  let changed = false;
  const updated = courses.map((c) => {
    if (c.finalizedAt) return c;
    const items = Array.isArray(byCourse[c.id]) ? byCourse[c.id] : (Array.isArray(byCourse[String(c.id)]) ? byCourse[String(c.id)] : []);
    const totalWeight = items.reduce((s, g) => s + (Number(g?.weight) || 0), 0);
    const mark = c.current_grade != null ? Number(c.current_grade) : null;
    if (totalWeight < 99.5 || mark == null) return c;
    const cred = Number(c.credit_hours) || 0;
    const passed = mark >= 50;
    if (passed) record.credits_completed += cred;
    else record.credits_carried += cred;
    changed = true;
    return { ...c, finalizedAt: new Date().toISOString(), passed };
  });
  if (changed) {
    setDemoAcademicRecord(record);
    setDemoStudentCourses(updated);
  }
}
function computeDemoFinalMark(items) {
  if (!items?.length) return null;
  let weightedSum = 0, totalWeight = 0;
  for (const g of items) {
    const w = Number(g.weight) || 0;
    const max = Number(g.max_score) || 100;
    const score = Number(g.score) ?? 0;
    if (w <= 0) continue;
    totalWeight += w;
    weightedSum += (max > 0 ? (score / max) * 100 : 0) * w;
  }
  if (totalWeight === 0) return null;
  return Math.round(Math.min(100, Math.max(0, weightedSum / totalWeight)) * 100) / 100;
}
function markToGpaPointsDemo(mark) {
  if (mark == null || Number.isNaN(Number(mark))) return 0;
  const m = Math.min(100, Math.max(0, Number(mark)));
  if (m >= 95) return 3.75; if (m >= 90) return 3.5; if (m >= 85) return 3.25; if (m >= 80) return 3;
  if (m >= 75) return 2.75; if (m >= 70) return 2.5; if (m >= 65) return 2.25; if (m >= 60) return 2;
  if (m >= 55) return 1.75; if (m >= 50) return 1.5;
  return 0;
}
function markToLetterDemo(mark) {
  if (mark == null || Number.isNaN(Number(mark))) return null;
  const m = Math.min(100, Math.max(0, Number(mark)));
  if (m >= 95) return 'A'; if (m >= 90) return 'A-'; if (m >= 85) return 'B+'; if (m >= 80) return 'B';
  if (m >= 75) return 'B-'; if (m >= 70) return 'C+'; if (m >= 65) return 'C'; if (m >= 60) return 'C-';
  if (m >= 55) return 'D+'; if (m >= 50) return 'D';
  return 'F';
}
function computeDemoSemesterGpa(courses) {
  if (!courses?.length) return 0;
  let sumW = 0, sumC = 0;
  for (const c of courses) {
    const cred = Number(c.credit_hours) || 0;
    if (cred <= 0) continue;
    const mark = c.current_grade != null ? Number(c.current_grade) : null;
    sumW += (mark != null ? markToGpaPointsDemo(mark) : 0) * cred;
    sumC += cred;
  }
  return sumC === 0 ? 0 : Math.round((sumW / sumC) * 100) / 100;
}
function computeDemoSemesterPercent(courses) {
  if (!courses?.length) return 0;
  let sumW = 0, sumC = 0;
  for (const c of courses) {
    const cred = Number(c.credit_hours) || 0;
    if (cred <= 0) continue;
    const mark = c.current_grade != null ? Number(c.current_grade) : null;
    sumW += (mark != null ? Math.min(100, Math.max(0, mark)) : 0) * cred;
    sumC += cred;
  }
  return sumC === 0 ? 0 : Math.round((sumW / sumC) * 100) / 100;
}

function createMockApi() {
  let catalogId = Math.max(0, ...getDemoCatalog().map((c) => c.id || 0));
  let studentCourseId = Math.max(0, ...getDemoStudentCourses().map((c) => c.id || 0));
  const nextCatalogId = () => ++catalogId;
  const nextStudentId = () => ++studentCourseId;

  const mockGet = (url) => {
    const u = typeof url === 'string' ? url : (url && url.url) || '';
    if (u.includes('/dashboard/summary')) {
      const coursesList = getDemoStudentCourses();
      const creditsCurrent = coursesList.reduce((s, c) => s + (Number(c.credit_hours) || 0), 0);
      const semesterGpa = computeDemoSemesterGpa(coursesList);
      const semesterPercent = computeDemoSemesterPercent(coursesList);
      const coursesWithStatus = coursesList.map((c) => {
        const g = c.current_grade;
        let status = 'normal';
        if (g != null) { if (g >= 80) status = 'safe'; else if (g >= 70) status = 'normal'; else if (g >= 60) status = 'at_risk'; else status = 'high_risk'; }
        return { ...c, grade_status: status };
      });
      const completed = coursesList.filter((c) => c.finalizedAt && c.passed);
      const carried = coursesList.filter((c) => c.finalizedAt && !c.passed);
      const completed_courses = completed.map((c) => ({
        course_name: c.course_name,
        course_code: c.course_code,
        percent: c.current_grade != null ? Number(c.current_grade) : null,
        gpa_points: c.current_grade != null ? markToGpaPointsDemo(c.current_grade) : null,
        letter_grade: c.current_grade != null ? markToLetterDemo(c.current_grade) : null,
      }));
      const carried_courses = carried.map((c) => ({
        course_name: c.course_name,
        course_code: c.course_code,
        percent: c.current_grade != null ? Number(c.current_grade) : null,
        gpa_points: c.current_grade != null ? markToGpaPointsDemo(c.current_grade) : null,
        letter_grade: c.current_grade != null ? markToLetterDemo(c.current_grade) : null,
      }));
      return Promise.resolve({
        data: {
          pending_tasks: 0,
          today_sessions: 0,
          courses_count: coursesList.length,
          avg_progress: coursesList.length ? coursesList.reduce((s, c) => s + (c.current_grade || 0), 0) / coursesList.length : 0,
          upcoming_tasks: [],
          semester_gpa: semesterGpa,
          cgpa: semesterGpa,
          semester_percent: semesterPercent,
          cumulative_percent: semesterPercent,
          ...getDemoAcademicRecord(),
          credits_current: creditsCurrent,
          completed_courses,
          carried_courses,
          courses: coursesWithStatus,
        },
      });
    }
    if (u === '/notes' || u.includes('/notes')) {
      const stored = getDemoNotes();
      const studentOnly = stored.filter((n) => n.type === 'student');
      const courses = getDemoStudentCourses();
      const statusLabels = { safe: 'آمن', normal: 'وضع عادي', at_risk: 'خطر', high_risk: 'خطر عالي' };
      const encouragement = { safe: '💪 تشجيع: مستواك ممتاز. حافظ على هذا الانضباط والجدية، أنت على الطريق الصحيح.', normal: '✨ تشجيع: أداؤك جيد. واصل المراجعة والمثابرة لتحافظ على تقدمك وتطوّره.', at_risk: '🌟 تشجيع: لا تستسلم. كل تحسن يبدأ بخطوة؛ ركّز على نقاط التحسين وستلاحظ الفرق.', high_risk: '❤️ تشجيع: الإحباط طبيعي، لكنك أقوى منه. خذ وقتك، راجع خطوة بخطوة، ونحن معك.' };
      const appNotes = [];
      let atRiskCount = 0;
      courses.forEach((c) => {
        if (c.current_grade == null) return;
        const g = Number(c.current_grade);
        const status = g >= 80 ? 'safe' : g >= 70 ? 'normal' : g >= 60 ? 'at_risk' : 'high_risk';
        if (status === 'at_risk' || status === 'high_risk') atRiskCount++;
        const letter = g >= 95 ? 'A' : g >= 90 ? 'A-' : g >= 85 ? 'B+' : g >= 80 ? 'B' : g >= 75 ? 'B-' : g >= 70 ? 'C+' : g >= 65 ? 'C' : g >= 60 ? 'C-' : g >= 55 ? 'D+' : g >= 50 ? 'D' : 'F';
        let content = `المادة: ${c.course_name}. العلامة: ${g}، التقدير: ${letter}. الوضع: ${statusLabels[status]}.`;
        if (status === 'high_risk') content += '\n\nتوصية: علامتك في هذه المادة منخفضة جداً. ننصحك بمراجعة المحتوى وزيادة ساعات الدراسة والاستعانة بالمراجع أو الأستاذ.';
        else if (status === 'at_risk') content += '\n\nتوصية: علامتك تحتاج تحسيناً. ننصحك بمراجعة الدروس والتركيز على النقاط الضعيفة لرفع المعدل.';
        content += '\n\n' + (encouragement[status] || encouragement.normal);
        appNotes.push({ id: `app-${c.id}`, student_course_id: c.id, content, type: 'app', course_name: c.course_name, created_at: new Date().toISOString() });
      });
      if (atRiskCount >= 2) {
        const generalContent = 'لديك أكثر من مادة تحتاج تركيزاً. ننصحك بترتيب أولويات المراجعة وزيادة ساعات الدراسة للمواد الحرجة.\n\n' + encouragement.high_risk;
        appNotes.push({ id: 'app-general', student_course_id: null, content: generalContent, type: 'app', course_name: null, created_at: new Date().toISOString() });
      }
      const merged = [...studentOnly, ...appNotes].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      return Promise.resolve({ data: merged });
    }
    if (u.includes('/analytics')) {
      const coursesList = getDemoStudentCourses();
      const semesterGpa = computeDemoSemesterGpa(coursesList);
      const semesterPercent = computeDemoSemesterPercent(coursesList);
      const creditsCurrent = coursesList.reduce((s, c) => s + (Number(c.credit_hours) || 0), 0);
      const courses = coursesList.map((c) => {
        const g = c.current_grade;
        let status = 'normal';
        if (g != null) { if (g >= 80) status = 'safe'; else if (g >= 70) status = 'normal'; else if (g >= 60) status = 'at_risk'; else status = 'high_risk'; }
        const letter = g != null ? (g >= 95 ? 'A' : g >= 90 ? 'A-' : g >= 85 ? 'B+' : g >= 80 ? 'B' : g >= 75 ? 'B-' : g >= 70 ? 'C+' : g >= 65 ? 'C' : g >= 60 ? 'C-' : g >= 55 ? 'D+' : g >= 50 ? 'D' : 'F') : null;
        const points = g != null ? markToGpaPointsDemo(g) : null;
        return { id: c.id, course_name: c.course_name, course_code: c.course_code, credit_hours: c.credit_hours, final_mark: c.current_grade, letter, gpa_points: points, status };
      });
      return Promise.resolve({
        data: { courses, semester_gpa: semesterGpa, semester_percent: semesterPercent, cgpa: semesterGpa, cumulative_percent: semesterPercent, ...getDemoAcademicRecord(), credits_current: creditsCurrent },
      });
    }
    if (u.includes('/catalog/courses') && !u.match(/\/catalog\/courses\/[^/]+$/)) {
      return Promise.resolve({ data: getDemoCatalog() });
    }
    const catalogMatch = u.match(/\/catalog\/courses\/(\d+)$/);
    if (catalogMatch) {
      const cat = getDemoCatalog().find((c) => c.id === parseInt(catalogMatch[1], 10));
      return Promise.resolve({ data: cat || null });
    }
    if (u.includes('/admin/users')) return Promise.resolve({ data: getDemoUsersList() });
    if (u.includes('/student/courses') && !u.match(/\/student\/courses\/\d+$/)) {
      return Promise.resolve({ data: getDemoStudentCourses() });
    }
    const studentMatch = u.match(/\/student\/courses\/(\d+)$/);
    if (studentMatch) {
      const sc = getDemoStudentCourses().find((c) => c.id === parseInt(studentMatch[1], 10));
      return Promise.resolve({ data: sc || null });
    }
    if (u.includes('/planner/daily')) {
      const date = (u.match(/date=([^&]+)/) || [])[1] || new Date().toISOString().slice(0, 10);
      const events = getDemoPlannerEvents().filter((e) => e.start_date <= date && e.end_date >= date);
      const tasks = getDemoPlannerTasks().filter((t) => t.due_date === date);
      const courses = getDemoStudentCourses();
      const name = (id) => (courses.find((c) => c.id === id) || {}).course_name;
      return Promise.resolve({ data: { date, events: events.map((e) => ({ ...e, course_name: e.student_course_id ? name(e.student_course_id) : null })), tasks: tasks.map((t) => ({ ...t, course_name: t.student_course_id ? name(t.student_course_id) : null })) } });
    }
    if (u === '/planner/events' || u.startsWith('/planner/events') && !u.match(/\/planner\/events\/\d+/)) {
      const list = getDemoPlannerEvents();
      const courses = getDemoStudentCourses();
      const name = (id) => (courses.find((c) => c.id === id) || {}).course_name;
      return Promise.resolve({ data: list.map((e) => ({ ...e, course_name: e.student_course_id ? name(e.student_course_id) : null })) });
    }
    const eventIdMatch = u.match(/\/planner\/events\/(\d+)$/);
    if (eventIdMatch) {
      const id = parseInt(eventIdMatch[1], 10);
      const events = getDemoPlannerEvents();
      const e = events.find((ev) => Number(ev.id) === id);
      if (!e) return Promise.reject({ response: { status: 404, data: { detail: 'Not found' } } });
      const courses = getDemoStudentCourses();
      const course_name = e.student_course_id ? (courses.find((c) => c.id === e.student_course_id) || {}).course_name : null;
      return Promise.resolve({ data: { ...e, course_name } });
    }
    if (u.includes('/planner/tasks') && !u.match(/\/planner\/tasks\/\d+$/)) {
      const date = (u.match(/date=([^&]+)/) || [])[1];
      let list = getDemoPlannerTasks();
      if (date) list = list.filter((t) => t.due_date === date);
      const courses = getDemoStudentCourses();
      const name = (id) => (courses.find((c) => c.id === id) || {}).course_name;
      return Promise.resolve({ data: list.map((t) => ({ ...t, course_name: t.student_course_id ? name(t.student_course_id) : null })) });
    }
    const taskIdMatch = u.match(/\/planner\/tasks\/(\d+)$/);
    if (taskIdMatch) {
      const id = parseInt(taskIdMatch[1], 10);
      const tasks = getDemoPlannerTasks();
      const t = tasks.find((tk) => Number(tk.id) === id);
      if (!t) return Promise.reject({ response: { status: 404, data: { detail: 'Not found' } } });
      const courses = getDemoStudentCourses();
      const course_name = t.student_course_id ? (courses.find((c) => c.id === t.student_course_id) || {}).course_name : null;
      return Promise.resolve({ data: { ...t, course_name } });
    }
    if (u.includes('/planner/compare')) {
      const date = (u.match(/date=([^&]+)/) || [])[1] || new Date().toISOString().slice(0, 10);
      const allTasks = getDemoPlannerTasks().filter((t) => t.due_date === date);
      const app_plan = allTasks.filter((t) => t.source === 'app');
      const student_plan = allTasks.filter((t) => t.source === 'student');
      const courses = getDemoStudentCourses();
      const name = (id) => (courses.find((c) => c.id === id) || {}).course_name;
      return Promise.resolve({ data: { date, app_plan: app_plan.map((t) => ({ ...t, course_name: t.student_course_id ? name(t.student_course_id) : null })), student_plan: student_plan.map((t) => ({ ...t, course_name: t.student_course_id ? name(t.student_course_id) : null })) } });
    }
    if (u.includes('/planner/feedback')) {
      const date = (u.match(/date=([^&]+)/) || [])[1] || new Date().toISOString().slice(0, 10);
      const allDayTasks = getDemoPlannerTasks().filter((t) => t.due_date === date);
      const studentTasks = allDayTasks.filter((t) => t.source === 'student');
      const completedCount = allDayTasks.filter((t) => t.completed).length;
      const totalCount = allDayTasks.length;
      const courses = getDemoStudentCourses();
      const risk = (c) => (c.current_grade == null ? 2 : c.current_grade >= 80 ? 0 : c.current_grade >= 70 ? 1 : c.current_grade >= 60 ? 2 : 3);
      const riskLabelAr = (r) => (r >= 3 ? 'حرجة' : r === 2 ? 'تحتاج تركيز' : r === 1 ? 'جيدة' : 'ممتازة');
      const riskLabelEn = (r) => (r >= 3 ? 'at risk' : r === 2 ? 'needs focus' : r === 1 ? 'good' : 'excellent');
      const recommended = [...courses].filter((c) => studentTasks.some((t) => t.student_course_id === c.id)).sort((a, b) => risk(b) - risk(a));
      const feedback = recommended.length >= 2 ? [{ type: 'priority', recommendation: `ننصحك أن تبدأ بـ "${recommended[0].course_name}" أولاً (الأكثر حراجة).` }] : [];
      const details = [];
      if (totalCount > 0) {
        details.push({
          title_ar: 'تقدم المهام',
          title_en: 'Task progress',
          body_ar: `أنجزت ${completedCount} من ${totalCount} مهمة لهذا اليوم (${Math.round((completedCount / totalCount) * 100)}%).${completedCount >= totalCount ? ' أحسنت! اكتمل جدول اليوم.' : ` بقي ${totalCount - completedCount} مهمة.`}`,
          body_en: `You completed ${completedCount} of ${totalCount} tasks (${Math.round((completedCount / totalCount) * 100)}%).${completedCount >= totalCount ? ' Well done!' : ` ${totalCount - completedCount} remaining.`}`,
        });
      }
      if (courses.some((c) => risk(c) >= 2)) {
        const atRisk = courses.filter((c) => risk(c) >= 2).map((c) => ({ name: c.course_name, grade: c.current_grade, risk: risk(c) }));
        details.push({
          title_ar: 'مواد تحتاج تركيز',
          title_en: 'Courses that need focus',
          body_ar: atRisk.map((c) => `"${c.name}" (العلامة: ${c.grade != null ? c.grade + '%' : 'لم تُحدد'} — ${riskLabelAr(c.risk)}).`).join(' '),
          body_en: atRisk.map((c) => `"${c.name}" (grade: ${c.grade != null ? c.grade + '%' : 'not set'} — ${riskLabelEn(c.risk)}).`).join(' '),
        });
      }
      if (recommended.length >= 2) {
        details.push({
          title_ar: 'ترتيب الأولويات',
          title_en: 'Priority order',
          body_ar: `ننصحك أن تبدأ بـ "${recommended[0].course_name}" أولاً.`,
          body_en: `We recommend starting with "${recommended[0].course_name}" first.`,
        });
      }
      if (details.length === 0 && totalCount === 0) {
        details.push({
          title_ar: 'لا مهام لهذا اليوم',
          title_en: 'No tasks for this day',
          body_ar: 'أضف حدثاً أو أنشئ مخططاً مقترحاً.',
          body_en: 'Add an event or generate a smart plan.',
        });
      }
      const summary = feedback.length ? feedback.map((f) => f.recommendation).join(' ') : (totalCount > 0 ? (completedCount >= totalCount ? 'أحسنت! اكتملت مهام اليوم.' : 'ترتيبك جيد. ركّز على إنجاز المهام.') : 'ترتيبك منطقي. واصل التنظيم حسب أولوياتك.');
      return Promise.resolve({ data: { date, feedback, summary, details } });
    }
    if (u.includes('/ai/conversations') && !u.match(/\/ai\/conversations\/\d+$/)) {
      return Promise.resolve({ data: [] });
    }
    if (u.match(/\/ai\/conversations\/\d+$/)) {
      return Promise.reject({ response: { status: 404, data: { detail: 'Not found' } } });
    }
    if (u.includes('/tasks/upcoming')) {
      const date = new Date().toISOString().slice(0, 10);
      const tasks = getDemoPlannerTasks().filter((t) => t.due_date >= date).slice(0, 20);
      const courses = getDemoStudentCourses();
      const name = (id) => (courses.find((c) => c.id === id) || {}).course_name;
      return Promise.resolve({ data: tasks.map((t) => ({ ...t, course_name: t.student_course_id ? name(t.student_course_id) : null, status: t.completed ? 'completed' : 'pending' })) });
    }
    if (u.includes('/admin/stats')) {
      const catalog = getDemoCatalog();
      const usersList = getDemoUsersList();
      const total_students = usersList.filter((u) => u.role === 'student').length;
      return Promise.resolve({
        data: {
          total_users: usersList.length,
          total_students,
          total_courses: catalog.length,
          total_tasks: 0,
        },
      });
    }
    if (u.includes('/insights/predictions')) return Promise.resolve({ data: [] });
    if (u.includes('/courses/') && u.includes('/grades') && !u.includes('/chat')) {
      const idMatch = u.match(/\/courses\/(\d+)\/grades/);
      if (idMatch) {
        const courseId = parseInt(idMatch[1], 10);
        const byCourse = getDemoGradeItems();
        const raw = byCourse[courseId] ?? byCourse[String(courseId)] ?? [];
        const items = Array.isArray(raw) ? raw : [];
        const normalized = items.map((g) => ({ ...g, id: Number(g.id) }));
        return Promise.resolve({ data: normalized });
      }
    }
    if (u.includes('/courses/') && u.includes('/modules') && !u.includes('/chat')) {
      const modulesMatch = u.match(/\/courses\/(\d+)\/modules$/);
      if (modulesMatch) {
        const courseIdKey = String(modulesMatch[1]);
        const byCourse = getDemoModules();
        const list = Array.isArray(byCourse[courseIdKey]) ? byCourse[courseIdKey] : [];
        const normalized = list.map((m) => ({
          ...m,
          id: Number(m.id),
          student_course_id: Number(m.student_course_id),
          items: (Array.isArray(m.items) ? m.items : []).map((i) => ({ ...i, id: Number(i.id), course_module_id: Number(i.course_module_id) })),
        }));
        return Promise.resolve({ data: normalized });
      }
      const itemsMatch = u.match(/\/courses\/(\d+)\/modules\/(\d+)\/items$/);
      if (itemsMatch) {
        const [, cId, modId] = itemsMatch;
        const courseIdKey = String(cId);
        const moduleId = parseInt(modId, 10);
        const byCourse = getDemoModules();
        const list = Array.isArray(byCourse[courseIdKey]) ? byCourse[courseIdKey] : [];
        const mod = list.find((m) => Number(m.id) === moduleId);
        const items = Array.isArray(mod?.items) ? mod.items : [];
        return Promise.resolve({ data: items.map((i) => ({ ...i, id: Number(i.id), course_module_id: Number(i.course_module_id) })) });
      }
      return Promise.resolve({ data: [] });
    }
    if (u.includes('/courses/') && u.includes('/chat')) return Promise.resolve({ data: [] });
    if (u.includes('/courses/') && !u.includes('/modules') && !u.includes('/grades') && !u.includes('/chat')) {
      const id = u.match(/\/courses\/(\d+)/)?.[1];
      const sc = getDemoStudentCourses().find((c) => String(c.id) === id);
      return Promise.resolve({ data: sc || { id: '', course_name: 'Demo Course', course_code: 'DEMO' } });
    }
    return Promise.resolve({ data: {} });
  };

  const mockPost = (url, body) => {
    const u = typeof url === 'string' ? url : (url && url.url) || '';
    if (u.includes('/catalog/courses')) {
      const catalog = getDemoCatalog();
      const newCourse = {
        id: nextCatalogId(),
        course_code: body.course_code || '',
        course_name: body.course_name || '',
        department: body.department || '',
        description: body.description || '',
        credit_hours: body.credit_hours ?? 3,
        order: body.order ?? catalog.length + 1,
        prerequisite_id: body.prerequisite_id ?? null,
      };
      catalog.push(newCourse);
      setDemoCatalog(catalog);
      return Promise.resolve({ data: newCourse });
    }
    if (u.includes('/student/courses')) {
      const list = getDemoStudentCourses();
      const newEnrollment = {
        id: nextStudentId(),
        course_name: body.course_name || body.course_code || 'Course',
        course_code: body.course_code || '',
        credit_hours: body.credit_hours ?? 3,
        catalog_course_id: body.catalog_course_id ?? null,
        current_grade: null,
        progress: 0,
        semester: body.semester || 'Spring 2026',
        difficulty: body.difficulty ?? 5,
        target_grade: body.target_grade ?? 85,
        professor_name: body.professor_name || '',
        description: body.description || '',
      };
      list.push(newEnrollment);
      setDemoStudentCourses(list);
      return Promise.resolve({ data: newEnrollment });
    }
    const finalizeMatch = u.match(/\/courses\/(\d+)\/finalize$/);
    if (finalizeMatch) {
      const courseId = parseInt(finalizeMatch[1], 10);
      const courses = getDemoStudentCourses();
      const course = courses.find((c) => Number(c.id) === courseId);
      if (!course) return Promise.reject({ response: { status: 404, data: { detail: 'Not found' } } });
      if (course.finalizedAt) return Promise.resolve({ data: { finalized: true, already: true } });
      const byCourse = getDemoGradeItems();
      const raw = byCourse[courseId] ?? byCourse[String(courseId)];
      const items = Array.isArray(raw) ? raw : [];
      const finalMark = computeDemoFinalMark(items);
      if (finalMark == null) return Promise.reject({ response: { status: 400, data: { detail: 'Add at least one grade before marking as finished.' } } });
      const passed = finalMark >= 50;
      const record = getDemoAcademicRecord();
      const cred = Number(course.credit_hours) || 0;
      if (passed) record.credits_completed += cred;
      else record.credits_carried += cred;
      setDemoAcademicRecord(record);
      const updated = courses.map((c) => (Number(c.id) === courseId ? { ...c, finalizedAt: new Date().toISOString(), passed } : c));
      setDemoStudentCourses(updated);
      return Promise.resolve({ data: { finalized: true } });
    }
    if (u.includes('/planner/events') && !u.match(/\/planner\/events\/\d+$/)) {
      const events = getDemoPlannerEvents();
      const id = Math.max(0, ...events.map((e) => e.id || 0)) + 1;
      const scId = body.student_course_id != null && body.student_course_id !== '' ? parseInt(body.student_course_id, 10) : null;
      const ev = {
        id,
        user_id: 1,
        student_course_id: Number.isNaN(scId) ? null : scId,
        title: (body.title || '').trim() || 'Event',
        description: body.description || null,
        start_date: body.start_date || new Date().toISOString().slice(0, 10),
        end_date: body.end_date || body.start_date || new Date().toISOString().slice(0, 10),
        start_time: body.start_time || '09:00',
        end_time: body.end_time || '11:00',
        event_type: ['exam', 'study', 'project', 'other'].includes(body.event_type) ? body.event_type : 'study',
        completed: 0,
        created_at: new Date().toISOString(),
      };
      events.push(ev);
      setDemoPlannerEvents(events);
      const courses = getDemoStudentCourses();
      const course_name = ev.student_course_id ? (courses.find((c) => c.id === ev.student_course_id) || {}).course_name : null;
      return Promise.resolve({ data: { ...ev, course_name } });
    }
    if (u.includes('/planner/tasks') && !u.match(/\/planner\/tasks\/\d+$/)) {
      const tasks = getDemoPlannerTasks();
      const id = Math.max(0, ...tasks.map((t) => t.id || 0)) + 1;
      const scId = body.student_course_id != null && body.student_course_id !== '' ? parseInt(body.student_course_id, 10) : null;
      const tk = {
        id,
        user_id: 1,
        student_course_id: Number.isNaN(scId) ? null : scId,
        title: (body.title || '').trim() || 'Task',
        due_date: body.due_date || new Date().toISOString().slice(0, 10),
        due_time: body.due_time || null,
        priority: Math.min(5, Math.max(1, parseInt(body.priority, 10) || 3)),
        completed: 0,
        source: body.source === 'app' ? 'app' : 'student',
        sort_order: tasks.length,
        created_at: new Date().toISOString(),
      };
      tasks.push(tk);
      setDemoPlannerTasks(tasks);
      const courses = getDemoStudentCourses();
      const course_name = tk.student_course_id ? (courses.find((c) => c.id === tk.student_course_id) || {}).course_name : null;
      return Promise.resolve({ data: { ...tk, course_name } });
    }
    if (u.includes('/planner/suggest-next')) {
      const fromDate = body?.date || new Date().toISOString().slice(0, 10);
      const courses = getDemoStudentCourses();
      const risk = (c) => (c.current_grade == null ? 2 : c.current_grade >= 80 ? 0 : c.current_grade >= 70 ? 1 : c.current_grade >= 60 ? 2 : 3);
      const sorted = [...courses].sort((a, b) => risk(b) - risk(a));
      const tasks = getDemoPlannerTasks();
      const dayTasks = tasks.filter((t) => t.due_date === fromDate);
      const appByCourse = {};
      dayTasks.filter((t) => t.source === 'app').forEach((t) => {
        const cid = t.student_course_id ?? 'general';
        if (!appByCourse[cid]) appByCourse[cid] = [];
        appByCourse[cid].push(t);
      });
      const maxOrder = dayTasks.length ? Math.max(...dayTasks.map((t) => t.sort_order ?? 0)) : 0;
      for (const c of sorted) {
        const appForCourse = appByCourse[c.id] || [];
        const allCompleted = appForCourse.length > 0 && appForCourse.every((t) => t.completed);
        if (appForCourse.length === 0) {
          const id = Math.max(0, ...tasks.map((t) => t.id || 0)) + 1;
          const tk = { id, user_id: 1, student_course_id: c.id, title: `مراجعة: ${c.course_name}`, due_date: fromDate, due_time: null, priority: Math.max(1, 5 - risk(c)), completed: 0, source: 'app', sort_order: maxOrder + 1, created_at: new Date().toISOString(), course_name: c.course_name };
          tasks.push(tk);
          setDemoPlannerTasks(tasks);
          return Promise.resolve({ data: { suggested: tk, message: 'New task suggested.' } });
        }
        if (allCompleted) {
          const id = Math.max(0, ...tasks.map((t) => t.id || 0)) + 1;
          const tk = { id, user_id: 1, student_course_id: c.id, title: `تمارين إضافية: ${c.course_name}`, due_date: fromDate, due_time: null, priority: Math.max(1, 5 - risk(c)), completed: 0, source: 'app', sort_order: maxOrder + 1, created_at: new Date().toISOString(), course_name: c.course_name };
          tasks.push(tk);
          setDemoPlannerTasks(tasks);
          return Promise.resolve({ data: { suggested: tk, message: 'Follow-up task suggested.' } });
        }
      }
      return Promise.resolve({ data: { suggested: null, message: 'No new suggestion for now.' } });
    }
    if (u.includes('/planner/generate-plan')) {
      const fromDate = body.from_date || new Date().toISOString().slice(0, 10);
      const courses = getDemoStudentCourses();
      const risk = (c) => (c.current_grade == null ? 2 : c.current_grade >= 80 ? 0 : c.current_grade >= 70 ? 1 : c.current_grade >= 60 ? 2 : 3);
      const sorted = [...courses].sort((a, b) => risk(b) - risk(a));
      const tasks = getDemoPlannerTasks();
      let order = Math.max(0, ...tasks.map((t) => t.sort_order || 0));
      const generated = [];
      for (const c of sorted) {
        const existing = tasks.some((t) => t.due_date === fromDate && t.student_course_id === c.id && t.source === 'app');
        if (!existing) {
          const id = Math.max(0, ...tasks.map((t) => t.id || 0), 0) + generated.length + 1;
          const tk = { id, user_id: 1, student_course_id: c.id, title: `مراجعة: ${c.course_name}`, due_date: fromDate, due_time: null, priority: 5 - risk(c), completed: 0, source: 'app', sort_order: order++, created_at: new Date().toISOString(), course_name: c.course_name };
          tasks.push(tk);
          generated.push(tk);
        }
      }
      setDemoPlannerTasks(tasks);
      return Promise.resolve({ data: { generated, message: 'Plan generated.' } });
    }
    const modulesPostMatch = u.match(/\/courses\/(\d+)\/modules$/);
    if (modulesPostMatch) {
      const b = body && typeof body === 'object' ? body : {};
      const courseIdKey = String(modulesPostMatch[1]);
      const byCourse = getDemoModules();
      const list = Array.isArray(byCourse[courseIdKey]) ? [...byCourse[courseIdKey]] : [];
      const id = Math.max(0, ...list.map((m) => Number(m.id) || 0)) + 1;
      const newMod = {
        id,
        student_course_id: parseInt(courseIdKey, 10),
        title: (b.title != null ? String(b.title) : '').trim() || 'Unit',
        description: b.description != null ? String(b.description) : null,
        sort_order: list.length + 1,
        created_at: new Date().toISOString(),
        items: [],
      };
      const nextList = [...list, newMod];
      const nextByCourse = { ...byCourse, [courseIdKey]: nextList };
      setDemoModules(nextByCourse);
      return Promise.resolve({ data: { ...newMod, items: [] } });
    }
    const moduleItemsPostMatch = u.match(/\/courses\/(\d+)\/modules\/(\d+)\/items$/);
    if (moduleItemsPostMatch && body) {
      const [, cId, modId] = moduleItemsPostMatch;
      const courseIdKey = String(cId);
      const moduleId = parseInt(modId, 10);
      const byCourse = getDemoModules();
      const list = Array.isArray(byCourse[courseIdKey]) ? [...byCourse[courseIdKey]] : [];
      const modIdx = list.findIndex((m) => Number(m.id) === moduleId);
      if (modIdx === -1) return Promise.reject({ response: { status: 404, data: { detail: 'Module not found' } } });
      const mod = list[modIdx];
      const items = Array.isArray(mod.items) ? [...mod.items] : [];
      const itemId = Math.max(0, ...items.map((i) => i.id || 0)) + 1;
      const type = (body.type === 'folder' || body.type === 'file') ? body.type : 'file';
      const newItem = {
        id: itemId,
        course_module_id: moduleId,
        type,
        title: (body.title || '').trim() || (type === 'folder' ? 'Folder' : 'File'),
        url_or_content: body.url_or_content != null ? String(body.url_or_content) : null,
        sort_order: items.length + 1,
        created_at: new Date().toISOString(),
      };
      items.push(newItem);
      list[modIdx] = { ...mod, items };
      setDemoModules({ ...byCourse, [courseIdKey]: list });
      return Promise.resolve({ data: newItem });
    }
    const gradesPostMatch = u.match(/\/courses\/(\d+)\/grades$/);
    if (gradesPostMatch && body) {
      const courseId = parseInt(gradesPostMatch[1], 10);
      const byCourse = getDemoGradeItems();
      const items = Array.isArray(byCourse[courseId]) ? byCourse[courseId] : [];
      const id = Math.max(0, ...items.map((i) => i.id || 0)) + 1;
      const newItem = {
        id,
        student_course_id: courseId,
        item_type: body.item_type || 'quiz',
        title: body.title || 'Grade',
        score: Number(body.score) ?? 0,
        max_score: Number(body.max_score) ?? 100,
        weight: Number(body.weight) ?? 0,
        created_at: new Date().toISOString(),
      };
      items.push(newItem);
      byCourse[courseId] = items;
      setDemoGradeItems(byCourse);
      const finalMark = computeDemoFinalMark(items);
      const courses = getDemoStudentCourses();
      const updated = courses.map((c) => (c.id === courseId ? { ...c, current_grade: finalMark } : c));
      setDemoStudentCourses(updated);
      maybeFinalizeDemoCourses();
      return Promise.resolve({ data: newItem });
    }
    if (u === '/ai/conversations' || u.match(/^\/ai\/conversations$/)) {
      const now = new Date().toISOString();
      return Promise.resolve({ data: { id: 1, title: body?.title || null, created_at: now, updated_at: now, messages: [] } });
    }
    if (u.includes('/ai/chat')) {
      const lastUser = (body?.messages || []).filter((m) => m.role === 'user').pop();
      const reply = lastUser?.content
        ? 'في وضع التجربة لا يتوفر الرد من الذكاء الاصطناعي. شغّل السيرفر وضَع GROQ_API_KEY في .env لتفعيل الأستاذ الذكي. (In demo mode, AI replies are not available. Run the server and set GROQ_API_KEY in .env to enable AI Coach.)'
        : '';
      return Promise.resolve({ data: { content: reply } });
    }
    if (u.includes('/ai/course_chat')) {
      return Promise.resolve({ data: { content: 'في وضع التجربة الرد من الذكاء الاصطناعي غير متاح. (AI reply not available in demo mode.)' } });
    }
    if (u.includes('/ai/summarize')) {
      return Promise.resolve({ data: { summary: (body?.text || '').slice(0, 200) + (body?.text?.length > 200 ? '...' : '') || 'Demo summary.' } });
    }
    if (u.includes('/ai/generate_flashcards')) {
      return Promise.resolve({ data: { flashcards: [{ front: 'Demo term', back: 'Demo definition' }] } });
    }
    if (u.includes('/ai/generate_quiz')) {
      return Promise.resolve({ data: { quiz: [{ question: 'Demo question?', options: ['A', 'B', 'C', 'D'], correct_index: 0 }] } });
    }
    if (u.includes('/notes') && !u.match(/\/notes\/\d+$/)) {
      const list = getDemoNotes();
      const id = Math.max(0, ...list.map((n) => n.id || 0)) + 1;
      const courseId = body.student_course_id ? parseInt(body.student_course_id, 10) : null;
      const courses = getDemoStudentCourses();
      const course_name = courseId ? (courses.find((c) => c.id === courseId)?.course_name || null) : null;
      const note = { id, student_course_id: courseId, content: body.content || '', type: 'student', created_at: new Date().toISOString(), course_name };
      list.push(note);
      setDemoNotes(list);
      return Promise.resolve({ data: note });
    }
    if (body?.text) return Promise.resolve({ data: { summary: 'Demo summary.', flashcards: [], quiz: [] } });
    if (body?.userMessage) return Promise.resolve({ data: { summary: 'Demo response.' } });
    if (body && (body.content !== undefined || body.course_id !== undefined)) return Promise.resolve({ data: { content: 'Demo reply.' } });
    return Promise.resolve({ data: body || {} });
  };

  const mockPatch = (url, body) => {
    const u = typeof url === 'string' ? url : (url && url.url) || '';
    const catalogMatch = u.match(/\/catalog\/courses\/(\d+)$/);
    if (catalogMatch && body) {
      const id = parseInt(catalogMatch[1], 10);
      const catalog = getDemoCatalog().map((c) =>
        c.id === id ? { ...c, ...body } : c
      );
      setDemoCatalog(catalog);
      return Promise.resolve({ data: catalog.find((c) => c.id === id) });
    }
    const notesMatch = u.match(/\/notes\/(\d+)$/);
    if (notesMatch && body?.content !== undefined) {
      const id = parseInt(notesMatch[1], 10);
      const list = getDemoNotes();
      const idx = list.findIndex((n) => n.id === id);
      if (idx === -1) return Promise.resolve({ data: null });
      list[idx] = { ...list[idx], content: body.content };
      setDemoNotes(list);
      return Promise.resolve({ data: list[idx] });
    }
    const plannerEventMatch = u.match(/\/planner\/events\/(\d+)$/);
    if (plannerEventMatch && body) {
      const id = parseInt(plannerEventMatch[1], 10);
      const events = getDemoPlannerEvents();
      const idx = events.findIndex((e) => Number(e.id) === id);
      if (idx === -1) return Promise.reject({ response: { status: 404, data: { detail: 'Not found' } } });
      const nextScId = body.student_course_id !== undefined
        ? (body.student_course_id != null && body.student_course_id !== '' ? parseInt(body.student_course_id, 10) : null)
        : events[idx].student_course_id;
      const finalScId = (nextScId != null && !Number.isNaN(nextScId)) ? nextScId : (nextScId === null ? null : events[idx].student_course_id);
      events[idx] = { ...events[idx], ...body, id: events[idx].id, student_course_id: finalScId };
      if (body.completed !== undefined) events[idx].completed = body.completed ? 1 : 0;
      setDemoPlannerEvents(events);
      const courses = getDemoStudentCourses();
      const course_name = events[idx].student_course_id ? (courses.find((c) => c.id === events[idx].student_course_id) || {}).course_name : null;
      return Promise.resolve({ data: { ...events[idx], course_name } });
    }
    if (u.match(/\/ai\/conversations\/\d+$/)) {
      return Promise.resolve({ data: { id: 1, title: body?.title ?? null, messages: body?.messages ?? [], updated_at: new Date().toISOString() } });
    }
    const plannerTaskMatch = u.match(/\/planner\/tasks\/(\d+)$/);
    if (plannerTaskMatch && body) {
      const id = parseInt(plannerTaskMatch[1], 10);
      const tasks = getDemoPlannerTasks();
      const idx = tasks.findIndex((t) => Number(t.id) === id);
      if (idx === -1) return Promise.reject({ response: { status: 404, data: { detail: 'Not found' } } });
      const nextScId = body.student_course_id !== undefined
        ? (body.student_course_id != null && body.student_course_id !== '' ? parseInt(body.student_course_id, 10) : null)
        : tasks[idx].student_course_id;
      const finalScId = (nextScId != null && !Number.isNaN(nextScId)) ? nextScId : (nextScId === null ? null : tasks[idx].student_course_id);
      tasks[idx] = { ...tasks[idx], ...body, id: tasks[idx].id, student_course_id: finalScId };
      if (body.completed !== undefined) tasks[idx].completed = body.completed ? 1 : 0;
      setDemoPlannerTasks(tasks);
      const courses = getDemoStudentCourses();
      const course_name = tasks[idx].student_course_id ? (courses.find((c) => c.id === tasks[idx].student_course_id) || {}).course_name : null;
      return Promise.resolve({ data: { ...tasks[idx], course_name } });
    }
    const modulePatchMatch = u.match(/\/courses\/(\d+)\/modules\/(\d+)$/);
    if (modulePatchMatch && body) {
      const [, cId, modId] = modulePatchMatch;
      const courseIdKey = String(cId);
      const moduleId = parseInt(modId, 10);
      const byCourse = getDemoModules();
      const list = Array.isArray(byCourse[courseIdKey]) ? [...byCourse[courseIdKey]] : [];
      const idx = list.findIndex((m) => Number(m.id) === moduleId);
      if (idx === -1) return Promise.reject({ response: { status: 404, data: { detail: 'Module not found' } } });
      list[idx] = {
        ...list[idx],
        title: body.title != null ? (String(body.title) || '').trim() || 'Unit' : list[idx].title,
        description: body.description !== undefined ? (body.description == null ? null : String(body.description)) : list[idx].description,
      };
      setDemoModules({ ...byCourse, [courseIdKey]: list });
      const row = list[idx];
      return Promise.resolve({ data: { ...row, items: row.items || [] } });
    }
    const moduleItemPatchMatch = u.match(/\/courses\/(\d+)\/modules\/(\d+)\/items\/(\d+)$/);
    if (moduleItemPatchMatch && body) {
      const [, cId, modId, itemId] = moduleItemPatchMatch;
      const courseIdKey = String(cId);
      const moduleId = parseInt(modId, 10);
      const itemIdNum = parseInt(itemId, 10);
      const byCourse = getDemoModules();
      const list = Array.isArray(byCourse[courseIdKey]) ? [...byCourse[courseIdKey]] : [];
      const modIdx = list.findIndex((m) => Number(m.id) === moduleId);
      if (modIdx === -1) return Promise.reject({ response: { status: 404, data: { detail: 'Module not found' } } });
      const items = Array.isArray(list[modIdx].items) ? [...list[modIdx].items] : [];
      const itemIdx = items.findIndex((i) => Number(i.id) === itemIdNum);
      if (itemIdx === -1) return Promise.reject({ response: { status: 404, data: { detail: 'Item not found' } } });
      items[itemIdx] = {
        ...items[itemIdx],
        type: (body.type === 'folder' || body.type === 'file') ? body.type : items[itemIdx].type,
        title: body.title != null ? (String(body.title) || '').trim() : items[itemIdx].title,
        url_or_content: body.url_or_content !== undefined ? (body.url_or_content == null ? null : String(body.url_or_content)) : items[itemIdx].url_or_content,
      };
      list[modIdx] = { ...list[modIdx], items };
      setDemoModules({ ...byCourse, [courseIdKey]: list });
      return Promise.resolve({ data: items[itemIdx] });
    }
    const gradePatchMatch = u.match(/\/grades\/(\d+)/);
    if (gradePatchMatch) {
      try {
        const gradeId = parseInt(gradePatchMatch[1], 10);
        const byCourse = getDemoGradeItems();
        let courseId = null;
        let foundIdx = -1;
        for (const cid of Object.keys(byCourse)) {
          const raw = byCourse[cid];
          const arr = Array.isArray(raw) ? raw : [];
          const idx = arr.findIndex((g) => g != null && Number(g.id) === gradeId);
          if (idx !== -1) {
            courseId = parseInt(cid, 10) || cid;
            foundIdx = idx;
            break;
          }
        }
        if (courseId == null || foundIdx === -1) {
          return Promise.reject({ response: { status: 404, data: { detail: 'Grade not found' } } });
        }
        const raw2 = byCourse[String(courseId)] ?? byCourse[courseId];
        const arr = Array.isArray(raw2) ? raw2 : [];
        const item = arr[foundIdx];
        if (item) {
          if (body?.item_type != null) item.item_type = body.item_type;
          if (body?.title != null) item.title = body.title;
          if (body?.score != null) item.score = Number(body.score);
          if (body?.max_score != null) item.max_score = Number(body.max_score);
          if (body?.weight != null) item.weight = Number(body.weight);
        }
        setDemoGradeItems(byCourse);
        const finalMark = computeDemoFinalMark(arr);
        const courses = getDemoStudentCourses();
        const updated = courses.map((c) => (Number(c.id) === Number(courseId) ? { ...c, current_grade: finalMark } : c));
        setDemoStudentCourses(updated);
        maybeFinalizeDemoCourses();
        return Promise.resolve({ data: item || arr[foundIdx] });
      } catch (err) {
        return Promise.reject({ response: { status: 500, data: { detail: err?.message || 'Update failed' } } });
      }
    }
    return Promise.resolve({ data: body || {} });
  };

  const mockDelete = (url) => {
    const u = typeof url === 'string' ? url : (url && url.url) || '';
    const catalogMatch = u.match(/\/catalog\/courses\/(\d+)$/);
    if (catalogMatch) {
      const id = parseInt(catalogMatch[1], 10);
      setDemoCatalog(getDemoCatalog().filter((c) => c.id !== id));
      return Promise.resolve({ data: {} });
    }
    const studentMatch = u.match(/\/student\/courses\/(\d+)$/);
    if (studentMatch) {
      const id = parseInt(studentMatch[1], 10);
      setDemoStudentCourses(getDemoStudentCourses().filter((c) => c.id !== id));
      return Promise.resolve({ data: {} });
    }
    const notesMatch = u.match(/\/notes\/(\d+)$/);
    if (notesMatch) {
      const id = parseInt(notesMatch[1], 10);
      setDemoNotes(getDemoNotes().filter((n) => n.id !== id));
      return Promise.resolve({ data: {} });
    }
    const plannerEventDelMatch = u.match(/\/planner\/events\/(\d+)$/);
    if (plannerEventDelMatch) {
      const id = parseInt(plannerEventDelMatch[1], 10);
      const events = getDemoPlannerEvents().filter((e) => Number(e.id) !== id);
      setDemoPlannerEvents(events);
      return Promise.resolve({ data: {} });
    }
    if (u.match(/\/ai\/conversations\/\d+$/)) {
      return Promise.resolve({ data: {} });
    }
    const plannerTaskDelMatch = u.match(/\/planner\/tasks\/(\d+)$/);
    if (plannerTaskDelMatch) {
      const id = parseInt(plannerTaskDelMatch[1], 10);
      const tasks = getDemoPlannerTasks().filter((t) => Number(t.id) !== id);
      setDemoPlannerTasks(tasks);
      return Promise.resolve({ data: {} });
    }
    const moduleDeleteMatch = u.match(/\/courses\/(\d+)\/modules\/(\d+)$/);
    if (moduleDeleteMatch) {
      const [, cId, modId] = moduleDeleteMatch;
      const courseIdKey = String(cId);
      const moduleId = parseInt(modId, 10);
      const byCourse = getDemoModules();
      const list = (Array.isArray(byCourse[courseIdKey]) ? byCourse[courseIdKey] : []).filter((m) => Number(m.id) !== moduleId);
      setDemoModules({ ...byCourse, [courseIdKey]: list });
      return Promise.resolve({ data: {} });
    }
    const moduleItemDeleteMatch = u.match(/\/courses\/(\d+)\/modules\/(\d+)\/items\/(\d+)$/);
    if (moduleItemDeleteMatch) {
      const [, cId, modId, itemId] = moduleItemDeleteMatch;
      const courseIdKey = String(cId);
      const moduleId = parseInt(modId, 10);
      const itemIdNum = parseInt(itemId, 10);
      const byCourse = getDemoModules();
      const list = Array.isArray(byCourse[courseIdKey]) ? [...byCourse[courseIdKey]] : [];
      const modIdx = list.findIndex((m) => Number(m.id) === moduleId);
      if (modIdx === -1) return Promise.reject({ response: { status: 404, data: { detail: 'Module not found' } } });
      const items = (Array.isArray(list[modIdx].items) ? list[modIdx].items : []).filter((i) => Number(i.id) !== itemIdNum);
      list[modIdx] = { ...list[modIdx], items };
      setDemoModules({ ...byCourse, [courseIdKey]: list });
      return Promise.resolve({ data: {} });
    }
    const gradeDeleteMatch = u.match(/\/grades\/(\d+)/);
    if (gradeDeleteMatch) {
      try {
        const gradeId = parseInt(gradeDeleteMatch[1], 10);
        const byCourse = getDemoGradeItems();
        let courseId = null;
        for (const cid of Object.keys(byCourse)) {
          const raw = byCourse[cid];
          const arr = Array.isArray(raw) ? raw : [];
          const items = arr.filter((g) => g != null && Number(g.id) !== gradeId);
          if (items.length !== arr.length) {
            courseId = parseInt(cid, 10) || cid;
            byCourse[cid] = items;
            break;
          }
        }
        if (courseId == null) {
          return Promise.reject({ response: { status: 404, data: { detail: 'Grade not found' } } });
        }
        setDemoGradeItems(byCourse);
        const rawRemaining = byCourse[courseId] ?? byCourse[String(courseId)];
        const remaining = Array.isArray(rawRemaining) ? rawRemaining : [];
        const finalMark = computeDemoFinalMark(remaining);
        const courses = getDemoStudentCourses();
        const updated = courses.map((c) => (Number(c.id) === Number(courseId) ? { ...c, current_grade: finalMark } : c));
        setDemoStudentCourses(updated);
        maybeFinalizeDemoCourses();
        return Promise.resolve({ data: {} });
      } catch (err) {
        return Promise.reject({ response: { status: 500, data: { detail: err?.message || 'Delete failed' } } });
      }
    }
    return Promise.resolve({ data: {} });
  };

  return {
    get: mockGet,
    post: mockPost,
    patch: mockPatch,
    put: (url, body) => Promise.resolve({ data: body || {} }),
    delete: mockDelete,
    defaults: { headers: { common: {} } },
  };
}

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => sessionStorage.getItem('unipilot_token'));
  const [loading, setLoading] = useState(true);

  const api = DEMO_MODE
    ? createMockApi()
    : axios.create({
        baseURL: `${API_URL}/api`,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

  useEffect(() => {
    if (DEMO_MODE) {
      if (token) {
        const stored = sessionStorage.getItem(DEMO_USER_KEY);
        setUser(stored ? JSON.parse(stored) : null);
      }
      setLoading(false);
      return;
    }
    if (token) {
      api.defaults.headers.Authorization = `Bearer ${token}`;
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    if (DEMO_MODE) {
      const isAdmin = /^admin@/i.test(email);
      const userData = {
        email,
        full_name: email.split('@')[0],
        role: isAdmin ? 'admin' : 'student',
      };
      sessionStorage.setItem('unipilot_token', 'demo');
      sessionStorage.setItem(DEMO_USER_KEY, JSON.stringify(userData));
      setToken('demo');
      setUser(userData);
      const usersList = getDemoUsersList();
      if (!usersList.some((u) => u.email === userData.email)) {
        usersList.push({ id: usersList.length + 1, email: userData.email, full_name: userData.full_name, role: userData.role });
        setDemoUsersList(usersList);
      }
      return userData;
    }
    const response = await api.post('/auth/login', { email, password });
    const { access_token, user: userData } = response.data;
    sessionStorage.setItem('unipilot_token', access_token);
    setToken(access_token);
    setUser(userData);
    return userData;
  };

  const register = async (email, password, fullName) => {
    if (DEMO_MODE) {
      const userData = { email, full_name: fullName || email.split('@')[0], role: 'student' };
      sessionStorage.setItem('unipilot_token', 'demo');
      sessionStorage.setItem(DEMO_USER_KEY, JSON.stringify(userData));
      setToken('demo');
      setUser(userData);
      const usersList = getDemoUsersList();
      if (!usersList.some((u) => u.email === userData.email)) {
        usersList.push({ id: usersList.length + 1, email: userData.email, full_name: userData.full_name, role: userData.role });
        setDemoUsersList(usersList);
      }
      return userData;
    }
    const response = await api.post('/auth/register', { email, password, full_name: fullName, role: 'student' });
    const { access_token, user: userData } = response.data;
    sessionStorage.setItem('unipilot_token', access_token);
    setToken(access_token);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    sessionStorage.removeItem('unipilot_token');
    if (DEMO_MODE) sessionStorage.removeItem(DEMO_USER_KEY);
    setToken(null);
    setUser(null);
  };

  const updateSettings = async (settings) => {
    if (DEMO_MODE) {
      const updated = { ...user, ...settings };
      setUser(updated);
      sessionStorage.setItem(DEMO_USER_KEY, JSON.stringify(updated));
      return updated;
    }
    const response = await api.patch('/auth/settings', settings);
    setUser(response.data);
    return response.data;
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateSettings, api, isAuthenticated: !!user, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
