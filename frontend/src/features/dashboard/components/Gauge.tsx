import React, { useEffect, useState } from 'react';

interface GaugeProps {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  gradientColors: [string, string]; // e.g. ['#3b82f6', '#ef4444']
}

export const Gauge: React.FC<GaugeProps> = ({ label, value, min, max, unit, gradientColors }) => {
  const [animatedValue, setAnimatedValue] = useState(min);

  useEffect(() => {
    // Smoothly animate from min to value on mount
    const timeout = setTimeout(() => {
      setAnimatedValue(value);
    }, 100);
    return () => clearTimeout(timeout);
  }, [value, min]);

  // Calculate percentage for rotation (0 to 180 degrees)
  const percentage = Math.max(0, Math.min(100, ((animatedValue - min) / (max - min)) * 100));
  const rotation = (percentage / 100) * 180;

  return (
    <div className="relative flex flex-col items-center bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-100 dark:border-slate-700 transition-transform duration-300 hover:scale-105 group overflow-hidden">
      <h3 className="text-sm font-semibold tracking-wider text-slate-500 dark:text-slate-400 mb-6 uppercase">
        {label}
      </h3>
      
      {/* Gauge SVG */}
      <div className="relative w-48 h-24 overflow-hidden mb-2">
        <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id={`gradient-${label.replace(/\s+/g, '-')}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={gradientColors[0]} />
              <stop offset="100%" stopColor={gradientColors[1]} />
            </linearGradient>
          </defs>
          
          {/* Background Arc */}
          <path 
            d="M 10 50 A 40 40 0 0 1 90 50" 
            fill="none" 
            stroke="currentColor" 
            className="text-slate-200 dark:text-slate-700" 
            strokeWidth="10" 
            strokeLinecap="round" 
          />
          
          {/* Foreground Arc */}
          <path 
            d="M 10 50 A 40 40 0 0 1 90 50" 
            fill="none" 
            stroke={`url(#gradient-${label.replace(/\s+/g, '-')})`} 
            strokeWidth="10" 
            strokeLinecap="round" 
            strokeDasharray="125.6" /* Circumference of half circle = Pi * R (3.14 * 40) ~ 125.6 */
            strokeDashoffset={125.6 - (125.6 * (percentage / 100))}
            className="transition-all duration-1000 ease-out drop-shadow-md"
          />

          {/* Needle Base */}
          <circle cx="50" cy="50" r="4" fill="currentColor" className="text-slate-700 dark:text-slate-300 shadow-xl z-20" />
        </svg>

        {/* CSS-based Needle Pivot */}
        <div 
          className="absolute bottom-0 left-[calc(50%-2px)] w-1 h-[42px] bg-slate-700 dark:bg-slate-300 rounded-t-full origin-bottom transition-transform duration-1000 ease-out"
          style={{ transform: `rotate(${rotation - 90}deg)` }}
        />
      </div>

      <div className="text-center z-10">
        <span className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {animatedValue.toFixed(1)}
        </span>
        <span className="text-lg font-medium text-slate-500 ml-1">{unit}</span>
      </div>

      {/* Decorative background glow based on gradient */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300"
        style={{ background: `linear-gradient(to bottom, ${gradientColors[1]}, transparent)` }}
      />
    </div>
  );
};
