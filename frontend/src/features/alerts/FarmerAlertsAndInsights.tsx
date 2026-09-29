import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { useAuthStore } from '../../stores/useAuthStore';
import { supabase } from '../../lib/supabase';
import { Bell, AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';

interface ActivityLog {
  id: string;
  event_type: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  created_at: string;
  site_name?: string;
  room_code?: string;
}

const FarmerAlertsAndInsights: React.FC = () => {
  const { user } = useAuthStore();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadActivityLogs();
    }
  }, [user?.id]);

  const loadActivityLogs = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile) return;

      // Get activity logs with site and room info
      const { data, error } = await supabase
        .from('farmer_activity_logs')
        .select(`
          id,
          event_type,
          title,
          description,
          severity,
          created_at,
          sites(facility_name),
          cold_storage_rooms(room_code)
        `)
        .eq('farmer_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error loading activity logs:', error);
        return;
      }

      // Transform data to include site and room names
      const enrichedLogs = (data || []).map((log: any) => ({
        id: log.id,
        event_type: log.event_type,
        title: log.title,
        description: log.description,
        severity: log.severity || 'info',
        created_at: log.created_at,
        site_name: Array.isArray(log.sites)
          ? log.sites[0]?.facility_name
          : log.sites?.facility_name,
        room_code: Array.isArray(log.cold_storage_rooms)
          ? log.cold_storage_rooms[0]?.room_code
          : log.cold_storage_rooms?.room_code,
      }));

      setLogs(enrichedLogs);
    } catch (err) {
      console.error('Failed to load activity logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/30';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800/30';
      case 'info':
      default:
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/30';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pt-6 px-4 pb-12">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
          <Bell className="w-8 h-8" />
          Alerts & Insights
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Your activity history and important notifications
        </p>
      </div>

      <Card variant="default">
        <CardHeader>
          <CardTitle>Activity Logs</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading activity logs...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                No activity yet. Your room requests and events will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={`border rounded-lg p-4 ${getSeverityColor(log.severity)}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      {getSeverityIcon(log.severity)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {log.title}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {log.description}
                          </p>
                        </div>
                      </div>

                      {/* Site and Room info */}
                      <div className="flex flex-wrap gap-3 mt-3 text-xs">
                        {log.site_name && (
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-700/50 rounded-full border border-gray-200 dark:border-slate-600">
                            <span className="text-gray-500 dark:text-gray-400">Site:</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {log.site_name}
                            </span>
                          </div>
                        )}
                        {log.room_code && (
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-700/50 rounded-full border border-gray-200 dark:border-slate-600">
                            <span className="text-gray-500 dark:text-gray-400">Room:</span>
                            <span className="font-mono font-semibold text-gray-900 dark:text-white">
                              {log.room_code}
                            </span>
                          </div>
                        )}
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-700/50 rounded-full border border-gray-200 dark:border-slate-600">
                          <span className="text-gray-500 dark:text-gray-400">
                            {formatDate(log.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FarmerAlertsAndInsights;
