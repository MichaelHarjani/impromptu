'use client';

import { useState, useRef } from 'react';
import type { Level, QuestionWithFeedback } from '@/lib/types';

const levels: Level[] = ['L1', 'L2', 'L3', 'L4', 'L5'];

interface QuestionsTabProps {
  questions: QuestionWithFeedback[];
  loading: boolean;
  onRefresh: () => void;
}

export default function QuestionsTab({ questions, loading, onRefresh }: QuestionsTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filterLevel, setFilterLevel] = useState<Level | 'all'>('all');

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

  // Select mode
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [bulkLevel, setBulkLevel] = useState<Level>('L1');
  const [bulkOperating, setBulkOperating] = useState(false);

  const filteredQuestions = filterLevel === 'all'
    ? questions
    : questions.filter(q => q.level === filterLevel);

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
        onRefresh();
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
      onRefresh();
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
      onRefresh();
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
    const csvContent = 'Level,Question\n' + filteredQuestions.map(q =>
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

  const handleEdit = (question: QuestionWithFeedback) => {
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
        onRefresh();
      }
    } catch (error) {
      console.error('Failed to update question:', error);
    }
  };

  const toggleSelectMode = () => {
    setSelectMode(!selectMode);
    setSelectedIds(new Set());
    setLastSelectedIndex(null);
    setEditingId(null);
  };

  const toggleSelectQuestion = (id: number, event?: React.MouseEvent) => {
    const isShiftClick = event?.shiftKey && lastSelectedIndex !== null;

    if (isShiftClick) {
      const currentIndex = filteredQuestions.findIndex(q => q.id === id);
      if (currentIndex !== -1) {
        const startIndex = Math.min(lastSelectedIndex, currentIndex);
        const endIndex = Math.max(lastSelectedIndex, currentIndex);
        const newSelected = new Set(selectedIds);
        for (let i = startIndex; i <= endIndex; i++) {
          newSelected.add(filteredQuestions[i].id);
        }
        setSelectedIds(newSelected);
      }
    } else {
      const newSelected = new Set(selectedIds);
      const currentIndex = filteredQuestions.findIndex(q => q.id === id);
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
    setSelectedIds(new Set(filteredQuestions.map(q => q.id)));
    setLastSelectedIndex(filteredQuestions.length > 0 ? filteredQuestions.length - 1 : null);
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
        onRefresh();
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
        onRefresh();
      }
    } catch (error) {
      console.error('Failed to delete questions:', error);
    } finally {
      setBulkOperating(false);
    }
  };

  return (
    <>
      {/* Add New Question */}
      <div className="rounded-xl shadow-sm border p-6 mb-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Add Questions</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowBatchImport(!showBatchImport)}
              className="px-3 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              {showBatchImport ? 'Single Add' : 'Batch Import'}
            </button>
            <label className="px-3 py-1 text-sm rounded-lg border cursor-pointer border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
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
              className="px-3 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              Export CSV
            </button>
          </div>
        </div>

        {showBatchImport ? (
          <div className="space-y-4">
            <div className="flex gap-4 items-start">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Level</label>
                <select
                  value={batchLevel}
                  onChange={(e) => setBatchLevel(e.target.value as Level)}
                  className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  {levels.map((level) => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Questions (one per line)
                </label>
                <textarea
                  value={batchText}
                  onChange={(e) => setBatchText(e.target.value)}
                  placeholder="Paste your questions here, one per line..."
                  rows={6}
                  className="w-full px-4 py-2 rounded-lg border resize-none border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
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
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
              className="flex-1 min-w-[200px] px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
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
      <div className="rounded-xl shadow-sm border p-4 mb-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter:</span>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilterLevel('all')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                  filterLevel === 'all'
                    ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
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
                      ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
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
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
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
              <button onClick={selectAll} className="px-3 py-1 text-xs rounded-lg bg-red-100 text-red-700 hover:bg-red-200 font-medium">
                Select All
              </button>
              <button onClick={selectNone} className="px-3 py-1 text-xs rounded-lg bg-red-100 text-red-700 hover:bg-red-200 font-medium">
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
      <div className="rounded-xl shadow-sm border overflow-hidden bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        {loading ? (
          <div className="p-8 text-center text-gray-600 dark:text-gray-400">Loading questions...</div>
        ) : filteredQuestions.length === 0 ? (
          <div className="p-8 text-center text-gray-600 dark:text-gray-400">
            No questions found. Add some questions above!
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredQuestions.map((question) => (
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
                      <span className="text-gray-900 dark:text-gray-100">{question.text}</span>
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
                      className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      {levels.map((level) => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="flex-1 min-w-[200px] px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200"
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
                      <span className="text-gray-900 dark:text-gray-100">{question.text}</span>
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
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg shrink-0 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
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

      {!loading && filteredQuestions.length > 0 && (
        <p className="mt-4 text-sm text-center text-gray-500">
          {filteredQuestions.length} question{filteredQuestions.length !== 1 ? 's' : ''}
        </p>
      )}
    </>
  );
}
