import { Router } from 'express';
import { db } from '../db.js';
import { authMiddleware, requireAdmin } from '../middleware/auth.js';

export const adminRouter = Router();
adminRouter.use(authMiddleware);
adminRouter.use(requireAdmin);

adminRouter.get('/stats', (req, res) => {
  const total_users = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const total_students = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'student'").get().c;
  const total_courses = db.prepare('SELECT COUNT(*) as c FROM catalog_courses').get().c;
  const total_tasks = 0;
  return res.json({ total_users, total_students, total_courses, total_tasks });
});

adminRouter.get('/users', (req, res) => {
  const rows = db.prepare('SELECT id, email, full_name, role, created_at FROM users ORDER BY id').all();
  return res.json(rows);
});

adminRouter.patch('/users/:id/role', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const role = req.query.role;
  if (!role || !['admin', 'student'].includes(role)) {
    return res.status(400).json({ detail: 'role must be admin or student' });
  }
  const result = db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
  if (result.changes === 0) return res.status(404).json({ detail: 'User not found' });
  const user = db.prepare('SELECT id, email, full_name, role FROM users WHERE id = ?').get(id);
  return res.json(user);
});

adminRouter.delete('/users/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ detail: 'User not found' });
  return res.status(204).send();
});
