import React, { useState } from 'react';

interface SensorData {
  id: string;
  label: string;
  value: string | number | null;
  unit: string;
  status: 'optimal' | 'warning' | 'critical' | 'unknown';
  x: number;
  y: number;
}

interface HVACDiagramProps {
  sensors: SensorData[];
}

export const HVACDiagram: React.FC<HVACDiagramProps> = ({ sensors }) => {
  const [hoveredSensor, setHoveredSensor] = useState<string | null>(null);

  const getStatusColor = (status: SensorData['status']) => {
    switch (status) {
      case 'optimal': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-400 dark:bg-gray-600';
    }
  };

  const getStatusBorder = (status: SensorData['status']) => {
    switch (status) {
      case 'optimal': return 'border-green-500';
      case 'warning': return 'border-yellow-500';
      case 'critical': return 'border-red-500';
      default: return 'border-gray-400 dark:border-gray-600';
    }
  };

  return (
    <div className="relative w-full h-[600px] bg-slate-50 dark:bg-slate-900 rounded-xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-800 transition-colors duration-300">
      <div className="absolute top-4 left-6 text-slate-800 dark:text-slate-300 font-medium tracking-wider flex items-center space-x-2">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
        <span>SYSTEM LIVE</span>
      </div>
      
      {/* 2D SVG Diagram */}
      <svg className="w-full h-full" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="pipeHot" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#b91c1c" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="pipeCold" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="metalGradDark" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="40%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>
          <linearGradient id="metalGradLight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#cbd5e1" />
            <stop offset="40%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>
          
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Cold Storage Box */}
        <rect x="50" y="80" width="300" height="400" rx="4" className="fill-slate-100 stroke-slate-300 dark:fill-slate-950 dark:stroke-slate-800" strokeWidth="8" />
        <rect x="70" y="100" width="260" height="360" rx="2" className="fill-slate-200 dark:fill-slate-800" opacity="0.5" />
        <text x="200" y="270" className="fill-slate-500 dark:fill-slate-500" textAnchor="middle" fontSize="24" fontWeight="600" letterSpacing="2">INTERNAL STORAGE</text>

        {/* Condenser (Outside) */}
        <rect x="650" y="320" width="220" height="150" rx="8" className="fill-[url(#metalGradLight)] dark:fill-[url(#metalGradDark)] stroke-slate-400 dark:stroke-slate-800" strokeWidth="4" />
        <circle cx="700" cy="395" r="30" className="fill-slate-800 dark:fill-slate-800" />
        <circle cx="810" cy="395" r="30" className="fill-slate-800 dark:fill-slate-800" />
        <path d="M700 375 L700 415 M680 395 L720 395" stroke="#475569" strokeWidth="4" />
        <path d="M810 375 L810 415 M790 395 L830 395" stroke="#475569" strokeWidth="4" />
        <text x="760" y="495" className="fill-slate-600 dark:fill-slate-400" textAnchor="middle" fontSize="14" fontWeight="600">CONDENSER UNIT</text>

        {/* Compressor */}
        <rect x="700" y="100" width="120" height="100" rx="20" className="fill-[url(#metalGradLight)] dark:fill-[url(#metalGradDark)] stroke-slate-400 dark:stroke-slate-800" strokeWidth="4" />
        <line x1="720" y1="120" x2="800" y2="120" className="stroke-slate-600 dark:stroke-slate-800" strokeWidth="8" />
        <line x1="720" y1="150" x2="800" y2="150" className="stroke-slate-600 dark:stroke-slate-800" strokeWidth="8" />
        <line x1="720" y1="180" x2="800" y2="180" className="stroke-slate-600 dark:stroke-slate-800" strokeWidth="8" />
        <text x="760" y="230" className="fill-slate-600 dark:fill-slate-400" textAnchor="middle" fontSize="14" fontWeight="600">COMPRESSOR</text>

        {/* Evaporator (Inside) */}
        <rect x="100" y="120" width="200" height="80" rx="4" className="fill-[url(#metalGradLight)] dark:fill-[url(#metalGradDark)]" />
        <path d="M120 140 Q 150 160 280 140" stroke="#60a5fa" strokeWidth="4" fill="none" />
        <path d="M120 160 Q 150 140 280 160" stroke="#60a5fa" strokeWidth="4" fill="none" />
        <path d="M120 180 Q 150 200 280 180" stroke="#60a5fa" strokeWidth="4" fill="none" />
        <text x="200" y="225" className="fill-slate-500 dark:fill-slate-400" textAnchor="middle" fontSize="12" fontWeight="600">EVAPORATOR</text>

        {/* PIPING */}
        <path d="M 820 150 L 920 150 L 920 395 L 870 395" fill="none" stroke="url(#pipeHot)" strokeWidth="12" />
        <path d="M 650 395 L 450 395 L 450 160 L 350 160" fill="none" stroke="#f59e0b" strokeWidth="10" />
        
        <polygon points="340,140 360,180 340,180 360,140" className="fill-slate-400 dark:fill-slate-400" />
        <rect x="345" y="130" width="10" height="10" fill="#ef4444" />
        
        <path d="M 300 160 L 340 160 Q 400 160 400 100 L 400 50 Q 400 30 450 30 L 760 30 L 760 100" fill="none" stroke="url(#pipeCold)" strokeWidth="14" />
        
        {/* Directional Flow Arrows */}
        <polygon points="860,140 880,150 860,160" fill="#fee2e2" />
        <polygon points="550,385 530,395 550,405" fill="#fef3c7" />
        <polygon points="600,40 620,30 600,20" fill="#dbeafe" />
      </svg>

      {/* Sensor Overlays */}
      {sensors.map((sensor) => (
        <div
          key={sensor.id}
          className="absolute transform -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${sensor.x}%`, top: `${sensor.y}%` }}
          onMouseEnter={() => setHoveredSensor(sensor.id)}
          onMouseLeave={() => setHoveredSensor(null)}
        >
          {/* Node Dot */}
          <div className="relative group cursor-pointer">
            <div className={`w-4 h-4 rounded-full ${getStatusColor(sensor.status)} border-2 border-white dark:border-slate-800 shadow-lg z-10 relative`}>
              <div className={`absolute inset-0 rounded-full ${getStatusColor(sensor.status)} ${sensor.status !== 'unknown' ? 'animate-ping opacity-75' : 'opacity-0'}`}></div>
            </div>
            
            {/* Tooltip / Label Card */}
            <div className={`absolute font-sans bottom-8 left-1/2 -translate-x-1/2 w-max bg-white dark:bg-slate-800 ${getStatusBorder(sensor.status)} border-b-2 rounded-lg px-4 py-3 shadow-xl transition-all duration-200 z-20 pointer-events-none
                ${hoveredSensor === sensor.id ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-1 uppercase tracking-wider">{sensor.label}</div>
              <div className="text-xl font-bold text-slate-900 dark:text-white flex items-baseline gap-1">
                {sensor.value !== null && sensor.value !== undefined ? sensor.value : '--'}
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{sensor.unit}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
