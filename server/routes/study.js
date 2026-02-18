/**
 * Study Tools API: upload, summarize, flashcards, quiz, mind map.
 * All persisted to DB. AI via groq.
 */
import { Router } from 'express';
import { db } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import * as groq from '../ai/groq.js';

export const studyRouter = Router();

function getTextFromBody(req, res) {
  const userId = req.user.id;
  const text = (req.body?.text || '').trim();
  const documentId = req.body?.document_id != null ? parseInt(req.body.document_id, 10) : null;
  if (text) return Promise.resolve(text);
  if (documentId) {
    const doc = db.prepare('SELECT extracted_text FROM study_documents WHERE id = ? AND user_id = ?').get(documentId, userId);
    if (!doc) {
      res.status(404).json({ detail: 'Document not found' });
      return null;
    }
    return Promise.resolve((doc.extracted_text || '').trim());
  }
  res.status(400).json({ detail: 'text or document_id required' });
  return null;
}

// POST /study/upload – upload file as base64, extract text (txt), save document
studyRouter.post('/upload', authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;
    const b64 = req.body?.file_base64;
    const filename = (req.body?.filename || 'file.txt').trim();
    if (!b64 || typeof b64 !== 'string') {
      return res.status(400).json({ detail: 'file_base64 required' });
    }
    let extracted = '';
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (ext === 'txt' || ext === 'text' || !ext) {
      try {
        const buf = Buffer.from(b64, 'base64');
        extracted = buf.toString('utf-8');
      } catch {
        extracted = '';
      }
    }
    const r = db.prepare(
      'INSERT INTO study_documents (user_id, filename, file_type, extracted_text) VALUES (?, ?, ?, ?)'
    ).run(userId, filename, ext || 'txt', extracted);
    const id = r.lastInsertRowid;
    res.status(201).json({ document_id: id, text: extracted, filename });
  } catch (e) {
    console.error('Study upload error:', e);
    res.status(500).json({ detail: e.message || 'Upload failed' });
  }
});

// GET /study/documents?search=
studyRouter.get('/documents', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const search = (req.query.search || '').trim().toLowerCase();
  let rows = db.prepare('SELECT id, filename, file_type, created_at FROM study_documents WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  if (search) {
    rows = rows.filter((r) => (r.filename || '').toLowerCase().includes(search));
  }
  res.json(rows);
});

// POST /study/summarize – AI summarize, save, return
studyRouter.post('/summarize', authMiddleware, async (req, res) => {
  try {
    const text = await getTextFromBody(req, res);
    if (text == null) return;
    if (!groq.isConfigured()) return res.status(503).json({ detail: 'AI not configured' });
    const lang = req.body?.lang === 'ar' ? 'ar' : 'en';
    const summary = await groq.summarize(text, lang);
    const userId = req.user.id;
    const title = (summary || '').slice(0, 200);
    db.prepare(
      'INSERT INTO study_summaries (user_id, source_type, title, content, lang) VALUES (?, ?, ?, ?, ?)'
    ).run(userId, 'text', title, summary || '', lang);
    const id = db.prepare('SELECT last_insert_rowid() as id').get().id;
    res.status(201).json({ id, summary: summary || '' });
  } catch (e) {
    console.error('Study summarize error:', e);
    res.status(500).json({ detail: e.message || 'Summarize failed' });
  }
});

// GET /study/summaries?search=
studyRouter.get('/summaries', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const search = (req.query.search || '').trim().toLowerCase();
  let rows = db.prepare('SELECT id, title, content, lang, created_at FROM study_summaries WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  if (search) {
    rows = rows.filter((r) => (r.title || '').toLowerCase().includes(search) || (r.content || '').toLowerCase().includes(search));
  }
  res.json(rows.map((r) => ({ id: r.id, title: r.title, content: r.content, lang: r.lang, created_at: r.created_at })));
});

// GET /study/summaries/:id
studyRouter.get('/summaries/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = db.prepare('SELECT id, title, content, lang, created_at FROM study_summaries WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!row) return res.status(404).json({ detail: 'Not found' });
  res.json(row);
});

