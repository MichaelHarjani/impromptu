'use client';

import { useState, useEffect } from 'react';

interface L7CategorySettingsProps {
  onSaved?: (name: string, label: string) => void;
}

export default function L7CategorySettings({ onSaved }: L7CategorySettingsProps) {
  const [name, setName] = useState('Special Events');
  const [label, setLabel] = useState('⭐');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            if (data.l7_name) setName(data.l7_name);
            if (data.l7_label) setLabel(data.l7_label);
          }
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const handleSave = async () => {
    setError(null);
    const trimmedName = name.trim();
    const trimmedLabel = label.trim();
    if (!trimmedName) { setError('Name cannot be empty'); return; }
    if (!trimmedLabel) { setError('Emoji cannot be empty'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ l7_name: trimmedName, l7_label: trimmedLabel }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to save');
        return;
      }
      onSaved?.(trimmedName, trimmedLabel);
    } catch {
      setError('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div className="rounded-xl shadow-sm border p-4 mb-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-4 flex-wrap">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</span>

        <label className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">Emoji</span>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={8}
            className="w-16 px-2 py-1 text-base rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-center"
          />
        </label>

        <label className="flex items-center gap-2 flex-1 min-w-[200px]">
          <span className="text-xs text-gray-500 dark:text-gray-400">Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            className="flex-1 px-2 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </label>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-3 py-1 text-sm rounded-lg font-medium bg-gray-900 dark:bg-gray-100 hover:bg-gray-800 dark:hover:bg-gray-200 disabled:bg-gray-400 text-white dark:text-gray-900"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>

        {error && (
          <span className="text-xs text-red-500">{error}</span>
        )}
      </div>
    </div>
  );
}
