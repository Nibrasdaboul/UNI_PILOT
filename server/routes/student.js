import { Router } from 'express';
import { db } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

export const studentRouter = Router();
studentRouter.use(authMiddleware);

studentRouter.get('/courses', (req, res) => {
  const rows = db.prepare(`
    SELECT id, user_id, catalog_course_id, course_name, course_code, credit_hours, semester, difficulty, target_grade, professor_name, description, current_grade, progress, finalized_at, passed, created_at
    FROM student_courses WHERE user_id = ?
  `).all(req.user.id);
  return res.json(rows);
});

studentRouter.get('/courses/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = db.prepare(`
    SELECT id, user_id, catalog_course_id, course_name, course_code, credit_hours, semester, difficulty, target_grade, professor_name, description, current_grade, progress, finalized_at, passed, created_at
    FROM student_courses WHERE id = ? AND user_id = ?
  `).get(id, req.user.id);
  if (!row) return res.status(404).json({ detail: 'Course not found' });
  return res.json(row);
});

studentRouter.post('/courses', (req, res) => {
  const body = req.body || {};
  const catalog_course_id = body.catalog_course_id != null ? parseInt(body.catalog_course_id, 10) : null;
  const course_name = body.course_name || body.course_code || 'Course';
  const course_code = body.course_code || '';
  const credit_hours = body.credit_hours ?? 3;
  const semester = body.semester || 'Spring 2026';
  const difficulty = body.difficulty ?? 5;
  const target_grade = body.target_grade ?? 85;
  const professor_name = body.professor_name || '';
  const description = body.description || '';

  if (catalog_course_id) {
    const already = db.prepare('SELECT id FROM student_courses WHERE user_id = ? AND catalog_course_id = ?')
      .get(req.user.id, catalog_course_id);
    if (already) {
      return res.status(400).json({ detail: 'Already enrolled in this course' });
    }
    const catalog = db.prepare('SELECT id, prerequisite_id FROM catalog_courses WHERE id = ?').get(catalog_course_id);
    if (!catalog) {
      return res.status(400).json({ detail: 'Catalog course not found' });
    }
    const prereqId = catalog.prerequisite_id != null ? parseInt(catalog.prerequisite_id, 10) : null;
    if (prereqId != null) {
      const prereqCourse = db.prepare(
        'SELECT id, finalized_at FROM student_courses WHERE user_id = ? AND catalog_course_id = ?'
      ).get(req.user.id, prereqId);
      if (!prereqCourse || prereqCourse.finalized_at == null) {
        return res.status(400).json({
          detail: 'Complete the prerequisite course first: mark it as finished and enter all grades, then you can enroll in this course.',
        });
      }
    }
  }

  const result = db.prepare(`
    INSERT INTO student_courses (user_id, catalog_course_id, course_name, course_code, credit_hours, semester, difficulty, target_grade, professor_name, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.user.id, catalog_course_id, course_name, course_code, credit_hours, semester, difficulty, target_grade, professor_name, description);
  const studentCourseId = result.lastInsertRowid;
  const row = db.prepare('SELECT * FROM student_courses WHERE id = ?').get(studentCourseId);
  return res.status(201).json(row);
});

studentRouter.delete('/courses/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const result = db.prepare('DELETE FROM student_courses WHERE id = ? AND user_id = ?').run(id, req.user.id);
  if (result.changes === 0) return res.status(404).json({ detail: 'Course not found' });
  return res.status(204).send();
});
