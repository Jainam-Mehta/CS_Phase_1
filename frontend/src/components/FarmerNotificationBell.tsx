/**
 * Notification Bell Component for Farmer Navbar
 * Shows unread notification count and dropdown
 */

import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';
import { getUnreadNotificationCount, getNotifications, markNotificationAsRead } from '../services/notificationService';

interface Notification {
  id: string;
  title: string;
  message?: string;
  is_read: boolean;
  created_at: string;
}

export const FarmerNotificationBell: React.FC = () => {
  const { user } = useAuthStore();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadUnreadCount();
      // Poll for new notifications every 10 seconds
      const interval = setInterval(() => {
        loadUnreadCount();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [user?.id]);

  const loadUnreadCount = async () => {
    if (!user?.id) return;
    const count = await getUnreadNotificationCount(user.id);
    setUnreadCount(count);
  };

  const loadNotifications = async () => {
    if (!user?.id || loading) return;
    try {
      setLoading(true);
      const notifs = await getNotifications(user.id, 10);
      setNotifications(notifs);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBellClick = () => {
    if (!showDropdown) {
      loadNotifications();
    }
    setShowDropdown(!showDropdown);
  };

  const handleMarkAsRead = async (notificationId: string) => {
    await markNotificationAsRead(notificationId);
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    );
    await loadUnreadCount();
  };

  return (
    <div className="relative">
      <button
        onClick={handleBellClick}
        className="relative p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 z-50">
          <div className="p-4 border-b border-gray-100 dark:border-slate-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
          </div>

          {loading ? (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No notifications</div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {notifications.map(notif => (
                <div
                  key={notif.id}
                  onClick={() => handleMarkAsRead(notif.id)}
                  className={`p-4 border-b border-gray-100 dark:border-slate-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors ${
                    notif.is_read ? 'opacity-60' : 'bg-blue-50 dark:bg-blue-900/20'
                  }`}
                >
                  <h4 className="font-medium text-sm text-gray-900 dark:text-white">
                    {notif.title}
                  </h4>
                  {notif.message && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                      {notif.message}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(notif.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
