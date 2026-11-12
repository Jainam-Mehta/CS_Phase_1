/**
 * Phase 2.9: Live Monitoring Component (Updated)
 * Real-time sensor data with gauges and trends
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, Loader, Gauge, Droplets, Wind } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface RoomCondition {
  room_id: string;
  temperature?: number;
  humidity?: number;
  door_status?: string;
  pressure_suction?: number;
  pressure_discharge?: number;
  recorded_at: string;
}

interface HistoricalReading {
  timestamp: string;
  temperature?: number;
  humidity?: number;
}

interface LiveMonitoringProps {
  roomId: string;
}

const LiveMonitoring: React.FC<LiveMonitoringProps> = ({ roomId }) => {
  const [currentCondition, setCurrentCondition] = useState<RoomCondition | null>(null);
  const [history, setHistory] = useState<HistoricalReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConditions();
    // Poll every 5 seconds
    const interval = setInterval(fetchConditions, 5000);
    return () => clearInterval(interval);
  }, [roomId]);

  const fetchConditions = async () => {
    try {
      // Get current conditions
      const condResponse = await fetch(`http://localhost:8000/api/v2/rooms/${roomId}/conditions`);
      if (condResponse.ok) {
        const data = await condResponse.json();
        setCurrentCondition(data);
      }

      // Get historical data
      const histResponse = await fetch(`http://localhost:8000/api/v2/rooms/${roomId}/readings/history?hours=24`);
      if (histResponse.ok) {
        const data = await histResponse.json();
        setHistory(data.readings || []);
      }
    } catch (err) {
      if (loading) {
        setError(err instanceof Error ? err.message : 'Failed to load conditions');
      }
    } finally {
      if (loading) setLoading(false);
    }
  };

  const getTemperatureStatus = (temp?: number) => {
    if (temp === undefined) return 'unknown';
    if (temp < 0) return 'cold';
    if (temp > 5) return 'warm';
    return 'optimal';
  };

  const getHumidityStatus = (humidity?: number) => {
    if (humidity === undefined) return 'unknown';
    if (humidity < 80) return 'low';
    if (humidity > 95) return 'high';
    return 'optimal';
  };

  const chartData = history.map(h => ({
    time: new Date(h.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    Temperature: h.temperature || 0,
    Humidity: h.humidity || 0
  }));

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg border border-gray-200 flex items-center justify-center h-96">
        <div className="text-center">
          <Loader className="mx-auto animate-spin text-blue-600 mb-2" size={32} />
          <p className="text-gray-600">Loading sensor data...</p>
        </div>
      </div>
    );
  }

  if (error && !currentCondition) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
        <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
        <div>
          <h3 className="font-semibold text-red-900">Error Loading Sensors</h3>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">Live Monitoring</h1>
        <p className="text-gray-600 mt-1">Real-time sensor readings for room {roomId.slice(0, 8)}...</p>
        {currentCondition && (
          <p className="text-xs text-gray-500 mt-2">
            Last updated: {new Date(currentCondition.recorded_at).toLocaleTimeString('en-IN')}
          </p>
        )}
      </div>

      {/* Current Readings - Gauges */}
      {currentCondition && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Temperature Gauge */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Temperature</h3>
              <Gauge size={20} className="text-blue-600" />
            </div>

            <div className="text-center mb-4">
              <p className="text-5xl font-bold text-blue-700">
                {currentCondition.temperature !== undefined ? currentCondition.temperature.toFixed(1) : '-'}°C
              </p>
            </div>

            {/* Status Indicator */}
            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    getTemperatureStatus(currentCondition.temperature) === 'optimal'
                      ? 'bg-green-500'
                      : getTemperatureStatus(currentCondition.temperature) === 'cold'
                      ? 'bg-blue-500'
                      : 'bg-red-500'
                  }`}
                  style={{
                    width: `${Math.min(100, Math.max(0, ((currentCondition.temperature || 0) + 10) / 25 * 100))}%`
                  }}
                />
              </div>
              <p className="text-xs text-gray-600 text-center">
                Status:{' '}
                <span
                  className={`font-semibold ${
                    getTemperatureStatus(currentCondition.temperature) === 'optimal'
                      ? 'text-green-600'
                      : getTemperatureStatus(currentCondition.temperature) === 'cold'
                      ? 'text-blue-600'
                      : 'text-red-600'
                  }`}
                >
                  {getTemperatureStatus(currentCondition.temperature).toUpperCase()}
                </span>
              </p>
            </div>
          </div>

          {/* Humidity Gauge */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Humidity</h3>
              <Droplets size={20} className="text-green-600" />
            </div>

            <div className="text-center mb-4">
              <p className="text-5xl font-bold text-green-700">
                {currentCondition.humidity !== undefined ? currentCondition.humidity.toFixed(1) : '-'}%
              </p>
            </div>

            {/* Status Indicator */}
            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    getHumidityStatus(currentCondition.humidity) === 'optimal'
                      ? 'bg-green-500'
                      : getHumidityStatus(currentCondition.humidity) === 'low'
                      ? 'bg-orange-500'
                      : 'bg-red-500'
                  }`}
                  style={{
                    width: `${Math.min(100, Math.max(0, (currentCondition.humidity || 0) / 100 * 100))}%`
                  }}
                />
              </div>
              <p className="text-xs text-gray-600 text-center">
                Status:{' '}
                <span
                  className={`font-semibold ${
                    getHumidityStatus(currentCondition.humidity) === 'optimal'
                      ? 'text-green-600'
                      : getHumidityStatus(currentCondition.humidity) === 'low'
                      ? 'text-orange-600'
                      : 'text-red-600'
                  }`}
                >
                  {getHumidityStatus(currentCondition.humidity).toUpperCase()}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 24-Hour Trend Chart */}
      {history.length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">24-Hour Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="time"
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="Temperature"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                unit="°C"
              />
              <Line
                type="monotone"
                dataKey="Humidity"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                unit="%"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Additional Sensors */}
      {currentCondition && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentCondition.door_status && (
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <p className="text-sm font-medium text-purple-700">Door Status</p>
              <p className="text-2xl font-bold text-purple-600 mt-2">{currentCondition.door_status}</p>
            </div>
          )}

          {currentCondition.pressure_suction !== undefined && (
            <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-200">
              <p className="text-sm font-medium text-cyan-700">Suction Pressure</p>
              <p className="text-2xl font-bold text-cyan-600 mt-2">
                {currentCondition.pressure_suction.toFixed(1)} psi
              </p>
            </div>
          )}
        </div>
      )}

      {/* Info Box */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          <span className="font-semibold">Note:</span> Sensor data updates every 5 seconds. Green status
          indicates optimal conditions for stored products. Yellow/orange warnings indicate conditions
          approaching limits. Red critical indicates immediate attention needed.
        </p>
      </div>
    </div>
  );
};

export default LiveMonitoring;
