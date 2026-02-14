'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Level, GeneratedQuestion } from '@/lib/types';

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
  const [question, setQuestion] = useState<GeneratedQuestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voted, setVoted] = useState<'up' | 'down' | null>(null);
  const [maxNumber, setMaxNumber] = useState(1000);
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerFinished, setTimerFinished] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetTimer = useCallback(() => {
    stopTimer();
    setTimerRunning(false);
    setElapsedSeconds(0);
    setTimerFinished(false);
  }, [stopTimer]);

  const startTimer = () => {
    setTimerRunning(true);
    setTimerFinished(false);
    setElapsedSeconds(0);
    timerRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
  };

  const endTimer = () => {
    stopTimer();
    setTimerRunning(false);
    setTimerFinished(true);
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  useEffect(() => {
    fetch('/api/settings/public')
      .then(res => res.json())
      .then(data => {
        if (data.max_number) setMaxNumber(data.max_number);
      })
      .catch(() => {});
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
    resetTimer();

    try {
      const response = await fetch(`/api/questions/random?level=${selectedLevel}&number=${num}`);
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

  const questionBgClass = timerRunning || timerFinished
    ? elapsedSeconds >= 90
      ? 'bg-red-100 dark:bg-red-900/30'
      : elapsedSeconds >= 60
        ? 'bg-yellow-300 dark:bg-yellow-500/40'
        : 'bg-gray-50 dark:bg-gray-800'
    : 'bg-gray-50 dark:bg-gray-800';

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900">
      {/* Admin Link - Top Left */}
      <div className="fixed top-4 left-4 z-50">
        <Link
          href="/admin"
          className="text-xs transition-colors text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400"
        >
          Admin
        </Link>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center pt-8 pb-40 px-4">
        {/* Logo */}
        <div className="mb-4 rounded-lg dark:bg-white dark:px-[15px] dark:py-2">
          <Image
            src="/logo-transparent.png"
            alt="Leaders of Tomorrow"
            width={500}
            height={200}
            priority
            className="w-auto h-auto max-w-[80vw]"
          />
        </div>

        {/* Subtitle */}
        <h1 className="text-lg md:text-xl font-medium tracking-wide mb-16 text-gray-600 dark:text-gray-400">
          IMPROMPTU QUESTION GENERATOR
        </h1>

        {/* Question Display */}
        <div className="w-full max-w-3xl">
          {question ? (
            <div>
              <div className="flex">
                <div className={`flex-1 border-l-4 border-red-600 p-8 rounded-r-lg transition-colors duration-500 ${questionBgClass}`}>
                  <p className="text-2xl md:text-4xl font-medium leading-relaxed text-gray-900 dark:text-gray-100">
                    {question.text}
                  </p>
                </div>
                {/* Thumbs up/down */}
                <div className="flex flex-col justify-center gap-1 ml-3">
                  <button
                    onClick={() => handleVote('up')}
                    disabled={voted !== null}
                    className={`p-2 rounded-full transition-all ${
                      voted === 'up'
                        ? 'text-green-500 bg-green-900/30'
                        : voted === 'down'
                        ? 'text-gray-200 dark:text-gray-600'
                        : 'text-gray-300 dark:text-gray-500 hover:text-green-500 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30'
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
                        ? 'text-red-500 bg-red-900/30'
                        : voted === 'up'
                        ? 'text-gray-200 dark:text-gray-600'
                        : 'text-gray-300 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30'
                    }`}
                    title="Needs review"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 rotate-180">
                      <path d="M1 8.25a1.25 1.25 0 1 1 2.5 0v7.5a1.25 1.25 0 1 1-2.5 0v-7.5ZM11 3V1.7c0-.268.14-.526.395-.607A2 2 0 0 1 14 3c0 .995-.182 1.948-.514 2.826-.204.54.166 1.174.744 1.174h2.52c1.243 0 2.261 1.01 2.146 2.247a23.864 23.864 0 0 1-1.341 5.974C17.153 16.323 16.072 17 14.9 17h-3.192a3 3 0 0 1-1.341-.317l-2.734-1.366A3 3 0 0 0 6.292 15H5V8h1.292c.86 0 1.705-.245 2.433-.703l1.618-1.018A5.978 5.978 0 0 0 11 3Z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Timer Controls */}
              <div className="mt-4 flex items-center justify-center gap-4">
                {!timerRunning && !timerFinished && (
                  <button
                    onClick={startTimer}
                    className="px-6 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition-colors"
                  >
                    Start
                  </button>
                )}
                {timerRunning && (
                  <button
                    onClick={endTimer}
                    className="px-6 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors"
                  >
                    End
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="border-l-4 p-8 rounded-r-lg bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600">
              <p className="text-2xl md:text-4xl leading-relaxed text-gray-300 dark:text-gray-500">
                Your question will appear here...
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Fixed Bottom Controls */}
      <div className="fixed bottom-0 left-0 right-0 px-4 py-6 border-t bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-4">
          {/* Level Selector */}
          <div className="flex items-center justify-center gap-1">
            <span className="text-sm mr-2 text-gray-500 dark:text-gray-400">Level</span>
            {levels.map((level) => (
              <button
                key={level.value}
                type="button"
                onClick={() => setSelectedLevel(level.value)}
                className={`w-8 h-8 rounded-full text-sm font-medium transition-all ${
                  selectedLevel === level.value
                    ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
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
              inputMode="numeric"
              pattern="[0-9]*"
              value={numberInput}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '') { setNumberInput(''); return; }
                const num = parseInt(value, 10);
                if (!isNaN(num) && num >= 0 && num <= maxNumber) {
                  setNumberInput(value);
                } else if (!isNaN(num) && num > maxNumber) {
                  setNumberInput(String(maxNumber));
                }
              }}
              onBlur={(e) => {
                const num = parseInt(e.target.value, 10);
                if (!isNaN(num)) {
                  if (num < 0) setNumberInput('0');
                  else if (num > maxNumber) setNumberInput(String(maxNumber));
                }
              }}
              min="0"
              max={maxNumber}
              placeholder={`Lucky number (0-${maxNumber})`}
              className="flex-1 px-6 py-5 rounded-lg border text-center text-2xl font-medium focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-12 py-5 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-semibold text-2xl transition-colors"
            >
              {loading ? '...' : 'Go'}
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <p className="text-red-500 text-center text-sm">{error}</p>
          )}
        </form>
      </div>
    </div>
  );
}
