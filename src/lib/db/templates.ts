import { getDb } from './index';
import type { QuestionTemplate } from '../types';

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
