'use client';

import { useState, useCallback, useEffect } from 'react';

interface SettingsTabProps {
  isActive: boolean;
}

export default function SettingsTab({ isActive }: SettingsTabProps) {
  const [lockDuration, setLockDuration] = useState(30);
  const [maxNumber, setMaxNumber] = useState(1000);
  const [savingSettings, setSavingSettings] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [sitePassword, setSitePassword] = useState('');
  const [ipWhitelist, setIpWhitelist] = useState<string[]>([]);
  const [ipWhitelistEnabled, setIpWhitelistEnabled] = useState(false);
  const [newIpAddress, setNewIpAddress] = useState('');

  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setLockDuration(data.lock_duration_minutes);
        setMaxNumber(data.max_number || 1000);
        setIpWhitelist(data.ip_whitelist || []);
        setIpWhitelistEnabled(data.ip_whitelist_enabled || false);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  }, []);

  useEffect(() => {
    if (isActive) fetchSettings();
  }, [isActive, fetchSettings]);

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const body: Record<string, unknown> = {
        lock_duration_minutes: lockDuration,
        max_number: maxNumber,
        ip_whitelist: ipWhitelist,
        ip_whitelist_enabled: ipWhitelistEnabled,
      };
      if (sitePassword) body.site_password = sitePassword;

      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (sitePassword) {
        setSitePassword('');
        alert('Settings saved successfully!');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddIpToWhitelist = () => {
    if (newIpAddress.trim() && !ipWhitelist.includes(newIpAddress.trim())) {
      setIpWhitelist([...ipWhitelist, newIpAddress.trim()]);
      setNewIpAddress('');
    }
  };

  const handleRemoveIpFromWhitelist = (ip: string) => {
    setIpWhitelist(ipWhitelist.filter(i => i !== ip));
  };

  const handleResetPool = async () => {
    if (!confirm('This will reset all questions and templates back to the pool, allowing them to be shown again. Continue?')) return;
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

  return (
    <div className="rounded-xl shadow-sm border p-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <h2 className="text-lg font-semibold mb-6 text-gray-900 dark:text-gray-100">Settings</h2>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Question Lock Duration
          </label>
          <p className="text-sm mb-3 text-gray-500 dark:text-gray-400">
            After a question is shown, it won&apos;t appear again for this duration. Set to 0 to disable.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={lockDuration}
              onChange={(e) => setLockDuration(parseInt(e.target.value) || 0)}
              min="0"
              max="1440"
              className="w-24 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <span className="text-gray-600 dark:text-gray-400">minutes</span>
          </div>
          <p className="text-xs mt-2 text-gray-400 dark:text-gray-500">
            Default: 30 minutes. Max: 1440 minutes (24 hours).
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Maximum Lucky Number
          </label>
          <p className="text-sm mb-3 text-gray-500 dark:text-gray-400">
            Maximum value allowed for the lucky number input on the public page. Students cannot enter numbers above this value.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={maxNumber}
              onChange={(e) => setMaxNumber(parseInt(e.target.value) || 1)}
              min="1"
              max="10000"
              className="w-24 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <span className="text-gray-600 dark:text-gray-400">(0 to {maxNumber})</span>
          </div>
          <p className="text-xs mt-2 text-gray-400 dark:text-gray-500">
            Default: 1000. Range: 1 to 10000.
          </p>
        </div>

        {/* Site Security Section */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-md font-semibold mb-4 text-gray-900 dark:text-gray-100">Site Security</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Site Password
              </label>
              <p className="text-sm mb-3 text-gray-500 dark:text-gray-400">
                Change the password required to access the site. Leave empty to keep current password.
              </p>
              <input
                type="password"
                value={sitePassword}
                onChange={(e) => setSitePassword(e.target.value)}
                placeholder="Enter new password (leave empty to keep current)"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                IP Whitelist
              </label>
              <p className="text-sm mb-3 text-gray-500 dark:text-gray-400">
                Optionally restrict access to specific IP addresses. Password authentication will still work from any IP.
              </p>
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  checked={ipWhitelistEnabled}
                  onChange={(e) => setIpWhitelistEnabled(e.target.checked)}
                  className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Enable IP whitelist</span>
              </div>
              {ipWhitelistEnabled && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newIpAddress}
                      onChange={(e) => setNewIpAddress(e.target.value)}
                      placeholder="Enter IP address"
                      className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddIpToWhitelist();
                        }
                      }}
                    />
                    <button
                      onClick={handleAddIpToWhitelist}
                      className="px-4 py-2 rounded-lg font-medium bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"
                    >
                      Add IP
                    </button>
                  </div>
                  {ipWhitelist.length > 0 && (
                    <div className="rounded-lg border p-3 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
                      <div className="flex flex-wrap gap-2">
                        {ipWhitelist.map((ip) => (
                          <span
                            key={ip}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-transparent"
                          >
                            {ip}
                            <button
                              onClick={() => handleRemoveIpFromWhitelist(ip)}
                              className="text-red-600 hover:text-red-700"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={handleSaveSettings}
          disabled={savingSettings}
          className="px-6 py-2 rounded-lg font-medium bg-gray-900 dark:bg-gray-100 hover:bg-gray-800 dark:hover:bg-gray-200 disabled:bg-gray-400 dark:disabled:bg-gray-500 text-white dark:text-gray-900"
        >
          {savingSettings ? 'Saving...' : 'Save Settings'}
        </button>

        {/* Reset Pool Section */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-md font-semibold mb-2 text-gray-900 dark:text-gray-100">Reset Question Pool</h3>
          <p className="text-sm mb-4 text-gray-500 dark:text-gray-400">
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
  );
}
