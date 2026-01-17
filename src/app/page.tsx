'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

type Level = 'L1' | 'L2' | 'L3' | 'L4' | 'L5';

interface QuestionData {
  type: 'simple' | 'template';
  id: number;
  text: string;
  templateId?: number;
  variableUsed?: string;
}

const levels: { value: Level; label: string }[] = [
  { value: 'L1', label: '1' },
  { value: 'L2', label: '2' },
  { value: 'L3', label: '3' },
  { value: 'L4', label: '4' },
  { value: 'L5', label: '5' },
];

export default function Home() {
  const [selectedLevel, setSelectedLevel] = useState<Level>('L1');
  const [numberInput, setNumberInput] = useState('');
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voted, setVoted] = useState<'up' | 'down' | null>(null);
  const [maxNumber, setMaxNumber] = useState(1000);

  useEffect(() => {
    // Fetch max number setting
    fetch('/api/settings/public')
      .then(res => res.json())
      .then(data => {
        if (data.max_number) {
          setMaxNumber(data.max_number);
        }
      })
      .catch(() => {
        // Fallback to default if API fails
      });
  }, []);

  const fetchQuestion = async () => {
    if (!numberInput.trim()) {
      setError('Please enter a number');
      return;
    }

    const num = parseInt(numberInput.trim(), 10);
    if (isNaN(num) || num < 0 || num > maxNumber) {
      setError(`Please enter a number between 0 and ${maxNumber}`);
      return;
    }

    setLoading(true);
    setError(null);
    setVoted(null);

    try {
      const response = await fetch(`/api/questions/random?level=${selectedLevel}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to fetch question');
        setQuestion(null);
        return;
      }

      setQuestion(data);
    } catch {
      setError('Failed to fetch question. Please try again.');
      setQuestion(null);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (vote: 'up' | 'down') => {
    if (!question || voted) return;

    try {
      const body: Record<string, unknown> = { vote };
      if (question.type === 'simple') {
        body.questionId = question.id;
      } else {
        body.templateId = question.templateId;
        body.variableUsed = question.variableUsed;
      }

      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setVoted(vote);
    } catch {
      // Silently fail - feedback is not critical
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchQuestion();
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Main Content - with padding for fixed bottom controls */}
      <main className="flex-1 flex flex-col items-center pt-8 pb-40 px-4">
        {/* Logo - Large */}
        <div className="mb-4">
          <Image
            src="/logo.webp"
            alt="Leaders of Tomorrow"
            width={500}
            height={200}
            priority
            className="w-auto h-auto max-w-[80vw]"
          />
        </div>

        {/* Subtitle */}
        <h1 className="text-lg md:text-xl font-medium text-gray-600 tracking-wide mb-12">
          IMPROMPTU SPEAKING QUESTIONS
        </h1>

        {/* Question Display */}
        <div className="w-full max-w-3xl">
          {question ? (
            <div className="flex">
              <div className="flex-1 bg-gray-50 border-l-4 border-red-600 p-8 rounded-r-lg">
                <p className="text-2xl md:text-4xl font-medium text-gray-900 leading-relaxed">
                  {question.text}
                </p>
              </div>
              {/* Thumbs up/down - Stacked vertically on right */}
              <div className="flex flex-col justify-center gap-1 ml-3">
                <button
                  onClick={() => handleVote('up')}
                  disabled={voted !== null}
                  className={`p-2 rounded-full transition-all ${
                    voted === 'up'
                      ? 'text-green-600 bg-green-50'
                      : voted === 'down'
                      ? 'text-gray-200'
                      : 'text-gray-300 hover:text-green-500 hover:bg-green-50'
                  }`}
                  title="Good question"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path d="M1 8.25a1.25 1.25 0 1 1 2.5 0v7.5a1.25 1.25 0 1 1-2.5 0v-7.5ZM11 3V1.7c0-.268.14-.526.395-.607A2 2 0 0 1 14 3c0 .995-.182 1.948-.514 2.826-.204.54.166 1.174.744 1.174h2.52c1.243 0 2.261 1.01 2.146 2.247a23.864 23.864 0 0 1-1.341 5.974C17.153 16.323 16.072 17 14.9 17h-3.192a3 3 0 0 1-1.341-.317l-2.734-1.366A3 3 0 0 0 6.292 15H5V8h1.292c.86 0 1.705-.245 2.433-.703l1.618-1.018A5.978 5.978 0 0 0 11 3Z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleVote('down')}
                  disabled={voted !== null}
                  className={`p-2 rounded-full transition-all ${
                    voted === 'down'
                      ? 'text-red-600 bg-red-50'
                      : voted === 'up'
                      ? 'text-gray-200'
                      : 'text-gray-300 hover:text-red-500 hover:bg-red-50'
                  }`}
                  title="Needs review"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path d="M19 11.75a1.25 1.25 0 1 0-2.5 0v7.5a1.25 1.25 0 1 0 2.5 0v-7.5ZM9 17v1.3c0 .268-.14.526-.395.607A2 2 0 0 1 6 17c0-.995.182-1.948.514-2.826.204-.54-.166-1.174-.744-1.174h-2.52c-1.243 0-2.261-1.01-2.146-2.247.193-2.08.651-4.082 1.341-5.974C2.847 3.677 3.928 3 5.1 3h3.192a3 3 0 0 1 1.341.317l2.734 1.366A3 3 0 0 0 13.708 5H15v7h-1.292a3 3 0 0 0-2.433.703l-1.618 1.018A5.978 5.978 0 0 0 9 17Z" />
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border-l-4 border-gray-200 p-8 rounded-r-lg">
              <p className="text-2xl md:text-4xl text-gray-300 leading-relaxed">
                Your question will appear here...
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Fixed Bottom Controls */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-6">
        <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-4">
          {/* Level Selector - Subtle */}
          <div className="flex items-center justify-center gap-1">
            <span className="text-sm text-gray-500 mr-2">Level</span>
            {levels.map((level) => (
              <button
                key={level.value}
                type="button"
                onClick={() => setSelectedLevel(level.value)}
                className={`w-8 h-8 rounded-full text-sm font-medium transition-all ${
                  selectedLevel === level.value
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {level.label}
              </button>
            ))}
          </div>

          {/* Number Input */}
          <div className="flex gap-3">
            <input
              type="number"
              value={numberInput}
              onChange={(e) => {
                const value = e.target.value;
                // Allow empty string for clearing
                if (value === '') {
                  setNumberInput('');
                  return;
                }
                const num = parseInt(value, 10);
                // Only update if valid number within range
                if (!isNaN(num) && num >= 0 && num <= maxNumber) {
                  setNumberInput(value);
                } else if (!isNaN(num) && num > maxNumber) {
                  setNumberInput(String(maxNumber));
                }
              }}
              onBlur={(e) => {
                // Ensure value is within bounds on blur
                const num = parseInt(e.target.value, 10);
                if (!isNaN(num)) {
                  if (num < 0) {
                    setNumberInput('0');
                  } else if (num > maxNumber) {
                    setNumberInput(String(maxNumber));
                  }
                }
              }}
              min="0"
              max={maxNumber}
              placeholder={`Lucky number (0-${maxNumber})`}
              className="flex-1 px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 text-center text-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-semibold text-lg transition-colors"
            >
              {loading ? '...' : 'Go'}
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <p className="text-red-600 text-center text-sm">{error}</p>
          )}
        </form>

        {/* Admin Link */}
        <div className="text-center mt-4">
          <Link
            href="/admin/login"
            className="text-xs text-gray-300 hover:text-gray-500 transition-colors"
          >
            Admin
          </Link>
        </div>
      </div>
    </div>
  );
}