// POST /study/flashcards – AI generate, save set + cards, return
studyRouter.post('/flashcards', authMiddleware, async (req, res) => {
  try {
    const text = await getTextFromBody(req, res);
    if (text == null) return;
    if (!groq.isConfigured()) return res.status(503).json({ detail: 'AI not configured' });
    const lang = req.body?.lang === 'ar' ? 'ar' : 'en';
    const count = Math.min(50, Math.max(1, parseInt(req.body?.count, 10) || 10));
    const cards = await groq.generateFlashcards(text, count, lang);
    const userId = req.user.id;
    db.prepare('INSERT INTO study_flashcard_sets (user_id, source_type, title, lang) VALUES (?, ?, ?, ?)').run(userId, 'text', (text.slice(0, 100) || 'Flashcards'), lang);
    const setId = db.prepare('SELECT last_insert_rowid() as id').get().id;
    const insert = db.prepare('INSERT INTO study_flashcards (set_id, front, back, sort_order) VALUES (?, ?, ?, ?)');
    cards.forEach((c, i) => {
      insert.run(setId, c.front || '', c.back || '', i);
    });
    const list = db.prepare('SELECT id, front, back, sort_order FROM study_flashcards WHERE set_id = ? ORDER BY sort_order').all(setId);
    res.status(201).json({ set_id: setId, flashcards: list.map((c) => ({ id: c.id, front: c.front, back: c.back })) });
  } catch (e) {
    console.error('Study flashcards error:', e);
    res.status(500).json({ detail: e.message || 'Flashcards failed' });
  }
});

// GET /study/flashcards/sets?search=
studyRouter.get('/flashcards/sets', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const search = (req.query.search || '').trim().toLowerCase();
  let rows = db.prepare('SELECT id, title, lang, created_at FROM study_flashcard_sets WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  if (search) {
    rows = rows.filter((r) => (r.title || '').toLowerCase().includes(search));
  }
  res.json(rows);
});

// GET /study/flashcards/sets/:id
studyRouter.get('/flashcards/sets/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const set = db.prepare('SELECT id, title, lang, created_at FROM study_flashcard_sets WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!set) return res.status(404).json({ detail: 'Not found' });
  const cards = db.prepare('SELECT id, front, back, sort_order FROM study_flashcards WHERE set_id = ? ORDER BY sort_order').all(id);
  res.json({ ...set, flashcards: cards });
});

// POST /study/quiz – AI generate with options, save, return
studyRouter.post('/quiz', authMiddleware, async (req, res) => {
  try {
    const text = await getTextFromBody(req, res);
    if (text == null) return;
    if (!groq.isConfigured()) return res.status(503).json({ detail: 'AI not configured' });
    const lang = req.body?.lang === 'ar' ? 'ar' : 'en';
    const count = Math.min(50, Math.max(1, parseInt(req.body?.count, 10) || 10));
    const difficulty = ['very_hard', 'hard', 'medium', 'easy'].includes(req.body?.difficulty) ? req.body.difficulty : 'medium';
    const questionType = ['multiple_choice', 'true_false', 'fill_blank', 'short_answer'].includes(req.body?.question_type) ? req.body.question_type : 'multiple_choice';
    const sourceScope = req.body?.source_scope === 'beyond' ? 'beyond' : 'within';
    const questions = await groq.generateQuizAdvanced(text, count, difficulty, questionType, sourceScope, lang);
    const userId = req.user.id;
    const questionsJson = JSON.stringify(questions);
    db.prepare(
      'INSERT INTO study_quizzes (user_id, source_type, title, difficulty, question_type, question_count, source_scope, lang, questions_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(userId, 'text', (text.slice(0, 150) || 'Quiz'), difficulty, questionType, questions.length, sourceScope, lang, questionsJson);
    const id = db.prepare('SELECT last_insert_rowid() as id').get().id;
    res.status(201).json({ id, quiz: questions, difficulty, question_type: questionType, source_scope: sourceScope });
  } catch (e) {
    console.error('Study quiz error:', e);
    res.status(500).json({ detail: e.message || 'Quiz failed' });
  }
});

// GET /study/quizzes?search=
studyRouter.get('/quizzes', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const search = (req.query.search || '').trim().toLowerCase();
  let rows = db.prepare('SELECT id, title, difficulty, question_type, question_count, source_scope, lang, created_at FROM study_quizzes WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  if (search) {
    rows = rows.filter((r) => (r.title || '').toLowerCase().includes(search));
  }
  res.json(rows);
});

// GET /study/quizzes/:id
studyRouter.get('/quizzes/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = db.prepare('SELECT id, title, difficulty, question_type, question_count, source_scope, lang, questions_json, created_at FROM study_quizzes WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!row) return res.status(404).json({ detail: 'Not found' });
  const questions = JSON.parse(row.questions_json || '[]');
  res.json({ id: row.id, title: row.title, difficulty: row.difficulty, question_type: row.question_type, source_scope: row.source_scope, lang: row.lang, questions, created_at: row.created_at });
});

