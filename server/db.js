import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'unipilot.db');

let nativeDb = null;

function save() {
  if (!nativeDb) return;
  try {
    const data = nativeDb.export();
    writeFileSync(dbPath, Buffer.from(data));
  } catch (e) {
    console.warn('DB save warning:', e?.message);
  }
}

function prepare(sql) {
  return {
    run: (...params) => {
      try {
        const stmt = nativeDb.prepare(sql);
        if (params.length > 0) stmt.bind(params);
        stmt.step();
        stmt.free();
        const res = nativeDb.exec('SELECT last_insert_rowid() as id');
        const lastInsertRowid = (res?.[0]?.values?.[0]?.[0] != null) ? Number(res[0].values[0][0]) : 0;
        const changesRes = nativeDb.exec('SELECT changes() as c');
        const changes = (changesRes?.[0]?.values?.[0]?.[0] != null) ? Number(changesRes[0].values[0][0]) : 0;
        save();
        return { lastInsertRowid, changes };
      } catch (e) {
        save();
        throw e;
      }
    },
    get: (...params) => {
      const stmt = nativeDb.prepare(sql);
      if (params.length > 0) stmt.bind(params);
      const row = stmt.step() ? stmt.getAsObject() : null;
      stmt.free();
      return row || undefined;
    },
    all: (...params) => {
      const stmt = nativeDb.prepare(sql);
      if (params.length > 0) stmt.bind(params);
      const rows = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      stmt.free();
      return rows;
    },
  };
}

function exec(sql) {
  nativeDb.exec(sql);
  save();
}

export const db = {
  prepare,
  exec,
  pragma: () => {},
};

