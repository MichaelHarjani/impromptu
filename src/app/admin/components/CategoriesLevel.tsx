'use client';

import { useState, useEffect, useCallback } from 'react';
import type { QuestionBank, L4Category } from '@/lib/types';

interface CategoriesLevelProps {
  bank: QuestionBank;
}

export default function CategoriesLevel({ bank }: CategoriesLevelProps) {
  const [categories, setCategories] = useState<L4Category[]>([]);
  const [loading, setLoading] = useState(true);

  // New category form
  const [newName, setNewName] = useState('');
  const [newQ1, setNewQ1] = useState('');
  const [newQ2, setNewQ2] = useState('');
  const [newQ3, setNewQ3] = useState('');
  const [newQ4, setNewQ4] = useState('');
  const [adding, setAdding] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editQ1, setEditQ1] = useState('');
  const [editQ2, setEditQ2] = useState('');
  const [editQ3, setEditQ3] = useState('');
  const [editQ4, setEditQ4] = useState('');

  const fetchCategories = useCallback(async () => {
    try {
      const params = new URLSearchParams({ bank });
      const response = await fetch(`/api/categories?${params}`);
      if (response.ok) {
        setCategories(await response.json());
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoading(false);
    }
  }, [bank]);

  useEffect(() => {
    setLoading(true);
    fetchCategories();
  }, [fetchCategories]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newQ1.trim() || !newQ2.trim() || !newQ3.trim() || !newQ4.trim()) return;

    setAdding(true);
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          questions: [newQ1.trim(), newQ2.trim(), newQ3.trim(), newQ4.trim()],
          bank,
        }),
      });
      if (response.ok) {
        setNewName('');
        setNewQ1('');
        setNewQ2('');
        setNewQ3('');
        setNewQ4('');
        fetchCategories();
      }
    } catch (error) {
      console.error('Failed to add category:', error);
    } finally {
      setAdding(false);
    }
  };

  const handleEdit = (category: L4Category) => {
    setEditingId(category.id);
    setEditName(category.name);
    const qs = JSON.parse(category.questions);
    setEditQ1(qs[0] || '');
    setEditQ2(qs[1] || '');
    setEditQ3(qs[2] || '');
    setEditQ4(qs[3] || '');
  };

  const handleUpdate = async (id: number) => {
    if (!editName.trim() || !editQ1.trim() || !editQ2.trim() || !editQ3.trim() || !editQ4.trim()) return;
    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          questions: [editQ1.trim(), editQ2.trim(), editQ3.trim(), editQ4.trim()],
          bank,
        }),
      });
      if (response.ok) {
        setEditingId(null);
        fetchCategories();
      }
    } catch (error) {
      console.error('Failed to update category:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      const response = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      if (response.ok) fetchCategories();
    } catch (error) {
      console.error('Failed to delete category:', error);
    }
  };

  return (
    <>
      {/* Add New Category */}
      <div className="rounded-xl shadow-sm border p-6 mb-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Add Category</h2>
        <p className="text-sm mb-4 text-gray-500 dark:text-gray-400">
          Each category has a name and exactly 4 questions. During the competition, 2 categories are randomly selected and all 4 questions from each are presented.
        </p>
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Category Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g., Food, Sports, Travel..."
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Questions (4 required)</label>
            {[
              { value: newQ1, setter: setNewQ1, num: 1 },
              { value: newQ2, setter: setNewQ2, num: 2 },
              { value: newQ3, setter: setNewQ3, num: 3 },
              { value: newQ4, setter: setNewQ4, num: 4 },
            ].map(({ value, setter, num }) => (
              <div key={num} className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400 w-6">{num}.</span>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  placeholder={`Question ${num}...`}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
            ))}
          </div>
          <button
            type="submit"
            disabled={adding || !newName.trim() || !newQ1.trim() || !newQ2.trim() || !newQ3.trim() || !newQ4.trim()}
            className="px-6 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-medium"
          >
            {adding ? 'Adding...' : 'Add Category'}
          </button>
        </form>
      </div>

      {/* Categories List */}
      <div className="rounded-xl shadow-sm border overflow-hidden bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        {loading ? (
          <div className="p-8 text-center text-gray-600 dark:text-gray-400">Loading categories...</div>
        ) : categories.length === 0 ? (
          <div className="p-8 text-center text-gray-600 dark:text-gray-400">
            No categories found. Add some categories above!
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {categories.map((category) => (
              <div key={category.id} className="p-4">
                {editingId === category.id ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Category Name</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    <div className="space-y-2">
                      {[
                        { value: editQ1, setter: setEditQ1, num: 1 },
                        { value: editQ2, setter: setEditQ2, num: 2 },
                        { value: editQ3, setter: setEditQ3, num: 3 },
                        { value: editQ4, setter: setEditQ4, num: 4 },
                      ].map(({ value, setter, num }) => (
                        <div key={num} className="flex items-center gap-2">
                          <span className="text-sm text-gray-500 dark:text-gray-400 w-6">{num}.</span>
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => setter(e.target.value)}
                            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdate(category.id)}
                        className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="group flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">{category.name}</h3>
                      <ol className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400 list-decimal list-inside">
                        {JSON.parse(category.questions).map((q: string, i: number) => (
                          <li key={i}>{q}</li>
                        ))}
                      </ol>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(category)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="Edit category"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                          <path d="m2.695 14.762-1.262 3.155a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.886L17.5 5.5a2.121 2.121 0 0 0-3-3L3.58 13.419a4 4 0 0 0-.885 1.343Z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="Delete category"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                          <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.519.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {!loading && categories.length > 0 && (
        <p className="mt-4 text-sm text-center text-gray-500">
          {categories.length} categor{categories.length !== 1 ? 'ies' : 'y'}
        </p>
      )}
    </>
  );
}
