import { getDb } from './index';
import type { AgeGroup, QuestionBank, QuestionTemplate } from '../types';

export function getAllTemplates(level?: 'L3' | 'L4', ageGroup?: AgeGroup, bank?: QuestionBank): QuestionTemplate[] {
  const db = getDb();
  const conditions: string[] = [];
  const params: string[] = [];
  if (level) { conditions.push('level = ?'); params.push(level); }
  if (ageGroup) { conditions.push('age_group = ?'); params.push(ageGroup); }
  if (bank) { conditions.push('bank = ?'); params.push(bank); }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return db.prepare(`SELECT * FROM question_templates ${where} ORDER BY level, id`).all(...params) as QuestionTemplate[];
}

export function createTemplate(level: 'L3' | 'L4', preText: string, postText: string, variables: string[], ageGroup: AgeGroup = '8-11', bank: QuestionBank = 'practice'): QuestionTemplate {
  const db = getDb();
  const result = db.prepare('INSERT INTO question_templates (level, pre_text, post_text, variables, age_group, bank) VALUES (?, ?, ?, ?, ?, ?)').run(
    level,
    preText,
    postText,
    JSON.stringify(variables),
    ageGroup,
    bank
  );
  return db.prepare('SELECT * FROM question_templates WHERE id = ?').get(result.lastInsertRowid) as QuestionTemplate;
}

export function updateTemplate(id: number, level: 'L3' | 'L4', preText: string, postText: string, variables: string[], ageGroup?: AgeGroup, bank?: QuestionBank): QuestionTemplate | null {
  const db = getDb();
  const sets: string[] = ['level = ?', 'pre_text = ?', 'post_text = ?', 'variables = ?'];
  const params: (string | number)[] = [level, preText, postText, JSON.stringify(variables)];
  if (ageGroup) { sets.push('age_group = ?'); params.push(ageGroup); }
  if (bank) { sets.push('bank = ?'); params.push(bank); }
  params.push(id);
  const result = db.prepare(`UPDATE question_templates SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  if (result.changes === 0) return null;
  return db.prepare('SELECT * FROM question_templates WHERE id = ?').get(id) as QuestionTemplate;
}

export function deleteTemplate(id: number): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM question_templates WHERE id = ?').run(id);
  return result.changes > 0;
}
