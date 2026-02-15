import { Router } from 'express';
import { db } from '../db.js';
import { authMiddleware, requireAdmin } from '../middleware/auth.js';

export const catalogRouter = Router();

catalogRouter.get('/courses', (req, res) => {
  const rows = db.prepare(`
    SELECT id, course_code, course_name, department, description, credit_hours, "order", prerequisite_id, created_at
    FROM catalog_courses ORDER BY "order" ASC, id ASC
  `).all();
  return res.json(rows);
});

catalogRouter.get('/courses/:id', (req, res) => {
  const row = db.prepare(`
    SELECT id, course_code, course_name, department, description, credit_hours, "order", prerequisite_id, created_at
    FROM catalog_courses WHERE id = ?
  `).get(parseInt(req.params.id, 10));
  if (!row) return res.status(404).json({ detail: 'Course not found' });
  return res.json(row);
});

catalogRouter.post('/courses', authMiddleware, requireAdmin, (req, res) => {
  const b = req.body || {};
  const course_code = b.course_code;
  const course_name = b.course_name;
  const department = b.department;
  const description = b.description ?? null;
  const credit_hours = b.credit_hours ?? 3;
  const order = b.order ?? 999;
  const prerequisite_id = b.prerequisite_id ? parseInt(b.prerequisite_id, 10) : null;
  if (!course_code || !course_name || !department) {
    return res.status(400).json({ detail: 'course_code, course_name, department required' });
  }
  const result = db.prepare(`
    INSERT INTO catalog_courses (course_code, course_name, department, description, credit_hours, "order", prerequisite_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(course_code, course_name, department, description, credit_hours, order, prerequisite_id);
  const row = db.prepare('SELECT * FROM catalog_courses WHERE id = ?').get(result.lastInsertRowid);
  return res.status(201).json(row);
});

catalogRouter.patch('/courses/:id', authMiddleware, requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const b = req.body || {};
  const existing = db.prepare('SELECT id FROM catalog_courses WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ detail: 'Course not found' });
  const row = db.prepare('SELECT * FROM catalog_courses WHERE id = ?').get(id);
  const course_code = b.course_code !== undefined ? b.course_code : row.course_code;
  const course_name = b.course_name !== undefined ? b.course_name : row.course_name;
  const department = b.department !== undefined ? b.department : row.department;
  const description = b.description !== undefined ? b.description : row.description;
  const credit_hours = b.credit_hours !== undefined ? b.credit_hours : row.credit_hours;
  const order = b.order !== undefined ? b.order : row.order;
  const prerequisite_id = b.prerequisite_id !== undefined ? (b.prerequisite_id ? parseInt(b.prerequisite_id, 10) : null) : row.prerequisite_id;
  db.prepare(`
    UPDATE catalog_courses SET course_code=?, course_name=?, department=?, description=?, credit_hours=?, "order"=?, prerequisite_id=? WHERE id=?
  `).run(course_code, course_name, department, description, credit_hours, order, prerequisite_id, id);
  const updated = db.prepare('SELECT * FROM catalog_courses WHERE id = ?').get(id);
  return res.json(updated);
});

catalogRouter.delete('/courses/:id', authMiddleware, requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const result = db.prepare('DELETE FROM catalog_courses WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ detail: 'Course not found' });
  return res.status(204).send();
});
