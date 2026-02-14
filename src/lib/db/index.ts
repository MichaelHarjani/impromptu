import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { initializeDb } from './schema';

const isVercel = process.env.VERCEL === '1';
const dbPath = isVercel
  ? '/tmp/impromptu.db'
  : path.join(process.cwd(), 'data', 'impromptu.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    if (!isVercel) {
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
    }

    db = new Database(dbPath);
    initializeDb(db);
  }
  return db;
}

// Re-export everything so `import { ... } from '@/lib/db'` still works
export * from './questions';
export * from './templates';
export * from './feedback';
export * from './settings';
export * from './auth';
export * from './logs';
export * from './users';
export type { Level, Question, QuestionWithFeedback, QuestionTemplate, GeneratedQuestion, User, NumberInput, SiteAccessLog, EmailUser, UserActivity } from '../types';