// POST /study/quizzes/:id/submit – score + AI feedback, save attempt, create exam_insight note + optional planner task
studyRouter.post('/quizzes/:id/submit', authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const userId = req.user.id;
    const quiz = db.prepare('SELECT id, title, questions_json, question_count FROM study_quizzes WHERE id = ? AND user_id = ?').get(id, userId);
    if (!quiz) return res.status(404).json({ detail: 'Not found' });
    const questions = JSON.parse(quiz.questions_json || '[]');
    const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];
    let score = 0;
    const results = questions.map((q, i) => {
      const userIdx = answers[i] != null ? parseInt(answers[i], 10) : -1;
      const correct = userIdx === q.correct_index;
      if (correct) score += 1;
      return { question: q.question, user_answer_index: userIdx, correct_index: q.correct_index, correct, explanation: q.explanation || '' };
    });
    const max = questions.length;
    let feedbackText = '';
    if (groq.isConfigured()) {
      try {
        const lang = req.body?.lang === 'ar' ? 'ar' : 'en';
        const prompt = lang === 'ar'
          ? `الطالب حصل على ${score}/${max} في اختبار. اعطِ رأياً مختصراً (2-3 جمل) لتشجيعه وتحديد نقاط التحسين.`
          : `The student scored ${score}/${max} on a quiz. Give a short 2-3 sentence feedback to encourage and suggest improvement.`;
        feedbackText = await groq.chat([{ role: 'user', content: prompt }], 'You are UniPilot study coach. Reply only with the feedback.');
      } catch (_) {}
    }
    db.prepare(
      'INSERT INTO study_quiz_attempts (user_id, quiz_id, answers_json, score_real, score_max, feedback_text) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(userId, id, JSON.stringify(answers), score, max, feedbackText);

    if (groq.isConfigured() && results.length > 0) {
      try {
        const lang = req.body?.lang === 'ar' ? 'ar' : 'en';
        const { content: insightContent, suggestedTopic } = await groq.generateExamInsight(
          quiz.title || 'اختبار',
          questions,
          results,
          lang
        );
        const noteCategory = 'exam_insight';
        const refType = 'quiz';
        db.prepare(
          `INSERT INTO notes (user_id, student_course_id, content, type, note_category, ref_id, ref_type) VALUES (?, NULL, ?, 'app', ?, ?, ?)`
        ).run(userId, insightContent || '', noteCategory, id, refType);
        if (suggestedTopic && suggestedTopic.length > 0) {
          const due = new Date();
          due.setDate(due.getDate() + 3);
          const dueStr = due.toISOString().slice(0, 10);
          const taskTitle = lang === 'ar' ? `مراجعة: ${suggestedTopic}` : `Review: ${suggestedTopic}`;
          try {
            db.prepare(
              `INSERT INTO planner_tasks (user_id, student_course_id, title, due_date, priority, source) VALUES (?, NULL, ?, ?, 2, 'app')`
            ).run(userId, taskTitle, dueStr);
          } catch (_) {}
        }
      } catch (err) {
        console.warn('Exam insight note failed:', err?.message);
      }
    }

    res.json({ score, max, feedback: feedbackText, results });
  } catch (e) {
    console.error('Study quiz submit error:', e);
    res.status(500).json({ detail: e.message || 'Submit failed' });
  }
});

// POST /study/mindmap – AI mind map, save, return
studyRouter.post('/mindmap', authMiddleware, async (req, res) => {
  try {
    const text = await getTextFromBody(req, res);
    if (text == null) return;
    if (!groq.isConfigured()) return res.status(503).json({ detail: 'AI not configured' });
    const lang = req.body?.lang === 'ar' ? 'ar' : 'en';
    const mindMap = await groq.generateMindMap(text, lang);
    const userId = req.user.id;
    const contentJson = JSON.stringify(mindMap);
    db.prepare(
      'INSERT INTO study_mind_maps (user_id, source_type, title, content_json, lang) VALUES (?, ?, ?, ?, ?)'
    ).run(userId, 'text', (mindMap.label || 'Mind map').slice(0, 200), contentJson, lang);
    const id = db.prepare('SELECT last_insert_rowid() as id').get().id;
    res.status(201).json({ id, mind_map: mindMap });
  } catch (e) {
    console.error('Study mindmap error:', e);
    res.status(500).json({ detail: e.message || 'Mind map failed' });
  }
});

// GET /study/mindmaps?search=
studyRouter.get('/mindmaps', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const search = (req.query.search || '').trim().toLowerCase();
  let rows = db.prepare('SELECT id, title, lang, created_at FROM study_mind_maps WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  if (search) {
    rows = rows.filter((r) => (r.title || '').toLowerCase().includes(search));
  }
  res.json(rows);
});

// GET /study/mindmaps/:id
studyRouter.get('/mindmaps/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = db.prepare('SELECT id, title, content_json, lang, created_at FROM study_mind_maps WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!row) return res.status(404).json({ detail: 'Not found' });
  const content = JSON.parse(row.content_json || '{}');
  res.json({ id: row.id, title: row.title, mind_map: content, lang: row.lang, created_at: row.created_at });
});
