'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from '@/lib/theme-context';

type Level = 'L1' | 'L2' | 'L3' | 'L4' | 'L5';

interface Question {
  id: number;
  level: Level;
  text: string;
  created_at: string;
  thumbs_up: number;
  thumbs_down: number;
}

interface Template {
  id: number;
  level: 'L3' | 'L4';
  pre_text: string;
  post_text: string;
  variables: string;
  created_at: string;
}

const levels: Level[] = ['L1', 'L2', 'L3', 'L4', 'L5'];
const templateLevels: ('L3' | 'L4')[] = ['L3', 'L4'];

export default function AdminDashboard() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState<Level | 'all'>('all');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'questions' | 'templates' | 'feedback' | 'settings'>('questions');

  // Settings
  const [lockDuration, setLockDuration] = useState(30);
  const [maxNumber, setMaxNumber] = useState(1000);
  const [savingSettings, setSavingSettings] = useState(false);
  const [resetting, setResetting] = useState(false);

  // New question form
  const [newLevel, setNewLevel] = useState<Level>('L1');
  const [newText, setNewText] = useState('');
  const [adding, setAdding] = useState(false);

  // Batch import
  const [showBatchImport, setShowBatchImport] = useState(false);
  const [batchLevel, setBatchLevel] = useState<Level>('L1');
  const [batchText, setBatchText] = useState('');
  const [importing, setImporting] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLevel, setEditLevel] = useState<Level>('L1');
  const [editText, setEditText] = useState('');

  // Select mode state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [bulkLevel, setBulkLevel] = useState<Level>('L1');
  const [bulkOperating, setBulkOperating] = useState(false);

  // Templates state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateFilterLevel, setTemplateFilterLevel] = useState<'L3' | 'L4' | 'all'>('all');
  const [newTemplateLevel, setNewTemplateLevel] = useState<'L3' | 'L4'>('L3');
  const [newPreText, setNewPreText] = useState('');
  const [newPostText, setNewPostText] = useState('');
  const [newVariables, setNewVariables] = useState('');
  const [addingTemplate, setAddingTemplate] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [editTemplateLevel, setEditTemplateLevel] = useState<'L3' | 'L4'>('L3');
  const [editPreText, setEditPreText] = useState('');
  const [editPostText, setEditPostText] = useState('');
  const [editVariables, setEditVariables] = useState('');

  const checkSession = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();
      if (!data.isLoggedIn) {
        router.push('/admin/login');
      } else {
        setIsLoggedIn(true);
      }
    } catch {
      router.push('/admin/login');
    }
  }, [router]);

  const fetchQuestions = useCallback(async () => {
    try {
      const url = filterLevel === 'all'
        ? '/api/questions'
        : `/api/questions?level=${filterLevel}`;
      const response = await fetch(url);
      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }
      const data = await response.json();
      setQuestions(data);
    } catch (error) {
      console.error('Failed to fetch questions:', error);
    } finally {
      setLoading(false);
    }
  }, [filterLevel, router]);

  const fetchTemplates = useCallback(async () => {
    try {
      const url = templateFilterLevel === 'all'
        ? '/api/templates'
        : `/api/templates?level=${templateFilterLevel}`;
      const response = await fetch(url);
      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  }, [templateFilterLevel, router]);

  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setLockDuration(data.lock_duration_minutes);
        setMaxNumber(data.max_number || 1000);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchQuestions();
      fetchTemplates();
      fetchSettings();
    }
  }, [isLoggedIn, fetchQuestions, fetchTemplates, fetchSettings]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lock_duration_minutes: lockDuration,
          max_number: maxNumber,
        }),
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleResetPool = async () => {
    if (!confirm('This will reset all questions and templates back to the pool, allowing them to be shown again. Continue?')) {
      return;
    }
    setResetting(true);
    try {
      await fetch('/api/questions/reset', { method: 'POST' });
      alert('Question pool has been reset successfully!');
    } catch (error) {
      console.error('Failed to reset pool:', error);
      alert('Failed to reset pool. Please try again.');
    } finally {
      setResetting(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;

    setAdding(true);
    try {
      const response = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: newLevel, text: newText.trim() }),
      });

      if (response.ok) {
        setNewText('');
        fetchQuestions();
      }
    } catch (error) {
      console.error('Failed to add question:', error);
    } finally {
      setAdding(false);
    }
  };

  const handleBatchImport = async () => {
    const lines = batchText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length === 0) return;

    setImporting(true);
    try {
      for (const text of lines) {
        await fetch('/api/questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ level: batchLevel, text }),
        });
      }
      setBatchText('');
      setShowBatchImport(false);
      fetchQuestions();
    } catch (error) {
      console.error('Failed to import questions:', error);
    } finally {
      setImporting(false);
    }
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split('\n').slice(1);

    setImporting(true);
    try {
      for (const line of lines) {
        const match = line.match(/^"?([^",]+)"?,\s*"?(.+?)"?\s*$/);
        if (match) {
          const level = match[1].trim().toUpperCase() as Level;
          const questionText = match[2].trim().replace(/^"|"$/g, '');
          if (levels.includes(level) && questionText) {
            await fetch('/api/questions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ level, text: questionText }),
            });
          }
        }
      }
      fetchQuestions();
    } catch (error) {
      console.error('Failed to import CSV:', error);
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCSVExport = () => {
    const csvContent = 'Level,Question\n' + questions.map(q =>
      `${q.level},"${q.text.replace(/"/g, '""')}"`
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'questions.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleEdit = (question: Question) => {
    setEditingId(question.id);
    setEditLevel(question.level);
    setEditText(question.text);
  };

  const handleUpdate = async (id: number) => {
    if (!editText.trim()) return;

    try {
      const response = await fetch(`/api/questions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: editLevel, text: editText.trim() }),
      });

      if (response.ok) {
        setEditingId(null);
        fetchQuestions();
      }
    } catch (error) {
      console.error('Failed to update question:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
      const response = await fetch(`/api/questions/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchQuestions();
      }
    } catch (error) {
      console.error('Failed to delete question:', error);
    }
  };

  // Select mode handlers
  const toggleSelectMode = () => {
    setSelectMode(!selectMode);
    setSelectedIds(new Set());
    setLastSelectedIndex(null);
    setEditingId(null);
  };

  const toggleSelectQuestion = (id: number, event?: React.MouseEvent) => {
    const isShiftClick = event?.shiftKey && lastSelectedIndex !== null;

    if (isShiftClick) {
      const currentIndex = questions.findIndex(q => q.id === id);

      if (currentIndex !== -1) {
        const startIndex = Math.min(lastSelectedIndex, currentIndex);
        const endIndex = Math.max(lastSelectedIndex, currentIndex);

        const newSelected = new Set(selectedIds);
        for (let i = startIndex; i <= endIndex; i++) {
          newSelected.add(questions[i].id);
        }
        setSelectedIds(newSelected);
      }
    } else {
      const newSelected = new Set(selectedIds);
      const currentIndex = questions.findIndex(q => q.id === id);

      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      setSelectedIds(newSelected);
      setLastSelectedIndex(currentIndex !== -1 ? currentIndex : null);
    }
  };

  const selectAll = () => {
    setSelectedIds(new Set(questions.map(q => q.id)));
    setLastSelectedIndex(questions.length > 0 ? questions.length - 1 : null);
  };

  const selectNone = () => {
    setSelectedIds(new Set());
    setLastSelectedIndex(null);
  };

  const handleBulkChangeLevel = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Move ${selectedIds.size} question(s) to level ${bulkLevel}?`)) return;

    setBulkOperating(true);
    try {
      const response = await fetch('/api/questions/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds), level: bulkLevel }),
      });

      if (response.ok) {
        setSelectedIds(new Set());
        fetchQuestions();
      }
    } catch (error) {
      console.error('Failed to change level:', error);
    } finally {
      setBulkOperating(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} question(s)? This cannot be undone.`)) return;

    setBulkOperating(true);
    try {
      const response = await fetch('/api/questions/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });

      if (response.ok) {
        setSelectedIds(new Set());
        fetchQuestions();
      }
    } catch (error) {
      console.error('Failed to delete questions:', error);
    } finally {
      setBulkOperating(false);
    }
  };

  // Template handlers
  const handleAddTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPreText.trim() && !newPostText.trim()) return;
    if (!newVariables.trim()) return;

    const variables = newVariables.split(',').map(v => v.trim()).filter(v => v.length > 0);
    if (variables.length === 0) return;

    setAddingTemplate(true);
    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: newTemplateLevel,
          pre_text: newPreText.trim(),
          post_text: newPostText.trim(),
          variables,
        }),
      });

      if (response.ok) {
        setNewPreText('');
        setNewPostText('');
        setNewVariables('');
        fetchTemplates();
      }
    } catch (error) {
      console.error('Failed to add template:', error);
    } finally {
      setAddingTemplate(false);
    }
  };

  const handleEditTemplate = (template: Template) => {
    setEditingTemplateId(template.id);
    setEditTemplateLevel(template.level);
    setEditPreText(template.pre_text);
    setEditPostText(template.post_text);
    const vars = JSON.parse(template.variables);
    setEditVariables(vars.join(', '));
  };

  const handleUpdateTemplate = async (id: number) => {
    if (!editPreText.trim() && !editPostText.trim()) return;
    if (!editVariables.trim()) return;

    const variables = editVariables.split(',').map(v => v.trim()).filter(v => v.length > 0);
    if (variables.length === 0) return;

    try {
      const response = await fetch(`/api/templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: editTemplateLevel,
          pre_text: editPreText.trim(),
          post_text: editPostText.trim(),
          variables,
        }),
      });

      if (response.ok) {
        setEditingTemplateId(null);
        fetchTemplates();
      }
    } catch (error) {
      console.error('Failed to update template:', error);
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const response = await fetch(`/api/templates/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchTemplates();
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  // Get questions sorted by feedback for the feedback tab
  const feedbackQuestions = [...questions].sort((a, b) => {
    const aScore = a.thumbs_down - a.thumbs_up;
    const bScore = b.thumbs_down - b.thumbs_up;
    return bScore - aScore;
  }).filter(q => q.thumbs_up > 0 || q.thumbs_down > 0);

  // Filter templates by level
  const filteredTemplates = templateFilterLevel === 'all'
    ? templates
    : templates.filter(t => t.level === templateFilterLevel);

  if (!isLoggedIn) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Loading...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <header className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Image src="/logo.webp" alt="Logo" width={48} height={48} className="rounded" />
            <div>
              <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>Question Bank</h1>
              <Link href="/" className="text-sm text-red-600 hover:text-red-700">
                View public page
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-full transition-all ${
                theme === 'dark'
                  ? 'bg-gray-800 hover:bg-gray-700 text-yellow-400'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <span className="text-lg">{theme === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19'}</span>
            </button>
            <button
              onClick={handleLogout}
              className={`px-4 py-2 text-sm ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Logout
            </button>
          </div>
        </header>

        {/* Tabs */}
        <div className={`flex gap-1 mb-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <button
            onClick={() => setActiveTab('questions')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'questions'
                ? 'border-red-600 text-red-600'
                : theme === 'dark' ? 'border-transparent text-gray-400 hover:text-gray-200' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Questions
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'templates'
                ? 'border-red-600 text-red-600'
                : theme === 'dark' ? 'border-transparent text-gray-400 hover:text-gray-200' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Templates (L3/L4)
          </button>
          <button
            onClick={() => setActiveTab('feedback')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'feedback'
                ? 'border-red-600 text-red-600'
                : theme === 'dark' ? 'border-transparent text-gray-400 hover:text-gray-200' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Feedback Review
            {feedbackQuestions.length > 0 && (
              <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
                {feedbackQuestions.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'settings'
                ? 'border-red-600 text-red-600'
                : theme === 'dark' ? 'border-transparent text-gray-400 hover:text-gray-200' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Settings
          </button>
        </div>

        {/* Questions Tab */}
        {activeTab === 'questions' && (
          <>
            {/* Add New Question */}
            <div className={`rounded-xl shadow-sm border p-6 mb-6 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex justify-between items-center mb-4">
                <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>Add Questions</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowBatchImport(!showBatchImport)}
                    className={`px-3 py-1 text-sm rounded-lg border ${theme === 'dark' ? 'border-gray-600 hover:bg-gray-700 text-gray-300' : 'border-gray-300 hover:bg-gray-50 text-gray-700'}`}
                  >
                    {showBatchImport ? 'Single Add' : 'Batch Import'}
                  </button>
                  <label className={`px-3 py-1 text-sm rounded-lg border cursor-pointer ${theme === 'dark' ? 'border-gray-600 hover:bg-gray-700 text-gray-300' : 'border-gray-300 hover:bg-gray-50 text-gray-700'}`}>
                    Import CSV
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleCSVImport}
                      className="hidden"
                    />
                  </label>
                  <button
                    onClick={handleCSVExport}
                    className={`px-3 py-1 text-sm rounded-lg border ${theme === 'dark' ? 'border-gray-600 hover:bg-gray-700 text-gray-300' : 'border-gray-300 hover:bg-gray-50 text-gray-700'}`}
                  >
                    Export CSV
                  </button>
                </div>
              </div>

              {showBatchImport ? (
                <div className="space-y-4">
                  <div className="flex gap-4 items-start">
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Level</label>
                      <select
                        value={batchLevel}
                        onChange={(e) => setBatchLevel(e.target.value as Level)}
                        className={`px-3 py-2 rounded-lg border ${theme === 'dark' ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'}`}
                      >
                        {levels.map((level) => (
                          <option key={level} value={level}>{level}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Questions (one per line)
                      </label>
                      <textarea
                        value={batchText}
                        onChange={(e) => setBatchText(e.target.value)}
                        placeholder="Paste your questions here, one per line..."
                        rows={6}
                        className={`w-full px-4 py-2 rounded-lg border resize-none ${theme === 'dark' ? 'border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-500' : 'border-gray-300 bg-white text-gray-900'}`}
                      />
                    </div>
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
                <form onSubmit={handleAdd} className="flex gap-4 flex-wrap">
                  <select
                    value={newLevel}
                    onChange={(e) => setNewLevel(e.target.value as Level)}
                    className={`px-3 py-2 rounded-lg border ${theme === 'dark' ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'}`}
                  >
                    {levels.map((level) => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                    placeholder="Enter question text..."
                    className={`flex-1 min-w-[200px] px-4 py-2 rounded-lg border ${theme === 'dark' ? 'border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-500' : 'border-gray-300 bg-white text-gray-900'}`}
                  />
                  <button
                    type="submit"
                    disabled={adding || !newText.trim()}
                    className="px-6 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-medium"
                  >
                    {adding ? 'Adding...' : 'Add'}
                  </button>
                </form>
              )}
            </div>

            {/* Filter and Select Mode */}
            <div className={`rounded-xl shadow-sm border p-4 mb-6 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Filter:</span>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setFilterLevel('all')}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                        filterLevel === 'all'
                          ? theme === 'dark' ? 'bg-gray-100 text-gray-900' : 'bg-gray-900 text-white'
                          : theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      All
                    </button>
                    {levels.map((level) => (
                      <button
                        key={level}
                        onClick={() => setFilterLevel(level)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                          filterLevel === level
                            ? theme === 'dark' ? 'bg-gray-100 text-gray-900' : 'bg-gray-900 text-white'
                            : theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={toggleSelectMode}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectMode
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {selectMode ? 'Exit Select Mode' : 'Select Mode'}
                </button>
              </div>
            </div>

            {/* Bulk Actions Bar */}
            {selectMode && selectedIds.size > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl shadow-sm p-4 mb-6">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-red-900">
                      {selectedIds.size} question{selectedIds.size !== 1 ? 's' : ''} selected
                    </span>
                    <button
                      onClick={selectAll}
                      className="px-3 py-1 text-xs rounded-lg bg-red-100 text-red-700 hover:bg-red-200 font-medium"
                    >
                      Select All
                    </button>
                    <button
                      onClick={selectNone}
                      className="px-3 py-1 text-xs rounded-lg bg-red-100 text-red-700 hover:bg-red-200 font-medium"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-red-900">Move to:</label>
                      <select
                        value={bulkLevel}
                        onChange={(e) => setBulkLevel(e.target.value as Level)}
                        className="px-3 py-1 rounded-lg border border-red-300 bg-white text-gray-900 text-sm"
                        disabled={bulkOperating}
                      >
                        {levels.map((level) => (
                          <option key={level} value={level}>{level}</option>
                        ))}
                      </select>
                      <button
                        onClick={handleBulkChangeLevel}
                        disabled={bulkOperating}
                        className="px-4 py-1 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-sm font-medium"
                      >
                        {bulkOperating ? 'Moving...' : 'Move'}
                      </button>
                    </div>
                    <button
                      onClick={handleBulkDelete}
                      disabled={bulkOperating}
                      className="px-4 py-1 rounded-lg bg-red-700 hover:bg-red-800 disabled:bg-red-400 text-white text-sm font-medium"
                    >
                      {bulkOperating ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Questions List */}
            <div className={`rounded-xl shadow-sm border overflow-hidden ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              {loading ? (
                <div className={`p-8 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Loading questions...</div>
              ) : questions.length === 0 ? (
                <div className={`p-8 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  No questions found. Add some questions above!
                </div>
              ) : (
                <div className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {questions.map((question) => (
                    <div
                      key={question.id}
                      className={`p-4 transition-colors ${
                        selectMode && selectedIds.has(question.id) ? 'bg-red-50' : ''
                      }`}
                    >
                      {selectMode ? (
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(question.id)}
                            onChange={() => {}}
                            onClick={(e) => toggleSelectQuestion(question.id, e)}
                            className="mt-1 w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500 cursor-pointer"
                          />
                          <div className="flex-1">
                            <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 mr-3">
                              {question.level}
                            </span>
                            <span className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>{question.text}</span>
                            {(question.thumbs_up > 0 || question.thumbs_down > 0) && (
                              <span className="ml-3 text-xs text-gray-400">
                                <span className="text-green-600">+{question.thumbs_up}</span>
                                {' / '}
                                <span className="text-red-600">-{question.thumbs_down}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      ) : editingId === question.id ? (
                        <div className="flex gap-4 flex-wrap items-start">
                          <select
                            value={editLevel}
                            onChange={(e) => setEditLevel(e.target.value as Level)}
                            className={`px-3 py-2 rounded-lg border ${theme === 'dark' ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'}`}
                          >
                            {levels.map((level) => (
                              <option key={level} value={level}>{level}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className={`flex-1 min-w-[200px] px-4 py-2 rounded-lg border ${theme === 'dark' ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'}`}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdate(question.id)}
                              className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className={`px-4 py-2 rounded-lg text-sm font-medium ${theme === 'dark' ? 'bg-gray-600 hover:bg-gray-500 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="group flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 mr-3">
                              {question.level}
                            </span>
                            <span className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>{question.text}</span>
                            {(question.thumbs_up > 0 || question.thumbs_down > 0) && (
                              <span className="ml-3 text-xs text-gray-400">
                                <span className="text-green-600">+{question.thumbs_up}</span>
                                {' / '}
                                <span className="text-red-600">-{question.thumbs_down}</span>
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => handleEdit(question)}
                            className={`opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg shrink-0 ${theme === 'dark' ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                            title="Edit question"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                              <path d="m2.695 14.762-1.262 3.155a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.886L17.5 5.5a2.121 2.121 0 0 0-3-3L3.58 13.419a4 4 0 0 0-.885 1.343Z" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!loading && questions.length > 0 && (
              <p className={`mt-4 text-sm text-center ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                {questions.length} question{questions.length !== 1 ? 's' : ''}
              </p>
            )}
          </>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <>
            {/* Add New Template */}
            <div className={`rounded-xl shadow-sm border p-6 mb-6 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <h2 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>Add Template</h2>
              <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Templates generate questions by combining pre-text + a random variable + post-text.<br />
                Example: &quot;Why do so many people enjoy&quot; + [fruits/pasta/rice] + &quot;so much?&quot;
              </p>
              <form onSubmit={handleAddTemplate} className="space-y-4">
                <div className="flex gap-4 flex-wrap">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Level</label>
                    <select
                      value={newTemplateLevel}
                      onChange={(e) => setNewTemplateLevel(e.target.value as 'L3' | 'L4')}
                      className={`px-3 py-2 rounded-lg border ${theme === 'dark' ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'}`}
                    >
                      {templateLevels.map((level) => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 min-w-[150px]">
                    <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Pre-text</label>
                    <input
                      type="text"
                      value={newPreText}
                      onChange={(e) => setNewPreText(e.target.value)}
                      placeholder="Why do so many people enjoy"
                      className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-500' : 'border-gray-300 bg-white text-gray-900'}`}
                    />
                  </div>
                  <div className="flex-1 min-w-[150px]">
                    <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Post-text</label>
                    <input
                      type="text"
                      value={newPostText}
                      onChange={(e) => setNewPostText(e.target.value)}
                      placeholder="so much?"
                      className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-500' : 'border-gray-300 bg-white text-gray-900'}`}
                    />
                  </div>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Variables (comma-separated)</label>
                  <input
                    type="text"
                    value={newVariables}
                    onChange={(e) => setNewVariables(e.target.value)}
                    placeholder="fruits, pasta, rice, vegetables, chocolate, ice cream"
                    className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-500' : 'border-gray-300 bg-white text-gray-900'}`}
                  />
                </div>
                <button
                  type="submit"
                  disabled={addingTemplate || (!newPreText.trim() && !newPostText.trim()) || !newVariables.trim()}
                  className="px-6 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-medium"
                >
                  {addingTemplate ? 'Adding...' : 'Add Template'}
                </button>
              </form>
            </div>

            {/* Filter Templates */}
            <div className={`rounded-xl shadow-sm border p-4 mb-6 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center gap-4">
                <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Filter:</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTemplateFilterLevel('all')}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                      templateFilterLevel === 'all'
                        ? theme === 'dark' ? 'bg-gray-100 text-gray-900' : 'bg-gray-900 text-white'
                        : theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    All
                  </button>
                  {templateLevels.map((level) => (
                    <button
                      key={level}
                      onClick={() => setTemplateFilterLevel(level)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                        templateFilterLevel === level
                          ? theme === 'dark' ? 'bg-gray-100 text-gray-900' : 'bg-gray-900 text-white'
                          : theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Templates List */}
            <div className={`rounded-xl shadow-sm border overflow-hidden ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              {filteredTemplates.length === 0 ? (
                <div className={`p-8 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  No templates found. Add some templates above!
                </div>
              ) : (
                <div className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {filteredTemplates.map((template) => (
                    <div key={template.id} className="p-4">
                      {editingTemplateId === template.id ? (
                        <div className="space-y-4">
                          <div className="flex gap-4 flex-wrap">
                            <div>
                              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Level</label>
                              <select
                                value={editTemplateLevel}
                                onChange={(e) => setEditTemplateLevel(e.target.value as 'L3' | 'L4')}
                                className={`px-3 py-2 rounded-lg border ${theme === 'dark' ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'}`}
                              >
                                {templateLevels.map((level) => (
                                  <option key={level} value={level}>{level}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex-1 min-w-[150px]">
                              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Pre-text</label>
                              <input
                                type="text"
                                value={editPreText}
                                onChange={(e) => setEditPreText(e.target.value)}
                                className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'}`}
                              />
                            </div>
                            <div className="flex-1 min-w-[150px]">
                              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Post-text</label>
                              <input
                                type="text"
                                value={editPostText}
                                onChange={(e) => setEditPostText(e.target.value)}
                                className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'}`}
                              />
                            </div>
                          </div>
                          <div>
                            <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Variables (comma-separated)</label>
                            <input
                              type="text"
                              value={editVariables}
                              onChange={(e) => setEditVariables(e.target.value)}
                              className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'}`}
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdateTemplate(template.id)}
                              className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingTemplateId(null)}
                              className={`px-4 py-2 rounded-lg text-sm font-medium ${theme === 'dark' ? 'bg-gray-600 hover:bg-gray-500 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="group flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 mr-3">
                              {template.level}
                            </span>
                            <span className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>
                              {template.pre_text} <span className="text-red-600 font-medium">[variable]</span> {template.post_text}
                            </span>
                            <div className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                              Variables: {JSON.parse(template.variables).join(', ')}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEditTemplate(template)}
                              className={`opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg ${theme === 'dark' ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                              title="Edit template"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                <path d="m2.695 14.762-1.262 3.155a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.886L17.5 5.5a2.121 2.121 0 0 0-3-3L3.58 13.419a4 4 0 0 0-.885 1.343Z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteTemplate(template.id)}
                              className={`opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg ${theme === 'dark' ? 'text-gray-500 hover:text-red-400 hover:bg-gray-700' : 'text-gray-400 hover:text-red-600 hover:bg-gray-100'}`}
                              title="Delete template"
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

            {filteredTemplates.length > 0 && (
              <p className={`mt-4 text-sm text-center ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}
              </p>
            )}
          </>
        )}

        {/* Feedback Tab */}
        {activeTab === 'feedback' && (
          <div className={`rounded-xl shadow-sm border overflow-hidden ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            {feedbackQuestions.length === 0 ? (
              <div className={`p-8 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                No feedback yet. Questions will appear here once students start voting.
              </div>
            ) : (
              <>
                <div className={`p-4 border-b ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    Questions sorted by feedback (most thumbs down first). Review these for potential edits or removal.
                  </p>
                </div>
                <div className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {feedbackQuestions.map((question) => (
                    <div key={question.id} className="p-4 flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 mr-3">
                          {question.level}
                        </span>
                        <span className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>{question.text}</span>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="flex items-center gap-1 text-green-600">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                              <path d="M1 8.25a1.25 1.25 0 1 1 2.5 0v7.5a1.25 1.25 0 1 1-2.5 0v-7.5ZM11 3V1.7c0-.268.14-.526.395-.607A2 2 0 0 1 14 3c0 .995-.182 1.948-.514 2.826-.204.54.166 1.174.744 1.174h2.52c1.243 0 2.261 1.01 2.146 2.247a23.864 23.864 0 0 1-1.341 5.974C17.153 16.323 16.072 17 14.9 17h-3.192a3 3 0 0 1-1.341-.317l-2.734-1.366A3 3 0 0 0 6.292 15H5V8h1.292c.86 0 1.705-.245 2.433-.703l1.618-1.018A5.978 5.978 0 0 0 11 3Z" />
                            </svg>
                            {question.thumbs_up}
                          </span>
                          <span className="flex items-center gap-1 text-red-600">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                              <path d="M19 11.75a1.25 1.25 0 1 0-2.5 0v7.5a1.25 1.25 0 1 0 2.5 0v-7.5ZM9 17v1.3c0 .268-.14.526-.395.607A2 2 0 0 1 6 17c0-.995.182-1.948.514-2.826.204-.54-.166-1.174-.744-1.174h-2.52c-1.243 0-2.261-1.01-2.146-2.247.193-2.08.651-4.082 1.341-5.974C2.847 3.677 3.928 3 5.1 3h3.192a3 3 0 0 1 1.341.317l2.734 1.366A3 3 0 0 0 13.708 5H15v7h-1.292a3 3 0 0 0-2.433.703l-1.618 1.018A5.978 5.978 0 0 0 9 17Z" />
                            </svg>
                            {question.thumbs_down}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setActiveTab('questions');
                            handleEdit(question);
                          }}
                          className={`px-3 py-1 rounded-lg text-sm ${theme === 'dark' ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(question.id)}
                          className="px-3 py-1 rounded-lg text-sm text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className={`rounded-xl shadow-sm border p-6 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className={`text-lg font-semibold mb-6 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>Settings</h2>

            <div className="space-y-6">
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Question Lock Duration
                </label>
                <p className={`text-sm mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  After a question is shown, it won&apos;t appear again for this duration. Set to 0 to disable.
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={lockDuration}
                    onChange={(e) => setLockDuration(parseInt(e.target.value) || 0)}
                    min="0"
                    max="1440"
                    className={`w-24 px-3 py-2 rounded-lg border ${theme === 'dark' ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'}`}
                  />
                  <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>minutes</span>
                </div>
                <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                  Default: 30 minutes. Max: 1440 minutes (24 hours).
                </p>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Maximum Lucky Number
                </label>
                <p className={`text-sm mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Maximum value allowed for the lucky number input on the public page. Students cannot enter numbers above this value.
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={maxNumber}
                    onChange={(e) => setMaxNumber(parseInt(e.target.value) || 1)}
                    min="1"
                    max="10000"
                    className={`w-24 px-3 py-2 rounded-lg border ${theme === 'dark' ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'}`}
                  />
                  <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>(0 to {maxNumber})</span>
                </div>
                <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                  Default: 1000. Range: 1 to 10000.
                </p>
              </div>

              <button
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className={`px-6 py-2 rounded-lg font-medium ${theme === 'dark' ? 'bg-gray-100 hover:bg-gray-200 disabled:bg-gray-500 text-gray-900' : 'bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white'}`}
              >
                {savingSettings ? 'Saving...' : 'Save Settings'}
              </button>

              {/* Reset Pool Section */}
              <div className={`mt-8 pt-6 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <h3 className={`text-md font-semibold mb-2 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>Reset Question Pool</h3>
                <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  This will clear the history of shown questions and template combinations, allowing all questions to be shown again.
                  Use this when starting a new session or class.
                </p>
                <button
                  onClick={handleResetPool}
                  disabled={resetting}
                  className="px-6 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-medium"
                >
                  {resetting ? 'Resetting...' : 'Reset Pool'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