export async function initDb() {
  const SQL = await initSqlJs({
    locateFile: (file) => join(__dirname, '..', 'node_modules', 'sql.js', 'dist', file),
  });
  if (existsSync(dbPath)) {
    const buf = readFileSync(dbPath);
    nativeDb = new SQL.Database(buf);
  } else {
    nativeDb = new SQL.Database();
  }

  try { nativeDb.run('PRAGMA foreign_keys = ON'); } catch (_) {}
  try { nativeDb.run('PRAGMA journal_mode = WAL'); } catch (_) {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student' CHECK(role IN ('admin','student')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS catalog_courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_code TEXT NOT NULL,
      course_name TEXT NOT NULL,
      department TEXT NOT NULL,
      description TEXT,
      credit_hours INTEGER NOT NULL DEFAULT 3,
      "order" INTEGER NOT NULL DEFAULT 1,
      prerequisite_id INTEGER REFERENCES catalog_courses(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS student_courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      catalog_course_id INTEGER REFERENCES catalog_courses(id),
      course_name TEXT NOT NULL,
      course_code TEXT NOT NULL,
      credit_hours INTEGER NOT NULL DEFAULT 3,
      semester TEXT DEFAULT 'Spring 2026',
      difficulty INTEGER DEFAULT 5,
      target_grade REAL DEFAULT 85,
      professor_name TEXT,
      description TEXT,
      current_grade REAL,
      progress REAL DEFAULT 0,
      finalized_at TEXT,
      passed INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, catalog_course_id)
    );

    CREATE INDEX IF NOT EXISTS idx_student_courses_user ON student_courses(user_id);
    CREATE INDEX IF NOT EXISTS idx_student_courses_catalog ON student_courses(catalog_course_id);
    CREATE INDEX IF NOT EXISTS idx_catalog_order ON catalog_courses("order");
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

    CREATE TABLE IF NOT EXISTS grade_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_course_id INTEGER NOT NULL REFERENCES student_courses(id) ON DELETE CASCADE,
      item_type TEXT NOT NULL DEFAULT 'quiz',
      title TEXT NOT NULL,
      score REAL NOT NULL DEFAULT 0,
      max_score REAL NOT NULL DEFAULT 100,
      weight REAL NOT NULL DEFAULT 0,
      from_scheme INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_grade_items_student_course ON grade_items(student_course_id);

    CREATE TABLE IF NOT EXISTS catalog_grade_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      catalog_course_id INTEGER NOT NULL REFERENCES catalog_courses(id) ON DELETE CASCADE,
      item_type TEXT NOT NULL DEFAULT 'quiz',
      title TEXT NOT NULL,
      weight REAL NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_catalog_grade_items_course ON catalog_grade_items(catalog_course_id);

    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      student_course_id INTEGER REFERENCES student_courses(id) ON DELETE SET NULL,
      content TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'student' CHECK(type IN ('student','app')),
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id);
    CREATE INDEX IF NOT EXISTS idx_notes_type ON notes(type);

    CREATE TABLE IF NOT EXISTS student_academic_record (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      cgpa REAL DEFAULT 0,
      cumulative_percent REAL DEFAULT 0,
      total_credits_completed REAL DEFAULT 0,
      total_credits_carried REAL DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS planner_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      student_course_id INTEGER REFERENCES student_courses(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      description TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      event_type TEXT NOT NULL DEFAULT 'study' CHECK(event_type IN ('exam','study','project','other')),
      completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_planner_events_user ON planner_events(user_id);
    CREATE INDEX IF NOT EXISTS idx_planner_events_dates ON planner_events(start_date, end_date);

    CREATE TABLE IF NOT EXISTS planner_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      student_course_id INTEGER REFERENCES student_courses(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      due_date TEXT NOT NULL,
      due_time TEXT,
      priority INTEGER NOT NULL DEFAULT 3,
      completed INTEGER DEFAULT 0,
      source TEXT NOT NULL DEFAULT 'student' CHECK(source IN ('app','student')),
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_planner_tasks_user ON planner_tasks(user_id);
    CREATE INDEX IF NOT EXISTS idx_planner_tasks_due ON planner_tasks(due_date);

    CREATE TABLE IF NOT EXISTS course_modules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_course_id INTEGER NOT NULL REFERENCES student_courses(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS course_module_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_module_id INTEGER NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
      type TEXT NOT NULL DEFAULT 'file' CHECK(type IN ('folder','file')),
      title TEXT NOT NULL,
      url_or_content TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_course_modules_student_course ON course_modules(student_course_id);
    CREATE INDEX IF NOT EXISTS idx_course_module_items_module ON course_module_items(course_module_id);

    CREATE TABLE IF NOT EXISTS catalog_resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      catalog_course_id INTEGER NOT NULL REFERENCES catalog_courses(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      url TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_catalog_resources_course ON catalog_resources(catalog_course_id);

    CREATE TABLE IF NOT EXISTS ai_chat_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS ai_chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS course_chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      student_course_id INTEGER NOT NULL REFERENCES student_courses(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user ON ai_chat_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session ON ai_chat_messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_course_chat_messages_course ON course_chat_messages(user_id, student_course_id);
  `);

  try {
    db.exec(`ALTER TABLE student_courses ADD COLUMN finalized_at TEXT`);
  } catch (_) {}
  try {
    db.exec(`ALTER TABLE student_courses ADD COLUMN passed INTEGER`);
  } catch (_) {}
  try {
    db.exec(`ALTER TABLE student_academic_record ADD COLUMN total_credits_carried REAL DEFAULT 0`);
  } catch (_) {}
  try {
    db.exec(`ALTER TABLE grade_items ADD COLUMN from_scheme INTEGER NOT NULL DEFAULT 0`);
  } catch (_) {}
  try {
    db.exec(`ALTER TABLE catalog_grade_items ADD COLUMN max_score REAL DEFAULT 100`);
  } catch (_) {}
  try {
    db.exec(`ALTER TABLE ai_chat_sessions ADD COLUMN title TEXT`);
  } catch (_) {}
  try {
    db.exec(`ALTER TABLE ai_chat_sessions ADD COLUMN updated_at TEXT`);
  } catch (_) {}
  try {
    db.exec(`ALTER TABLE notes ADD COLUMN note_category TEXT`);
  } catch (_) {}
  try {
    db.exec(`ALTER TABLE notes ADD COLUMN ref_id INTEGER`);
  } catch (_) {}
  try {
    db.exec(`ALTER TABLE notes ADD COLUMN ref_type TEXT`);
  } catch (_) {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS study_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      filename TEXT,
      file_type TEXT,
      extracted_text TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS study_summaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      source_type TEXT NOT NULL DEFAULT 'text',
      source_id INTEGER,
      title TEXT,
      content TEXT NOT NULL,
      lang TEXT DEFAULT 'ar',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS study_flashcard_sets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      source_type TEXT NOT NULL DEFAULT 'text',
      source_id INTEGER,
      title TEXT,
      lang TEXT DEFAULT 'ar',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS study_flashcards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      set_id INTEGER NOT NULL REFERENCES study_flashcard_sets(id) ON DELETE CASCADE,
      front TEXT NOT NULL,
      back TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS study_quizzes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      source_type TEXT NOT NULL DEFAULT 'text',
      source_id INTEGER,
      title TEXT,
      difficulty TEXT DEFAULT 'medium',
      question_type TEXT DEFAULT 'multiple_choice',
      question_count INTEGER NOT NULL,
      source_scope TEXT DEFAULT 'within',
      lang TEXT DEFAULT 'ar',
      questions_json TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS study_quiz_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      quiz_id INTEGER NOT NULL REFERENCES study_quizzes(id) ON DELETE CASCADE,
      answers_json TEXT,
      score_real INTEGER NOT NULL,
      score_max INTEGER NOT NULL,
      feedback_text TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS study_mind_maps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      source_type TEXT NOT NULL DEFAULT 'text',
      source_id INTEGER,
      title TEXT,
      content_json TEXT NOT NULL,
      lang TEXT DEFAULT 'ar',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_study_documents_user ON study_documents(user_id);
    CREATE INDEX IF NOT EXISTS idx_study_summaries_user ON study_summaries(user_id);
    CREATE INDEX IF NOT EXISTS idx_study_flashcard_sets_user ON study_flashcard_sets(user_id);
    CREATE INDEX IF NOT EXISTS idx_study_flashcards_set ON study_flashcards(set_id);
    CREATE INDEX IF NOT EXISTS idx_study_quizzes_user ON study_quizzes(user_id);
    CREATE INDEX IF NOT EXISTS idx_study_quiz_attempts_user ON study_quiz_attempts(user_id);
    CREATE INDEX IF NOT EXISTS idx_study_mind_maps_user ON study_mind_maps(user_id);

    CREATE TABLE IF NOT EXISTS voice_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT 'Voice session',
      transcript TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      summary TEXT,
      source TEXT NOT NULL DEFAULT 'live' CHECK(source IN ('live','upload')),
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_voice_sessions_user ON voice_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_voice_sessions_created ON voice_sessions(created_at DESC);
  `);

  save();
  console.log('Database initialized.');
}
