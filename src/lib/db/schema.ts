import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import type { Level } from '../types';

export function initializeDb(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT NOT NULL CHECK(level IN ('L1', 'L2', 'L3', 'L4', 'L5')),
      text TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS question_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT NOT NULL CHECK(level IN ('L3', 'L4')),
      pre_text TEXT NOT NULL,
      post_text TEXT NOT NULL,
      variables TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS template_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER NOT NULL,
      variable_used TEXT NOT NULL,
      shown_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (template_id) REFERENCES question_templates(id) ON DELETE CASCADE
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER,
      template_id INTEGER,
      variable_used TEXT,
      vote TEXT NOT NULL CHECK(vote IN ('up', 'down')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS question_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER NOT NULL,
      shown_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS number_inputs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number INTEGER NOT NULL,
      level TEXT NOT NULL CHECK(level IN ('L1', 'L2', 'L3', 'L4', 'L5')),
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS site_access_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip_address TEXT NOT NULL,
      user_agent TEXT,
      device_info TEXT,
      location TEXT,
      success INTEGER NOT NULL CHECK(success IN (0, 1)),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      approved INTEGER NOT NULL DEFAULT 0,
      is_admin INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migration: rename email_users table to users (drop old users table first)
  try {
    database.exec('DROP TABLE IF EXISTS users');
    database.exec('ALTER TABLE email_users RENAME TO users');
  } catch {
    // Already renamed
  }

  // Migration: add is_admin column if it doesn't exist yet
  try {
    database.exec('ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0');
  } catch {
    // Column already exists
  }

  // Migration: rename email column to username
  try {
    database.exec('ALTER TABLE users RENAME COLUMN email TO username');
  } catch {
    // Column already renamed
  }

  database.exec(`
    CREATE TABLE IF NOT EXISTS user_activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email_user_id INTEGER NOT NULL,
      question_type TEXT NOT NULL CHECK(question_type IN ('simple', 'template')),
      question_id INTEGER,
      template_id INTEGER,
      variable_used TEXT,
      level TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (email_user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Set defaults if not exists
  const defaults: Record<string, string> = {
    lock_duration_minutes: '30',
    max_number: '1000',
    ip_whitelist: '[]',
    ip_whitelist_enabled: 'false',
  };

  for (const [key, value] of Object.entries(defaults)) {
    const existing = database.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    if (!existing) {
      database.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(key, value);
    }
  }

  // Set default site password
  const sitePassword = database.prepare('SELECT value FROM settings WHERE key = ?').get('site_password');
  if (!sitePassword) {
    const defaultSitePassword = bcrypt.hashSync('10Values!', 10);
    database.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('site_password', defaultSitePassword);
  }

  // Seed default admin users
  const adminUsernames = ['george', 'michael'];
  for (const username of adminUsernames) {
    const exists = database.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (!exists) {
      database.prepare('INSERT INTO users (username, approved, is_admin) VALUES (?, 1, 1)').run(username);
    }
  }

  seedDatabase(database);
}

const sampleQuestions: Record<Level, string[]> = {
  L1: [
    'What is your favorite food and why?',
    'Describe your best friend.',
    'What did you do last weekend?',
    'What is your favorite animal?',
    'Tell us about your family.',
    'What is your favorite color and why?',
    'Describe your home.',
    'What do you like to do for fun?',
  ],
  L2: [
    'If you could have any superpower, what would it be?',
    'Describe your ideal vacation.',
    'What would you do if you won the lottery?',
    'Tell us about a memorable experience.',
    'What is the best gift you have ever received?',
    'If you could meet anyone, who would it be?',
    'Describe your favorite holiday.',
    'What makes a good friend?',
  ],
  L3: [
    'Should students wear school uniforms? Why or why not?',
    'What are the advantages and disadvantages of social media?',
    'How can we protect the environment?',
    'Is it better to live in a city or the countryside?',
    'What qualities make a good leader?',
    'How has technology changed education?',
    'What are the benefits of learning a second language?',
    'Should homework be banned?',
  ],
  L4: [
    'Discuss the impact of artificial intelligence on employment.',
    'How should governments address climate change?',
    'What role should social media play in democracy?',
    'Discuss the ethics of genetic engineering.',
    'How can we balance economic growth with environmental protection?',
    'What are the pros and cons of globalization?',
    'Should there be limits on free speech?',
    'How can we reduce inequality in society?',
  ],
  L5: [
    'Analyze the relationship between individual freedom and collective responsibility.',
    'To what extent should governments intervene in the economy?',
    'Discuss the philosophical implications of artificial consciousness.',
    'How should society balance security and privacy?',
    'Evaluate the effectiveness of international organizations in solving global problems.',
    'What ethical frameworks should guide biotechnology research?',
    'Discuss the future of work in an automated world.',
    'How can democratic institutions adapt to technological change?',
  ],
};

function seedDatabase(database: Database.Database): void {
  const questionCount = database.prepare('SELECT COUNT(*) as count FROM questions').get() as { count: number };

  if (questionCount.count === 0) {
    const insert = database.prepare('INSERT INTO questions (level, text) VALUES (?, ?)');
    for (const [level, questions] of Object.entries(sampleQuestions)) {
      for (const text of questions) {
        insert.run(level, text);
      }
    }
  }
}
