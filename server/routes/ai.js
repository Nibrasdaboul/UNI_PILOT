import { Router } from 'express';
import { db } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { getGradeStatus } from '../lib/gradeUtils.js';
import * as groq from '../ai/groq.js';

export const aiRouter = Router();

function buildCoachContext(userId) {
  const user = db.prepare('SELECT full_name FROM users WHERE id = ?').get(userId);
  const courses = db.prepare(`
    SELECT course_name, course_code, current_grade, credit_hours, target_grade FROM student_courses WHERE user_id = ?
  `).all(userId);
  const record = db.prepare('SELECT cgpa, total_credits_completed FROM student_academic_record WHERE user_id = ?').get(userId);
  const tasks = db.prepare(`
    SELECT title, due_date FROM planner_tasks WHERE user_id = ? AND completed = 0 AND due_date >= date('now') ORDER BY due_date LIMIT 5
  `).all(userId);
  const name = user?.full_name || 'Student';
  let context = `You are UniPilot AI Coach, an expert academic assistant. The student's name is ${name}.

RULES FOR YOUR ANSWERS:
- Address EVERY part of the student's question or request. Do not skip or summarize away important points.
- Be direct and clear. Give a complete answer first, then add details or examples if useful.
- Use the same language the student uses (Arabic or English). If they write in Arabic, respond fully in Arabic.
- When explaining: structure with short paragraphs or bullet points so the answer is easy to follow.
- For study plans or strategies: give concrete, step-by-step advice the student can apply immediately.
- If the question is ambiguous, answer the most likely meaning and briefly mention other interpretations if relevant.`;
  if (courses.length) {
    context += `\nTheir courses: ${courses.map((c) => `${c.course_name} (${c.course_code})${c.current_grade != null ? ', grade: ' + c.current_grade + '%' : ''}${c.target_grade != null ? ', target: ' + c.target_grade + '%' : ''}`).join('; ')}.`;
  }
  if (record) {
    context += `\nCGPA: ${Number(record.cgpa || 0).toFixed(2)}; credits completed: ${record.total_credits_completed || 0}.`;
  }
  if (tasks.length) {
    context += `\nUpcoming tasks: ${tasks.map((t) => t.title + ' (' + t.due_date + ')').join('; ')}.`;
  }
  context += '\nAlways respond in a helpful, complete way that fully satisfies what the student asked.';
  return context;
}

// GET /api/ai/conversations – list coach conversation history
aiRouter.get('/conversations', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const rows = db.prepare(`
    SELECT id, title, created_at, updated_at
    FROM ai_chat_sessions
    WHERE user_id = ?
    ORDER BY COALESCE(updated_at, created_at) DESC
  `).all(userId);
  const list = rows.map((r) => ({
    id: r.id,
    title: r.title || (r.created_at ? new Date(r.created_at).toLocaleDateString() : 'Chat'),
    created_at: r.created_at,
    updated_at: r.updated_at || r.created_at,
  }));
  res.json(list);
});

// GET /api/ai/conversations/:id – get one conversation with messages
aiRouter.get('/conversations/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const session = db.prepare('SELECT id, title, created_at, updated_at FROM ai_chat_sessions WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!session) return res.status(404).json({ detail: 'Not found' });
  const msgs = db.prepare('SELECT id, role, content, created_at FROM ai_chat_messages WHERE session_id = ? ORDER BY id ASC').all(id);
  const messages = msgs.map((m) => ({ id: m.id, role: m.role, content: m.content }));
  res.json({ id: session.id, title: session.title, created_at: session.created_at, updated_at: session.updated_at, messages });
});

// POST /api/ai/conversations – create new conversation (optional title and initial messages)
aiRouter.post('/conversations', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const title = (req.body?.title || '').trim().slice(0, 200) || null;
  const now = new Date().toISOString();
  const r = db.prepare('INSERT INTO ai_chat_sessions (user_id, title, updated_at) VALUES (?, ?, ?)').run(userId, title, now);
  const sessionId = r.lastInsertRowid;
  res.status(201).json({ id: sessionId, title, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), messages: [] });
});

// PATCH /api/ai/conversations/:id – update title and/or append messages
aiRouter.patch('/conversations/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const existing = db.prepare('SELECT id FROM ai_chat_sessions WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!existing) return res.status(404).json({ detail: 'Not found' });
  const b = req.body || {};
  if (b.title !== undefined) {
    const title = (b.title || '').trim().slice(0, 200) || null;
    db.prepare('UPDATE ai_chat_sessions SET title = ?, updated_at = datetime("now") WHERE id = ?').run(title, id);
  }
  if (Array.isArray(b.messages) && b.messages.length > 0) {
    const insert = db.prepare('INSERT INTO ai_chat_messages (session_id, role, content) VALUES (?, ?, ?)');
    for (const m of b.messages) {
      const role = m.role === 'user' ? 'user' : 'assistant';
      const content = (m.content || '').trim();
      if (content) insert.run(id, role, content);
    }
    db.prepare('UPDATE ai_chat_sessions SET updated_at = datetime("now") WHERE id = ?').run(id);
  }
  const updated = db.prepare('SELECT id, title, created_at, updated_at FROM ai_chat_sessions WHERE id = ?').get(id);
  const msgs = db.prepare('SELECT id, role, content FROM ai_chat_messages WHERE session_id = ? ORDER BY id ASC').all(id);
  res.json({ id: updated.id, title: updated.title, created_at: updated.created_at, updated_at: updated.updated_at, messages: msgs.map((m) => ({ id: m.id, role: m.role, content: m.content })) });
});

// DELETE /api/ai/conversations/:id
aiRouter.delete('/conversations/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const r = db.prepare('DELETE FROM ai_chat_sessions WHERE id = ? AND user_id = ?').run(id, req.user.id);
  if (r.changes === 0) return res.status(404).json({ detail: 'Not found' });
  res.status(204).send();
});

