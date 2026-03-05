'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { QuestionBank, QuestionWithFeedback } from '@/lib/types';
import AdminHeader from './components/AdminHeader';
import SimpleQuestionsLevel from './components/SimpleQuestionsLevel';
import TemplatesLevel from './components/TemplatesLevel';
import CategoriesLevel from './components/CategoriesLevel';
import FeedbackTab from './components/FeedbackTab';
import LogsTab from './components/LogsTab';
import LuckyNumbersTab from './components/LuckyNumbersTab';
import SettingsTab from './components/SettingsTab';
import UsersTab from './components/UsersTab';
import LevelTimerSettings from './components/LevelTimerSettings';

type LevelTab = 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6';
type UtilityTab = 'feedback' | 'users' | 'logs' | 'lucky-numbers' | 'settings';
type Tab = LevelTab | UtilityTab;

const levelTabs: { value: LevelTab; label: string; description: string }[] = [
  { value: 'L1', label: 'Level 1', description: 'All About Me' },
  { value: 'L2', label: 'Level 2', description: 'Imagine That' },
  { value: 'L3', label: 'Level 3', description: 'Pick a Side' },
  { value: 'L4', label: 'Level 4', description: 'This or That' },
  { value: 'L5', label: 'Level 5', description: 'Think Critically' },
  { value: 'L6', label: 'Level 6', description: 'University Admission' },
];

const utilityTabs: { value: UtilityTab; label: string }[] = [
  { value: 'feedback', label: 'Feedback' },
  { value: 'users', label: 'Users' },
  { value: 'logs', label: 'Logs' },
  { value: 'lucky-numbers', label: 'Lucky Numbers' },
  { value: 'settings', label: 'Settings' },
];

const banks: { value: QuestionBank; label: string }[] = [
  { value: 'practice', label: 'Practice' },
  { value: 'competition', label: 'Competition' },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('L1');
  const [selectedBank, setSelectedBank] = useState<QuestionBank>('practice');

  // For feedback tab - fetch all questions
  const [questions, setQuestions] = useState<QuestionWithFeedback[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const [sessionRes, settingsRes] = await Promise.all([
          fetch('/api/auth/session'),
          fetch('/api/settings/public'),
        ]);
        const sessionData = await sessionRes.json();
        if (!sessionData.isLoggedIn) {
          router.push('/access');
          return;
        }
        if (!cancelled) setIsLoggedIn(true);
        const settingsData = await settingsRes.json();
        if (!cancelled && settingsData.active_bank) setSelectedBank(settingsData.active_bank);
      } catch {
        router.push('/access');
      }
    }
    init();
    return () => { cancelled = true; };
  }, [router]);

  const handleBankChange = async (newBank: QuestionBank) => {
    setSelectedBank(newBank);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active_bank: newBank }),
      });
    } catch {
      // Setting will still work locally
    }
  };

  useEffect(() => {
    if (!isLoggedIn || activeTab !== 'feedback') return;
    let cancelled = false;
    async function load() {
      try {
        const params = new URLSearchParams({ bank: selectedBank });
        const response = await fetch(`/api/questions?${params}`);
        if (response.ok && !cancelled) {
          setQuestions(await response.json());
        }
      } catch (error) {
        console.error('Failed to fetch questions:', error);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [isLoggedIn, activeTab, selectedBank]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/access');
  };

  const handleDeleteQuestion = async (id: number) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    try {
      const response = await fetch(`/api/questions/${id}`, { method: 'DELETE' });
      if (response.ok) {
        // Re-fetch questions for feedback tab
        const params = new URLSearchParams({ bank: selectedBank });
        const res = await fetch(`/api/questions?${params}`);
        if (res.ok) setQuestions(await res.json());
      }
    } catch (error) {
      console.error('Failed to delete question:', error);
    }
  };

  const feedbackCount = questions.filter(q => q.thumbs_up > 0 || q.thumbs_down > 0).length;

  const isLevelTab = (tab: Tab): tab is LevelTab =>
    ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'].includes(tab);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <AdminHeader onLogout={handleLogout} />

        {/* Bank Switcher */}
        <div className="flex items-center gap-4 mb-6 rounded-xl shadow-sm border p-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <div className="flex gap-1">
            {banks.map((b) => (
              <button
                key={b.value}
                onClick={() => handleBankChange(b.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  selectedBank === b.value
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* Level Tabs */}
        <div className="flex gap-1 mb-2 border-b border-gray-200 dark:border-gray-700">
          {levelTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.value
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Utility Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
          {utilityTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-3 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.value
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
              {tab.value === 'feedback' && feedbackCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700">
                  {feedbackCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Level description */}
        {isLevelTab(activeTab) && (
          <div className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            {levelTabs.find(t => t.value === activeTab)?.description}
          </div>
        )}

        {/* Level Timer + Content */}
        {isLevelTab(activeTab) && <LevelTimerSettings level={activeTab} />}
        {activeTab === 'L1' && <SimpleQuestionsLevel level="L1" bank={selectedBank} />}
        {activeTab === 'L2' && <SimpleQuestionsLevel level="L2" bank={selectedBank} />}
        {activeTab === 'L3' && <TemplatesLevel bank={selectedBank} />}
        {activeTab === 'L4' && <CategoriesLevel bank={selectedBank} />}
        {activeTab === 'L5' && <SimpleQuestionsLevel level="L5" bank={selectedBank} />}
        {activeTab === 'L6' && <SimpleQuestionsLevel level="L6" bank={selectedBank} />}

        {/* Utility Content */}
        {activeTab === 'feedback' && (
          <FeedbackTab
            questions={questions}
            onEditQuestion={() => setActiveTab('L1')}
            onDeleteQuestion={handleDeleteQuestion}
          />
        )}
        {activeTab === 'users' && <UsersTab isActive={activeTab === 'users'} />}
        {activeTab === 'logs' && <LogsTab isActive={activeTab === 'logs'} />}
        {activeTab === 'lucky-numbers' && <LuckyNumbersTab isActive={activeTab === 'lucky-numbers'} />}
        {activeTab === 'settings' && <SettingsTab isActive={activeTab === 'settings'} />}
      </div>
    </div>
  );
}
