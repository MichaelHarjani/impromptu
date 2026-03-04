import { getDb } from './index';
import type { QuestionBank, L4Category } from '../types';

export function getAllCategories(bank?: QuestionBank): L4Category[] {
  const db = getDb();
  if (bank) {
    return db.prepare('SELECT * FROM l4_categories WHERE bank = ? ORDER BY name, id').all(bank) as L4Category[];
  }
  return db.prepare('SELECT * FROM l4_categories ORDER BY name, id').all() as L4Category[];
}

export function getCategory(id: number): L4Category | null {
  const db = getDb();
  return (db.prepare('SELECT * FROM l4_categories WHERE id = ?').get(id) as L4Category) || null;
}

export function createCategory(name: string, questions: string[], bank: QuestionBank = 'practice'): L4Category {
  const db = getDb();
  const result = db.prepare('INSERT INTO l4_categories (name, questions, bank) VALUES (?, ?, ?)').run(
    name,
    JSON.stringify(questions),
    bank
  );
  return db.prepare('SELECT * FROM l4_categories WHERE id = ?').get(result.lastInsertRowid) as L4Category;
}

export function updateCategory(id: number, name: string, questions: string[], bank?: QuestionBank): L4Category | null {
  const db = getDb();
  const sets: string[] = ['name = ?', 'questions = ?'];
  const params: (string | number)[] = [name, JSON.stringify(questions)];
  if (bank) { sets.push('bank = ?'); params.push(bank); }
  params.push(id);
  const result = db.prepare(`UPDATE l4_categories SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  if (result.changes === 0) return null;
  return db.prepare('SELECT * FROM l4_categories WHERE id = ?').get(id) as L4Category;
}

export function deleteCategory(id: number): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM l4_categories WHERE id = ?').run(id);
  return result.changes > 0;
}
