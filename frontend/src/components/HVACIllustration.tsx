import React from 'react';
import { Gauge, Activity, Thermometer, Droplets, Battery, Zap } from 'lucide-react';

interface HVACIllustrationProps {
  pressure?: number;
  compressorHealth?: 'running' | 'fault';
  avgTemperature?: number;
  ambientTemperature?: number;
  avgHumidity?: number;
  ambientHumidity?: number;
  batteryPercentage?: number;
  batteryStatus?: 'charging' | 'discharging';
}

const HVACIllustration: React.FC<HVACIllustrationProps> = ({
  pressure,
  compressorHealth = 'running',
  avgTemperature,
  ambientTemperature,
  avgHumidity,
  ambientHumidity,
  batteryPercentage,
  batteryStatus = 'discharging',
}) => {
  const formatValue = (value: number | undefined) => {
    if (value === undefined || value === null) return '--';
    return value.toFixed(1);
  };

  return (
    <div className="relative w-full bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-8 overflow-hidden">
      {/* HVAC Illustration Background */}
      <div className="absolute inset-0 flex items-center justify-center opacity-10">
        <svg
          viewBox="0 0 800 400"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Compressor */}
          <rect x="100" y="150" width="120" height="100" fill="currentColor" rx="8" />
          <text x="160" y="205" textAnchor="middle" fill="currentColor" fontSize="14">Compressor</text>
          
          {/* Condenser */}
          <rect x="280" y="100" width="80" height="200" fill="currentColor" rx="4" />
          <text x="320" y="205" textAnchor="middle" fill="currentColor" fontSize="12">Condenser</text>
          
          {/* Expansion Valve */}
          <circle cx="420" cy="200" r="30" fill="currentColor" />
          <text x="420" y="240" textAnchor="middle" fill="currentColor" fontSize="10">Valve</text>
          
          {/* Evaporator */}
          <rect x="500" y="120" width="100" height="160" fill="currentColor" rx="4" />
          <text x="550" y="205" textAnchor="middle" fill="currentColor" fontSize="12">Evaporator</text>
          
          {/* Refrigerant Lines */}
          <path d="M 220 200 L 280 200" stroke="currentColor" strokeWidth="4" fill="none" />
          <path d="M 360 200 L 390 200" stroke="currentColor" strokeWidth="4" fill="none" />
          <path d="M 450 200 L 500 200" stroke="currentColor" strokeWidth="4" fill="none" />
          
          {/* Battery */}
          <rect x="650" y="150" width="100" height="100" fill="currentColor" rx="8" />
          <text x="700" y="205" textAnchor="middle" fill="currentColor" fontSize="14">Battery</text>
        </svg>
      </div>

      {/* Overlay 1: Pressure */}
      <div className="absolute top-1/4 left-1/4 bg-white dark:bg-slate-800 rounded-lg shadow-lg p-3 border border-gray-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <Gauge className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Pressure</p>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {formatValue(pressure)} bar
            </p>
            <p className="text-xs text-green-600 dark:text-green-400">Normal</p>
          </div>
        </div>
      </div>

      {/* Overlay 2: Compressor Health */}
      <div className="absolute top-1/4 left-1/4 ml-32 bg-white dark:bg-slate-800 rounded-lg shadow-lg p-3 border border-gray-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <Activity className={`h-5 w-5 ${compressorHealth === 'running' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Compressor</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 capitalize">
              {compressorHealth}
            </p>
            <p className={`text-xs ${compressorHealth === 'running' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {compressorHealth === 'running' ? 'Healthy' : 'Fault'}
            </p>
          </div>
        </div>
      </div>

      {/* Overlay 3: Cold Storage Temperature */}
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 bg-white dark:bg-slate-800 rounded-lg shadow-lg p-3 border border-gray-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <Thermometer className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Room Avg</p>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {formatValue(avgTemperature)}°C
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Ambient: {formatValue(ambientTemperature)}°C
            </p>
          </div>
        </div>
      </div>

      {/* Overlay 4: Cold Storage Humidity */}
      <div className="absolute bottom-1/4 right-1/4 bg-white dark:bg-slate-800 rounded-lg shadow-lg p-3 border border-gray-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <Droplets className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Room Avg</p>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {formatValue(avgHumidity)}%
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Ambient: {formatValue(ambientHumidity)}%
            </p>
          </div>
        </div>
      </div>

      {/* Overlay 5: Battery Status */}
      <div className="absolute bottom-1/4 left-1/4 bg-white dark:bg-slate-800 rounded-lg shadow-lg p-3 border border-gray-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <Battery className="h-5 w-5 text-green-600 dark:text-green-400" />
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Battery</p>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {batteryPercentage !== undefined ? `${batteryPercentage}%` : '--'}
            </p>
            <p className={`text-xs ${batteryStatus === 'charging' ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
              {batteryStatus === 'charging' ? 'Charging' : 'Discharging'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HVACIllustration;
