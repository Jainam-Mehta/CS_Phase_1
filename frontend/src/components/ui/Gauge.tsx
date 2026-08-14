/**
 * Gauge Component
 * Displays a semicircular gauge chart with needle, optimal zone, and status
 */

import React, { useState } from 'react';
import { type LucideIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './Card';

interface GaugeProps {
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
  onIconHover?: (show: boolean) => void;
  showAmbientTemp?: boolean;
  ambientTemp?: number;
  gaugeType?: 'temperature' | 'humidity';
  showAmbientBadge?: boolean;
  ambientBadgeValue?: number;
  ambientBadgeUnit?: string;
  ambientBadgeIcon?: LucideIcon;
}

const Gauge: React.FC<GaugeProps> = ({
  value,
  unit,
  minValue,
  maxValue,
  optimalMin,
  optimalMax,
  warningMin,
  warningMax,
  criticalMin,
  criticalMax,
  icon: Icon,
  title,
  onIconHover,
  showAmbientTemp = false,
  ambientTemp,
  gaugeType = 'temperature',
  showAmbientBadge = false,
  ambientBadgeValue,
  ambientBadgeUnit,
  ambientBadgeIcon: AmbientBadgeIcon,
}) => {
  // Calculate gauge parameters
  const range = maxValue - minValue;
  const percentage = ((value - minValue) / range) * 100;
  
  // Calculate needle rotation (180 degrees = half circle)
  const needleRotation = (percentage / 100) * 180 - 90; // -90 to 90 degrees
  
  // Color mapping
  const colorMap = {
    green: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-600 dark:text-green-400',
      gauge: '#22c55e',
    },
    orange: {
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      text: 'text-orange-600 dark:text-orange-400',
      gauge: '#f97316',
    },
    red: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-600 dark:text-red-400',
      gauge: '#ef4444',
    },
  };
  
  // Calculate zone positions for gauge arc based on gauge type
  const getZonePositions = () => {
    if (gaugeType === 'temperature') {
      // Temperature: RED (1/6) - ORANGE (1/6) - GREEN (2/6) - ORANGE (1/6) - RED (1/6)
      const leftRedEnd = 16.67;
      const orangeEnd = 33.33;
      const greenEnd = 66.67;
      const rightOrangeEnd = 83.33;
      
      return {
        leftRed: { start: 0, end: leftRedEnd },
        orange: { start: leftRedEnd, end: orangeEnd },
        green: { start: orangeEnd, end: greenEnd },
        rightOrange: { start: greenEnd, end: rightOrangeEnd },
        rightRed: { start: rightOrangeEnd, end: 100 },
      };
    } else {
      // Humidity: RED (1/3) - ORANGE (1/3) - GREEN (1/3)
      const redEnd = 33.33;
      const orangeEnd = 66.67;
      
      return {
        red: { start: 0, end: redEnd },
        orange: { start: redEnd, end: orangeEnd },
        green: { start: orangeEnd, end: 100 },
      };
    }
  };
  
  const zones = getZonePositions();

  // Convert percentage to angle (180 degrees total)
  const percentageToAngle = (percentage: number) => (percentage / 100) * 180;
  
  // Calculate needle position based on value
  const getNeedleColor = () => {
    if (gaugeType === 'temperature') {
      if (value >= optimalMin && value <= optimalMax) return '#22c55e'; // Green
      if (value >= optimalMin - 2 && value <= optimalMax + 2) return '#f97316'; // Orange
      return '#ef4444'; // Red
    } else {
      if (value >= optimalMin && value <= optimalMax) return '#22c55e'; // Green
      if (value >= optimalMin - 5 && value <= optimalMax + 5) return '#f97316'; // Orange
      return '#ef4444'; // Red
    }
  };
  
  const needleColor = getNeedleColor();

  // Calculate dynamic status based on actual value
  const getDynamicStatus = () => {
    if (gaugeType === 'temperature') {
      if (value >= optimalMin && value <= optimalMax) {
        return { status: 'optimal', color: 'green', message: 'Optimal' };
      } else if (value >= optimalMin - 2 && value <= optimalMax + 2) {
        return { status: 'warning', color: 'orange', message: 'Warning' };
      } else {
        return { status: 'critical', color: 'red', message: 'Critical' };
      }
    } else {
      if (value >= optimalMin && value <= optimalMax) {
        return { status: 'optimal', color: 'green', message: 'Optimal' };
      } else if (value >= optimalMin - 5 && value <= optimalMax + 5) {
        return { status: 'warning', color: 'orange', message: 'Warning' };
      } else {
        return { status: 'critical', color: 'red', message: 'Critical' };
      }
    }
  };

  const dynamicStatus = getDynamicStatus();
  const colors = colorMap[dynamicStatus.color as keyof typeof colorMap];
  
  return (
    <Card variant="default" className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {title}
          </CardTitle>
          <div 
            className={`h-10 w-10 rounded-lg ${colors.bg} flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110 flex-shrink-0`}
            onMouseEnter={() => onIconHover?.(true)}
            onMouseLeave={() => onIconHover?.(false)}
          >
            <Icon className={`h-6 w-6 ${colors.text} transition-all duration-200`} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col relative">
        <div className="relative flex-1">
          {/* Gauge Chart */}
          <svg viewBox="0 0 200 120" className="w-full h-32">
            {gaugeType === 'temperature' ? (
              <>
                {/* Temperature zones - perfectly aligned with no overlap */}
                {/* Left Red zone */}
                <path
                  d={`M 20 100 A 80 80 0 0 1 ${20 + ((zones as any).leftRed.end / 100) * 160} 100`}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="12"
                  strokeLinecap="round"
                />
                {/* Orange zone */}
                <path
                  d={`M ${20 + ((zones as any).orange.start / 100) * 160} 100 A 80 80 0 0 1 ${20 + ((zones as any).orange.end / 100) * 160} 100`}
                  fill="none"
                  stroke="#f97316"
                  strokeWidth="12"
                  strokeLinecap="round"
                />
                {/* Green zone */}
                <path
                  d={`M ${20 + ((zones as any).green.start / 100) * 160} 100 A 80 80 0 0 1 ${20 + ((zones as any).green.end / 100) * 160} 100`}
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="12"
                  strokeLinecap="round"
                />
                {/* Right Orange zone */}
                <path
                  d={`M ${20 + ((zones as any).rightOrange.start / 100) * 160} 100 A 80 80 0 0 1 ${20 + ((zones as any).rightOrange.end / 100) * 160} 100`}
                  fill="none"
                  stroke="#f97316"
                  strokeWidth="12"
                  strokeLinecap="round"
                />
                {/* Right Red zone */}
                <path
                  d={`M ${20 + ((zones as any).rightRed.start / 100) * 160} 100 A 80 80 0 0 1 180 100`}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="12"
                  strokeLinecap="round"
                />
              </>
            ) : (
              <>
                {/* Humidity zones - perfectly aligned with no overlap */}
                {/* Red zone */}
                <path
                  d={`M 20 100 A 80 80 0 0 1 ${20 + ((zones as any).red.end / 100) * 160} 100`}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="12"
                  strokeLinecap="round"
                />
                {/* Orange zone */}
                <path
                  d={`M ${20 + ((zones as any).orange.start / 100) * 160} 100 A 80 80 0 0 1 ${20 + ((zones as any).orange.end / 100) * 160} 100`}
                  fill="none"
                  stroke="#f97316"
                  strokeWidth="12"
                  strokeLinecap="round"
                />
                {/* Green zone */}
                <path
                  d={`M ${20 + ((zones as any).green.start / 100) * 160} 100 A 80 80 0 0 1 180 100`}
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="12"
                  strokeLinecap="round"
                />
              </>
            )}
            
            {/* Needle */}
            <g
              transform={`rotate(${needleRotation}, 100, 100)`}
              style={{ transition: 'transform 0.5s ease-in-out' }}
            >
              <line
                x1="100"
                y1="100"
                x2="100"
                y2="30"
                stroke={needleColor}
                strokeWidth="3"
                strokeLinecap="round"
              />
              <circle
                cx="100"
                cy="100"
                r="6"
                fill={needleColor}
              />
            </g>
          </svg>
          
          {/* Value Display */}
          <div className="text-center mt-2">
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {value.toFixed(1)}{unit}
            </div>
            <div className={`text-sm font-medium ${colorMap[dynamicStatus.color as keyof typeof colorMap].text} mt-1`}>
              {dynamicStatus.message}
            </div>
            {showAmbientTemp && ambientTemp !== undefined && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Ambient: {ambientTemp.toFixed(1)}°C
              </div>
            )}
          </div>

          {/* Ambient Badge - Bottom Right */}
          {showAmbientBadge && ambientBadgeValue !== undefined && (
            <div className="absolute bottom-2 right-2 bg-gray-100 dark:bg-slate-700 rounded-lg px-2 py-1 flex flex-col items-center gap-0.5 shadow-sm">
              <span className="text-[10px] text-gray-500 dark:text-gray-400 leading-none">Ambient</span>
              <div className="flex items-center gap-1">
                {AmbientBadgeIcon && <AmbientBadgeIcon className="h-3 w-3 text-gray-600 dark:text-gray-300" />}
                <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                  {ambientBadgeValue.toFixed(1)}{ambientBadgeUnit}
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default Gauge;
