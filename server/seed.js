import bcrypt from 'bcryptjs';
import { db, initDb } from './db.js';

await initDb();

const adminPassword = 'Admin123!';
const studentPassword = 'Student123!';
const adminHash = bcrypt.hashSync(adminPassword, 10);
const studentHash = bcrypt.hashSync(studentPassword, 10);

const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users (email, password_hash, full_name, role)
  VALUES (?, ?, ?, ?)
`);

insertUser.run('admin@unipilot.local', adminHash, 'Admin', 'admin');
insertUser.run('student@unipilot.local', studentHash, 'Student', 'student');

console.log('Seeded users:');
console.log('  Admin:  admin@unipilot.local / Admin123!');
console.log('  Student: student@unipilot.local / Student123!');
process.exit(0);