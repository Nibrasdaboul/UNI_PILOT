/**
 * Voice-to-Text API: sessions (history), summarize, clean transcript, upload audio.
 * Full AI support for listening, writing, summarization, noise removal.
 */
import { Router } from 'express';
import { db } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import * as groq from '../ai/groq.js';

export const voiceRouter = Router();

// GET /voice/sessions – list user's voice sessions (history)
voiceRouter.get('/sessions', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const rows = db.prepare(
    `SELECT id, title, transcript, notes, summary, source, created_at
     FROM voice_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 200`
  ).all(userId);
  res.json(rows.map((r) => ({
    id: r.id,
    title: r.title,
    transcript: r.transcript,
    notes: r.notes,
    summary: r.summary,
    source: r.source,
    created_at: r.created_at,
  })));
});

// GET /voice/sessions/:id – get one session
voiceRouter.get('/sessions/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = db.prepare(
    'SELECT id, title, transcript, notes, summary, source, created_at FROM voice_sessions WHERE id = ? AND user_id = ?'
  ).get(id, req.user.id);
  if (!row) return res.status(404).json({ detail: 'Session not found' });
  res.json(row);
});

// POST /voice/sessions – create session
voiceRouter.post('/sessions', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const b = req.body || {};
  const lang = b.lang === 'en' ? 'en' : 'ar';
  const title = (b.title || '').trim() || (lang === 'ar' ? 'تسجيل صوتي' : 'Voice session');
  const transcript = typeof b.transcript === 'string' ? b.transcript : '';
  const notes = typeof b.notes === 'string' ? b.notes : '';
  const summary = b.summary != null ? String(b.summary) : null;
  const source = b.source === 'upload' ? 'upload' : 'live';
  const r = db.prepare(
    'INSERT INTO voice_sessions (user_id, title, transcript, notes, summary, source) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(userId, title, transcript, notes, summary, source);
  const id = r.lastInsertRowid;
  const row = db.prepare('SELECT id, title, transcript, notes, summary, source, created_at FROM voice_sessions WHERE id = ?').get(id);
  res.status(201).json(row);
});

// PATCH /voice/sessions/:id
voiceRouter.patch('/sessions/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = db.prepare('SELECT id FROM voice_sessions WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!row) return res.status(404).json({ detail: 'Session not found' });
  const b = req.body || {};
  if (b.title !== undefined) db.prepare('UPDATE voice_sessions SET title = ? WHERE id = ?').run((b.title || '').trim() || 'Voice session', id);
  if (b.transcript !== undefined) db.prepare('UPDATE voice_sessions SET transcript = ? WHERE id = ?').run(String(b.transcript), id);
  if (b.notes !== undefined) db.prepare('UPDATE voice_sessions SET notes = ? WHERE id = ?').run(String(b.notes), id);
  if (b.summary !== undefined) db.prepare('UPDATE voice_sessions SET summary = ? WHERE id = ?').run(b.summary == null ? null : String(b.summary), id);
  const updated = db.prepare('SELECT id, title, transcript, notes, summary, source, created_at FROM voice_sessions WHERE id = ?').get(id);
  res.json(updated);
});

// DELETE /voice/sessions/:id
voiceRouter.delete('/sessions/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = db.prepare('SELECT id FROM voice_sessions WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!row) return res.status(404).json({ detail: 'Session not found' });
  db.prepare('DELETE FROM voice_sessions WHERE id = ?').run(id);
  res.status(204).send();
});

// POST /voice/summarize – AI summarize transcript
voiceRouter.post('/summarize', authMiddleware, async (req, res) => {
  try {
    if (!groq.isConfigured()) return res.status(503).json({ detail: 'AI not configured' });
    const text = (req.body?.text || '').trim();
    if (!text) return res.status(400).json({ detail: 'text required' });
    const lang = req.body?.lang === 'en' ? 'en' : 'ar';
    const summary = await groq.summarize(text, lang);
    res.json({ summary: summary || '' });
  } catch (e) {
    console.error('Voice summarize error:', e);
    res.status(500).json({ detail: e.message || 'Summarize failed' });
  }
});

// POST /voice/clean – AI clean transcript (remove repetition, fix noise)
voiceRouter.post('/clean', authMiddleware, async (req, res) => {
  try {
    if (!groq.isConfigured()) return res.status(503).json({ detail: 'AI not configured' });
    const text = (req.body?.text || '').trim();
    const lang = req.body?.lang === 'en' ? 'en' : 'ar';
    const cleaned = await groq.cleanTranscript(text || '', lang);
    res.json({ cleaned });
  } catch (e) {
    console.error('Voice clean error:', e);
    res.status(500).json({ detail: e.message || 'Clean failed' });
  }
});

// POST /voice/upload-audio – transcribe audio file (base64) via Groq Whisper; optional summarize
voiceRouter.post('/upload-audio', authMiddleware, async (req, res) => {
  const fs = await import('fs');
  const path = await import('path');
  const os = await import('os');
  try {
    const b64 = req.body?.file_base64;
    const filename = (req.body?.filename || 'audio').trim();
    const wantSummary = !!req.body?.summarize;
    if (!b64 || typeof b64 !== 'string') {
      return res.status(400).json({ detail: 'file_base64 required' });
    }
    if (!groq.isConfigured()) {
      return res.status(503).json({
        detail: 'Audio transcription requires GROQ_API_KEY. Set it in .env (see AI_SETUP.md), or use live recording.',
        transcript: '',
      });
    }
    const buf = Buffer.from(b64, 'base64');
    const ext = filename.split('.').pop()?.toLowerCase() || 'mp3';
    const suffix = ext === 'mp3' ? '.mp3' : ext === 'wav' ? '.wav' : ext === 'm4a' ? '.m4a' : '.mp3';
    const tmpPath = path.join(os.tmpdir(), `voice-${Date.now()}${suffix}`);
    fs.writeFileSync(tmpPath, buf);
    let transcript = '';
    try {
      const stream = fs.createReadStream(tmpPath);
      const lang = req.body?.lang === 'en' ? 'en' : req.body?.lang === 'ar' ? 'ar' : undefined;
      transcript = await groq.transcribeAudio(stream, { language: lang });
    } finally {
      try { fs.unlinkSync(tmpPath); } catch (_) {}
    }
    if (!transcript) {
      return res.status(500).json({ detail: 'Transcription returned empty', transcript: '' });
    }
    let summary = null;
    if (wantSummary && transcript) {
      const lang = req.body?.lang === 'en' ? 'en' : 'ar';
      summary = await groq.summarize(transcript, lang);
    }
    res.json({ transcript, summary });
  } catch (e) {
    console.error('Voice upload-audio error:', e);
    res.status(500).json({ detail: e.message || 'Upload/transcribe failed' });
  }
});
