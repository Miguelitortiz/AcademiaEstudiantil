import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

// Ensure data directory exists inside the project
const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'database.sqlite');
const db = new Database(DB_PATH);

// Set pragmas for performance and foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS system_config (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT CHECK(role IN ('director', 'jefe_carrera')) NOT NULL,
    career TEXT -- NULL for director, e.g., 'ICI', 'IME' for department heads
  );

  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    enrollment TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    grade INTEGER NOT NULL, -- 1 to 8 (or 10)
    group_letter TEXT NOT NULL, -- A, B, C, etc.
    career TEXT NOT NULL, -- ICI, IME, IMT, etc.
    phone TEXT NOT NULL, -- Phone number for WhatsApp
    role TEXT CHECK(role IN ('Jefe', 'Subjefe')) NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY, -- Form DD/MM - XX
    date TEXT NOT NULL, -- YYYY-MM-DD
    time TEXT NOT NULL, -- HH:MM
    agenda TEXT NOT NULL, -- JSON string array of blocks
    role_type TEXT CHECK(role_type IN ('Jefe', 'Subjefe', 'Ambos')) NOT NULL,
    career TEXT, -- NULL for Director (all careers), or specific career
    status TEXT CHECK(status IN ('draft', 'summoned', 'completed')) NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS invites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    student_id INTEGER NOT NULL,
    whatsapp_sent INTEGER NOT NULL DEFAULT 0, -- 0 = No, 1 = Yes
    attended INTEGER NOT NULL DEFAULT 0, -- 0 = No, 1 = Yes
    FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE(session_id, student_id)
  );

  CREATE TABLE IF NOT EXISTS minutes (
    session_id TEXT PRIMARY KEY,
    agreements TEXT NOT NULL, -- JSON string array of agreements
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
  );
`);

// Helper to seed data if users table is empty
const seedUsers = db.prepare('SELECT COUNT(*) as count FROM users');
const { count: userCount } = seedUsers.get() as { count: number };

if (userCount === 0) {
  console.log('Seeding initial users and students...');
  
  const salt = bcrypt.genSaltSync(10);
  const defaultPasswordHash = bcrypt.hashSync('colima2026', salt);

  // Insert users
  const insertUser = db.prepare(`
    INSERT INTO users (username, password_hash, role, career) VALUES (?, ?, ?, ?)
  `);
  
  insertUser.run('director', defaultPasswordHash, 'director', null);
  insertUser.run('jefe.ici', defaultPasswordHash, 'jefe_carrera', 'ICI');
  insertUser.run('jefe.ime', defaultPasswordHash, 'jefe_carrera', 'IME');
  insertUser.run('jefe.imt', defaultPasswordHash, 'jefe_carrera', 'IMT');

  // Insert seed students (Jefes and Subjefes of different grades and groups)
  const insertStudent = db.prepare(`
    INSERT INTO students (enrollment, full_name, grade, group_letter, career, phone, role) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const mockStudents = [
    // ICI
    { enrollment: '20241001', name: 'Ana Sofía Torres', grade: 2, group: 'A', career: 'ICI', phone: '3121012345', role: 'Jefe' },
    { enrollment: '20241002', name: 'Carlos Eduardo Medina', grade: 2, group: 'A', career: 'ICI', phone: '3121023456', role: 'Subjefe' },
    { enrollment: '20231003', name: 'María Fernanda Ruiz', grade: 4, group: 'B', career: 'ICI', phone: '3121034567', role: 'Jefe' },
    { enrollment: '20231004', name: 'Juan Pablo Ochoa', grade: 4, group: 'B', career: 'ICI', phone: '3121045678', role: 'Subjefe' },
    { enrollment: '20221005', name: 'Valeria Gómez Silva', grade: 6, group: 'A', career: 'ICI', phone: '3121056789', role: 'Jefe' },
    { enrollment: '20221006', name: 'Diego Alejandro Larios', grade: 6, group: 'A', career: 'ICI', phone: '3121067890', role: 'Subjefe' },
    { enrollment: '20211007', name: 'Luis Fernando Cárdenas', grade: 8, group: 'A', career: 'ICI', phone: '3121078901', role: 'Jefe' },
    { enrollment: '20211008', name: 'Gabriela Michelle Ramos', grade: 8, group: 'A', career: 'ICI', phone: '3121089012', role: 'Subjefe' },

    // IME
    { enrollment: '20242001', name: 'Héctor Manuel Silva', grade: 2, group: 'A', career: 'IME', phone: '3122012345', role: 'Jefe' },
    { enrollment: '20242002', name: 'Jessica Monserrat Villa', grade: 2, group: 'A', career: 'IME', phone: '3122023456', role: 'Subjefe' },
    { enrollment: '20232003', name: 'Ricardo Daniel Vargas', grade: 4, group: 'A', career: 'IME', phone: '3122034567', role: 'Jefe' },
    { enrollment: '20232004', name: 'Fernanda Isabel Ortiz', grade: 4, group: 'A', career: 'IME', phone: '3122045678', role: 'Subjefe' },
    { enrollment: '20222005', name: 'Mauricio Salvador Cruz', grade: 6, group: 'B', career: 'IME', phone: '3122056789', role: 'Jefe' },
    { enrollment: '20212006', name: 'Sofía Alejandra Ponce', grade: 8, group: 'A', career: 'IME', phone: '3122067890', role: 'Jefe' },

    // IMT
    { enrollment: '20243001', name: 'Emilio Javier López', grade: 2, group: 'B', career: 'IMT', phone: '3123012345', role: 'Jefe' },
    { enrollment: '20243002', name: 'Karla Patricia Méndez', grade: 2, group: 'B', career: 'IMT', phone: '3123023456', role: 'Subjefe' },
    { enrollment: '20233003', name: 'José Armando Beltrán', grade: 4, group: 'A', career: 'IMT', phone: '3123034567', role: 'Jefe' },
    { enrollment: '20223004', name: 'Andrea Lizeth Barajas', grade: 6, group: 'A', career: 'IMT', phone: '3123045678', role: 'Jefe' },
    { enrollment: '20213005', name: 'Francisco Javier Nieto', grade: 8, group: 'A', career: 'IMT', phone: '3123056789', role: 'Jefe' }
  ];

  for (const s of mockStudents) {
    insertStudent.run(s.enrollment, s.name, s.grade, s.group, s.career, s.phone, s.role);
  }

  // Initialize config
  const insertConfig = db.prepare(`
    INSERT INTO system_config (key, value) VALUES (?, ?)
  `);
  insertConfig.run('last_grade_promotion_date', '2026-01-01');

  console.log('Database successfully seeded!');
}

export default db;
export { db };