// POST /api/ai/chat – global AI coach chat (optional conversation_id to append to history)
aiRouter.post('/chat', authMiddleware, async (req, res) => {
  try {
    if (!groq.isConfigured()) {
      return res.status(503).json({ detail: 'AI is not configured. Set GROQ_API_KEY in .env' });
    }
    const userId = req.user.id;
    const { messages, conversation_id } = req.body || {};
    const list = Array.isArray(messages) && messages.length ? messages : [];
    const lastUser = list.filter((m) => m.role === 'user').pop();
    if (!lastUser?.content?.trim()) {
      return res.status(400).json({ detail: 'messages with at least one user message required' });
    }
    const systemContext = buildCoachContext(userId);
    const reply = await groq.chat(list, systemContext);
    const out = { content: reply };
    if (conversation_id != null) {
      const cid = parseInt(conversation_id, 10);
      const session = db.prepare('SELECT id FROM ai_chat_sessions WHERE id = ? AND user_id = ?').get(cid, userId);
      if (session) {
        db.prepare('INSERT INTO ai_chat_messages (session_id, role, content) VALUES (?, ?, ?)').run(cid, 'user', lastUser.content.trim());
        db.prepare('INSERT INTO ai_chat_messages (session_id, role, content) VALUES (?, ?, ?)').run(cid, 'assistant', reply);
        const firstTitle = db.prepare('SELECT title FROM ai_chat_sessions WHERE id = ?').get(cid);
        if (!firstTitle?.title) {
          const title = lastUser.content.trim().slice(0, 80);
          db.prepare('UPDATE ai_chat_sessions SET title = ?, updated_at = datetime("now") WHERE id = ?').run(title, cid);
        } else {
          db.prepare('UPDATE ai_chat_sessions SET updated_at = datetime("now") WHERE id = ?').run(cid);
        }
        out.conversation_id = cid;
      }
    }
    res.json(out);
  } catch (e) {
    console.error('AI chat error:', e);
    res.status(500).json({ detail: e.message || 'AI request failed' });
  }
});

// POST /api/ai/course_chat – course-specific chat
aiRouter.post('/course_chat', authMiddleware, async (req, res) => {
  try {
    if (!groq.isConfigured()) {
      return res.status(503).json({ detail: 'AI is not configured. Set GROQ_API_KEY in .env' });
    }
    const userId = req.user.id;
    const courseId = parseInt(req.body?.course_id, 10);
    const content = (req.body?.content || '').trim();
    if (!content || !Number.isFinite(courseId)) {
      return res.status(400).json({ detail: 'course_id and content required' });
    }
    const course = db.prepare('SELECT id, course_name, course_code, description FROM student_courses WHERE id = ? AND user_id = ?').get(courseId, userId);
    if (!course) return res.status(404).json({ detail: 'Course not found' });
    const systemContext = `You are UniPilot AI Coach helping with the course "${course.course_name}" (${course.course_code}). ${course.description ? 'Course description: ' + course.description.slice(0, 500) : ''} Answer only about this course and study advice. Use the same language as the student (Arabic or English).`;
    const reply = await groq.chat([{ role: 'user', content }], systemContext);
    res.json({ content: reply });
  } catch (e) {
    console.error('AI course_chat error:', e);
    res.status(500).json({ detail: e.message || 'AI request failed' });
  }
});

// POST /api/ai/summarize
aiRouter.post('/summarize', authMiddleware, async (req, res) => {
  try {
    if (!groq.isConfigured()) {
      return res.status(503).json({ detail: 'AI is not configured. Set GROQ_API_KEY in .env' });
    }
    const text = (req.body?.text || '').trim();
    const lang = req.body?.lang === 'ar' ? 'ar' : 'en';
    if (!text) return res.status(400).json({ detail: 'text required' });
    const summary = await groq.summarize(text, lang);
    res.json({ summary: summary || '' });
  } catch (e) {
    console.error('AI summarize error:', e);
    res.status(500).json({ detail: e.message || 'AI request failed' });
  }
});

// POST /api/ai/generate_flashcards
aiRouter.post('/generate_flashcards', authMiddleware, async (req, res) => {
  try {
    if (!groq.isConfigured()) {
      return res.status(503).json({ detail: 'AI is not configured. Set GROQ_API_KEY in .env' });
    }
    const text = (req.body?.text || '').trim();
    const count = Math.min(20, Math.max(1, parseInt(req.body?.count, 10) || 5));
    const lang = req.body?.lang === 'ar' ? 'ar' : 'en';
    if (!text) return res.status(400).json({ detail: 'text required' });
    const flashcards = await groq.generateFlashcards(text, count, lang);
    res.json({ flashcards });
  } catch (e) {
    console.error('AI flashcards error:', e);
    res.status(500).json({ detail: e.message || 'AI request failed' });
  }
});

// POST /api/ai/generate_quiz
aiRouter.post('/generate_quiz', authMiddleware, async (req, res) => {
  try {
    if (!groq.isConfigured()) {
      return res.status(503).json({ detail: 'AI is not configured. Set GROQ_API_KEY in .env' });
    }
    const text = (req.body?.text || '').trim();
    const count = Math.min(10, Math.max(1, parseInt(req.body?.count, 10) || 3));
    const lang = req.body?.lang === 'ar' ? 'ar' : 'en';
    if (!text) return res.status(400).json({ detail: 'text required' });
    const quiz = await groq.generateQuiz(text, count, lang);
    res.json({ quiz });
  } catch (e) {
    console.error('AI quiz error:', e);
    res.status(500).json({ detail: e.message || 'AI request failed' });
  }
});

