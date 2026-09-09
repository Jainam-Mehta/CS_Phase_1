/**
 * LineChart Component
 * Reusable line chart component for displaying time-series data
 */

import React, { useId } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './Card';

interface LineChartProps {
  title: string;
  data: number[];
  timestamps: string[];
  missingData?: boolean[];
  color: string;
  unit: string;
  minValue?: number;
  maxValue?: number;
  showArea?: boolean;
  showGradient?: boolean;
  binary?: boolean;
  doorSensor1?: number;
  doorSensor2?: number;
}

const LineChart: React.FC<LineChartProps> = ({
  title,
  data,
  timestamps,
  missingData = [],
  color,
  unit,
  minValue,
  maxValue,
  showArea = true,
  showGradient = true,
  binary = false,
  doorSensor1,
  doorSensor2,
}) => {
  // Calculate chart range
  const actualMinValue = minValue !== undefined ? minValue : (binary ? -2 : Math.min(...data, 0));
  const actualMaxValue = maxValue !== undefined ? maxValue : (binary ? 2 : Math.max(...data, 100));
  const range = actualMaxValue - actualMinValue || 1;

  // Stable IDs via React.useId() — never Math.random() in render
  const uid = useId().replace(/:/g, '');
  const gradientId = `${color}Gradient-${uid}`;
  const glowId = `${color}Glow-${uid}`;

  // Calculate chart dimensions based on data length
  const dataLength = data.length;
  const chartWidth = 500;
  const chartPadding = 50;
  const availableWidth = chartWidth - chartPadding * 2;
  const stepWidth = availableWidth / (dataLength - 1);
  const chartHeight = 100; // Use full height for better visibility

  // Adjust stepWidth to ensure points align with timestamps
  const adjustedStepWidth = dataLength > 1 ? availableWidth / (dataLength - 1) : 0;

  // Determine if we need to rotate labels based on data length
  const shouldRotateLabels = dataLength > 6;

  // Format Y-axis labels
  const formatYAxisLabel = (value: number) => {
    if (binary) {
      if (value === 2) return '';
      if (value === 1) return 'Door 1';
      if (value === 0) return 'Open';
      if (value === -1) return 'Door 2';
      if (value === -2) return '';
      return value.toString();
    }
    if (unit === '°C') return `${value.toFixed(0)}°C`;
    if (unit === '%') return `${value.toFixed(0)}%`;
    if (unit === '₹') return `₹${Math.round(value)}`;
    return value.toFixed(0);
  };

  // Calculate Y-axis steps
  const yAxisSteps = binary ? [2, 1, 0, -1, -2] :
                     unit === '°C' ? [0, 1, 2, 3, 4, 5, 6] : 
                     unit === '%' ? [0, 20, 40, 60, 80, 100] :
                     Array.from({ length: 6 }, (_, i) => actualMinValue + (i * range) / 5);

  // Generate door sensor data for two-line chart
  const generateDoorSensorData = () => {
    if (!binary || doorSensor1 === undefined || doorSensor2 === undefined) return null;
    
    // Use the provided data array to generate door sensor states
    // Door 1: normally at y=1 (closed), transitions to y=0 when open
    const sensor1Data = data.map((value, i) => {
      // The data array contains binary values (0=open, 1=closed)
      // Convert to door sensor scale: 1=closed, 0=open
      return value === 0 ? 0 : 1;
    });
    
    // Door 2: normally at y=-1 (closed), transitions to y=0 when open
    const sensor2Data = data.map((value, i) => {
      // The data array contains binary values (0=open, 1=closed)
      // Convert to door sensor scale: -1=closed, 0=open
      return value === 0 ? 0 : -1;
    });
    
    return { sensor1Data, sensor2Data };
  };

  const doorData = generateDoorSensorData();

  return (
    <Card variant="default">
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="h-48 relative bg-gray-50 dark:bg-slate-800/50 rounded-lg p-6">
          <svg className="w-full h-full" viewBox={`0 0 ${chartWidth} ${chartHeight + 25}`} preserveAspectRatio="none">
            <defs>
              {showGradient && !binary && (
                <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
              )}
              <filter id={glowId}>
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            {/* Y-axis grid lines and labels - Increased padding */}
            {yAxisSteps.map((value) => {
              const y = chartHeight - ((value - actualMinValue) / range) * chartHeight;
              return (
                <g key={value}>
                  <line x1={chartPadding} y1={y} x2={chartWidth - chartPadding} y2={y} stroke="currentColor" strokeWidth="0.5" className="text-gray-300 dark:text-gray-600" opacity="0.3" />
                  <text x="8" y={y + 3} className="text-[9px] fill-gray-500 dark:fill-gray-400">{formatYAxisLabel(value)}</text>
                </g>
              );
            })}
            
            {/* Door sensor lines - two lines for binary door chart */}
            {doorData && (
              <>
                {/* Sensor 1 line (blue) */}
                <path
                  d={`M ${chartPadding} ${chartHeight - ((doorData.sensor1Data[0] - actualMinValue) / range) * chartHeight} ${doorData.sensor1Data.slice(1, dataLength).map((value, i) => `L ${chartPadding + ((i + 1) * adjustedStepWidth)} ${chartHeight - ((value - actualMinValue) / range) * chartHeight}`).join(' ')}`}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  className="transition-all duration-300"
                  filter={`url(#${glowId})`}
                />
                {/* Sensor 2 line (purple) */}
                <path
                  d={`M ${chartPadding} ${chartHeight - ((doorData.sensor2Data[0] - actualMinValue) / range) * chartHeight} ${doorData.sensor2Data.slice(1, dataLength).map((value, i) => `L ${chartPadding + ((i + 1) * adjustedStepWidth)} ${chartHeight - ((value - actualMinValue) / range) * chartHeight}`).join(' ')}`}
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="2"
                  className="transition-all duration-300"
                  filter={`url(#${glowId})`}
                />
                {/* Markers for Sensor 1 */}
                {doorData.sensor1Data.slice(0, dataLength).map((value, index) => {
                  const xPosition = chartPadding + (index * adjustedStepWidth);
                  return (
                    <g key={`sensor1-${index}`} className="group">
                      <circle
                        cx={xPosition}
                        cy={chartHeight - ((value - actualMinValue) / range) * chartHeight}
                        r="3"
                        fill="#3b82f6"
                        className="transition-all duration-300"
                      />
                    </g>
                  );
                })}
                {/* Markers for Sensor 2 */}
                {doorData.sensor2Data.slice(0, dataLength).map((value, index) => {
                  const xPosition = chartPadding + (index * adjustedStepWidth);
                  return (
                    <g key={`sensor2-${index}`} className="group">
                      <circle
                        cx={xPosition}
                        cy={chartHeight - ((value - actualMinValue) / range) * chartHeight}
                        r="3"
                        fill="#8b5cf6"
                        className="transition-all duration-300"
                      />
                    </g>
                  );
                })}
              </>
            )}
            
            {/* Area fill - only for non-binary charts */}
            {!binary && showArea && showGradient && (
              <path
                d={`M ${chartPadding} ${chartHeight - ((data[0] - actualMinValue) / range) * chartHeight} ${data.slice(1, dataLength).map((value, i) => `L ${chartPadding + ((i + 1) * adjustedStepWidth)} ${chartHeight - ((value - actualMinValue) / range) * chartHeight}`).join(' ')} L ${chartWidth - chartPadding} ${chartHeight} L ${chartPadding} ${chartHeight} Z`}
                fill={`url(#${gradientId})`}
              />
            )}
            
            {/* Line - only for non-binary charts */}
            {!binary && (
              <path
                d={`M ${chartPadding} ${chartHeight - ((data[0] - actualMinValue) / range) * chartHeight} ${data.slice(1, dataLength).map((value, i) => `L ${chartPadding + ((i + 1) * adjustedStepWidth)} ${chartHeight - ((value - actualMinValue) / range) * chartHeight}`).join(' ')}`}
                fill="none"
                stroke={color}
                strokeWidth="2"
                className="transition-all duration-300"
                filter={`url(#${glowId})`}
              />
            )}
            
            {/* Markers with glow and hover effect - only for non-binary charts */}
            {!binary && data.slice(0, dataLength).map((value, index) => {
              const xPosition = chartPadding + (index * adjustedStepWidth);
              const yPosition = chartHeight - ((value - actualMinValue) / range) * chartHeight;
              return (
                <g key={index} className="group">
                  <circle
                    cx={xPosition}
                    cy={yPosition}
                    r="4"
                    fill={missingData[index] ? "white" : color}
                    stroke={missingData[index] ? color : "none"}
                    strokeWidth={missingData[index] ? "2" : "0"}
                    className="transition-all duration-300 group-hover:r-6"
                    filter={`url(#${glowId})`}
                  />
                  {!missingData[index] && (
                    <circle
                      cx={xPosition}
                      cy={yPosition}
                      r="2"
                      fill="white"
                      className="transition-all duration-300"
                    />
                  )}
                  {/* Tooltip */}
                  <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                    <rect
                      x={xPosition - 30}
                      y={yPosition - 35}
                      width="60"
                      height="30"
                      rx="4"
                      fill="#1e293b"
                      className="dark:fill-slate-700"
                    />
                    <text
                      x={xPosition}
                      y={yPosition - 20}
                      textAnchor="middle"
                      className="text-[10px] fill-white font-medium"
                    >
                      {binary ? (value === 1 ? 'Closed' : 'Open') : `${value.toFixed(1)}${unit}`}
                    </text>
                    <text
                      x={xPosition}
                      y={yPosition - 8}
                      textAnchor="middle"
                      className="text-[8px] fill-gray-300"
                    >
                      {timestamps[index] || '--:--'}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>
          <div className="relative mt-3" style={{ height: shouldRotateLabels ? '40px' : '20px', paddingLeft: `${chartPadding}px`, paddingRight: `${chartPadding}px` }}>
            {timestamps.slice(0, dataLength).map((time, index) => {
              const xPosition = chartPadding + (index * adjustedStepWidth);
              return (
                <div 
                  key={index} 
                  className={`text-xs text-gray-500 dark:text-gray-400 text-center absolute -translate-x-1/2 whitespace-nowrap ${shouldRotateLabels ? 'origin-bottom-left' : ''}`}
                  style={{ 
                    left: `${xPosition}px`,
                    top: '2px',
                    transform: shouldRotateLabels ? `rotate(-60deg) translateX(-10px)` : 'translateX(-50%)'
                  }}
                >
                  {time || '--:--'}
                </div>
              );
            })}
          </div>
          {/* Legend for door sensor chart */}
          {doorData && (
            <div className="flex items-center justify-center gap-6 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-xs text-gray-600 dark:text-gray-400">Door Sensor 1</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                <span className="text-xs text-gray-600 dark:text-gray-400">Door Sensor 2</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LineChart;
