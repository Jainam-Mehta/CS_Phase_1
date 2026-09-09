import React, { useState } from 'react';
import { 
  Thermometer, Droplets, Gauge, Zap, DoorOpen, Activity, 
  Sun, Battery, AlertCircle, CheckCircle2, ShieldAlert, Plug
} from 'lucide-react';

export type SensorIconType = 
  | 'temp' 
  | 'humidity' 
  | 'pressure' 
  | 'power' 
  | 'door' 
  | 'compressor' 
  | 'battery' 
  | 'ambientTemp' 
  | 'ambientHum';

export interface SensorData {
  id: string;
  label: string;
  value: string | number | null;
  unit: string;
  status: 'optimal' | 'warning' | 'critical' | 'unknown' | 'uninstalled';
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  iconType?: SensorIconType;
  isInstalled?: boolean;
  category?: 'storage' | 'mechanical' | 'ambient' | 'electrical';
  thresholds?: { min?: number; max?: number };
}

export interface InverterData {
  solarPercentage: number;
  gridPercentage: number;
  totalKwh: number;
  voltage?: number;
  currentAmps?: number;
  status: 'optimal' | 'warning' | 'critical' | 'offline';
}

export interface CompressorHealthData {
  score: number; // 0-100
  status: 'Optimal' | 'Warning' | 'Critical';
  reason: string;
}

interface HVACDiagramProps {
  sensors: SensorData[];
  inverterData?: InverterData;
  compressorHealth?: CompressorHealthData;
  systemLive?: boolean;
}

