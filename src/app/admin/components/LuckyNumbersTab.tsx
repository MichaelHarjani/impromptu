'use client';

import { useState, useCallback, useEffect } from 'react';

interface LuckyNumbersTabProps {
  isActive: boolean;
}

export default function LuckyNumbersTab({ isActive }: LuckyNumbersTabProps) {
  const [luckyStats, setLuckyStats] = useState<{ topDigits: { digit: number; count: number }[]; totalCount: number } | null>(null);
  const [luckyLoading, setLuckyLoading] = useState(false);

  const fetchLuckyNumbers = useCallback(async () => {
    setLuckyLoading(true);
    try {
      const response = await fetch('/api/stats/lucky-numbers');
      if (response.ok) {
        const data = await response.json();
        setLuckyStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch lucky numbers:', error);
    } finally {
      setLuckyLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isActive) fetchLuckyNumbers();
  }, [isActive, fetchLuckyNumbers]);

  return (
    <div className="rounded-xl shadow-sm border p-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Lucky Numbers Analytics
        </h2>
        <a
          href="/api/stats/lucky-numbers/export"
          className="px-4 py-2 text-sm rounded-lg border transition-colors border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"
        >
          Download CSV
        </a>
      </div>

      {luckyLoading ? (
        <p className="text-gray-500 dark:text-gray-400">Loading statistics...</p>
      ) : luckyStats ? (
        <div className="space-y-6">
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Total lucky numbers entered: <span className="font-semibold">{luckyStats.totalCount}</span>
            </p>
          </div>

          <div>
            <h3 className="text-md font-semibold mb-4 text-gray-800 dark:text-gray-200">
              Top 10 Most Common Digits
            </h3>
            <div className="space-y-3">
              {luckyStats.topDigits.map((stat, index) => {
                const maxCount = luckyStats.topDigits[0]?.count || 1;
                const percentage = (stat.count / maxCount) * 100;
                return (
                  <div key={stat.digit} className="flex items-center gap-4">
                    <div className="w-12 text-center">
                      <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {stat.digit}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-8 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-600">
                          <div
                            className={`h-full transition-all ${
                              index === 0
                                ? 'bg-red-600'
                                : index === 1
                                ? 'bg-orange-500'
                                : index === 2
                                ? 'bg-yellow-500'
                                : 'bg-blue-400 dark:bg-blue-500'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="w-16 text-right">
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            {stat.count}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-gray-500 dark:text-gray-400">No data available</p>
      )}
    </div>
  );
}
