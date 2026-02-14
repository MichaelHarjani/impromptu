import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { initializeDb } from './schema';

// Railway volume mount or local data directory
const dataDir = process.env.RAILWAY_VOLUME_MOUNT_PATH
  || path.join(process.cwd(), 'data');
const dbPath = path.join(dataDir, 'impromptu.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
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
export type { Level, Question, QuestionWithFeedback, QuestionTemplate, GeneratedQuestion, NumberInput, SiteAccessLog, EmailUser, UserActivity } from '../types';
