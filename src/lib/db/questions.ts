import { getDb } from './index';
import type { Level, Question, QuestionWithFeedback, QuestionTemplate, GeneratedQuestion } from '../types';

export function getRandomQuestion(level: Level): GeneratedQuestion | null {
  const db = getDb();

  const lockSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('lock_duration_minutes') as { value: string } | undefined;
  const lockMinutes = parseInt(lockSetting?.value || '30', 10);

  if (level === 'L3' || level === 'L4') {
    return getRandomTemplateQuestion(level, lockMinutes);
  }

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

  const templates = db.prepare('SELECT * FROM question_templates WHERE level = ?').all(level) as QuestionTemplate[];
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
