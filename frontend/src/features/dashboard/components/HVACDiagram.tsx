import React, { useState } from 'react';
import { 
  Thermometer, Droplets, Gauge, Zap, DoorOpen, Activity, 
  Sun, Battery as BatteryIcon, Wind
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
  | 'ambientHum' 
  | 'gas';

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
  category?: 'storage' | 'mechanical' | 'ambient' | 'electrical' | 'gas';
  thresholds?: { min?: number; max?: number };
}

export interface InverterData {
  solarPercentage: number;
  gridPercentage: number;
  totalKwh: number;
  solarKw?: number | null;
  voltage?: number;
  currentAmps?: number;
  status: 'optimal' | 'warning' | 'critical' | 'offline';
}

export interface CompressorHealthData {
  score: number; // 0-100
  status: 'Optimal' | 'Warning' | 'Critical';
  reason: string;
}

export interface BatteryData {
  capacity?: string | null;
  percentage?: number | null;
  status?: 'charged' | 'charging' | 'discharging' | 'standby';
  powerKw?: number | null;
  voltage?: number;
}

interface HVACDiagramProps {
  sensors: SensorData[];
  inverterData?: InverterData;
  compressorHealth?: CompressorHealthData;
  batteryData?: BatteryData;
  systemLive?: boolean;
}

