'use client';

import { useState, useCallback, useEffect } from 'react';

interface EmailUserWithStats {
  id: number;
  email: string;
  approved: number;
  is_admin: number;
  created_at: string;
  activity_count: number;
  last_active: string | null;
}

interface ActivityItem {
  id: number;
  question_type: string;
  level: string;
  question_text?: string;
  created_at: string;
}

interface UsersTabProps {
  isActive: boolean;
}

export default function UsersTab({ isActive }: UsersTabProps) {
  const [users, setUsers] = useState<EmailUserWithStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activitiesTotal, setActivitiesTotal] = useState(0);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [toggling, setToggling] = useState<number | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isActive) fetchUsers();
  }, [isActive, fetchUsers]);

  const fetchUserActivity = async (userId: number) => {
    setActivitiesLoading(true);
    try {
      const response = await fetch(`/api/users/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
        setActivitiesTotal(data.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch user activity:', error);
    } finally {
      setActivitiesLoading(false);
    }
  };

  const toggleExpand = (userId: number) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      setActivities([]);
    } else {
      setExpandedUserId(userId);
      fetchUserActivity(userId);
    }
  };

  const handleToggleApproval = async (user: EmailUserWithStats) => {
    setToggling(user.id);
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: !user.approved }),
      });
      if (response.ok) fetchUsers();
    } catch (error) {
      console.error('Failed to toggle approval:', error);
    } finally {
      setToggling(null);
    }
  };

  const handleToggleAdmin = async (user: EmailUserWithStats) => {
    setToggling(user.id);
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_admin: !user.is_admin }),
      });
      if (response.ok) fetchUsers();
    } catch (error) {
      console.error('Failed to toggle admin:', error);
    } finally {
      setToggling(null);
    }
  };

  const handleDelete = async (userId: number) => {
    if (!confirm('Delete this user and all their activity? This cannot be undone.')) return;
    try {
      const response = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      if (response.ok) {
        if (expandedUserId === userId) setExpandedUserId(null);
        fetchUsers();
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const pendingCount = users.filter(u => !u.approved).length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex gap-4">
        <div className="rounded-xl shadow-sm border p-4 flex-1 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Users</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{users.length}</p>
        </div>
        <div className="rounded-xl shadow-sm border p-4 flex-1 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Pending Approval</p>
          <p className={`text-2xl font-bold ${pendingCount > 0 ? 'text-orange-600' : 'text-gray-900 dark:text-gray-100'}`}>{pendingCount}</p>
        </div>
        <div className="rounded-xl shadow-sm border p-4 flex-1 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Approved</p>
          <p className="text-2xl font-bold text-green-600">{users.filter(u => u.approved).length}</p>
        </div>
      </div>

      {/* Users List */}
      <div className="rounded-xl shadow-sm border overflow-hidden bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        {loading ? (
          <div className="p-8 text-center text-gray-600 dark:text-gray-400">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-600 dark:text-gray-400">
            No users yet. Users will appear here when they attempt to log in.
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {users.map((user) => (
              <div key={user.id}>
                <div className="p-4 flex items-center justify-between gap-4">
                  <button
                    onClick={() => toggleExpand(user.id)}
                    className="flex-1 text-left flex items-center gap-3 min-w-0"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className={`w-4 h-4 shrink-0 transition-transform text-gray-400 ${expandedUserId === user.id ? 'rotate-90' : ''}`}
                    >
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z" clipRule="evenodd" />
                    </svg>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user.email}</p>
                        {user.is_admin === 1 && (
                          <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {user.activity_count} question{user.activity_count !== 1 ? 's' : ''} viewed
                        {user.last_active && ` · Last active ${new Date(user.last_active).toLocaleDateString()}`}
                      </p>
                    </div>
                  </button>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleAdmin(user)}
                      disabled={toggling === user.id}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        user.is_admin
                          ? 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {toggling === user.id ? '...' : user.is_admin ? 'Admin' : 'User'}
                    </button>
                    <button
                      onClick={() => handleToggleApproval(user)}
                      disabled={toggling === user.id}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        user.approved
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-orange-100 text-orange-800 hover:bg-orange-200'
                      }`}
                    >
                      {toggling === user.id ? '...' : user.approved ? 'Approved' : 'Pending'}
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                      title="Delete user"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.519.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Expanded Activity */}
                {expandedUserId === user.id && (
                  <div className="px-4 pb-4">
                    <div className="rounded-lg border bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 overflow-hidden">
                      {activitiesLoading ? (
                        <div className="p-4 text-sm text-gray-500 dark:text-gray-400">Loading activity...</div>
                      ) : activities.length === 0 ? (
                        <div className="p-4 text-sm text-gray-500 dark:text-gray-400">No activity yet.</div>
                      ) : (
                        <>
                          <div className="p-3 border-b border-gray-200 dark:border-gray-600">
                            <p className="text-xs text-gray-500 dark:text-gray-400">{activitiesTotal} total questions viewed</p>
                          </div>
                          <div className="divide-y divide-gray-200 dark:divide-gray-600 max-h-64 overflow-y-auto">
                            {activities.map((activity) => (
                              <div key={activity.id} className="px-3 py-2 flex justify-between items-start gap-4">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="inline-block px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                                      {activity.level}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {new Date(activity.created_at).toLocaleString()}
                                    </span>
                                  </div>
                                  {activity.question_text && (
                                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 truncate">
                                      {activity.question_text}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
