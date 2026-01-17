import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';

const dbPath = path.join(process.cwd(), 'data', 'impromptu.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    // Ensure data directory exists
    const fs = require('fs');
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    db = new Database(dbPath);
    initializeDb(db);
  }
  return db;
}

function initializeDb(database: Database.Database) {
  // Create questions table (for L1, L2, L5 - simple questions)
  database.exec(`
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT NOT NULL CHECK(level IN ('L1', 'L2', 'L3', 'L4', 'L5')),
      text TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create question templates table (for L3, L4 - template-based questions)
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

  // Create template history for tracking shown template+variable combinations
  database.exec(`
    CREATE TABLE IF NOT EXISTS template_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER NOT NULL,
      variable_used TEXT NOT NULL,
      shown_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (template_id) REFERENCES question_templates(id) ON DELETE CASCADE
    )
  `);

  // Create users table for admin auth
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create feedback table for thumbs up/down
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

  // Create question history for tracking shown questions
  database.exec(`
    CREATE TABLE IF NOT EXISTS question_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER NOT NULL,
      shown_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    )
  `);

  // Create settings table
  database.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // Set default lock duration (30 minutes) if not exists
  const lockDuration = database.prepare('SELECT value FROM settings WHERE key = ?').get('lock_duration_minutes');
  if (!lockDuration) {
    database.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('lock_duration_minutes', '30');
  }

  // Set default max number (1000) if not exists
  const maxNumber = database.prepare('SELECT value FROM settings WHERE key = ?').get('max_number');
  if (!maxNumber) {
    database.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('max_number', '1000');
  }

  // Create default admin user if none exists
  const adminExists = database.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!adminExists) {
    const defaultPassword = bcrypt.hashSync('admin123', 10);
    database.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run('admin', defaultPassword);
  }
}

export type Level = 'L1' | 'L2' | 'L3' | 'L4' | 'L5';

export interface Question {
  id: number;
  level: Level;
  text: string;
  created_at: string;
}

export interface QuestionWithFeedback extends Question {
  thumbs_up: number;
  thumbs_down: number;
}

export interface QuestionTemplate {
  id: number;
  level: 'L3' | 'L4';
  pre_text: string;
  post_text: string;
  variables: string; // JSON array stored as string
  created_at: string;
}

export interface GeneratedQuestion {
  type: 'simple' | 'template';
  id: number;
  text: string;
  templateId?: number;
  variableUsed?: string;
}

export interface User {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
}

// Question operations
export function getRandomQuestion(level: Level): GeneratedQuestion | null {
  const db = getDb();

  // Get lock duration from settings
  const lockSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('lock_duration_minutes') as { value: string } | undefined;
  const lockMinutes = parseInt(lockSetting?.value || '30', 10);

  // For L3 and L4, use template-based questions
  if (level === 'L3' || level === 'L4') {
    return getRandomTemplateQuestion(level, lockMinutes);
  }

  // For L1, L2, L5 - use simple questions
  const question = db.prepare(`
    SELECT q.* FROM questions q
    WHERE q.level = ?
    AND q.id NOT IN (
      SELECT question_id FROM question_history
      WHERE shown_at > datetime('now', '-' || ? || ' minutes')
    )
    ORDER BY RANDOM()
    LIMIT 1
  `).get(level, lockMinutes) as Question | undefined;

  // If all questions are locked, get any random question
  if (!question) {
    const fallback = db.prepare(`
      SELECT * FROM questions
      WHERE level = ?
      ORDER BY RANDOM()
      LIMIT 1
    `).get(level) as Question | undefined;

    if (!fallback) return null;
    return { type: 'simple', id: fallback.id, text: fallback.text };
  }

  return { type: 'simple', id: question.id, text: question.text };
}

function getRandomTemplateQuestion(level: 'L3' | 'L4', lockMinutes: number): GeneratedQuestion | null {
  const db = getDb();

  // Get all templates for this level
  const templates = db.prepare('SELECT * FROM question_templates WHERE level = ?').all(level) as QuestionTemplate[];

  if (templates.length === 0) return null;

  // Build a list of all possible template+variable combinations
  const combinations: { template: QuestionTemplate; variable: string }[] = [];
  for (const template of templates) {
    const variables = JSON.parse(template.variables) as string[];
    for (const variable of variables) {
      combinations.push({ template, variable });
    }
  }

  if (combinations.length === 0) return null;

  // Get recently shown combinations
  const recentlyShown = db.prepare(`
    SELECT template_id, variable_used FROM template_history
    WHERE shown_at > datetime('now', '-' || ? || ' minutes')
  `).all(lockMinutes) as { template_id: number; variable_used: string }[];

  const recentSet = new Set(recentlyShown.map(r => `${r.template_id}:${r.variable_used}`));

  // Filter out recently shown combinations
  const available = combinations.filter(c => !recentSet.has(`${c.template.id}:${c.variable}`));

  // If all are locked, use any random combination
  const selected = available.length > 0
    ? available[Math.floor(Math.random() * available.length)]
    : combinations[Math.floor(Math.random() * combinations.length)];

  const text = `${selected.template.pre_text} ${selected.variable} ${selected.template.post_text}`;

  return {
    type: 'template',
    id: selected.template.id,
    text,
    templateId: selected.template.id,
    variableUsed: selected.variable,
  };
}

export function recordQuestionShown(questionId: number): void {
  const db = getDb();
  db.prepare('INSERT INTO question_history (question_id) VALUES (?)').run(questionId);
}

export function recordTemplateShown(templateId: number, variableUsed: string): void {
  const db = getDb();
  db.prepare('INSERT INTO template_history (template_id, variable_used) VALUES (?, ?)').run(templateId, variableUsed);
}

export function resetQuestionPool(): void {
  const db = getDb();
  db.prepare('DELETE FROM question_history').run();
  db.prepare('DELETE FROM template_history').run();
}

export function getAllQuestions(level?: Level): Question[] {
  const db = getDb();
  if (level) {
    return db.prepare('SELECT * FROM questions WHERE level = ? ORDER BY id').all(level) as Question[];
  }
  return db.prepare('SELECT * FROM questions ORDER BY level, id').all() as Question[];
}

export function getAllQuestionsWithFeedback(level?: Level): QuestionWithFeedback[] {
  const db = getDb();
  const query = `
    SELECT
      q.*,
      COALESCE(SUM(CASE WHEN f.vote = 'up' THEN 1 ELSE 0 END), 0) as thumbs_up,
      COALESCE(SUM(CASE WHEN f.vote = 'down' THEN 1 ELSE 0 END), 0) as thumbs_down
    FROM questions q
    LEFT JOIN feedback f ON q.id = f.question_id
    ${level ? 'WHERE q.level = ?' : ''}
    GROUP BY q.id
    ORDER BY q.level, q.id
  `;

  if (level) {
    return db.prepare(query).all(level) as QuestionWithFeedback[];
  }
  return db.prepare(query).all() as QuestionWithFeedback[];
}

export function createQuestion(level: Level, text: string): Question {
  const db = getDb();
  const result = db.prepare('INSERT INTO questions (level, text) VALUES (?, ?)').run(level, text);
  return db.prepare('SELECT * FROM questions WHERE id = ?').get(result.lastInsertRowid) as Question;
}

export function updateQuestion(id: number, level: Level, text: string): Question | null {
  const db = getDb();
  const result = db.prepare('UPDATE questions SET level = ?, text = ? WHERE id = ?').run(level, text, id);
  if (result.changes === 0) return null;
  return db.prepare('SELECT * FROM questions WHERE id = ?').get(id) as Question;
}

export function deleteQuestion(id: number): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM questions WHERE id = ?').run(id);
  return result.changes > 0;
}

// Bulk operations
export function bulkUpdateQuestionLevel(ids: number[], newLevel: Level): number {
  const db = getDb();
  const updateStmt = db.prepare('UPDATE questions SET level = ? WHERE id = ?');
  const updateMany = db.transaction((ids: number[], level: Level) => {
    let count = 0;
    for (const id of ids) {
      const result = updateStmt.run(level, id);
      count += result.changes;
    }
    return count;
  });
  return updateMany(ids, newLevel);
}

export function bulkDeleteQuestions(ids: number[]): number {
  const db = getDb();
  const deleteStmt = db.prepare('DELETE FROM questions WHERE id = ?');
  const deleteMany = db.transaction((ids: number[]) => {
    let count = 0;
    for (const id of ids) {
      const result = deleteStmt.run(id);
      count += result.changes;
    }
    return count;
  });
  return deleteMany(ids);
}

// Template operations
export function getAllTemplates(level?: 'L3' | 'L4'): QuestionTemplate[] {
  const db = getDb();
  if (level) {
    return db.prepare('SELECT * FROM question_templates WHERE level = ? ORDER BY id').all(level) as QuestionTemplate[];
  }
  return db.prepare('SELECT * FROM question_templates ORDER BY level, id').all() as QuestionTemplate[];
}

export function createTemplate(level: 'L3' | 'L4', preText: string, postText: string, variables: string[]): QuestionTemplate {
  const db = getDb();
  const result = db.prepare('INSERT INTO question_templates (level, pre_text, post_text, variables) VALUES (?, ?, ?, ?)').run(
    level,
    preText,
    postText,
    JSON.stringify(variables)
  );
  return db.prepare('SELECT * FROM question_templates WHERE id = ?').get(result.lastInsertRowid) as QuestionTemplate;
}

export function updateTemplate(id: number, level: 'L3' | 'L4', preText: string, postText: string, variables: string[]): QuestionTemplate | null {
  const db = getDb();
  const result = db.prepare('UPDATE question_templates SET level = ?, pre_text = ?, post_text = ?, variables = ? WHERE id = ?').run(
    level,
    preText,
    postText,
    JSON.stringify(variables),
    id
  );
  if (result.changes === 0) return null;
  return db.prepare('SELECT * FROM question_templates WHERE id = ?').get(id) as QuestionTemplate;
}

export function deleteTemplate(id: number): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM question_templates WHERE id = ?').run(id);
  return result.changes > 0;
}

// Feedback operations
export function addFeedback(questionId: number | null, vote: 'up' | 'down', templateId?: number, variableUsed?: string): void {
  const db = getDb();
  db.prepare('INSERT INTO feedback (question_id, template_id, variable_used, vote) VALUES (?, ?, ?, ?)').run(
    questionId,
    templateId || null,
    variableUsed || null,
    vote
  );
}

export function getFeedbackSummary(): { question_id: number; thumbs_up: number; thumbs_down: number }[] {
  const db = getDb();
  return db.prepare(`
    SELECT
      question_id,
      SUM(CASE WHEN vote = 'up' THEN 1 ELSE 0 END) as thumbs_up,
      SUM(CASE WHEN vote = 'down' THEN 1 ELSE 0 END) as thumbs_down
    FROM feedback
    WHERE question_id IS NOT NULL
    GROUP BY question_id
  `).all() as { question_id: number; thumbs_up: number; thumbs_down: number }[];
}

// Settings operations
export function getSetting(key: string): string | null {
  const db = getDb();
  const result = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return result?.value || null;
}

export function setSetting(key: string, value: string): void {
  const db = getDb();
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
}

// User operations
export function getUserByUsername(username: string): User | null {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as User | undefined;
  return user || null;
}

export function verifyPassword(plainPassword: string, hashedPassword: string): boolean {
  return bcrypt.compareSync(plainPassword, hashedPassword);
}

export function updatePassword(userId: number, newPassword: string): boolean {
  const db = getDb();
  const hash = bcrypt.hashSync(newPassword, 10);
  const result = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, userId);
  return result.changes > 0;
}

// Cleanup old history (optional, to keep db size small)
export function cleanupOldHistory(olderThanMinutes: number = 1440): void {
  const db = getDb();
  db.prepare(`
    DELETE FROM question_history
    WHERE shown_at < datetime('now', '-' || ? || ' minutes')
  `).run(olderThanMinutes);
  db.prepare(`
    DELETE FROM template_history
    WHERE shown_at < datetime('now', '-' || ? || ' minutes')
  `).run(olderThanMinutes);
}
