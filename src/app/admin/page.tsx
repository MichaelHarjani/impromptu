'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { QuestionWithFeedback } from '@/lib/types';
import AdminHeader from './components/AdminHeader';
import QuestionsTab from './components/QuestionsTab';
import TemplatesTab from './components/TemplatesTab';
import FeedbackTab from './components/FeedbackTab';
import LogsTab from './components/LogsTab';
import LuckyNumbersTab from './components/LuckyNumbersTab';
import SettingsTab from './components/SettingsTab';
import UsersTab from './components/UsersTab';

type Tab = 'questions' | 'templates' | 'feedback' | 'users' | 'logs' | 'lucky-numbers' | 'settings';

interface Template {
  id: number;
  level: 'L3' | 'L4';
  pre_text: string;
  post_text: string;
  variables: string;
  created_at: string;
}

const tabs: { value: Tab; label: string }[] = [
  { value: 'questions', label: 'Questions' },
  { value: 'templates', label: 'Templates (L3/L4)' },
  { value: 'feedback', label: 'Feedback Review' },
  { value: 'users', label: 'Users' },
  { value: 'logs', label: 'Access Logs' },
  { value: 'lucky-numbers', label: 'Lucky Numbers' },
  { value: 'settings', label: 'Settings' },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('questions');
  const [questions, setQuestions] = useState<QuestionWithFeedback[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);

  const checkSession = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();
      if (!data.isLoggedIn) {
        router.push('/access');
      } else {
        setIsLoggedIn(true);
      }
    } catch {
      router.push('/access');
    }
  }, [router]);

  const fetchQuestions = useCallback(async () => {
    try {
      const response = await fetch('/api/questions');
      if (response.status === 401) { router.push('/access'); return; }
      const data = await response.json();
      setQuestions(data);
    } catch (error) {
      console.error('Failed to fetch questions:', error);
    } finally {
      setQuestionsLoading(false);
    }
  }, [router]);

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await fetch('/api/templates');
      if (response.status === 401) { router.push('/access'); return; }
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  }, [router]);

  useEffect(() => { checkSession(); }, [checkSession]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchQuestions();
      fetchTemplates();
    }
  }, [isLoggedIn, fetchQuestions, fetchTemplates]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/access');
  };

  const handleEditFromFeedback = () => {
    setActiveTab('questions');
  };

  const handleDeleteQuestion = async (id: number) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    try {
      const response = await fetch(`/api/questions/${id}`, { method: 'DELETE' });
      if (response.ok) fetchQuestions();
    } catch (error) {
      console.error('Failed to delete question:', error);
    }
  };

  const feedbackCount = questions.filter(q => q.thumbs_up > 0 || q.thumbs_down > 0).length;

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

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
          {tabs.map((tab) => (
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
              {tab.value === 'feedback' && feedbackCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700">
                  {feedbackCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'questions' && (
          <QuestionsTab
            questions={questions}
            loading={questionsLoading}
            onRefresh={fetchQuestions}
          />
        )}

        {activeTab === 'templates' && (
          <TemplatesTab
            templates={templates}
            onRefresh={fetchTemplates}
          />
        )}

        {activeTab === 'feedback' && (
          <FeedbackTab
            questions={questions}
            onEditQuestion={handleEditFromFeedback}
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
