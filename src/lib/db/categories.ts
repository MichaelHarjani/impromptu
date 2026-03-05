import { getDb } from './index';
import type { QuestionBank, L4Activity } from '../types';

export function getAllActivities(bank?: QuestionBank): L4Activity[] {
  const db = getDb();
  if (bank) {
    return db.prepare('SELECT * FROM l4_activities WHERE bank = ? ORDER BY name, id').all(bank) as L4Activity[];
  }
  return db.prepare('SELECT * FROM l4_activities ORDER BY name, id').all() as L4Activity[];
}

export function createActivity(name: string, bank: QuestionBank = 'practice'): L4Activity {
  const db = getDb();
  const result = db.prepare('INSERT INTO l4_activities (name, bank) VALUES (?, ?)').run(name, bank);
  return db.prepare('SELECT * FROM l4_activities WHERE id = ?').get(result.lastInsertRowid) as L4Activity;
}

export function updateActivity(id: number, name: string, bank?: QuestionBank): L4Activity | null {
  const db = getDb();
  const sets: string[] = ['name = ?'];
  const params: (string | number)[] = [name];
  if (bank) { sets.push('bank = ?'); params.push(bank); }
  params.push(id);
  const result = db.prepare(`UPDATE l4_activities SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  if (result.changes === 0) return null;
  return db.prepare('SELECT * FROM l4_activities WHERE id = ?').get(id) as L4Activity;
}

export function deleteActivity(id: number): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM l4_activities WHERE id = ?').run(id);
  return result.changes > 0;
}

export function bulkCreateActivities(names: string[], bank: QuestionBank = 'practice'): void {
  const db = getDb();
  const insert = db.prepare('INSERT INTO l4_activities (name, bank) VALUES (?, ?)');
  const transaction = db.transaction((items: string[]) => {
    for (const name of items) {
      insert.run(name.trim(), bank);
    }
  });
  transaction(names);
}
