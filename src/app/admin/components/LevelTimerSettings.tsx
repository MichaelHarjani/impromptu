'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Level } from '@/lib/types';

interface TimerConfig {
  default_yellow: number;
  default_red: number;
  levels: Record<string, { use_default: boolean; yellow?: number; red?: number }>;
}

interface LevelTimerSettingsProps {
  level: Level;
}

export default function LevelTimerSettings({ level }: LevelTimerSettingsProps) {
  const [timerSettings, setTimerSettings] = useState<TimerConfig | null>(null);
  const [useDefault, setUseDefault] = useState(true);
  const [yellow, setYellow] = useState(60);
  const [red, setRed] = useState(90);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        const ts = data.timer_settings as TimerConfig | null;
        if (ts) {
          setTimerSettings(ts);
          const lc = ts.levels?.[level];
          if (lc) {
            setUseDefault(lc.use_default);
            setYellow(lc.yellow ?? ts.default_yellow);
            setRed(lc.red ?? ts.default_red);
          } else {
            setUseDefault(true);
            setYellow(ts.default_yellow);
            setRed(ts.default_red);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch timer settings:', error);
    }
  }, [level]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    if (!timerSettings) return;
    setSaving(true);
    try {
      const updated = {
        ...timerSettings,
        levels: {
          ...timerSettings.levels,
          [level]: useDefault
            ? { use_default: true }
            : { use_default: false, yellow, red },
        },
      };
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timer_settings: updated }),
      });
      setTimerSettings(updated);
    } catch (error) {
      console.error('Failed to save timer settings:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!timerSettings) return null;

  const effectiveYellow = useDefault ? timerSettings.default_yellow : yellow;
  const effectiveRed = useDefault ? timerSettings.default_red : red;

  return (
    <div className="rounded-xl shadow-sm border p-4 mb-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Timer</span>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useDefault}
              onChange={(e) => setUseDefault(e.target.checked)}
              className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Use default ({timerSettings.default_yellow}s / {timerSettings.default_red}s)
            </span>
          </label>
        </div>

        {!useDefault && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-yellow-400"></span>
              <input
                type="number"
                value={yellow}
                onChange={(e) => setYellow(parseInt(e.target.value) || 0)}
                min="0"
                max="600"
                className="w-16 px-2 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-center"
              />
              <span className="text-xs text-gray-500">s</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              <input
                type="number"
                value={red}
                onChange={(e) => setRed(parseInt(e.target.value) || 0)}
                min="0"
                max="600"
                className="w-16 px-2 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-center"
              />
              <span className="text-xs text-gray-500">s</span>
            </div>
          </div>
        )}

        {!useDefault && (
          <span className="text-xs text-gray-400">
            Yellow at {effectiveYellow}s, Red at {effectiveRed}s
          </span>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-3 py-1 text-sm rounded-lg font-medium bg-gray-900 dark:bg-gray-100 hover:bg-gray-800 dark:hover:bg-gray-200 disabled:bg-gray-400 text-white dark:text-gray-900"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}
