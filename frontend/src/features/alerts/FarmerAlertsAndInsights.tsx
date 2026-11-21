import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { useAuthStore } from '../../stores/useAuthStore';
import { supabase } from '../../lib/supabase';
import { Bell, AlertCircle, CheckCircle, AlertTriangle, Info, Thermometer, Droplets } from 'lucide-react';

interface ActivityLog {
  id: string;
  event_type: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  created_at: string;
  site_name?: string;
  room_code?: string;
  type: 'log';
}

interface SensorAlert {
  id: string;
  room_id: string;
  alert_type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description?: string;
  sensor_type?: string;
  sensor_number?: number;
  current_value?: number;
  min_value?: number;
  max_value?: number;
  status: string;
  acknowledged: boolean;
  created_at: string;
  room_code?: string;
  type: 'sensor_alert';
}

type CombinedAlert = ActivityLog | SensorAlert;

const FarmerAlertsAndInsights: React.FC = () => {
  const { user } = useAuthStore();
  const [alerts, setAlerts] = useState<CombinedAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [farmerProfile, setFarmerProfile] = useState<any>(null);

  useEffect(() => {
    if (user?.id) {
      loadFarmerProfile();
    }
  }, [user?.id]);

  useEffect(() => {
    if (farmerProfile?.id) {
      loadAlertsAndLogs();
    }
  }, [farmerProfile?.id]);

  const loadFarmerProfile = async () => {
    if (!user?.id) return;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();
      setFarmerProfile(profile);
    } catch (err) {
      console.error('Failed to load farmer profile:', err);
    }
  };

  const loadAlertsAndLogs = async () => {
    if (!farmerProfile?.id) return;
    try {
      setLoading(true);
      
      // Load activity logs
      const { data: logsData, error: logsError } = await supabase
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
        .eq('farmer_id', farmerProfile.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (logsError) {
        console.error('Error loading activity logs:', logsError);
      }

      // Load sensor alerts from backend API
      let sensorAlertsData: SensorAlert[] = [];
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        try {
          const response = await fetch(`${apiUrl}/alerts/farmer/${farmerProfile.id}`, {
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          
          if (response.ok) {
            sensorAlertsData = await response.json();
          } else {
            console.warn('Backend returned:', response.status, response.statusText);
          }
        } catch (fetchErr: any) {
          clearTimeout(timeoutId);
          if (fetchErr.name === 'AbortError') {
            console.warn('Sensor alerts fetch timed out after 5s - backend may be slow or endpoint not ready');
          } else {
            console.warn('Sensor alerts fetch failed:', fetchErr.message);
          }
        }
      } catch (err) {
        console.error('Error setting up sensor alerts fetch:', err);
      }

      // Transform activity logs
      const enrichedLogs = (logsData || []).map((log: any) => ({
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
        type: 'log' as const,
      }));

      // Fetch room codes for sensor alerts
      const sensorAlertsWithRoomCode = await Promise.all(
        sensorAlertsData.map(async (alert) => {
          try {
            const { data: roomData } = await supabase
              .from('cold_storage_rooms')
              .select('room_code')
              .eq('id', alert.room_id)
              .maybeSingle();
            return {
              ...alert,
              room_code: roomData?.room_code,
              type: 'sensor_alert' as const,
            };
          } catch {
            return {
              ...alert,
              type: 'sensor_alert' as const,
            };
          }
        })
      );

      // Merge and sort by created_at (descending)
      const combined = [...enrichedLogs, ...sensorAlertsWithRoomCode].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setAlerts(combined);
    } catch (err) {
      console.error('Failed to load alerts and logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    if (!farmerProfile?.id) return;
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/alerts/${alertId}/acknowledge?farmer_id=${farmerProfile.id}`, {
        method: 'PUT',
      });
      if (response.ok) {
        // Reload alerts
        await loadAlertsAndLogs();
      } else {
        console.error('Failed to acknowledge alert');
      }
    } catch (err) {
      console.error('Error acknowledging alert:', err);
    }
  };

  const getSeverityIcon = (severity: string, alertType?: string) => {
    // For sensor alerts, show sensor-specific icons
    if (alertType === 'temperature') {
      return <Thermometer className="w-5 h-5 text-red-600" />;
    } else if (alertType === 'humidity') {
      return <Droplets className="w-5 h-5 text-blue-600" />;
    }

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

  const formatSensorValue = (value?: number, type?: string) => {
    if (value === undefined || value === null) return '';
    if (type === 'temperature') return `${value.toFixed(1)}°C`;
    if (type === 'humidity') return `${value.toFixed(1)}%`;
    return value.toFixed(2);
  };

  const renderAlertDetails = (alert: CombinedAlert) => {
    if (alert.type === 'sensor_alert') {
      const sensorAlert = alert as SensorAlert;
      return (
        <>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 mb-3">
            {sensorAlert.description}
          </div>
          {sensorAlert.current_value !== undefined && (
            <div className="bg-white dark:bg-slate-700/30 rounded p-2 mb-3 text-sm">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block text-xs">Current</span>
                  <span className="font-mono font-semibold text-gray-900 dark:text-white">
                    {formatSensorValue(sensorAlert.current_value, sensorAlert.sensor_type)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block text-xs">Min</span>
                  <span className="font-mono font-semibold text-gray-900 dark:text-white">
                    {formatSensorValue(sensorAlert.min_value, sensorAlert.sensor_type)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block text-xs">Max</span>
                  <span className="font-mono font-semibold text-gray-900 dark:text-white">
                    {formatSensorValue(sensorAlert.max_value, sensorAlert.sensor_type)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      );
    }
    return <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{(alert as ActivityLog).description}</p>;
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pt-6 px-4 pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2.5 sm:gap-3">
          <Bell className="w-8 h-8" />
          Alerts & Insights
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Your sensor alerts, activity history, and important notifications
        </p>
      </div>

      <Card variant="default">
        <CardHeader>
          <CardTitle>Recent Alerts & Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading alerts...</div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                No alerts or activity yet. Sensor alerts and room requests will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`border rounded-lg p-4 ${getSeverityColor(alert.severity)}`}
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="flex-shrink-0 mt-1">
                      {getSeverityIcon(
                        alert.severity,
                        alert.type === 'sensor_alert' ? (alert as SensorAlert).sensor_type : undefined
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {alert.title}
                            {alert.type === 'sensor_alert' && (alert as SensorAlert).acknowledged && (
                              <span className="ml-2 inline-block px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded">
                                Acknowledged
                              </span>
                            )}
                          </h3>
                        </div>
                      </div>

                      {renderAlertDetails(alert)}

                      {/* Site, Room, and Timestamp info */}
                      <div className="flex flex-wrap gap-2 sm:gap-3 mt-3 text-xs">
                        {alert.type === 'log' && (alert as ActivityLog).site_name && (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[11px] sm:text-xs bg-white dark:bg-slate-700/50 rounded-full border border-gray-200 dark:border-slate-600">
                            <span className="text-gray-500 dark:text-gray-400">Site:</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {(alert as ActivityLog).site_name}
                            </span>
                          </div>
                        )}
                        {alert.room_code && (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[11px] sm:text-xs bg-white dark:bg-slate-700/50 rounded-full border border-gray-200 dark:border-slate-600">
                            <span className="text-gray-500 dark:text-gray-400">Room:</span>
                            <span className="font-mono font-semibold text-gray-900 dark:text-white">
                              {alert.room_code}
                            </span>
                          </div>
                        )}
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[11px] sm:text-xs bg-white dark:bg-slate-700/50 rounded-full border border-gray-200 dark:border-slate-600">
                          <span className="text-gray-500 dark:text-gray-400">
                            {formatDate(alert.created_at)}
                          </span>
                        </div>
                        {alert.type === 'sensor_alert' && !(alert as SensorAlert).acknowledged && (
                          <button
                            onClick={() => handleAcknowledgeAlert(alert.id)}
                            className="inline-flex items-center gap-1 px-3 py-1 text-[11px] sm:text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full border border-blue-300 dark:border-blue-700 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                          >
                            <CheckCircle className="w-3 h-3" />
                            Acknowledge
                          </button>
                        )}
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
