/**
 * Phase 2.9: Alerts Panel Component (Updated)
 * Real-time alerts on sensor threshold violations
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, AlertTriangle, Info, CheckCircle, Loader, Eye, EyeOff } from 'lucide-react';

interface Alert {
  alert_id: string;
  type: string;
  level: 'critical' | 'warning' | 'info';
  message: string;
  triggered_value?: number;
  threshold?: number;
  triggered_at: string;
}

interface AlertsPanelProps {
  roomId: string;
}

const AlertsPanel: React.FC<AlertsPanelProps> = ({ roomId }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acknowledging, setAcknowledging] = useState<string | null>(null);

  useEffect(() => {
    fetchAlerts();
    // Poll for new alerts every 10 seconds
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, [roomId]);

  const fetchAlerts = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/v2/alerts/active/${roomId}`);

      if (!response.ok) throw new Error('Failed to fetch alerts');

      const data = await response.json();
      setAlerts(data);
    } catch (err) {
      if (loading) {
        setError(err instanceof Error ? err.message : 'Failed to load alerts');
      }
    } finally {
      if (loading) setLoading(false);
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      setAcknowledging(alertId);

      const response = await fetch(`http://localhost:8000/api/v2/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error('Failed to acknowledge alert');

      // Remove from list
      setAlerts(alerts.filter(a => a.alert_id !== alertId));
    } catch (err) {
      console.error('Error acknowledging alert:', err);
    } finally {
      setAcknowledging(null);
    }
  };

  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'critical':
        return <AlertTriangle className="text-red-600" size={20} />;
      case 'warning':
        return <AlertCircle className="text-yellow-600" size={20} />;
      default:
        return <Info className="text-blue-600" size={20} />;
    }
  };

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getAlertBadgeColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  if (loading && alerts.length === 0) {
    return (
      <div className="p-6 bg-white rounded-lg border border-gray-200 flex items-center justify-center h-96">
        <div className="text-center">
          <Loader className="mx-auto animate-spin text-blue-600 mb-2" size={32} />
          <p className="text-gray-600">Loading alerts...</p>
        </div>
      </div>
    );
  }

  if (error && alerts.length === 0) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
        <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
        <div>
          <h3 className="font-semibold text-red-900">Error Loading Alerts</h3>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Alerts</h1>
            <p className="text-gray-600 mt-1">
              Real-time notifications for room {roomId.slice(0, 8)}...
            </p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-red-600">{alerts.length}</p>
            <p className="text-sm text-gray-600">Active alert(s)</p>
          </div>
        </div>
      </div>

      {/* No Alerts */}
      {alerts.length === 0 ? (
        <div className="p-8 bg-green-50 border border-green-200 rounded-lg text-center">
          <CheckCircle className="mx-auto text-green-600 mb-2" size={32} />
          <h3 className="font-semibold text-green-900 text-lg">All Systems Normal</h3>
          <p className="text-sm text-green-700 mt-1">
            No alerts at this time. Room conditions are within acceptable ranges.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map(alert => (
            <div
              key={alert.alert_id}
              className={`p-4 rounded-lg border ${getAlertColor(alert.level)}`}
            >
              <button
                onClick={() =>
                  setExpandedAlert(expandedAlert === alert.alert_id ? null : alert.alert_id)
                }
                className="w-full flex items-start justify-between"
              >
                <div className="flex items-start gap-3 flex-1 text-left">
                  <div className="flex-shrink-0 mt-0.5">
                    {getAlertIcon(alert.level)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{alert.type}</h3>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getAlertBadgeColor(
                          alert.level
                        )}`}
                      >
                        {alert.level.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{alert.message}</p>
                    {alert.triggered_value !== undefined && alert.threshold !== undefined && (
                      <p className="text-xs text-gray-600 mt-1">
                        Triggered: {alert.triggered_value} (Threshold: {alert.threshold})
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(alert.triggered_at).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                <button className="ml-2 text-gray-500 hover:text-gray-700 flex-shrink-0">
                  {expandedAlert === alert.alert_id ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </button>

              {/* Expanded Actions */}
              {expandedAlert === alert.alert_id && (
                <div className="mt-4 pt-4 border-t border-current border-opacity-10">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-900">Actions:</p>
                    <button
                      onClick={() => handleAcknowledge(alert.alert_id)}
                      disabled={acknowledging === alert.alert_id}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center justify-center gap-2"
                    >
                      {acknowledging === alert.alert_id ? (
                        <>
                          <Loader size={16} className="animate-spin" />
                          Acknowledging...
                        </>
                      ) : (
                        <>
                          <CheckCircle size={16} />
                          Acknowledge Alert
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Alert Statistics */}
      {alerts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <p className="text-sm text-red-700 font-medium">Critical</p>
            <p className="text-2xl font-bold text-red-600 mt-1">
              {alerts.filter(a => a.level === 'critical').length}
            </p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <p className="text-sm text-yellow-700 font-medium">Warnings</p>
            <p className="text-2xl font-bold text-yellow-600 mt-1">
              {alerts.filter(a => a.level === 'warning').length}
            </p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700 font-medium">Info</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {alerts.filter(a => a.level === 'info').length}
            </p>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          <span className="font-semibold">Note:</span> Alerts are triggered when sensor readings exceed
          the product's storage requirements (temperature, humidity, etc). Acknowledge alerts to dismiss
          them. Critical alerts require immediate attention.
        </p>
      </div>
    </div>
  );
};

export default AlertsPanel;
