import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useThemeStore } from '../../stores/useThemeStore';
import { useUserStore } from '../../stores/useUserStore';

interface PreferencesState {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsAlerts: boolean;
  language: string;
  timezone: string;
  sensorRefresh: string;
  alertFrequency: string;
  showTemperatureChart: boolean;
  showRecentAlerts: boolean;
  showStorageStatus: boolean;
}

const Preferences: React.FC = () => {
  const { theme } = useThemeStore();
  const { updateUser } = useUserStore();
  const [preferences, setPreferences] = useState<PreferencesState>({
    emailNotifications: true,
    pushNotifications: true,
    smsAlerts: false,
    language: 'English',
    timezone: 'IST (UTC+5:30)',
    sensorRefresh: '5',
    alertFrequency: 'realtime',
    showTemperatureChart: true,
    showRecentAlerts: true,
    showStorageStatus: true,
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // Save preferences to user store
    updateUser({
      preferences: {
        theme,
        language: preferences.language,
        notifications: {
          email: preferences.emailNotifications,
          push: preferences.pushNotifications,
          sms: preferences.smsAlerts,
          alerts: true,
          reports: true,
        },
        dashboard: {
          layout: 'grid',
          widgets: [
            ...(preferences.showTemperatureChart ? ['temperature_chart'] : []),
            ...(preferences.showRecentAlerts ? ['alert_list'] : []),
            ...(preferences.showStorageStatus ? ['storage_status'] : []),
          ],
          refreshInterval: parseInt(preferences.sensorRefresh) * 1000,
        },
      },
    });
    
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setPreferences({
      emailNotifications: true,
      pushNotifications: true,
      smsAlerts: false,
      language: 'English',
      timezone: 'IST (UTC+5:30)',
      sensorRefresh: '5',
      alertFrequency: 'realtime',
      showTemperatureChart: true,
      showRecentAlerts: true,
      showStorageStatus: true,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Preferences
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Manage your application preferences
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card variant="default">
          <CardHeader>
            <CardTitle>Notification Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Email Notifications
              </span>
              <input
                type="checkbox"
                className="w-4 h-4 rounded"
                checked={preferences.emailNotifications}
                onChange={(e) => setPreferences({ ...preferences, emailNotifications: e.target.checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Push Notifications
              </span>
              <input
                type="checkbox"
                className="w-4 h-4 rounded"
                checked={preferences.pushNotifications}
                onChange={(e) => setPreferences({ ...preferences, pushNotifications: e.target.checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                SMS Alerts
              </span>
              <input
                type="checkbox"
                className="w-4 h-4 rounded"
                checked={preferences.smsAlerts}
                onChange={(e) => setPreferences({ ...preferences, smsAlerts: e.target.checked })}
              />
            </div>
          </CardContent>
        </Card>

        <Card variant="default">
          <CardHeader>
            <CardTitle>Display Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-gray-700 dark:text-gray-300 block mb-2">
                Language
              </label>
              <select
                className="w-full p-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={preferences.language}
                onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
              >
                <option>English</option>
                <option>Hindi</option>
                <option>Tamil</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-700 dark:text-gray-300 block mb-2">
                Timezone
              </label>
              <select
                className="w-full p-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={preferences.timezone}
                onChange={(e) => setPreferences({ ...preferences, timezone: e.target.value })}
              >
                <option>IST (UTC+5:30)</option>
                <option>UTC</option>
                <option>EST (UTC-5)</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card variant="default">
          <CardHeader>
            <CardTitle>Data Refresh Interval</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-gray-700 dark:text-gray-300 block mb-2">
                Sensor Data Refresh
              </label>
              <select
                className="w-full p-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={preferences.sensorRefresh}
                onChange={(e) => setPreferences({ ...preferences, sensorRefresh: e.target.value })}
              >
                <option value="5">Every 5 seconds</option>
                <option value="10">Every 10 seconds</option>
                <option value="30">Every 30 seconds</option>
                <option value="60">Every 1 minute</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-700 dark:text-gray-300 block mb-2">
                Alert Check Frequency
              </label>
              <select
                className="w-full p-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={preferences.alertFrequency}
                onChange={(e) => setPreferences({ ...preferences, alertFrequency: e.target.value })}
              >
                <option value="realtime">Real-time</option>
                <option value="60">Every 1 minute</option>
                <option value="300">Every 5 minutes</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card variant="default">
          <CardHeader>
            <CardTitle>Dashboard Layout</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Show Temperature Chart
              </span>
              <input
                type="checkbox"
                className="w-4 h-4 rounded"
                checked={preferences.showTemperatureChart}
                onChange={(e) => setPreferences({ ...preferences, showTemperatureChart: e.target.checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Show Recent Alerts
              </span>
              <input
                type="checkbox"
                className="w-4 h-4 rounded"
                checked={preferences.showRecentAlerts}
                onChange={(e) => setPreferences({ ...preferences, showRecentAlerts: e.target.checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Show Storage Status
              </span>
              <input
                type="checkbox"
                className="w-4 h-4 rounded"
                checked={preferences.showStorageStatus}
                onChange={(e) => setPreferences({ ...preferences, showStorageStatus: e.target.checked })}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleReset}>
          Reset to Defaults
        </Button>
        <Button variant="primary" onClick={handleSave}>
          {saved ? 'Saved!' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  );
};

export default Preferences;
