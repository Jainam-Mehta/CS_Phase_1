/**
 * Door Card Component
 * Animated 2D door with closed/open states, sensor values, and duration tracking
 */

import React, { useState } from 'react';
import { Card, CardContent } from './Card';
import { DoorOpen, Clock, AlertTriangle } from 'lucide-react';

interface DoorCardProps {
  isOpen: boolean;
  doorSensor1?: number;
  doorSensor2?: number;
  openCount?: number;
  durationOpen?: number;
}

const DoorCard: React.FC<DoorCardProps> = ({
  isOpen,
  doorSensor1 = 1,
  doorSensor2 = 1,
  openCount = 0,
  durationOpen = 0,
}) => {
  const [showSensorValues, setShowSensorValues] = useState(false);

  // Format duration
  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${Math.floor(minutes)}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  // Determine alert level based on duration
  const getAlertLevel = () => {
    if (durationOpen > 20) return { level: 'critical', color: 'red', message: 'Critical' };
    if (durationOpen > 10) return { level: 'warning', color: 'orange', message: 'Warning' };
    return { level: 'normal', color: 'green', message: 'Normal' };
  };

  const alertLevel = getAlertLevel();

  return (
    <div className="relative h-full">
      <Card variant="default" className="overflow-hidden h-full">
        <CardContent className="p-6 h-full flex flex-col">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Door Status
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Main storage door
              </p>
            </div>
            <div 
              className={`h-10 w-10 rounded-lg cursor-pointer flex items-center justify-center flex-shrink-0 ${
                isOpen 
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' 
                  : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
              }`}
              onMouseEnter={() => setShowSensorValues(true)}
              onMouseLeave={() => setShowSensorValues(false)}
            >
              <DoorOpen className="h-6 w-6" />
            </div>
          </div>

          {/* Animated Door Visual */}
          <div className="relative h-32 bg-gray-100 dark:bg-slate-800 rounded-lg mb-4 overflow-hidden">
            <div 
              className={`absolute inset-0 transition-all duration-500 ease-in-out ${
                isOpen ? 'translate-x-20 opacity-50' : 'translate-x-0 opacity-100'
              }`}
            >
              {/* Door Frame */}
              <div className="absolute inset-0 border-4 border-gray-300 dark:border-slate-600 rounded-lg">
                {/* Door */}
                <div className={`absolute top-2 bottom-2 left-2 right-2 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-slate-600 dark:to-slate-700 rounded-md shadow-inner transition-all duration-500 ${
                  isOpen ? 'translate-x-16' : 'translate-x-0'
                }`}>
                  {/* Door Handle */}
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 w-1 h-8 bg-gray-400 dark:bg-slate-500 rounded-full" />
                </div>
              </div>
            </div>

            {/* Door Status Text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-2xl font-bold ${
                isOpen 
                  ? 'text-red-600 dark:text-red-400' 
                  : 'text-green-600 dark:text-green-400'
              }`}>
                {isOpen ? 'OPEN' : 'CLOSED'}
              </span>
            </div>
          </div>

          {/* Door Stats */}
          <div className="grid grid-cols-2 gap-4 mt-auto">
            <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span className="text-xs text-gray-500 dark:text-gray-400">Today's Duration</span>
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {formatDuration(durationOpen)}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span className="text-xs text-gray-500 dark:text-gray-400">Open Count</span>
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {openCount}
              </p>
            </div>
          </div>

          {/* Alert Status */}
          {alertLevel.level !== 'normal' && (
            <div className={`mt-4 p-3 rounded-lg bg-${alertLevel.color}-100 dark:bg-${alertLevel.color}-900/30 border border-${alertLevel.color}-200 dark:border-${alertLevel.color}-800`}>
              <div className="flex items-center gap-2">
                <AlertTriangle className={`h-4 w-4 text-${alertLevel.color}-600 dark:text-${alertLevel.color}-400`} />
                <span className={`text-sm font-medium text-${alertLevel.color}-700 dark:text-${alertLevel.color}-300`}>
                  {alertLevel.message}: Door open for {formatDuration(durationOpen)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hover tooltip for sensor values - positioned above icon */}
      {showSensorValues && (
        <div 
          className="absolute top-0 right-0 mt-12 mr-2 bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 z-30 p-3 min-w-[180px]"
          onMouseEnter={() => setShowSensorValues(true)}
          onMouseLeave={() => setShowSensorValues(false)}
        >
          <div className="text-center space-y-1">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-2">Door Sensor</h4>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-600 dark:text-gray-400">Door Sensor 1:</span>
              <span className={`text-xs font-medium ${
                doorSensor1 === 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
              }`}>
                {doorSensor1 === 0 ? 'OPEN' : 'CLOSED'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-600 dark:text-gray-400">Door Sensor 2:</span>
              <span className={`text-xs font-medium ${
                doorSensor2 === 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
              }`}>
                {doorSensor2 === 0 ? 'OPEN' : 'CLOSED'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-600 dark:text-gray-400">Current State:</span>
              <span className={`text-xs font-medium ${
                isOpen ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
              }`}>
                {isOpen ? 'OPEN' : 'CLOSED'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-600 dark:text-gray-400">Last Changed:</span>
              <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                {new Date().toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoorCard;
