'use client';

import { useState } from 'react';

interface Template {
  id: number;
  level: 'L3' | 'L4';
  pre_text: string;
  post_text: string;
  variables: string;
  created_at: string;
}

const templateLevels: ('L3' | 'L4')[] = ['L3', 'L4'];

interface TemplatesTabProps {
  templates: Template[];
  onRefresh: () => void;
}

export default function TemplatesTab({ templates, onRefresh }: TemplatesTabProps) {
  const [templateFilterLevel, setTemplateFilterLevel] = useState<'L3' | 'L4' | 'all'>('all');

  // New template form
  const [newTemplateLevel, setNewTemplateLevel] = useState<'L3' | 'L4'>('L3');
  const [newPreText, setNewPreText] = useState('');
  const [newPostText, setNewPostText] = useState('');
  const [newVariables, setNewVariables] = useState('');
  const [addingTemplate, setAddingTemplate] = useState(false);

  // Edit state
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [editTemplateLevel, setEditTemplateLevel] = useState<'L3' | 'L4'>('L3');
  const [editPreText, setEditPreText] = useState('');
  const [editPostText, setEditPostText] = useState('');
  const [editVariables, setEditVariables] = useState('');

  const filteredTemplates = templateFilterLevel === 'all'
    ? templates
    : templates.filter(t => t.level === templateFilterLevel);

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
        onRefresh();
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
        onRefresh();
      }
    } catch (error) {
      console.error('Failed to update template:', error);
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      const response = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
      if (response.ok) onRefresh();
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  return (
    <>
      {/* Add New Template */}
      <div className="rounded-xl shadow-sm border p-6 mb-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Add Template</h2>
        <p className="text-sm mb-4 text-gray-500 dark:text-gray-400">
          Templates generate questions by combining pre-text + a random variable + post-text.<br />
          Example: &quot;Why do so many people enjoy&quot; + [fruits/pasta/rice] + &quot;so much?&quot;
        </p>
        <form onSubmit={handleAddTemplate} className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Level</label>
              <select
                value={newTemplateLevel}
                onChange={(e) => setNewTemplateLevel(e.target.value as 'L3' | 'L4')}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                {templateLevels.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Pre-text</label>
              <input
                type="text"
                value={newPreText}
                onChange={(e) => setNewPreText(e.target.value)}
                placeholder="Why do so many people enjoy"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Post-text</label>
              <input
                type="text"
                value={newPostText}
                onChange={(e) => setNewPostText(e.target.value)}
                placeholder="so much?"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Variables (comma-separated)</label>
            <input
              type="text"
              value={newVariables}
              onChange={(e) => setNewVariables(e.target.value)}
              placeholder="fruits, pasta, rice, vegetables, chocolate, ice cream"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
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
      <div className="rounded-xl shadow-sm border p-4 mb-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setTemplateFilterLevel('all')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                templateFilterLevel === 'all'
                  ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
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
                    ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Templates List */}
      <div className="rounded-xl shadow-sm border overflow-hidden bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        {filteredTemplates.length === 0 ? (
          <div className="p-8 text-center text-gray-600 dark:text-gray-400">
            No templates found. Add some templates above!
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredTemplates.map((template) => (
              <div key={template.id} className="p-4">
                {editingTemplateId === template.id ? (
                  <div className="space-y-4">
                    <div className="flex gap-4 flex-wrap">
                      <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Level</label>
                        <select
                          value={editTemplateLevel}
                          onChange={(e) => setEditTemplateLevel(e.target.value as 'L3' | 'L4')}
                          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        >
                          {templateLevels.map((level) => (
                            <option key={level} value={level}>{level}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1 min-w-[150px]">
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Pre-text</label>
                        <input
                          type="text"
                          value={editPreText}
                          onChange={(e) => setEditPreText(e.target.value)}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                      <div className="flex-1 min-w-[150px]">
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Post-text</label>
                        <input
                          type="text"
                          value={editPostText}
                          onChange={(e) => setEditPostText(e.target.value)}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Variables (comma-separated)</label>
                      <input
                        type="text"
                        value={editVariables}
                        onChange={(e) => setEditVariables(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
                        {template.level}
                      </span>
                      <span className="text-gray-900 dark:text-gray-100">
                        {template.pre_text} <span className="text-red-600 font-medium">[variable]</span> {template.post_text}
                      </span>
                      <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        Variables: {JSON.parse(template.variables).join(', ')}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditTemplate(template)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="Edit template"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                          <path d="m2.695 14.762-1.262 3.155a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.886L17.5 5.5a2.121 2.121 0 0 0-3-3L3.58 13.419a4 4 0 0 0-.885 1.343Z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
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
        <p className="mt-4 text-sm text-center text-gray-500">
          {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}
        </p>
      )}
    </>
  );
}
