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

  // Create number_inputs table for tracking inputted numbers
  database.exec(`
    CREATE TABLE IF NOT EXISTS number_inputs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number INTEGER NOT NULL,
      level TEXT NOT NULL CHECK(level IN ('L1', 'L2', 'L3', 'L4', 'L5')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create site_access_logs table for tracking login attempts
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

  // Set default site password (hashed) if not exists
  const sitePassword = database.prepare('SELECT value FROM settings WHERE key = ?').get('site_password');
  if (!sitePassword) {
    const defaultSitePassword = bcrypt.hashSync('animal', 10);
    database.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('site_password', defaultSitePassword);
  }

  // Set default IP whitelist (empty array) if not exists
  const ipWhitelist = database.prepare('SELECT value FROM settings WHERE key = ?').get('ip_whitelist');
  if (!ipWhitelist) {
    database.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('ip_whitelist', '[]');
  }

  // Set default IP whitelist enabled (false) if not exists
  const ipWhitelistEnabled = database.prepare('SELECT value FROM settings WHERE key = ?').get('ip_whitelist_enabled');
  if (!ipWhitelistEnabled) {
    database.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('ip_whitelist_enabled', 'false');
  }

  // Create default admin user if none exists
  const adminExists = database.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!adminExists) {
    const defaultPassword = bcrypt.hashSync('animal63', 10);
    database.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run('admin', defaultPassword);
  }

  // Seed database with questions if empty
  seedDatabase(database);
}

// Sample questions for seeding the database
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
  // Check if questions table is empty
  const questionCount = database.prepare('SELECT COUNT(*) as count FROM questions').get() as { count: number };
  
  if (questionCount.count === 0) {
    // Insert sample questions
    const insert = database.prepare('INSERT INTO questions (level, text) VALUES (?, ?)');

    for (const [level, questions] of Object.entries(sampleQuestions)) {
      for (const text of questions) {
        insert.run(level, text);
      }
    }
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

// Number input operations
export function recordNumberInput(number: number, level: Level): void {
  const db = getDb();
  db.prepare('INSERT INTO number_inputs (number, level) VALUES (?, ?)').run(number, level);
}

export interface NumberInput {
  id: number;
  number: number;
  level: Level;
  created_at: string;
}

export function getAllNumberInputs(): NumberInput[] {
  const db = getDb();
  return db.prepare('SELECT * FROM number_inputs ORDER BY created_at DESC').all() as NumberInput[];
}

// Site access log interface
export interface SiteAccessLog {
  id: number;
  ip_address: string;
  user_agent: string | null;
  device_info: string | null;
  location: string | null;
  success: number; // 0 or 1
  created_at: string;
}

// Site access logging functions
export function logSiteAccess(
  ipAddress: string,
  success: boolean,
  userAgent?: string,
  deviceInfo?: any,
  location?: any
): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO site_access_logs (ip_address, user_agent, device_info, location, success)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    ipAddress,
    userAgent || null,
    deviceInfo ? JSON.stringify(deviceInfo) : null,
    location ? JSON.stringify(location) : null,
    success ? 1 : 0
  );
}

export function getSiteAccessLogs(options: {
  page?: number;
  limit?: number;
  success?: boolean;
  ip?: string;
  dateFrom?: string;
  dateTo?: string;
} = {}): { logs: SiteAccessLog[]; total: number } {
  const db = getDb();
  const page = options.page || 1;
  const limit = options.limit || 50;
  const offset = (page - 1) * limit;

  // Build WHERE clause
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options.success !== undefined) {
    conditions.push('success = ?');
    params.push(options.success ? 1 : 0);
  }

  if (options.ip) {
    conditions.push('ip_address = ?');
    params.push(options.ip);
  }

  if (options.dateFrom) {
    conditions.push('created_at >= ?');
    params.push(options.dateFrom);
  }

  if (options.dateTo) {
    conditions.push('created_at <= ?');
    params.push(options.dateTo);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total count
  const totalResult = db.prepare(`SELECT COUNT(*) as count FROM site_access_logs ${whereClause}`).get(...params) as { count: number };
  const total = totalResult.count;

  // Get paginated logs
  const logs = db.prepare(`
    SELECT * FROM site_access_logs
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as SiteAccessLog[];

  return { logs, total };
}

// Site password management
export function getSitePasswordHash(): string | null {
  return getSetting('site_password');
}

export function setSitePassword(plainPassword: string): void {
  const hash = bcrypt.hashSync(plainPassword, 10);
  setSetting('site_password', hash);
}

export function verifySitePassword(plainPassword: string): boolean {
  let hash = getSitePasswordHash();

  // If no password is set, initialize with default 'animal'
  if (!hash) {
    setSitePassword('animal');
    hash = getSitePasswordHash();
  }

  if (!hash) return false;
  return bcrypt.compareSync(plainPassword, hash);
}

// IP whitelist management
export function getIpWhitelist(): string[] {
  const whitelistJson = getSetting('ip_whitelist') || '[]';
  try {
    return JSON.parse(whitelistJson) as string[];
  } catch {
    return [];
  }
}

export function setIpWhitelist(ips: string[]): void {
  setSetting('ip_whitelist', JSON.stringify(ips));
}

export function isIpWhitelisted(ip: string): boolean {
  const whitelist = getIpWhitelist();
  return whitelist.includes(ip);
}

export function isIpWhitelistEnabled(): boolean {
  const enabled = getSetting('ip_whitelist_enabled');
  return enabled === 'true';
}

export function setIpWhitelistEnabled(enabled: boolean): void {
  setSetting('ip_whitelist_enabled', enabled ? 'true' : 'false');
}

// Rate limiting for login attempts
const loginAttempts = new Map<string, { count: number; firstAttempt: number; lockedUntil?: number }>();

const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export function checkRateLimit(ip: string): { allowed: boolean; remainingAttempts?: number; lockedUntil?: number } {
  const now = Date.now();
  const attempt = loginAttempts.get(ip);

  // No previous attempts
  if (!attempt) {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS - 1 };
  }

  // Check if currently locked out
  if (attempt.lockedUntil && now < attempt.lockedUntil) {
    return { allowed: false, lockedUntil: attempt.lockedUntil };
  }

  // Reset if attempt window has passed
  if (now - attempt.firstAttempt > ATTEMPT_WINDOW_MS) {
    loginAttempts.delete(ip);
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS - 1 };
  }

  // Check if max attempts reached
  if (attempt.count >= MAX_ATTEMPTS) {
    const lockedUntil = attempt.firstAttempt + ATTEMPT_WINDOW_MS + LOCKOUT_DURATION_MS;
    attempt.lockedUntil = lockedUntil;
    return { allowed: false, lockedUntil };
  }

  return { allowed: true, remainingAttempts: MAX_ATTEMPTS - attempt.count - 1 };
}

export function recordLoginAttempt(ip: string, success: boolean): void {
  const now = Date.now();
  const attempt = loginAttempts.get(ip);

  if (success) {
    // Clear attempts on successful login
    loginAttempts.delete(ip);
    return;
  }

  if (!attempt) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
  } else {
    // Reset if window has passed
    if (now - attempt.firstAttempt > ATTEMPT_WINDOW_MS) {
      loginAttempts.set(ip, { count: 1, firstAttempt: now });
    } else {
      attempt.count++;
    }
  }
}

export function clearRateLimit(ip: string): void {
  loginAttempts.delete(ip);
}
