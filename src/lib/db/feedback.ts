import { getDb } from './index';

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
