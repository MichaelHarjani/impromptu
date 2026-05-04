import { getDb } from './index';
import type { Level, AgeGroup, QuestionBank, Question, QuestionWithFeedback, QuestionTemplate, L4Activity, GeneratedQuestion } from '../types';

export function getRandomQuestion(level?: Level, ageGroup?: AgeGroup, bank: QuestionBank = 'practice'): GeneratedQuestion | null {
  const db = getDb();

  const lockSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('lock_duration_minutes') as { value: string } | undefined;
  const lockMinutes = parseInt(lockSetting?.value || '30', 10);

  // L4 practice: synthesize a question from a random pair of activities.
  if (bank === 'practice' && level === 'L4') {
    return getRandomActivityQuestion(bank);
  }

  // For practice mode with L3, use template questions
  if (bank === 'practice' && level === 'L3') {
    return getRandomTemplateQuestion(level, lockMinutes, bank);
  }

  // Build dynamic WHERE clause based on bank mode
  const conditions: string[] = ['q.bank = ?'];
  const params: (string | number)[] = [bank];

  if (level) { conditions.push('q.level = ?'); params.push(level); }
  if (ageGroup) { conditions.push('q.age_group = ?'); params.push(ageGroup); }

  const where = conditions.join(' AND ');

  const question = db.prepare(`
    SELECT q.* FROM questions q
    WHERE ${where}
    AND q.id NOT IN (
      SELECT question_id FROM question_history
      WHERE shown_at > datetime('now', '-' || ? || ' minutes')
    )
    ORDER BY RANDOM()
    LIMIT 1
  `).get(...params, lockMinutes) as Question | undefined;

  if (!question) {
    const fallback = db.prepare(`
      SELECT q.* FROM questions q
      WHERE ${where}
      ORDER BY RANDOM()
      LIMIT 1
    `).get(...params) as Question | undefined;

    if (!fallback) return null;
    return { type: 'simple', id: fallback.id, text: fallback.text };
  }

  return { type: 'simple', id: question.id, text: question.text };
}

function getRandomActivityQuestion(bank: QuestionBank): GeneratedQuestion | null {
  const db = getDb();
  const activities = db.prepare('SELECT * FROM l4_activities WHERE bank = ?').all(bank) as L4Activity[];
  if (activities.length < 2) return null;

  const i = Math.floor(Math.random() * activities.length);
  let j = Math.floor(Math.random() * (activities.length - 1));
  if (j >= i) j += 1;
  const a = activities[i].name;
  const b = activities[j].name;

  const shapes = [
    `Why do you prefer ${a} over ${b}?`,
    `Why do you prefer ${b} over ${a}?`,
    `Why do you want to do both ${a} and ${b}?`,
    `Why do you want to do neither ${a} or ${b}?`,
  ];
  const text = shapes[Math.floor(Math.random() * shapes.length)];

  return { type: 'activity', id: 0, text };
}

function getRandomTemplateQuestion(level: 'L3' | 'L4', lockMinutes: number, bank: QuestionBank): GeneratedQuestion | null {
  const db = getDb();

  const templates = db.prepare('SELECT * FROM question_templates WHERE level = ? AND bank = ?').all(level, bank) as QuestionTemplate[];
  if (templates.length === 0) return null;

  const combinations: { template: QuestionTemplate; variable: string }[] = [];
  for (const template of templates) {
    const variables = JSON.parse(template.variables) as string[];
    for (const variable of variables) {
      combinations.push({ template, variable });
    }
  }

  if (combinations.length === 0) return null;

  const recentlyShown = db.prepare(`
    SELECT template_id, variable_used FROM template_history
    WHERE shown_at > datetime('now', '-' || ? || ' minutes')
  `).all(lockMinutes) as { template_id: number; variable_used: string }[];

  const recentSet = new Set(recentlyShown.map(r => `${r.template_id}:${r.variable_used}`));
  const available = combinations.filter(c => !recentSet.has(`${c.template.id}:${c.variable}`));

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

export function getAllQuestions(level?: Level, ageGroup?: AgeGroup, bank?: QuestionBank): Question[] {
  const db = getDb();
  const conditions: string[] = [];
  const params: string[] = [];
  if (level) { conditions.push('level = ?'); params.push(level); }
  if (ageGroup) { conditions.push('age_group = ?'); params.push(ageGroup); }
  if (bank) { conditions.push('bank = ?'); params.push(bank); }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return db.prepare(`SELECT * FROM questions ${where} ORDER BY level, id`).all(...params) as Question[];
}

export function getAllQuestionsWithFeedback(level?: Level, ageGroup?: AgeGroup, bank?: QuestionBank): QuestionWithFeedback[] {
  const db = getDb();
  const conditions: string[] = [];
  const params: string[] = [];
  if (level) { conditions.push('q.level = ?'); params.push(level); }
  if (ageGroup) { conditions.push('q.age_group = ?'); params.push(ageGroup); }
  if (bank) { conditions.push('q.bank = ?'); params.push(bank); }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const query = `
    SELECT
      q.*,
      COALESCE(SUM(CASE WHEN f.vote = 'up' THEN 1 ELSE 0 END), 0) as thumbs_up,
      COALESCE(SUM(CASE WHEN f.vote = 'down' THEN 1 ELSE 0 END), 0) as thumbs_down
    FROM questions q
    LEFT JOIN feedback f ON q.id = f.question_id
    ${where}
    GROUP BY q.id
    ORDER BY q.level, q.id
  `;
  return db.prepare(query).all(...params) as QuestionWithFeedback[];
}

export function createQuestion(level: Level, text: string, ageGroup: AgeGroup = '8-11', bank: QuestionBank = 'practice'): Question {
  const db = getDb();
  const result = db.prepare('INSERT INTO questions (level, text, age_group, bank) VALUES (?, ?, ?, ?)').run(level, text, ageGroup, bank);
  return db.prepare('SELECT * FROM questions WHERE id = ?').get(result.lastInsertRowid) as Question;
}

export function updateQuestion(id: number, level: Level, text: string, ageGroup?: AgeGroup, bank?: QuestionBank): Question | null {
  const db = getDb();
  const sets: string[] = ['level = ?', 'text = ?'];
  const params: (string | number)[] = [level, text];
  if (ageGroup) { sets.push('age_group = ?'); params.push(ageGroup); }
  if (bank) { sets.push('bank = ?'); params.push(bank); }
  params.push(id);
  const result = db.prepare(`UPDATE questions SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  if (result.changes === 0) return null;
  return db.prepare('SELECT * FROM questions WHERE id = ?').get(id) as Question;
}

export function deleteQuestion(id: number): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM questions WHERE id = ?').run(id);
  return result.changes > 0;
}

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
