import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'unipilot.db');
export const db = new Database(dbPath);

db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');

export function initDb() {
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
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_grade_items_student_course ON grade_items(student_course_id);

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
  `);
  // Migrations: add columns if they don't exist (SQLite has no IF NOT EXISTS for ADD COLUMN)
  try {
    db.exec(`ALTER TABLE student_courses ADD COLUMN finalized_at TEXT`);
  } catch (_) {}
  try {
    db.exec(`ALTER TABLE student_courses ADD COLUMN passed INTEGER`);
  } catch (_) {}
  try {
    db.exec(`ALTER TABLE student_academic_record ADD COLUMN total_credits_carried REAL DEFAULT 0`);
  } catch (_) {}
  console.log('Database initialized.');
}
