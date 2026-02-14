'use client';

import { useState, useCallback, useEffect } from 'react';

interface LogsTabProps {
  isActive: boolean;
}

export default function LogsTab({ isActive }: LogsTabProps) {
  const [logs, setLogs] = useState<Array<Record<string, unknown>>>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsSuccessFilter, setLogsSuccessFilter] = useState<string>('all');
  const [logsIpFilter, setLogsIpFilter] = useState('');

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(logsPage), limit: '50' });
      if (logsSuccessFilter !== 'all') params.append('success', logsSuccessFilter);
      if (logsIpFilter) params.append('ip', logsIpFilter);

      const response = await fetch(`/api/logs?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
        setLogsTotal(data.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLogsLoading(false);
    }
  }, [logsPage, logsSuccessFilter, logsIpFilter]);

  useEffect(() => {
    if (isActive) fetchLogs();
  }, [isActive, fetchLogs]);

  return (
    <div className="rounded-xl shadow-sm border overflow-hidden bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</label>
            <select
              value={logsSuccessFilter}
              onChange={(e) => { setLogsSuccessFilter(e.target.value); setLogsPage(1); }}
              className="px-3 py-1 rounded-lg border text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All</option>
              <option value="true">Success</option>
              <option value="false">Failed</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">IP:</label>
            <input
              type="text"
              value={logsIpFilter}
              onChange={(e) => { setLogsIpFilter(e.target.value); setLogsPage(1); }}
              placeholder="Filter by IP"
              className="px-3 py-1 rounded-lg border text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <button
            onClick={fetchLogs}
            className="px-4 py-1 rounded-lg text-sm font-medium bg-gray-900 dark:bg-gray-600 hover:bg-gray-800 dark:hover:bg-gray-500 text-white dark:text-gray-200"
          >
            Refresh
          </button>
        </div>
      </div>

      {logsLoading ? (
        <div className="p-8 text-center text-gray-600 dark:text-gray-400">Loading logs...</div>
      ) : logs.length === 0 ? (
        <div className="p-8 text-center text-gray-600 dark:text-gray-400">No logs found.</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300">Timestamp</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300">IP Address</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300">Device</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {logs.map((log) => {
                  const deviceInfo = log.device_info ? JSON.parse(log.device_info as string) : null;
                  const location = log.location ? JSON.parse(log.location as string) : null;
                  return (
                    <tr key={log.id as number} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-300">
                        {new Date(log.created_at as string).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-300">
                        {log.ip_address as string}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-300">
                        {location ? `${location.city || ''}${location.city && location.country ? ', ' : ''}${location.country || ''}`.trim() || 'N/A' : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-300">
                        {deviceInfo ? `${deviceInfo.browser?.name || ''}${deviceInfo.browser?.version ? ' ' + deviceInfo.browser.version : ''}${deviceInfo.os?.name ? ' / ' + deviceInfo.os.name : ''}`.trim() || 'N/A' : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${log.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {log.success ? 'Success' : 'Failed'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {logsTotal > 50 && (
            <div className="p-4 border-t flex justify-between items-center border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Showing {((logsPage - 1) * 50) + 1}-{Math.min(logsPage * 50, logsTotal)} of {logsTotal} logs
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setLogsPage(p => Math.max(1, p - 1))}
                  disabled={logsPage === 1}
                  className="px-3 py-1 rounded-lg text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setLogsPage(p => p + 1)}
                  disabled={logsPage * 50 >= logsTotal}
                  className="px-3 py-1 rounded-lg text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
