'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function AccessPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPendingMessage(null);
    setLoading(true);

    try {
      const response = await fetch('/api/auth/site-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.status === 403) {
        setPendingMessage('Your username has been submitted for approval. Please check back later.');
        return;
      }

      if (!response.ok) {
        setError(data.error || 'Access denied');
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-full max-w-sm px-4">
        <div className="text-center mb-8">
          <Image
            src="/logo.webp"
            alt="Impromptu"
            width={200}
            height={80}
            className="mx-auto mb-4"
            priority
          />
          <h1 className="text-xl font-semibold text-gray-900">Site Access</h1>
          <p className="text-sm text-gray-600 mt-2">Enter your username and password to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              required
              autoFocus
            />
          </div>
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              required
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm text-center">{error}</p>
          )}

          {pendingMessage && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-3">
              <p className="text-green-800 text-sm text-center">{pendingMessage}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !!pendingMessage}
            className="w-full py-3 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-medium transition-colors"
          >
            {loading ? 'Verifying...' : 'Access Site'}
          </button>
        </form>
      </div>
    </div>
  );
}
