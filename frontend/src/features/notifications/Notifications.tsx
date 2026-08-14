import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import RupeeIcon from '../../components/icons/RupeeIcon';
import { DoorOpen, TrendingUp, FileText, Droplets, Check, CheckCheck, Settings } from 'lucide-react';
import { useNotificationPreferencesStore } from '../../stores/useNotificationPreferencesStore';

interface Notification {
  id: string;
  icon: React.ElementType;
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  time: string;
  read: boolean;
}

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      icon: DoorOpen,
      title: 'Door Alert',
      message: 'Door remained open for 6 minutes',
      priority: 'high',
      time: '5 minutes ago',
      read: false,
    },
    {
      id: '2',
      icon: TrendingUp,
      title: 'Market Update',
      message: 'Tomato prices expected to increase 8%',
      priority: 'medium',
      time: '15 minutes ago',
      read: false,
    },
    {
      id: '3',
      icon: FileText,
      title: 'Report Generated',
      message: 'Weekly Sales Report generated',
      priority: 'low',
      time: '1 hour ago',
      read: false,
    },
    {
      id: '4',
      icon: Check,
      title: 'Sync Complete',
      message: 'Inventory synchronized successfully',
      priority: 'low',
      time: '2 hours ago',
      read: true,
    },
    {
      id: '5',
      icon: Droplets,
      title: 'Humidity Restored',
      message: 'Humidity levels restored to optimal range',
      priority: 'medium',
      time: '3 hours ago',
      read: true,
    },
    {
      id: '6',
      icon: RupeeIcon,
      title: 'Report Ready',
      message: 'Monthly Profit Report ready for download',
      priority: 'low',
      time: '5 hours ago',
      read: true,
    },
  ]);

  const [showSettings, setShowSettings] = useState(false);

  const {
    marketUpdates,
    doorAlerts,
    reports,
    aiRecommendations,
    emailNotifications,
    pushNotifications,
    setMarketUpdates,
    setDoorAlerts,
    setReports,
    setAiRecommendations,
    setEmailNotifications,
    setPushNotifications,
  } = useNotificationPreferencesStore();

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="error">High</Badge>;
      case 'medium':
        return <Badge variant="warning">Medium</Badge>;
      case 'low':
        return <Badge variant="info">Low</Badge>;
      default:
        return <Badge variant="info">{priority}</Badge>;
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Notifications
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark All Read
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowSettings(!showSettings)}>
            <Settings className="h-4 w-4 mr-2" />
            {showSettings ? 'Hide' : 'Show'} Settings
          </Button>
        </div>
      </div>

      {showSettings && (
        <Card variant="default">
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">Market Updates</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Receive price changes and market trends</p>
                </div>
                <button
                  onClick={() => setMarketUpdates(!marketUpdates)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    marketUpdates ? 'bg-primary-600' : 'bg-gray-200 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      marketUpdates ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">Door Alerts</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Get notified when storage door is left open</p>
                </div>
                <button
                  onClick={() => setDoorAlerts(!doorAlerts)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    doorAlerts ? 'bg-primary-600' : 'bg-gray-200 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      doorAlerts ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">Reports</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Receive notifications when reports are ready</p>
                </div>
                <button
                  onClick={() => setReports(!reports)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    reports ? 'bg-primary-600' : 'bg-gray-200 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      reports ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">AI Recommendations</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Receive AI-powered insights and suggestions</p>
                </div>
                <button
                  onClick={() => setAiRecommendations(!aiRecommendations)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    aiRecommendations ? 'bg-primary-600' : 'bg-gray-200 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      aiRecommendations ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">Email Notifications</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Receive notifications via email</p>
                </div>
                <button
                  onClick={() => setEmailNotifications(!emailNotifications)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    emailNotifications ? 'bg-primary-600' : 'bg-gray-200 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      emailNotifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">Push Notifications</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Receive push notifications on your device</p>
                </div>
                <button
                  onClick={() => setPushNotifications(!pushNotifications)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    pushNotifications ? 'bg-primary-600' : 'bg-gray-200 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      pushNotifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {notifications.map((notification) => {
          const Icon = notification.icon;
          return (
            <Card
              key={notification.id}
              variant="default"
              className={`hover:shadow-lg transition-shadow ${!notification.read ? 'border-l-4 border-l-primary-500' : ''}`}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`h-12 w-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    !notification.read
                      ? 'bg-primary-100 dark:bg-primary-900/30'
                      : 'bg-gray-100 dark:bg-slate-800'
                  }`}>
                    <Icon className={`h-6 w-6 ${
                      !notification.read
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-gray-500'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        {notification.title}
                      </h3>
                      <div className="flex items-center gap-2">
                        {getPriorityBadge(notification.priority)}
                        {!notification.read && (
                          <Badge variant="error" size="sm">New</Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {notification.time}
                      </span>
                      {!notification.read && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => markAsRead(notification.id)}
                        >
                          Mark as Read
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Notifications;