export const HVACDiagram: React.FC<HVACDiagramProps> = ({
  sensors,
  inverterData = { solarPercentage: 0, gridPercentage: 100, totalKwh: 0, status: 'optimal' },
  compressorHealth = { score: 100, status: 'Optimal', reason: 'No active alarms detected' },
  systemLive = true,
}) => {
  const [hoveredSensor, setHoveredSensor] = useState<string | null>(null);

  const renderIcon = (type?: SensorIconType) => {
    const iconClass = "w-3.5 h-3.5 flex-shrink-0";
    switch (type) {
      case 'temp':
        return <Thermometer className={`${iconClass} text-blue-600 dark:text-blue-400`} />;
      case 'humidity':
        return <Droplets className={`${iconClass} text-emerald-600 dark:text-emerald-400`} />;
      case 'pressure':
        return <Gauge className={`${iconClass} text-purple-600 dark:text-purple-400`} />;
      case 'power':
        return <Zap className={`${iconClass} text-amber-600 dark:text-amber-400`} />;
      case 'door':
        return <DoorOpen className={`${iconClass} text-indigo-600 dark:text-indigo-400`} />;
      case 'compressor':
        return <Activity className={`${iconClass} text-rose-600 dark:text-rose-400`} />;
      case 'battery':
        return <Battery className={`${iconClass} text-green-600 dark:text-green-400`} />;
      case 'ambientTemp':
        return <Sun className={`${iconClass} text-orange-600 dark:text-orange-400`} />;
      case 'ambientHum':
        return <Droplets className={`${iconClass} text-teal-600 dark:text-teal-400`} />;
      default:
        return <Activity className={`${iconClass} text-slate-500 dark:text-slate-400`} />;
    }
  };

  const getStatusBg = (status: SensorData['status'], isInstalled = true) => {
    if (!isInstalled || status === 'uninstalled') {
      return 'bg-slate-100/90 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 border-dashed border-slate-300 dark:border-slate-700 opacity-60';
    }
    switch (status) {
      case 'optimal':
        return 'bg-white/95 dark:bg-slate-900/90 text-emerald-700 dark:text-emerald-300 border-emerald-500/50 dark:border-emerald-500/40 shadow-sm dark:shadow-emerald-900/20';
      case 'warning':
        return 'bg-white/95 dark:bg-slate-900/90 text-amber-700 dark:text-amber-300 border-amber-500/50 dark:border-amber-500/40 shadow-sm dark:shadow-amber-900/20';
      case 'critical':
        return 'bg-white/95 dark:bg-slate-900/90 text-rose-700 dark:text-rose-300 border-rose-500/50 dark:border-rose-500/40 shadow-sm dark:shadow-rose-900/20';
      default:
        return 'bg-white/95 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700';
    }
  };

  const getStatusDotColor = (status: SensorData['status'], isInstalled = true) => {
    if (!isInstalled || status === 'uninstalled') return 'bg-slate-400 dark:bg-slate-600';
    switch (status) {
      case 'optimal': return 'bg-emerald-500';
      case 'warning': return 'bg-amber-500';
      case 'critical': return 'bg-rose-500';
      default: return 'bg-slate-400';
    }
  };

  return (
    <div className="relative w-full h-[620px] bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 rounded-2xl overflow-hidden shadow-xl dark:shadow-2xl border border-slate-200 dark:border-slate-800 transition-colors duration-300 font-sans">
      {/* Top Bar Header */}
      <div className="absolute top-4 left-6 right-6 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center space-x-3 bg-white/90 dark:bg-slate-900/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-lg pointer-events-auto">
          <span className={`w-2.5 h-2.5 rounded-full ${systemLive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            {systemLive ? 'SYSTEM LIVE' : 'SYSTEM OFFLINE'}
          </span>
        </div>

        {/* Inverter Power Feed Bar */}
        <div className="flex items-center space-x-4 bg-white/90 dark:bg-slate-900/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 pointer-events-auto shadow-sm dark:shadow-lg">
          <div className="flex items-center space-x-1.5">
            <Sun className="w-3.5 h-3.5 text-amber-500" />
            <span>Solar: <strong className="text-emerald-600 dark:text-emerald-400">{inverterData.solarPercentage}%</strong></span>
          </div>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <div className="flex items-center space-x-1.5">
            <Plug className="w-3.5 h-3.5 text-blue-500" />
            <span>Grid: <strong className="text-blue-600 dark:text-blue-400">{inverterData.gridPercentage}%</strong></span>
          </div>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <div className="flex items-center space-x-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Total: <strong className="text-amber-700 dark:text-amber-300">{inverterData.totalKwh} kWh</strong></span>
          </div>
        </div>
      </div>

      {/* 2D Industrial SVG Schematic */}
      <svg className="w-full h-full" viewBox="0 0 1000 620" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="pipeHot" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#dc2626" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="pipeCold" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="pipeLiquid" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0.9" />
          </linearGradient>

          <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" className="stroke-slate-300 dark:stroke-slate-800" strokeWidth="0.75" opacity="0.4" />
          </pattern>

          {/* Animated Flow Dash Effect */}
          <style>
            {`
              @keyframes dashFlow {
                to { stroke-dashoffset: -40; }
              }
              .refrigerant-flow {
                stroke-dasharray: 10, 10;
                animation: dashFlow 2s linear infinite;
              }
            `}
          </style>
        </defs>

        {/* Background Grid */}
        <rect width="1000" height="620" fill="url(#gridPattern)" />

        {/* ── ZONE 1: COLD STORAGE ROOM (LEFT) ─────────────────────────────────── */}
        <rect x="50" y="80" width="340" height="440" rx="16" className="fill-white dark:fill-slate-950 stroke-slate-300 dark:stroke-slate-700/80 shadow-md" strokeWidth="3" />
        <rect x="65" y="95" width="310" height="410" rx="12" className="fill-blue-50/40 dark:fill-slate-900/60 stroke-blue-200 dark:stroke-slate-800/80" strokeWidth="2" strokeDasharray="6 6" />
        
        {/* Cold Storage Header Label */}
        <rect x="120" y="110" width="200" height="30" rx="6" className="fill-blue-100/80 dark:fill-slate-800/90 stroke-blue-200 dark:stroke-slate-700" strokeWidth="1" />
        <text x="220" y="130" className="fill-blue-700 dark:fill-blue-400 font-extrabold" textAnchor="middle" fontSize="12" letterSpacing="1.5">
          INTERNAL COLD STORAGE
        </text>

        {/* Evaporator Unit (Inside Cold Storage) */}
        <g transform="translate(100, 160)">
          <rect x="0" y="0" width="240" height="90" rx="8" className="fill-slate-200 dark:fill-slate-800 stroke-slate-300 dark:stroke-slate-600" strokeWidth="2" />
          {/* Evaporator Coils */}
          <path d="M 20 25 Q 60 45 220 25 M 20 45 Q 60 65 220 45 M 20 65 Q 60 85 220 65" stroke="#3b82f6" strokeWidth="3" fill="none" opacity="0.8" />
          <text x="120" y="52" className="fill-slate-800 dark:fill-slate-200 font-bold" textAnchor="middle" fontSize="11">EVAPORATOR COILS</text>
        </g>

        {/* Door Sensor Gateway Graphic */}
        <g transform="translate(50, 310)">
          <rect x="-8" y="0" width="16" height="80" rx="4" className="fill-slate-300 dark:fill-slate-700" />
          <line x1="0" y1="5" x2="0" y2="75" className="stroke-slate-400 dark:stroke-slate-500" strokeWidth="3" />
          <text x="14" y="45" className="fill-slate-500 dark:fill-slate-400 text-[10px] font-bold uppercase tracking-wider" textAnchor="start">DOOR ACCESS</text>
        </g>

        {/* ── ZONE 2: MECHANICAL / MACHINE ROOM (RIGHT) ────────────────────────── */}
        <rect x="620" y="50" width="340" height="500" rx="16" className="fill-slate-200/50 dark:fill-slate-950/70 stroke-slate-300 dark:stroke-slate-800" strokeWidth="2" strokeDasharray="4 4" />
        <text x="790" y="75" className="fill-slate-600 dark:fill-slate-500 font-bold uppercase tracking-wider" textAnchor="middle" fontSize="11">
          MACHINE ROOM / MECHANICAL ZONE
        </text>

        {/* Compressor Unit */}
        <g transform="translate(680, 100)">
          <rect x="0" y="0" width="170" height="120" rx="14" className="fill-slate-200 dark:fill-slate-800 stroke-rose-400 dark:stroke-rose-500/40" strokeWidth="2" />
          {/* Compressor Heat Fins */}
          <line x1="20" y1="30" x2="150" y2="30" className="stroke-slate-400 dark:stroke-slate-600" strokeWidth="5" strokeLinecap="round" />
          <line x1="20" y1="55" x2="150" y2="55" className="stroke-slate-400 dark:stroke-slate-600" strokeWidth="5" strokeLinecap="round" />
          <line x1="20" y1="80" x2="150" y2="80" className="stroke-slate-400 dark:stroke-slate-600" strokeWidth="5" strokeLinecap="round" />
          <text x="85" y="106" className="fill-slate-800 dark:fill-slate-200 font-bold" textAnchor="middle" fontSize="13">COMPRESSOR UNIT</text>

          {/* Health Score Overlay Tag */}
          <g transform="translate(15, -12)">
            <rect x="0" y="0" width="140" height="22" rx="11" className="fill-white dark:fill-slate-900 stroke-slate-300 dark:stroke-slate-700 shadow-sm" strokeWidth="1.5" />
            <text x="70" y="15" fill={compressorHealth.score >= 80 ? "#10b981" : compressorHealth.score >= 60 ? "#f59e0b" : "#ef4444"} fontSize="10" fontWeight="bold" textAnchor="middle">
              HEALTH: {compressorHealth.score}% ({compressorHealth.status.toUpperCase()})
            </text>
          </g>
        </g>

        {/* Condenser Unit */}
        <g transform="translate(660, 310)">
          <rect x="0" y="0" width="220" height="160" rx="14" className="fill-slate-200 dark:fill-slate-800 stroke-slate-300 dark:stroke-slate-600" strokeWidth="2" />
          {/* Fans */}
          <circle cx="65" cy="80" r="38" className="fill-white dark:fill-slate-900 stroke-slate-300 dark:stroke-slate-700" strokeWidth="2" />
          <circle cx="155" cy="80" r="38" className="fill-white dark:fill-slate-900 stroke-slate-300 dark:stroke-slate-700" strokeWidth="2" />
          <path d="M 65 52 L 65 108 M 37 80 L 93 80" className="stroke-slate-400 dark:stroke-slate-600" strokeWidth="3" />
          <path d="M 155 52 L 155 108 M 127 80 L 183 80" className="stroke-slate-400 dark:stroke-slate-600" strokeWidth="3" />
          <text x="110" y="145" className="fill-slate-700 dark:fill-slate-300 font-bold" textAnchor="middle" fontSize="12">CONDENSER UNIT & FANS</text>
        </g>

        {/* Expansion Valve */}
        <g transform="translate(420, 205)">
          <polygon points="0,-15 30,0 0,15" fill="#f59e0b" />
          <polygon points="30,-15 0,0 30,15" fill="#f59e0b" />
          <rect x="10" y="-22" width="10" height="12" fill="#ef4444" rx="2" />
          <text x="15" y="-24" className="fill-amber-600 dark:fill-amber-400 font-bold" textAnchor="middle" fontSize="9">EXP. VALVE</text>
        </g>

        {/* ── ZONE 3: REFRIGERANT PIPING LOOP ──────────────────────────────────── */}
        {/* Low-Pressure Suction Line (Blue - Evaporator to Compressor) */}
        <path d="M 340 205 L 520 205 Q 560 205 560 160 L 560 160 Q 560 140 600 140 L 680 140" fill="none" stroke="url(#pipeCold)" strokeWidth="12" />
        <path d="M 340 205 L 520 205 Q 560 205 560 160 L 560 160 Q 560 140 600 140 L 680 140" fill="none" stroke="#93c5fd" strokeWidth="3" className="refrigerant-flow" />

        {/* High-Pressure Discharge Line (Red - Compressor to Condenser) */}
        <path d="M 850 160 L 910 160 Q 930 160 930 200 L 930 370 Q 930 390 880 390" fill="none" stroke="url(#pipeHot)" strokeWidth="12" />
        <path d="M 850 160 L 910 160 Q 930 160 930 200 L 930 370 Q 930 390 880 390" fill="none" stroke="#fca5a5" strokeWidth="3" className="refrigerant-flow" />

        {/* High-Pressure Liquid Line (Orange - Condenser to Expansion Valve) */}
        <path d="M 660 390 L 450 390 Q 420 390 420 360 L 420 225" fill="none" stroke="url(#pipeLiquid)" strokeWidth="10" />
        <path d="M 660 390 L 450 390 Q 420 390 420 360 L 420 225" fill="none" stroke="#fde68a" strokeWidth="2.5" className="refrigerant-flow" />

        {/* ── ZONE 4: OUTDOOR AMBIENT ZONE (BOTTOM LEFT) ─────────────────────────── */}
        <rect x="50" y="525" width="340" height="80" rx="12" className="fill-white/80 dark:fill-slate-900/90 stroke-slate-300 dark:stroke-slate-800 shadow-sm" strokeWidth="1" />
        <text x="65" y="546" className="fill-slate-500 dark:fill-slate-400 font-bold uppercase tracking-wider" fontSize="10">
          OUTDOOR AMBIENT ENVIRONMENT
        </text>
      </svg>

      {/* ── INTERACTIVE DYNAMIC SENSOR BADGES OVERLAY ─────────────────────────── */}
      {sensors.map((sensor) => {
        const isInstalled = sensor.isInstalled !== false && sensor.status !== 'uninstalled';
        const isHovered = hoveredSensor === sensor.id;

        return (
          <div
            key={sensor.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 z-20"
            style={{ left: `${sensor.x}%`, top: `${sensor.y}%` }}
            onMouseEnter={() => setHoveredSensor(sensor.id)}
            onMouseLeave={() => setHoveredSensor(null)}
          >
            <div className="relative group cursor-pointer">
              {/* Sensor Badge Pill */}
              <div
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full border shadow-md transition-all duration-200 ${getStatusBg(
                  sensor.status,
                  isInstalled
                )} ${isHovered ? 'scale-110 z-30 ring-2 ring-blue-500 dark:ring-blue-400' : ''}`}
              >
                {/* Glowing Pulse Dot */}
                <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                  {isInstalled && sensor.status !== 'optimal' && sensor.status !== 'unknown' && (
                    <span
                      className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${getStatusDotColor(
                        sensor.status,
                        isInstalled
                      )}`}
                    />
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-2.5 w-2.5 ${getStatusDotColor(
                      sensor.status,
                      isInstalled
                    )}`}
                  />
                </span>

                {/* Micro Icon */}
                {renderIcon(sensor.iconType)}

                {/* Sensor Value / Label */}
                <div className="flex items-baseline space-x-1">
                  {isInstalled ? (
                    <>
                      <span className="text-xs font-extrabold tracking-tight">
                        {sensor.value !== null && sensor.value !== undefined ? sensor.value : '--'}
                      </span>
                      {sensor.unit && <span className="text-[10px] font-medium opacity-80">{sensor.unit}</span>}
                    </>
                  ) : (
                    <span className="text-[10px] font-bold tracking-tight uppercase opacity-60">Not Installed</span>
                  )}
                </div>
              </div>

              {/* Detailed Hover Card / Tooltip */}
              <div
                className={`absolute font-sans bottom-9 left-1/2 -translate-x-1/2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-xl dark:shadow-2xl transition-all duration-200 z-40 pointer-events-none ${
                  isHovered ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    {renderIcon(sensor.iconType)}
                    {sensor.label}
                  </span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                      isInstalled
                        ? sensor.status === 'optimal'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400'
                          : sensor.status === 'warning'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400'
                          : sensor.status === 'critical'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-400'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {isInstalled ? (sensor.status === 'unknown' ? 'No Telemetry' : sensor.status) : 'Optional'}
                  </span>
                </div>

                {isInstalled ? (
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between items-baseline">
                      <span className="text-slate-500 dark:text-slate-400">Current Reading:</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {sensor.value !== null && sensor.value !== undefined ? `${sensor.value} ${sensor.unit}`.trim() : 'No Reading'}
                      </span>
                    </div>
                    {sensor.thresholds && (
                      <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                        <span>Target Range:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {sensor.thresholds.min ?? 0} to {sensor.thresholds.max ?? 100} {sensor.unit}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                    Optional sensor hardware not detected for this room. Install to unlock extended component analytics.
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default HVACDiagram;
