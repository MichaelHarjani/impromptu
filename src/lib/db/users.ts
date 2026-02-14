import { getDb } from './index';
import type { EmailUser, UserActivity, Level } from '../types';

export function findOrCreateEmailUser(email: string): EmailUser {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM email_users WHERE email = ?').get(email) as EmailUser | undefined;
  if (existing) return existing;

  const result = db.prepare('INSERT INTO email_users (email) VALUES (?)').run(email);
  return db.prepare('SELECT * FROM email_users WHERE id = ?').get(result.lastInsertRowid) as EmailUser;
}

export function getEmailUser(email: string): EmailUser | null {
  const db = getDb();
  const user = db.prepare('SELECT * FROM email_users WHERE email = ?').get(email) as EmailUser | undefined;
  return user || null;
}

export function getEmailUserById(id: number): EmailUser | null {
  const db = getDb();
  const user = db.prepare('SELECT * FROM email_users WHERE id = ?').get(id) as EmailUser | undefined;
  return user || null;
}

export function getAllEmailUsers(): (EmailUser & { activity_count: number; last_active: string | null })[] {
  const db = getDb();
  return db.prepare(`
    SELECT
      eu.*,
      COUNT(ua.id) as activity_count,
      MAX(ua.created_at) as last_active
    FROM email_users eu
    LEFT JOIN user_activity ua ON eu.id = ua.email_user_id
    GROUP BY eu.id
    ORDER BY eu.created_at DESC
  `).all() as (EmailUser & { activity_count: number; last_active: string | null })[];
}

export function approveEmailUser(id: number): void {
  const db = getDb();
  db.prepare('UPDATE email_users SET approved = 1 WHERE id = ?').run(id);
}

export function revokeEmailUser(id: number): void {
  const db = getDb();
  db.prepare('UPDATE email_users SET approved = 0 WHERE id = ?').run(id);
}

export function setEmailUserAdmin(id: number, isAdmin: boolean): void {
  const db = getDb();
  db.prepare('UPDATE email_users SET is_admin = ? WHERE id = ?').run(isAdmin ? 1 : 0, id);
}

export function deleteEmailUser(id: number): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM email_users WHERE id = ?').run(id);
  return result.changes > 0;
}

export function recordUserActivity(
  emailUserId: number,
  questionType: 'simple' | 'template',
  questionId: number | null,
  templateId: number | null,
  variableUsed: string | null,
  level: Level
): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO user_activity (email_user_id, question_type, question_id, template_id, variable_used, level)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(emailUserId, questionType, questionId, templateId, variableUsed, level);
}

export function getUserActivity(emailUserId: number, options: { page?: number; limit?: number } = {}): { activities: (UserActivity & { question_text?: string })[]; total: number } {
  const db = getDb();
  const page = options.page || 1;
  const limit = options.limit || 50;
  const offset = (page - 1) * limit;

  const totalResult = db.prepare('SELECT COUNT(*) as count FROM user_activity WHERE email_user_id = ?').get(emailUserId) as { count: number };

  const activities = db.prepare(`
    SELECT
      ua.*,
      CASE
        WHEN ua.question_type = 'simple' THEN q.text
        WHEN ua.question_type = 'template' THEN qt.pre_text || ' ' || ua.variable_used || ' ' || qt.post_text
      END as question_text
    FROM user_activity ua
    LEFT JOIN questions q ON ua.question_id = q.id AND ua.question_type = 'simple'
    LEFT JOIN question_templates qt ON ua.template_id = qt.id AND ua.question_type = 'template'
    WHERE ua.email_user_id = ?
    ORDER BY ua.created_at DESC
    LIMIT ? OFFSET ?
  `).all(emailUserId, limit, offset) as (UserActivity & { question_text?: string })[];

  return { activities, total: totalResult.count };
}
