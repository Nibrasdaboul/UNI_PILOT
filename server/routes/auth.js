import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { authMiddleware, signToken } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.post('/register', (req, res) => {
  const { email, password, full_name } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ detail: 'Email and password required' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(400).json({ detail: 'Email already registered' });
  }
  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)'
  ).run(email, hash, full_name || email.split('@')[0], 'student');
  const user = db.prepare('SELECT id, email, full_name, role FROM users WHERE id = ?').get(result.lastInsertRowid);
  const access_token = signToken(user.id);
  return res.status(201).json({ access_token, user });
});

authRouter.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ detail: 'Email and password required' });
  }
  const row = db.prepare('SELECT id, email, full_name, role, password_hash FROM users WHERE email = ?').get(email);
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    return res.status(401).json({ detail: 'Invalid email or password' });
  }
  const user = { id: row.id, email: row.email, full_name: row.full_name, role: row.role };
  const access_token = signToken(row.id);
  return res.json({ access_token, user });
});

authRouter.get('/me', authMiddleware, (req, res) => {
  return res.json(req.user);
});