export const HVACDiagram: React.FC<HVACDiagramProps> = ({
  sensors,
  inverterData = { solarPercentage: 0, gridPercentage: 100, totalKwh: 0, status: 'optimal' },
  compressorHealth = { score: 100, status: 'Optimal', reason: 'Awaiting telemetry' },
  batteryData,
  systemLive = true,
}) => {
  const [hoveredSensor, setHoveredSensor] = useState<string | null>(null);

  // Derived operating values directly from live props/database telemetry
  const isSolarActive = systemLive && (inverterData.solarPercentage ?? 0) > 0;
  const isGridConnected = systemLive && (inverterData.gridPercentage ?? 0) > 0;
  const isCompressorRunning = systemLive && compressorHealth.status !== 'Critical';
  const batteryPercent = batteryData?.percentage ?? null;

  // Real solar kW: use solarKw prop from database if provided, or derive from real totalKwh & solarPercentage
  const solarKw = inverterData.solarKw !== undefined && inverterData.solarKw !== null
    ? inverterData.solarKw
    : isSolarActive && (inverterData.totalKwh ?? 0) > 0
      ? Number(((inverterData.solarPercentage / 100) * inverterData.totalKwh).toFixed(1))
      : 0;

  // Filter out gas sensors (Oxygen, Ammonia, etc.) to eliminate visual clutter
  const relevantSensors = sensors.filter((sensor) => {
    const id = (sensor.id || '').toLowerCase();
    const label = (sensor.label || '').toLowerCase();
    const cat = (sensor.category || '').toLowerCase();
    const icon = (sensor.iconType || '').toLowerCase();

    if (
      cat === 'gas' || 
      icon === 'gas' || 
      id.includes('gas') || 
      id.includes('oxygen') || 
      id.includes('ammonia') || 
      id.includes('co2') || 
      id.includes('ethylene') ||
      label.includes('oxygen') ||
      label.includes('ammonia') ||
      label.includes('co₂') ||
      label.includes('co2') ||
      label.includes('ethylene')
    ) {
      return false;
    }
    return true;
  });

  // Precise coordinate mapping for updated layout to prevent overlap
  const getAdjustedSensorCoords = (sensor: SensorData) => {
    switch (sensor.id) {
      case 'internal-storage-temp':
        return { x: 20, y: 17 };
      case 'internal-storage-hum':
        return { x: 34, y: 17 };
      case 'door-access-state':
        return { x: 10.5, y: 72 };
      case 'suction-pressure-line':
        // Cleanly below the blue line (blue line is at y: 295 / ~47.6%)
        return { x: 49, y: 53.5 };
      case 'compressor-health-node':
        return { x: 74, y: 48 };
      case 'discharge-pressure-line':
        // Cleanly to the right side of the red line, centered between red discharge line (810) and green condenser power line (930)
        return { x: 87, y: 65 };
      case 'outdoor-ambient-temp':
        return { x: 18, y: 91 };
      case 'outdoor-ambient-hum':
        return { x: 34, y: 91 };
      case 'battery-status-node':
      case 'battery-level':
        return { x: 67.3, y: 11 };
      default:
        return { x: sensor.x, y: sensor.y };
    }
  };

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
        return <BatteryIcon className={`${iconClass} text-green-600 dark:text-green-400`} />;
      case 'ambientTemp':
        return <Sun className={`${iconClass} text-orange-600 dark:text-orange-400`} />;
      case 'ambientHum':
        return <Droplets className={`${iconClass} text-teal-600 dark:text-teal-400`} />;
      case 'gas':
        return <Wind className={`${iconClass} text-emerald-600 dark:text-emerald-400`} />;
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
    <div className="w-full flex justify-center items-center">
      {/* ── UNIFIED AUTO-SCALING RESPONSIVE BOX (STRICT 1000:620 ASPECT RATIO) ──
          Eliminates all letterboxing so SVG coordinates & HTML sensor badge percentages
          are mathematically locked in 100% synchronization on all device screen sizes.
      ─────────────────────────────────────────────────────────────────────────── */}
      <div 
        className="relative w-full aspect-[1000/620] bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 rounded-2xl overflow-hidden shadow-xl dark:shadow-2xl border border-slate-200 dark:border-slate-800 transition-colors duration-300 font-sans select-none"
        style={{
          maxWidth: 'min(100%, calc((100vh - 160px) * (1000 / 620)))',
        }}
      >
        {/* ── 2D INDUSTRIAL SVG SCHEMATIC CANVAS (1000 × 620) ─────────────────── */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 620" preserveAspectRatio="none">
        <defs>
          {/* Uniform Standardized Refrigerant Gradients */}
          <linearGradient id="pipeHot" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f87171" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#dc2626" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="pipeCold" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="pipeLiquid" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0.95" />
          </linearGradient>

          {/* Photovoltaic Cells Gradient */}
          <linearGradient id="solarCell" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fde047" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>

          {/* Realistic Industrial Commercial Storage Battery Gradients */}
          <linearGradient id="industrialBatteryGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="30%" stopColor="#1e293b" />
            <stop offset="70%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>

          {/* Realistic Industrial Cold Room Door Gradients */}
          <linearGradient id="metalDoorPanel" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="25%" stopColor="#cbd5e1" />
            <stop offset="50%" stopColor="#f8fafc" />
            <stop offset="75%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
          <linearGradient id="metalDoorDepth" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>
          <linearGradient id="doorFrost" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
            <stop offset="60%" stopColor="#e0f2fe" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.15" />
          </linearGradient>

          {/* Blueprint Grid */}
          <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" className="stroke-slate-300 dark:stroke-slate-800" strokeWidth="0.75" opacity="0.3" />
          </pattern>

          {/* Standardized Arrowhead Markers with Uniform Geometry */}
          <marker id="arrowSolar" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#f59e0b" />
          </marker>
          <marker id="arrowGrid" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#3b82f6" />
          </marker>
          <marker id="arrowGreen" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#10b981" />
          </marker>

          {/* Standardized Flow & Fan Animation Keyframes */}
          <style>
            {`
              @keyframes fanSpin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
              /* Evaporator fan: rotates around its local origin (0,0) */
              .fan-spin-active {
                animation: fanSpin 1.8s linear infinite;
                transform-box: fill-box;
                transform-origin: center;
              }
              /* Condenser fans: same technique */
              .fan-spin-fast {
                animation: fanSpin 1.1s linear infinite;
                transform-box: fill-box;
                transform-origin: center;
              }
              @keyframes dashFlow {
                to { stroke-dashoffset: -40; }
              }
              /* Standardized uniform animation for ALL refrigerant lines */
              .refrigerant-flow {
                stroke-dasharray: 8, 8;
                animation: dashFlow 2s linear infinite;
              }
              /* Top-right power flow lines: EXACT SAME speed, dash and style */
              .power-flow-grid {
                stroke-dasharray: 6, 6;
                animation: dashFlow 1.8s linear infinite;
              }
              .power-flow-solar {
                stroke-dasharray: 6, 6;
                animation: dashFlow 1.8s linear infinite;
              }
              .power-flow-battery {
                stroke-dasharray: 6, 6;
                animation: dashFlow 1.8s linear infinite;
              }
              /* Green AC power lines: animated exactly like refrigerant lines */
              .power-flow-ac {
                stroke-dasharray: 8, 8;
                animation: dashFlow 2s linear infinite;
              }
              @keyframes solarPulse {
                0%, 100% { transform: scale(1); opacity: 0.55; }
                50% { transform: scale(1.1); opacity: 0.95; }
              }
              .solar-pulse-anim {
                animation: solarPulse 3s ease-in-out infinite;
                transform-box: fill-box;
                transform-origin: center;
              }
            `}
          </style>
        </defs>

        {/* Blueprint Grid Background */}
        <rect width="1000" height="620" fill="url(#gridPattern)" />

        {/* ═══════════════════════════════════════════════════════════════════════
            TOP RIGHT SECTION: POWER INFRASTRUCTURE CONTAINER (x: 440-970)
            Includes: Grid Power (left), Battery (center top), 
            Inverter (center bottom), Solar Panels (right)
            ═══════════════════════════════════════════════════════════════════════ */}
        <rect 
          x="440" y="20" width="530" height="195" rx="14" 
          className="fill-white/70 dark:fill-slate-900/80 stroke-slate-200 dark:stroke-slate-800 shadow-sm" 
          strokeWidth="1.5" 
        />

        {/* ── 1. GRID POWER (TOP LEFT) (x: 452) ────────────────────────────── */}
        <g transform="translate(452, 30)">
          <rect x="0" y="0" width="128" height="175" rx="10" className="fill-slate-50/90 dark:fill-slate-950/70 stroke-slate-200 dark:stroke-slate-800" strokeWidth="1" />
          
          {/* Header Label */}
          <text x="64" y="21" className="fill-slate-800 dark:fill-slate-100 font-extrabold text-[11px] tracking-wider" textAnchor="middle">
            GRID POWER
          </text>

          {/* Status Indicator Badge */}
          <g transform="translate(34, 27)">
            <circle cx="5" cy="5" r="3" fill={isGridConnected ? "#10b981" : "#94a3b8"} className={isGridConnected ? "animate-pulse" : ""} />
            <text x="14" y="8.5" className="fill-emerald-600 dark:fill-emerald-400 font-bold text-[9px]">
              {isGridConnected ? 'Connected' : 'Standby'}
            </text>
          </g>

          {/* Electrical Grid Transmission Tower Icon */}
          <g 
            transform="translate(64, 108) scale(0.6) translate(-66, -103.5)" 
            className="stroke-slate-900 dark:stroke-slate-100" 
            strokeWidth="4.2" 
            strokeLinecap="round" 
            strokeLinejoin="miter" 
            fill="none"
          >
            <path d="M 52 58 L 59 50 L 66 54 L 73 50 L 80 58" />
            <line x1="52" y1="58" x2="80" y2="58" />
            <line x1="52" y1="58" x2="52" y2="83" />
            <line x1="80" y1="58" x2="80" y2="83" />
            <line x1="52" y1="58" x2="80" y2="83" />
            <line x1="80" y1="58" x2="52" y2="83" />
            <line x1="25" y1="83" x2="107" y2="83" />
            <path d="M 52 58 L 25 78 L 25 83" />
            <path d="M 80 58 L 107 78 L 107 83" />
            <line x1="27" y1="83" x2="27" y2="90" strokeWidth="4.5" strokeLinecap="square" />
            <line x1="36" y1="83" x2="36" y2="90" strokeWidth="4.5" strokeLinecap="square" />
            <line x1="96" y1="83" x2="96" y2="90" strokeWidth="4.5" strokeLinecap="square" />
            <line x1="105" y1="83" x2="105" y2="90" strokeWidth="4.5" strokeLinecap="square" />
            <line x1="52" y1="83" x2="52" y2="108" />
            <line x1="80" y1="83" x2="80" y2="108" />
            <line x1="52" y1="83" x2="80" y2="108" />
            <line x1="80" y1="83" x2="52" y2="108" />
            <line x1="25" y1="108" x2="107" y2="108" />
            <path d="M 52 83 L 25 103 L 25 108" />
            <path d="M 80 83 L 107 103 L 107 108" />
            <line x1="27" y1="108" x2="27" y2="115" strokeWidth="4.5" strokeLinecap="square" />
            <line x1="36" y1="108" x2="36" y2="115" strokeWidth="4.5" strokeLinecap="square" />
            <line x1="96" y1="108" x2="96" y2="115" strokeWidth="4.5" strokeLinecap="square" />
            <line x1="105" y1="108" x2="105" y2="115" strokeWidth="4.5" strokeLinecap="square" />
            <line x1="52" y1="108" x2="41" y2="150" />
            <line x1="80" y1="108" x2="91" y2="150" />
            <line x1="52" y1="108" x2="91" y2="150" />
            <line x1="80" y1="108" x2="41" y2="150" />
            <rect x="25" y="150" width="82" height="7" rx="1" className="fill-slate-900 dark:fill-slate-100 stroke-none" />
          </g>
        </g>

        {/* ── 2. BATTERY (CENTER TOP: "BATTERY", RELEVANT INDUSTRIAL BESS ICON, CONSTANT PERCENTAGE) ─ */}
        <g transform="translate(602, 30)">
          {/* Battery Outer Enclosure Box */}
          <rect 
            x="0" y="0" width="142" height="80" rx="9" 
            className="fill-slate-50/95 dark:fill-slate-950/80 stroke-slate-200 dark:stroke-slate-800 shadow-sm" 
            strokeWidth="1" 
          />
          
          {/* Header Label: "BATTERY" only */}
          <text x="12" y="19" className="fill-slate-800 dark:fill-slate-100 font-extrabold text-[11px] tracking-wider">
            BATTERY
          </text>

          {/* Status Badge: Database-driven percentage display or '--%' if uninstalled */}
          <g transform="translate(86, 7)">
            <rect 
              x="0" y="0" width="46" height="17" rx="4" 
              className={batteryPercent !== null 
                ? "fill-emerald-100/90 dark:fill-emerald-950/70 stroke-emerald-400 dark:stroke-emerald-600" 
                : "fill-slate-100/90 dark:fill-slate-800/70 stroke-slate-300 dark:stroke-slate-700"} 
              strokeWidth="0.8" 
            />
            <circle 
              cx="7" cy="8.5" r="2.5" 
              fill={batteryPercent !== null ? "#10b981" : "#94a3b8"} 
              className={batteryPercent !== null && systemLive ? "animate-pulse" : ""} 
            />
            <text 
              x="14" y="12" 
              fill={batteryPercent !== null ? "#047857" : "#64748b"} 
              fontSize="9" 
              fontWeight="800" 
              letterSpacing="0.02em"
            >
              {batteryPercent !== null ? `${batteryPercent}%` : '--%'}
            </text>
          </g>

          {/* Relevant Commercial Solar Storage Battery (Static Monobloc BESS Unit) */}
          <g transform="translate(42, 27)">
            {/* Top Terminals with Polarity Accents */}
            {/* Left Negative Terminal */}
            <rect x="8" y="1" width="8" height="6" rx="1" fill="#3b82f6" />
            <circle cx="12" cy="4" r="1.5" fill="#e2e8f0" />
            {/* Right Positive Terminal */}
            <rect x="42" y="1" width="8" height="6" rx="1" fill="#ef4444" />
            <circle cx="46" cy="4" r="1.5" fill="#e2e8f0" />
            {/* Molded Top Rim Cover */}
            <rect x="4" y="6" width="50" height="5" rx="1.5" fill="#334155" stroke="#475569" strokeWidth="0.8" />

            {/* Heavy-Duty Industrial Monobloc Casing */}
            <rect 
              x="4" y="10" width="50" height="34" rx="3" 
              fill="url(#industrialBatteryGrad)" 
              stroke="#475569" 
              strokeWidth="1" 
            />

            {/* Molded Side Grip Ridges */}
            <line x1="1" y1="18" x2="3" y2="18" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
            <line x1="1" y1="24" x2="3" y2="24" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
            <line x1="55" y1="18" x2="57" y2="18" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
            <line x1="55" y1="24" x2="57" y2="24" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />

            {/* Central Industrial Gauge Faceplate */}
            <rect x="10" y="15" width="38" height="24" rx="2" fill="#0f172a" stroke="#334155" strokeWidth="0.8" />

            {/* Solid Constant 4-Bar Energy Storage Gauge (Static, uniform appearance) */}
            <rect x="13" y="24" width="6" height="10" rx="1" fill="#10b981" />
            <rect x="21" y="24" width="6" height="10" rx="1" fill="#10b981" />
            <rect x="29" y="24" width="6" height="10" rx="1" fill="#10b981" />
            <rect x="37" y="24" width="6" height="10" rx="1" fill="#10b981" />

            {/* High-Voltage Energy Bolt Glyph */}
            <path d="M 30 16 L 26 21 L 29 21 L 27 25 L 33 20 L 29.5 20 Z" fill="#fbbf24" />


          </g>
        </g>

        {/* ── 3. INVERTER (CENTER BOTTOM: "INVERTER" ONLY, SHOWING ONLY ON/OFF) ─ */}
        <g transform="translate(602, 132)">
          <rect 
            x="0" y="0" width="142" height="73" rx="9" 
            className="fill-slate-100 dark:fill-slate-800/90 stroke-slate-300 dark:stroke-slate-700 shadow-md" 
            strokeWidth="1.5" 
          />

          {/* Header Label: "INVERTER" only */}
          <text x="71" y="26" className="fill-slate-800 dark:fill-slate-100 font-extrabold text-[11px] tracking-wider" textAnchor="middle">
            INVERTER
          </text>

          {/* Clean Centered Status Badge: ONLY ON / OFF */}
          <g transform="translate(44, 36)">
            <rect 
              x="0" y="0" width="54" height="24" rx="6" 
              className={systemLive ? "fill-emerald-100 dark:fill-emerald-950/60 stroke-emerald-300 dark:stroke-emerald-700 shadow-sm" : "fill-slate-200 dark:fill-slate-800"} 
              strokeWidth="1.2" 
            />
            <circle cx="13" cy="12" r="3.5" fill={systemLive ? "#10b981" : "#94a3b8"} className={systemLive ? "animate-pulse" : ""} />
            <text x="23" y="16" fill={systemLive ? "#047857" : "#64748b"} fontSize="11" fontWeight="bold">
              {systemLive ? 'ON' : 'OFF'}
            </text>
          </g>
        </g>

        {/* ── 4. SOLAR PANELS (TOP RIGHT) (x: 766) ─────────────────────────── */}
        <g transform="translate(766, 30)">
          <rect x="0" y="0" width="194" height="175" rx="10" className="fill-slate-50/90 dark:fill-slate-950/70 stroke-slate-200 dark:stroke-slate-800" strokeWidth="1" />
          
          {/* Pulsing Sun Icon */}
          <g transform="translate(14, 12)">
            <circle cx="12" cy="12" r="15" fill="url(#sunGlow)" className={isSolarActive ? "solar-pulse-anim" : "opacity-30"} />
            <circle cx="12" cy="12" r="6" fill={isSolarActive ? "#f59e0b" : "#94a3b8"} />
          </g>

          {/* Header & Status */}
          <text x="44" y="21" className="fill-slate-800 dark:fill-slate-100 font-extrabold text-[12px] tracking-wider">
            SOLAR
          </text>
          <g transform="translate(44, 27)">
            <circle cx="3" cy="3" r="2.5" fill={isSolarActive ? "#10b981" : "#94a3b8"} className={isSolarActive ? "animate-pulse" : ""} />
            <text x="9" y="5.5" fill={isSolarActive ? "#059669" : "#64748b"} fontSize="8" fontWeight="bold">
              {isSolarActive ? 'ACTIVE' : 'STANDBY'}
            </text>
          </g>

          {/* Real Output: "kW" */}
          <g transform="translate(14, 48)">
            <text x="0" y="10" className="fill-amber-600 dark:fill-amber-400 font-mono font-extrabold text-[13px]">
              {systemLive ? `${solarKw} kW` : '-- kW'}
            </text>
          </g>

          {/* 2 Realistic Angled Rooftop Solar Panels */}
          <g transform="translate(0, 0)">
            <line x1="16" y1="106" x2="178" y2="106" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
            <line x1="12" y1="140" x2="174" y2="140" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
            <path d="M 24 152 L 30 144 M 88 152 L 94 144 M 154 152 L 160 144" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" />

            {/* PANEL 1 (LEFT ROOFTOP PANEL) */}
            <g>
              <path d="M 90 76 L 94 78 L 80 147 L 76 145 Z" fill="#1e293b" />
              <path d="M 12 145 L 76 145 L 80 147 L 16 147 Z" fill="#0f172a" />
              <polygon 
                points="24,76 90,76 76,145 10,145" 
                fill={isSolarActive ? "url(#solarCell)" : "#1e293b"} 
                stroke={isSolarActive ? "#38bdf8" : "#475569"} 
                strokeWidth="1.2" 
              />
              <line x1="19.5" y1="99" x2="85.5" y2="99" stroke="#93c5fd" strokeWidth="0.8" opacity="0.5" />
              <line x1="15" y1="122" x2="81" y2="122" stroke="#93c5fd" strokeWidth="0.8" opacity="0.5" />
              <line x1="40" y1="76" x2="26" y2="145" stroke="#bae6fd" strokeWidth="0.6" opacity="0.4" />
              <line x1="57" y1="76" x2="43" y2="145" stroke="#bae6fd" strokeWidth="0.6" opacity="0.4" />
              <line x1="74" y1="76" x2="60" y2="145" stroke="#bae6fd" strokeWidth="0.6" opacity="0.4" />
              <polygon points="24,76 50,76 34,145 10,145" fill="white" opacity={isSolarActive ? "0.08" : "0.02"} />
            </g>

            {/* PANEL 2 (RIGHT ROOFTOP PANEL) */}
            <g>
              <path d="M 172 76 L 176 78 L 162 147 L 158 145 Z" fill="#1e293b" />
              <path d="M 94 145 L 158 145 L 162 147 L 98 147 Z" fill="#0f172a" />
              <polygon 
                points="106,76 172,76 158,145 92,145" 
                fill={isSolarActive ? "url(#solarCell)" : "#1e293b"} 
                stroke={isSolarActive ? "#38bdf8" : "#475569"} 
                strokeWidth="1.2" 
              />
              <line x1="101.5" y1="99" x2="167.5" y2="99" stroke="#93c5fd" strokeWidth="0.8" opacity="0.5" />
              <line x1="97" y1="122" x2="163" y2="122" stroke="#93c5fd" strokeWidth="0.8" opacity="0.5" />
              <line x1="122" y1="76" x2="108" y2="145" stroke="#bae6fd" strokeWidth="0.6" opacity="0.4" />
              <line x1="139" y1="76" x2="125" y2="145" stroke="#bae6fd" strokeWidth="0.6" opacity="0.4" />
              <line x1="156" y1="76" x2="142" y2="145" stroke="#bae6fd" strokeWidth="0.6" opacity="0.4" />
              <polygon points="106,76 132,76 116,145 92,145" fill="white" opacity={isSolarActive ? "0.08" : "0.02"} />
            </g>
          </g>
        </g>

        {/* ── POWER CONNECTIVITY FLOW PATHS (ALL 3 ARROWS IDENTICAL IN STYLE) ── */}
        
        {/* 1. Grid → Battery (Blue arrow: Length 22px, x: 580 to 602) */}
        <path d="M 580 70 L 602 70" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.25" />
        <path 
          d="M 580 70 L 602 70" 
          stroke="#3b82f6" 
          strokeWidth="2.5" 
          strokeLinecap="round"
          fill="none" 
          className={systemLive ? "power-flow-grid" : ""} 
          markerEnd="url(#arrowGrid)" 
        />

        {/* 2. Solar → Battery (Orange arrow: Length 22px, x: 766 to 744) */}
        <path d="M 766 70 L 744 70" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.25" />
        <path 
          d="M 766 70 L 744 70" 
          stroke="#f59e0b" 
          strokeWidth="2.5" 
          strokeLinecap="round"
          fill="none" 
          className={systemLive ? "power-flow-solar" : ""} 
          markerEnd="url(#arrowSolar)" 
        />

        {/* 3. Battery → Inverter (Green arrow: Length 22px, y: 110 to 132) */}
        <path d="M 673 110 L 673 132" stroke="#10b981" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.25" />
        <path 
          d="M 673 110 L 673 132" 
          stroke="#10b981" 
          strokeWidth="2.5" 
          strokeLinecap="round"
          fill="none" 
          className={systemLive ? "power-flow-battery" : ""} 
          markerEnd="url(#arrowGreen)" 
        />



        {/* ═══════════════════════════════════════════════════════════════════════
            LEFT SECTION: INTERNAL COLD STORAGE (x: 45-425, y: 30-475, HEIGHT 445px)
            ═══════════════════════════════════════════════════════════════════════ */}
        <rect 
          x="45" y="30" width="380" height="445" rx="16" 
          className="fill-white dark:fill-slate-950 stroke-slate-300 dark:stroke-slate-700 shadow-md" 
          strokeWidth="3" 
        />
        <rect 
          x="58" y="42" width="354" height="421" rx="12" 
          className="fill-blue-50/40 dark:fill-slate-900/60 stroke-blue-200 dark:stroke-slate-800" 
          strokeWidth="1.5" strokeDasharray="5 5" 
        />
        
        {/* Cold Storage Header Banner */}
        <g transform="translate(132, 50)">
          <rect x="0" y="0" width="205" height="24" rx="5" className="fill-blue-100/90 dark:fill-slate-800/90 stroke-blue-200 dark:stroke-slate-700" strokeWidth="1" />
          <text x="102.5" y="16" className="fill-blue-700 dark:fill-blue-400 font-extrabold text-[11px] tracking-wider" textAnchor="middle">
            INTERNAL COLD STORAGE
          </text>
        </g>

        {/* ── EVAPORATOR UNIT: RESIZED TO MATCH COMPRESSOR WIDTH (240px) ─────
            Centered horizontally in Cold Storage (x: 115 to 355)
            Aligned in SAME ROW as Compressor (y: 250, height: 95)
            ─────────────────────────────────────────────────────────────────── */}
        <g transform="translate(115, 250)">
          {/* Evaporator Enclosure */}
          <rect 
            x="0" y="0" width="240" height="95" rx="12" 
            className="fill-slate-200/90 dark:fill-slate-800/90 stroke-slate-300 dark:stroke-slate-600 shadow-sm" 
            strokeWidth="1.5" 
          />

          {/* Evaporator Title */}
          <text x="16" y="15" className="fill-slate-800 dark:fill-slate-200 font-extrabold text-[10px] tracking-wider">
            EVAPORATOR
          </text>

          {/* Frosted Ice Cooling Coil Background */}
          <rect 
            x="12" y="21" width="148" height="65" rx="5" 
            className="fill-blue-100/60 dark:fill-cyan-950/40 stroke-cyan-200/60 dark:stroke-cyan-800/50" 
            strokeWidth="1" 
          />

          {/* Scaled Vertical Aluminum Fins */}
          {[...Array(14)].map((_, i) => (
            <line 
              key={i} 
              x1={18 + i * 10} y1="23" 
              x2={18 + i * 10} y2="84" 
              stroke="#93c5fd" 
              strokeWidth="1" 
              opacity="0.45" 
            />
          ))}

          {/* Serpentine Multi-Pass Copper/Cyan Cooling Tubes */}
          <path 
            d="M 16 32 L 152 32 Q 156 32 156 41 Q 156 50 152 50 L 22 50 Q 16 50 16 59 Q 16 68 22 68 L 152 68 Q 156 68 156 77 Q 156 81 152 81 L 16 81" 
            stroke="#0284c7" strokeWidth="4" fill="none" strokeLinecap="round" 
          />
          <path 
            d="M 16 32 L 152 32 Q 156 32 156 41 Q 156 50 152 50 L 22 50 Q 16 50 16 59 Q 16 68 22 68 L 152 68 Q 156 68 156 77 Q 156 81 152 81 L 16 81" 
            stroke="#bae6fd" strokeWidth="1.3" fill="none" strokeLinecap="round" opacity="0.8" 
          />

          {/* Integrated Cooling Fan Unit */}
          <g transform="translate(196, 52.5)">
            <circle cx="0" cy="0" r="28" className="fill-slate-100 dark:fill-slate-900 stroke-slate-400 dark:stroke-slate-600" strokeWidth="1.8" />
            <circle cx="0" cy="0" r="24" fill="none" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />

            <g style={systemLive ? {
              animation: 'fanSpin 1.8s linear infinite',
              transformBox: 'fill-box',
              transformOrigin: 'center',
            } : {}}>
              {/* Invisible centering anchor to lock rotation center strictly to (0,0) with zero wobble */}
              <circle cx="0" cy="0" r="25" fill="none" stroke="none" />
              <path d="M 0,-3 C 6,-8 15,-12 15,-20 C 11,-24 3,-20 0,-3" fill="#0284c7" />
              <g transform="rotate(120)">
                <path d="M 0,-3 C 6,-8 15,-12 15,-20 C 11,-24 3,-20 0,-3" fill="#0284c7" />
              </g>
              <g transform="rotate(240)">
                <path d="M 0,-3 C 6,-8 15,-12 15,-20 C 11,-24 3,-20 0,-3" fill="#0284c7" />
              </g>
              <circle cx="0" cy="0" r="6" className="fill-slate-700 dark:fill-slate-200 stroke-slate-300" strokeWidth="1.2" />
              <circle cx="0" cy="0" r="2" fill="#38bdf8" />
            </g>
          </g>
        </g>

        {/* ── REALISTIC INDUSTRIAL COLD STORAGE DOOR (LEFT SECTION) ───────────
            3D perspective door slab, metallic brushed steel, chrome latch handle,
            hinges, and thermal gasket (green 'sealed' box removed)
            ─────────────────────────────────────────────────────────────────── */}
        <g transform="translate(48, 350)">
          {/* Header Label */}
          <text 
            x="25" y="-7" 
            textAnchor="middle" 
            className="fill-slate-600 dark:fill-slate-300 font-bold text-[8.5px] uppercase tracking-wider"
          >
            ACCESS DOOR
          </text>

          {/* Heavy Insulated Door Frame Jamb */}
          <rect 
            x="0" y="0" width="50" height="86" rx="3" 
            className="fill-slate-300 dark:fill-slate-800 stroke-slate-400 dark:stroke-slate-600" 
            strokeWidth="1" 
          />
          {/* Dark Neoprene Rubber Perimeter Compression Thermal Gasket */}
          <rect x="3" y="3" width="44" height="80" rx="2" fill="#0f172a" />

          {/* 3D Insulated Door Blade */}
          <polygon points="5,5 45,5 47,3 7,3" fill="#f8fafc" opacity="0.8" />
          <polygon points="45,5 47,3 47,81 45,83" fill="url(#metalDoorDepth)" />
          
          {/* Main Metallic Stainless Steel Door Panel */}
          <rect 
            x="5" y="5" width="40" height="78" rx="2" 
            fill="url(#metalDoorPanel)" 
            stroke="#94a3b8" 
            strokeWidth="0.8" 
          />

          {/* Recessed Insulated Panel Indentations */}
          <rect x="8" y="9" width="34" height="30" rx="1.5" fill="#cbd5e1" opacity="0.35" stroke="#94a3b8" strokeWidth="0.6" />
          <rect x="8" y="47" width="34" height="32" rx="1.5" fill="#cbd5e1" opacity="0.35" stroke="#94a3b8" strokeWidth="0.6" />

          {/* Industrial Heavy-Duty Stainless Steel Hinges */}
          <g transform="translate(2, 12)">
            <rect x="0" y="0" width="5" height="12" rx="1" fill="#334155" stroke="#64748b" strokeWidth="0.6" />
            <circle cx="2.5" cy="3" r="0.8" fill="#e2e8f0" />
            <circle cx="2.5" cy="9" r="0.8" fill="#e2e8f0" />
          </g>
          <g transform="translate(2, 60)">
            <rect x="0" y="0" width="5" height="12" rx="1" fill="#334155" stroke="#64748b" strokeWidth="0.6" />
            <circle cx="2.5" cy="3" r="0.8" fill="#e2e8f0" />
            <circle cx="2.5" cy="9" r="0.8" fill="#e2e8f0" />
          </g>

          {/* Industrial Slam-Latch & Chrome Lever Handle */}
          <g transform="translate(37, 38)">
            <rect x="0" y="0" width="6" height="18" rx="1" fill="#475569" stroke="#334155" strokeWidth="0.6" />
            <circle cx="3" cy="4" r="0.8" fill="#cbd5e1" />
            <circle cx="3" cy="14" r="0.8" fill="#cbd5e1" />
            <path 
              d="M 3 9 L 9 9 Q 11 9 11 13 L 11 20" 
              stroke="#f8fafc" 
              strokeWidth="2.2" 
              fill="none" 
              strokeLinecap="round" 
            />
            <rect x="8" y="6" width="3" height="6" rx="0.5" fill="#38bdf8" opacity="0.9" />
          </g>

          {/* Subtle Cold Storage Frost / Icing Condensation Sheen */}
          <polygon 
            points="5,64 45,64 45,83 5,83" 
            fill="url(#doorFrost)" 
            opacity="0.8" 
          />
        </g>

        {/* ═══════════════════════════════════════════════════════════════════════
            MIDDLE SECTION: COMPRESSOR (x: 620, y: 250, WIDTH 240, HEIGHT 95)
            Aligned in SAME ROW as Evaporator
            ═══════════════════════════════════════════════════════════════════════ */}
        <g transform="translate(620, 250)">
          {/* Compressor Enclosure */}
          <rect 
            x="0" y="0" width="240" height="95" rx="14" 
            className="fill-slate-200 dark:fill-slate-800 stroke-rose-400 dark:stroke-rose-500/50 shadow-md" 
            strokeWidth="2" 
          />

          {/* Motor Horizontal Cooling Ribs */}
          <line x1="25" y1="36" x2="215" y2="36" className="stroke-slate-400 dark:stroke-slate-600" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="25" y1="52" x2="215" y2="52" className="stroke-slate-400 dark:stroke-slate-600" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="25" y1="68" x2="215" y2="68" className="stroke-slate-400 dark:stroke-slate-600" strokeWidth="3.5" strokeLinecap="round" />

          {/* Compressor Label */}
          <text x="120" y="85" className="fill-slate-800 dark:fill-slate-100 font-extrabold text-[13px] tracking-wider" textAnchor="middle">
            COMPRESSOR
          </text>

          {/* Health Indicator Badge */}
          <g transform="translate(68, -12)">
            <rect 
              x="0" y="0" width="150" height="20" rx="10" 
              className="fill-white dark:fill-slate-900 stroke-slate-300 dark:stroke-slate-700 shadow-sm" 
              strokeWidth="1.5" 
            />
            <text 
              x="75" y="14" 
              fill={!systemLive ? "#94a3b8" : compressorHealth.score >= 80 ? "#10b981" : compressorHealth.score >= 60 ? "#f59e0b" : "#ef4444"} 
              fontSize="9.5" 
              fontWeight="bold" 
              textAnchor="middle"
            >
              HEALTH: {systemLive ? `${compressorHealth.score}% (${compressorHealth.status.toUpperCase()})` : 'STANDBY'}
            </text>
          </g>
        </g>

        {/* ═══════════════════════════════════════════════════════════════════════
            CONDENSER (y: 460-585, x: 550-955)
            ═══════════════════════════════════════════════════════════════════════ */}
        <g transform="translate(550, 460)">
          {/* Condenser Chassis */}
          <rect x="0" y="0" width="405" height="125" rx="14" className="fill-slate-200 dark:fill-slate-800 stroke-slate-300 dark:stroke-slate-600 shadow-md" strokeWidth="2" />

          {/* Radiator-Style Heat Rejection Fins */}
          {[...Array(30)].map((_, i) => (
            <line 
              key={i} 
              x1={20 + i * 12.5} y1="18" 
              x2={20 + i * 12.5} y2="108" 
              stroke="#cbd5e1" 
              className="dark:stroke-slate-700" 
              strokeWidth="1.25" 
              opacity="0.5" 
            />
          ))}

          {/* CONDENSER FAN 1 (LEFT) */}
          <g transform="translate(110, 64)">
            <circle cx="0" cy="0" r="36" className="fill-white dark:fill-slate-900 stroke-slate-300 dark:stroke-slate-700" strokeWidth="2" />
            <circle cx="0" cy="0" r="32" fill="none" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />

            <g style={systemLive && isCompressorRunning ? {
              animation: 'fanSpin 1.1s linear infinite',
              transformBox: 'fill-box',
              transformOrigin: 'center',
            } : {}}>
              <circle cx="0" cy="0" r="32" fill="none" stroke="none" />
              {[0, 90, 180, 270].map((angle) => (
                <g key={angle} transform={`rotate(${angle})`}>
                  <path d="M -4,-5 C 6,-12 18,-16 18,-26 C 14,-30 4,-26 -4,-5" fill="#0284c7" />
                </g>
              ))}
              <circle cx="0" cy="0" r="8" className="fill-slate-700 dark:fill-slate-200 stroke-slate-300" strokeWidth="1.5" />
              <circle cx="0" cy="0" r="3" fill="#38bdf8" />
            </g>
          </g>

          {/* CONDENSER FAN 2 (RIGHT) */}
          <g transform="translate(270, 64)">
            <circle cx="0" cy="0" r="36" className="fill-white dark:fill-slate-900 stroke-slate-300 dark:stroke-slate-700" strokeWidth="2" />
            <circle cx="0" cy="0" r="32" fill="none" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />

            <g style={systemLive && isCompressorRunning ? {
              animation: 'fanSpin 1.1s linear infinite',
              transformBox: 'fill-box',
              transformOrigin: 'center',
            } : {}}>
              <circle cx="0" cy="0" r="32" fill="none" stroke="none" />
              {[0, 90, 180, 270].map((angle) => (
                <g key={angle} transform={`rotate(${angle})`}>
                  <path d="M -4,-5 C 6,-12 18,-16 18,-26 C 14,-30 4,-26 -4,-5" fill="#0284c7" />
                </g>
              ))}
              <circle cx="0" cy="0" r="8" className="fill-slate-700 dark:fill-slate-200 stroke-slate-300" strokeWidth="1.5" />
              <circle cx="0" cy="0" r="3" fill="#38bdf8" />
            </g>
          </g>

          {/* Condenser Label */}
          <text x="202.5" y="18" className="fill-slate-800 dark:fill-slate-200 font-extrabold text-[12px] tracking-wider" textAnchor="middle">
            CONDENSER
          </text>
        </g>

        {/* ═══════════════════════════════════════════════════════════════════════
            REFRIGERANT PIPING LOOP (UNIFORM STYLING, PRECISE ALIGNMENT)
            ═══════════════════════════════════════════════════════════════════════ */}

        {/* ── 1. BLUE SUCTION LINE: EVAPORATOR (x: 355) → COMPRESSOR (x: 620) ─
            Straight horizontal row connection at y: 295
            ─────────────────────────────────────────────────────────────────── */}
        <path 
          d="M 355 295 L 620 295" 
          stroke="#3b82f6" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.25" 
        />
        <path 
          d="M 355 295 L 620 295" 
          stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" fill="none" className="refrigerant-flow" 
        />
        <text 
          x="487" 
          y="283" 
          className="fill-blue-600 dark:fill-blue-400 font-mono font-bold text-[12.5px]" 
          textAnchor="middle"
        >
          Suction Line (Low Pressure Vapor)
        </text>

        {/* ── 2. RED DISCHARGE LINE: COMPRESSOR → CONDENSER ───────────────────
            Straight vertical connection at x: 810 (y: 345 to 460)
            ─────────────────────────────────────────────────────────────────── */}
        <path 
          d="M 810 345 L 810 460" 
          stroke="#ef4444" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.25" 
        />
        <path 
          d="M 810 345 L 810 460" 
          stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" fill="none" className="refrigerant-flow" 
        />
        <text 
          x="796" 
          y="395" 
          className="fill-rose-500 dark:fill-rose-400 font-mono font-bold text-[12.5px]" 
          textAnchor="end"
        >
          Discharge Line (Hot Gas)
        </text>

        {/* ── 3. YELLOW LIQUID RETURN LINE: CONDENSER → EVAPORATOR ────────────
            Clean 2-segment path entering the bottom of the Evaporator unit
            ─────────────────────────────────────────────────────────────────── */}
        <path 
          d="M 550 485 L 235 485 Q 225 485 225 473 L 225 345" 
          stroke="#f59e0b" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.25" 
        />
        <path 
          d="M 550 485 L 235 485 Q 225 485 225 473 L 225 345" 
          stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" fill="none" className="refrigerant-flow" 
        />
        <text 
          x="380" 
          y="472" 
          className="fill-amber-700 dark:fill-amber-400 font-mono font-bold text-[12px]" 
          textAnchor="middle"
        >
          Liquid Refrigerant Return Line
        </text>

        {/* ═══════════════════════════════════════════════════════════════════════
            INVERTER AC POWER DISTRIBUTION (Feeds Compressor, Evaporator & Condenser)
            Rendered on top of room boundaries to clearly show power entering Evaporator
            ═══════════════════════════════════════════════════════════════════════ */}
        
        {/* Underlay Tracks (Green #10b981 with opacity 0.22) */}
        {/* Branch A: Inverter → Compressor (Vertical Drop to Compressor) */}
        <path d="M 673 205 L 673 250" stroke="#10b981" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.22" />
        {/* Branch B: Inverter → Evaporator (Goes across into Cold Storage to Evaporator) */}
        <path d="M 673 225 L 321 225 Q 311 225 311 235 L 311 250" stroke="#10b981" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.22" />
        {/* Branch C: Inverter → Condenser (Right Branch down into Condenser) */}
        <path d="M 673 225 L 920 225 Q 930 225 930 235 L 930 460" stroke="#10b981" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.22" />

        {/* Animated Green Flow Paths with Arrowheads Directly Entering Units */}
        {/* Branch A: Power Feed to Compressor */}
        <path 
          d="M 673 205 L 673 250" 
          stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" fill="none" 
          className={systemLive ? "power-flow-ac" : ""} 
          markerEnd="url(#arrowGreen)" 
        />
        {/* Branch B: Power Feed directly to Evaporator */}
        <path 
          d="M 673 225 L 321 225 Q 311 225 311 235 L 311 250" 
          stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" fill="none" 
          className={systemLive ? "power-flow-ac" : ""} 
          markerEnd="url(#arrowGreen)" 
        />
        {/* Branch C: Power Feed to Condenser */}
        <path 
          d="M 673 225 L 920 225 Q 930 225 930 235 L 930 460" 
          stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" fill="none" 
          className={systemLive ? "power-flow-ac" : ""} 
          markerEnd="url(#arrowGreen)" 
        />

        {/* Power Terminal Junction Blocks on Component Enclosures */}
        <rect x="305" y="247" width="12" height="6" rx="1.5" fill="#10b981" />
        <rect x="667" y="247" width="12" height="6" rx="1.5" fill="#10b981" />
        <rect x="924" y="457" width="12" height="6" rx="1.5" fill="#10b981" />

        {/* Central Distribution Junction Node */}
        <circle cx="673" cy="225" r="3.5" fill="#10b981" />
        <circle cx="673" cy="225" r="6" fill="none" stroke="#10b981" strokeWidth="1" opacity="0.4" />

        {/* Crisp Power Labels Positioned with Clear Margins */}
        <text 
          x="311" 
          y="218" 
          className="fill-emerald-600 dark:fill-emerald-400 font-mono font-bold text-[9.5px]" 
          textAnchor="middle"
        >
          Power to Evaporator
        </text>
        <text 
          x="660" 
          y="238" 
          className="fill-emerald-600 dark:fill-emerald-400 font-mono font-bold text-[9px]" 
          textAnchor="end"
        >
          Power to Compressor
        </text>
        <text 
          x="930" 
          y="218" 
          className="fill-emerald-600 dark:fill-emerald-400 font-mono font-bold text-[9.5px]" 
          textAnchor="end"
        >
          Power to Condenser
        </text>

        {/* ═══════════════════════════════════════════════════════════════════════
            OUTDOOR AMBIENT ENVIRONMENT (x: 45-425, y: 495-605, HEIGHT 110px)
            ═══════════════════════════════════════════════════════════════════════ */}
        <rect 
          x="45" y="495" width="380" height="110" rx="14" 
          className="fill-white/85 dark:fill-slate-900/90 stroke-slate-300 dark:stroke-slate-800 shadow-md" 
          strokeWidth="1.5" 
        />
        {/* Header & Status Indicator */}
        <g transform="translate(60, 514)">
          <circle cx="8" cy="8" r="6" fill="#f59e0b" opacity="0.9" />
          <path d="M 5 9 Q 3 8 5 6 Q 7 5 9 6 Q 12 4 14 7 Q 16 8 14 11 Z" fill="#94a3b8" opacity="0.8" />
          <text x="22" y="11.5" className="fill-slate-700 dark:fill-slate-200 font-extrabold uppercase tracking-wider text-[10px]">
            OUTDOOR AMBIENT ENVIRONMENT
          </text>
        </g>
      </svg>

      {/* ── INTERACTIVE SENSOR BADGES OVERLAY (POSITIONED TO PREVENT OVERLAP) ─ */}
      {relevantSensors.map((sensor) => {
        const isInstalled = sensor.isInstalled !== false && sensor.status !== 'uninstalled';
        const isHovered = hoveredSensor === sensor.id;
        const coords = getAdjustedSensorCoords(sensor);

        return (
          <div
            key={sensor.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 z-20"
            style={{ left: `${coords.x}%`, top: `${coords.y}%` }}
            onMouseEnter={() => setHoveredSensor(sensor.id)}
            onMouseLeave={() => setHoveredSensor(null)}
          >
            <div className="relative group cursor-pointer">
              {/* Sensor Badge Pill */}
              <div
                className={`flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border shadow-md transition-all duration-200 ${getStatusBg(
                  sensor.status,
                  isInstalled
                )} ${isHovered ? 'scale-110 z-30 ring-2 ring-blue-500 dark:ring-blue-400' : ''}`}
              >
                {/* Glowing Pulse Dot */}
                <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5 flex-shrink-0">
                  {isInstalled && sensor.status !== 'optimal' && sensor.status !== 'unknown' && (
                    <span
                      className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${getStatusDotColor(
                        sensor.status,
                        isInstalled
                      )}`}
                    />
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 ${getStatusDotColor(
                      sensor.status,
                      isInstalled
                    )}`}
                  />
                </span>

                {/* Micro Icon */}
                {renderIcon(sensor.iconType)}

                {/* Sensor Value / Label */}
                <div className="flex items-baseline space-x-0.5 sm:space-x-1">
                  {isInstalled ? (
                    <>
                      <span className="text-[11px] sm:text-xs font-extrabold tracking-tight">
                        {sensor.value !== null && sensor.value !== undefined ? sensor.value : '--'}
                      </span>
                      {sensor.unit && <span className="text-[9px] sm:text-[10px] font-medium opacity-80">{sensor.unit}</span>}
                    </>
                  ) : (
                    <span className="text-[9px] sm:text-[10px] font-bold tracking-tight uppercase opacity-60 whitespace-nowrap">Not Installed</span>
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
    </div>
  );
};

export default HVACDiagram;
