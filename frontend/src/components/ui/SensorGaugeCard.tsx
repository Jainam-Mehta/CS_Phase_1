/**
 * Sensor Gauge Card Wrapper
 * Wraps Gauge component with hover functionality to show individual sensor values
 */

import React, { useState } from 'react';
import { type LucideIcon } from 'lucide-react';
import GaugeComponent from './Gauge';

interface SensorGaugeCardProps {
  value: number;
  unit: string;
  minValue: number;
  maxValue: number;
  optimalMin: number;
  optimalMax: number;
  warningMin: number;
  warningMax: number;
  criticalMin: number;
  criticalMax: number;
  icon: LucideIcon;
  title: string;
  sensor1Value?: number;
  sensor2Value?: number;
  sensor3Value?: number;
  sensor4Value?: number;
  sensor1Label?: string;
  sensor2Label?: string;
  sensor3Label?: string;
  sensor4Label?: string;
  showAmbientTemp?: boolean;
  ambientTemp?: number;
  gaugeType?: 'temperature' | 'humidity';
  showAmbientBadge?: boolean;
  ambientBadgeValue?: number;
  ambientBadgeUnit?: string;
  ambientBadgeIcon?: LucideIcon;
}

const SensorGaugeCard: React.FC<SensorGaugeCardProps> = ({
  sensor1Value,
  sensor2Value,
  sensor3Value,
  sensor4Value,
  sensor1Label = 'Sensor 1',
  sensor2Label = 'Sensor 2',
  sensor3Label = 'Sensor 3',
  sensor4Label = 'Sensor 4',
  showAmbientTemp = false,
  ambientTemp,
  gaugeType = 'temperature',
  showAmbientBadge = false,
  ambientBadgeValue,
  ambientBadgeUnit,
  ambientBadgeIcon,
  icon: Icon,
  ...gaugeProps
}) => {
  const [showSensorValues, setShowSensorValues] = useState(false);
  const [isHoveringTooltip, setIsHoveringTooltip] = useState(false);

  const shouldShowTooltip = showSensorValues || isHoveringTooltip;

  // Calculate average
  const validSensors = [sensor1Value, sensor2Value, sensor3Value, sensor4Value].filter(v => v !== undefined);
  const average = validSensors.length > 0 
    ? validSensors.reduce((sum, val) => sum + (val || 0), 0) / validSensors.length 
    : 0;
  const min = validSensors.length > 0 ? Math.min(...validSensors) : 0;
  const max = validSensors.length > 0 ? Math.max(...validSensors) : 0;

  return (
    <div className="relative group h-full">
      <GaugeComponent 
        {...gaugeProps} 
        icon={Icon} 
        onIconHover={setShowSensorValues}
        showAmbientTemp={showAmbientTemp}
        ambientTemp={ambientTemp}
        gaugeType={gaugeType}
        showAmbientBadge={showAmbientBadge}
        ambientBadgeValue={ambientBadgeValue}
        ambientBadgeUnit={ambientBadgeUnit}
        ambientBadgeIcon={ambientBadgeIcon}
      />
      
      {/* Hover tooltip for sensor values - positioned above icon, overlays gauge */}
      {shouldShowTooltip && (sensor1Value !== undefined || sensor2Value !== undefined || sensor3Value !== undefined || sensor4Value !== undefined) && (
        <div 
          className="absolute top-0 right-0 mt-12 mr-2 bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 z-30 p-3 min-w-[180px] animate-in fade-in duration-200"
          onMouseEnter={() => setIsHoveringTooltip(true)}
          onMouseLeave={() => setIsHoveringTooltip(false)}
        >
          <div className="text-center space-y-1">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-2">
              {gaugeType === 'temperature' ? 'Temperature Sensors' : 'Humidity Sensors'}
            </h4>
            {sensor1Value !== undefined && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-600 dark:text-gray-400">{sensor1Label}:</span>
                <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                  {sensor1Value.toFixed(1)}{gaugeProps.unit}
                </span>
              </div>
            )}
            {sensor2Value !== undefined && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-600 dark:text-gray-400">{sensor2Label}:</span>
                <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                  {sensor2Value.toFixed(1)}{gaugeProps.unit}
                </span>
              </div>
            )}
            {sensor3Value !== undefined && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-600 dark:text-gray-400">{sensor3Label}:</span>
                <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                  {sensor3Value.toFixed(1)}{gaugeProps.unit}
                </span>
              </div>
            )}
            {sensor4Value !== undefined && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-600 dark:text-gray-400">{sensor4Label}:</span>
                <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                  {sensor4Value.toFixed(1)}{gaugeProps.unit}
                </span>
              </div>
            )}
            {/* Add average */}
            <div className="border-t border-gray-200 dark:border-slate-700 pt-2 mt-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-600 dark:text-gray-400">Average:</span>
                <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                  {average.toFixed(1)}{gaugeProps.unit}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SensorGaugeCard;
