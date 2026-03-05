'use client';

import { useState, useEffect, useCallback } from 'react';
import type { QuestionBank, L4Activity } from '@/lib/types';

interface CategoriesLevelProps {
  bank: QuestionBank;
}

export default function CategoriesLevel({ bank }: CategoriesLevelProps) {
  const [activities, setActivities] = useState<L4Activity[]>([]);
  const [loading, setLoading] = useState(true);

  // New activity form
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  // Batch import
  const [showBatchImport, setShowBatchImport] = useState(false);
  const [batchText, setBatchText] = useState('');
  const [importing, setImporting] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  const fetchActivities = useCallback(async () => {
    try {
      const params = new URLSearchParams({ bank });
      const response = await fetch(`/api/categories?${params}`);
      if (response.ok) {
        setActivities(await response.json());
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setLoading(false);
    }
  }, [bank]);

  useEffect(() => {
    setLoading(true);
    fetchActivities();
  }, [fetchActivities]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), bank }),
      });
      if (response.ok) {
        setNewName('');
        fetchActivities();
      }
    } catch (error) {
      console.error('Failed to add activity:', error);
    } finally {
      setAdding(false);
    }
  };

  const handleBatchImport = async () => {
    const names = batchText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (names.length === 0) return;
    setImporting(true);
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ names, bank }),
      });
      if (response.ok) {
        setBatchText('');
        setShowBatchImport(false);
        fetchActivities();
      }
    } catch (error) {
      console.error('Failed to import activities:', error);
    } finally {
      setImporting(false);
    }
  };

  const handleEdit = (activity: L4Activity) => {
    setEditingId(activity.id);
    setEditName(activity.name);
  };

  const handleUpdate = async (id: number) => {
    if (!editName.trim()) return;
    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), bank }),
      });
      if (response.ok) {
        setEditingId(null);
        fetchActivities();
      }
    } catch (error) {
      console.error('Failed to update activity:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this activity?')) return;
    try {
      const response = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      if (response.ok) fetchActivities();
    } catch (error) {
      console.error('Failed to delete activity:', error);
    }
  };

  // Generate preview of what questions look like
  const previewA = activities.length >= 2 ? activities[0].name : 'Activity A';
  const previewB = activities.length >= 2 ? activities[1].name : 'Activity B';

  return (
    <>
      {/* Explanation */}
      <div className="rounded-xl shadow-sm border p-6 mb-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">How Level 4 Works</h2>
        <p className="text-sm mb-3 text-gray-500 dark:text-gray-400">
          Two activities are randomly selected, and 4 questions are generated:
        </p>
        <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside mb-0">
          <li>Why do you prefer <span className="text-red-600 font-medium">{previewA}</span> over <span className="text-red-600 font-medium">{previewB}</span>?</li>
          <li>Why do you prefer <span className="text-red-600 font-medium">{previewB}</span> over <span className="text-red-600 font-medium">{previewA}</span>?</li>
          <li>Why do you want to do both <span className="text-red-600 font-medium">{previewA}</span> and <span className="text-red-600 font-medium">{previewB}</span>?</li>
          <li>Why do you want to do neither <span className="text-red-600 font-medium">{previewA}</span> or <span className="text-red-600 font-medium">{previewB}</span>?</li>
        </ol>
      </div>

      {/* Add Activity */}
      <div className="rounded-xl shadow-sm border p-6 mb-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Activities</h2>
          <button
            onClick={() => setShowBatchImport(!showBatchImport)}
            className="px-3 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            {showBatchImport ? 'Single Add' : 'Batch Import'}
          </button>
        </div>

        {showBatchImport ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Activities (one per line)
              </label>
              <textarea
                value={batchText}
                onChange={(e) => setBatchText(e.target.value)}
                placeholder="Music&#10;Languages&#10;Photography&#10;..."
                rows={8}
                className="w-full px-4 py-2 rounded-lg border resize-none border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
            <button
              onClick={handleBatchImport}
              disabled={importing || !batchText.trim()}
              className="px-6 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-medium"
            >
              {importing ? 'Importing...' : 'Import All'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleAdd} className="flex gap-4">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter activity name..."
              className="flex-1 min-w-[200px] px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            />
            <button
              type="submit"
              disabled={adding || !newName.trim()}
              className="px-6 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-medium"
            >
              {adding ? 'Adding...' : 'Add'}
            </button>
          </form>
        )}
      </div>

      {/* Activities List */}
      <div className="rounded-xl shadow-sm border overflow-hidden bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        {loading ? (
          <div className="p-8 text-center text-gray-600 dark:text-gray-400">Loading activities...</div>
        ) : activities.length === 0 ? (
          <div className="p-8 text-center text-gray-600 dark:text-gray-400">
            No activities found. Add some activities above!
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {activities.map((activity) => (
              <div key={activity.id} className="p-4">
                {editingId === activity.id ? (
                  <div className="flex gap-4 items-start">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 min-w-[200px] px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdate(activity.id)}
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
                  <div className="group flex justify-between items-center gap-4">
                    <span className="text-gray-900 dark:text-gray-100">{activity.name}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(activity)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="Edit activity"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                          <path d="m2.695 14.762-1.262 3.155a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.886L17.5 5.5a2.121 2.121 0 0 0-3-3L3.58 13.419a4 4 0 0 0-.885 1.343Z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(activity.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="Delete activity"
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

      {!loading && activities.length > 0 && (
        <p className="mt-4 text-sm text-center text-gray-500">
          {activities.length} activit{activities.length !== 1 ? 'ies' : 'y'}
        </p>
      )}
    </>
  );
}
