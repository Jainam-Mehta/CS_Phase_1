import React, { useEffect, useRef, useState } from 'react';

export type WarehouseMode = 'role-selection' | 'login' | 'owner' | 'farmer' | 'stakeholder';

interface WarehouseBackgroundProps {
  mode: WarehouseMode;
  opacity?: number;
  className?: string;
  preferVideo?: boolean;
}

interface ShelfBay {
  row: number;
  col: number;
  tier: number;
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
  isPulsing: boolean;
  pulseTimer: number;
  pulseDuration: number;
  boxColor: string;
}

interface FrostParticle {
  x: number;
  y: number;
  vy: number;
  size: number;
  alpha: number;
  swaySpeed: number;
  swayAmp: number;
  swayOffset: number;
}

interface SensorDataPacket {
  pathIndex: number;
  progress: number;
  speed: number;
  color: string;
  glowColor: string;
  size: number;
  trail: { x: number; y: number }[];
}

export const WarehouseBackground: React.FC<WarehouseBackgroundProps> = ({
  mode,
  className = '',
  preferVideo = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;
    let animId: number;
    let lastTime = performance.now();

    let cssWidth = window.innerWidth;
    let cssHeight = window.innerHeight;

    const setupCanvasSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cssWidth = window.innerWidth;
      cssHeight = window.innerHeight;
      canvas.width = Math.floor(cssWidth * dpr);
      canvas.height = Math.floor(cssHeight * dpr);
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;
    };

    setupCanvasSize();
    window.addEventListener('resize', setupCanvasSize);

    // Isometric Projection: 4 rows x 7 columns x 3 tiers
    const rowsCount = 4;
    const colsCount = 7;
    const tiersCount = 3;
    const tileW = 112;
    const tileH = 56;

    const toScreen = (c: number, r: number, t: number, cx: number, cy: number) => {
      const sx = cx + (c - r) * (tileW * 0.5);
      const sy = cy + (c + r) * (tileH * 0.5) - t * 48;
      return { x: sx, y: sy };
    };

    // Pre-calculate shelf bays with brighter industrial pallet colors
    const initShelves = (cx: number, cy: number): ShelfBay[] => {
      const bays: ShelfBay[] = [];
      const boxPalettes = [
        '#2E4E68', // Vibrant chilled steel
        '#345774', // Pallet box blue
        '#3A6384', // Chilled storage bin
        '#2B5576', // Fresh stock container
        '#416E92', // Highlighted rack tote
      ];

      for (let r = 0; r < rowsCount; r++) {
        for (let c = 0; c < colsCount; c++) {
          for (let t = 0; t < tiersCount; t++) {
            const pt = toScreen(c, r, t, cx, cy);
            bays.push({
              row: r,
              col: c,
              tier: t,
              x: pt.x,
              y: pt.y,
              width: tileW * 0.76,
              height: 42,
              depth: tileH * 0.66,
              isPulsing: false,
              pulseTimer: 0,
              pulseDuration: 0.85,
              boxColor: boxPalettes[(r * 3 + c * 2 + t) % boxPalettes.length],
            });
          }
        }
      }
      return bays;
    };

    let shelves = initShelves(cssWidth * 0.5, cssHeight * 0.33);

    // Brighter, more visible Frost Particles (#F0FFFF white/frost)
    const frostCount = mode === 'role-selection' ? 50 : mode === 'login' ? 60 : 25;
    const frostParticles: FrostParticle[] = Array.from({ length: frostCount }, () => ({
      x: Math.random() * cssWidth,
      y: Math.random() * cssHeight,
      vy: 0.5 + Math.random() * 0.6,
      size: 2.2 + Math.random() * 3.2,
      alpha: 0.55 + Math.random() * 0.35, // High visibility
      swaySpeed: 0.0018 + Math.random() * 0.002,
      swayAmp: 1.8 + Math.random() * 3.2,
      swayOffset: Math.random() * Math.PI * 2,
    }));

    // Sensor paths along aisles & racks
    const getRailPaths = (cx: number, cy: number) => {
      const paths: { start: { x: number; y: number }; end: { x: number; y: number } }[] = [];
      for (let r = 0; r < rowsCount; r++) {
        paths.push({
          start: toScreen(0, r, 0, cx, cy),
          end: toScreen(colsCount - 1, r, 0, cx, cy),
        });
        paths.push({
          start: toScreen(0, r, 2, cx, cy),
          end: toScreen(colsCount - 1, r, 2, cx, cy),
        });
      }
      for (let c = 0; c < colsCount; c += 2) {
        paths.push({
          start: toScreen(c, 0, 1, cx, cy),
          end: toScreen(c, rowsCount - 1, 1, cx, cy),
        });
      }
      return paths;
    };

    let railPaths = getRailPaths(cssWidth * 0.5, cssHeight * 0.33);

    // Brighter, vibrant Sensor Data Packets (#FFA500, #FFD700)
    const packetCount = mode === 'login' ? 8 : 5;
    const sensorPackets: SensorDataPacket[] = Array.from({ length: packetCount }, (_, i) => ({
      pathIndex: i % railPaths.length,
      progress: Math.random(),
      speed: mode === 'login' ? 0.0038 + Math.random() * 0.0025 : 0.0024 + Math.random() * 0.0018,
      color: i % 2 === 0 ? '#FFA500' : '#FFD700',
      glowColor: '#FF9500',
      size: 4.5,
      trail: [],
    }));

    // Glow pulse timer (every 2-3 seconds, pulses 2-3 shelves brightly)
    let pulseAccumulator = 0;
    const pulseInterval = mode === 'login' ? 1.8 : 2.3;

    const handleVisibility = () => {
      isRunning = document.visibilityState === 'visible';
      if (isRunning) {
        lastTime = performance.now();
        animId = requestAnimationFrame(render);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const render = (now: number) => {
      if (!isRunning) return;
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (Math.abs(cssWidth - window.innerWidth) > 10 || Math.abs(cssHeight - window.innerHeight) > 10) {
        cssWidth = window.innerWidth;
        cssHeight = window.innerHeight;
        shelves = initShelves(cssWidth * 0.5, cssHeight * 0.33);
        railPaths = getRailPaths(cssWidth * 0.5, cssHeight * 0.33);
      }

      // 1. LIGHTENED INDUSTRIAL DUSK/EARLY EVENING BACKGROUND (+15% Additional Brightness)
      const bgGrad = ctx.createLinearGradient(0, 0, 0, cssHeight);
      bgGrad.addColorStop(0, '#233B52');    // Lighter cold steel navy
      bgGrad.addColorStop(0.35, '#2C4C6A'); // Well-lit cold storage ambient
      bgGrad.addColorStop(0.7, '#26425B');  // Atmospheric depth
      bgGrad.addColorStop(1, '#1E354B');    // Clean base
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, cssWidth, cssHeight);

      // 2. Visible Floor Guide Rails / Conveyor Lanes
      ctx.lineWidth = 1.3;
      ctx.strokeStyle = 'rgba(125, 160, 190, 0.55)';
      ctx.beginPath();
      for (const p of railPaths) {
        ctx.moveTo(p.start.x, p.start.y);
        ctx.lineTo(p.end.x, p.end.y);
      }
      ctx.stroke();

      // 3. Trigger Active Glow Pulses (Bright Cyan #00E5FF / #1E90FF)
      pulseAccumulator += dt;
      if (pulseAccumulator >= pulseInterval) {
        pulseAccumulator = 0;
        const count = 3;
        for (let i = 0; i < count; i++) {
          const rand = shelves[Math.floor(Math.random() * shelves.length)];
          if (rand && !rand.isPulsing) {
            rand.isPulsing = true;
            rand.pulseTimer = 0;
          }
        }
      }

      // 4. Draw Warehouse Shelves (Lighter #5A6A7A / #6E8092, metallic highlights)
      shelves.sort((a, b) => a.row + a.col - (b.row + b.col) || a.tier - b.tier);

      for (const sh of shelves) {
        const { x, y, width: sw, height: shh, depth: sd } = sh;

        let pulseAlpha = 0;
        if (sh.isPulsing) {
          sh.pulseTimer += dt;
          const prog = sh.pulseTimer / sh.pulseDuration;
          if (prog >= 1) {
            sh.isPulsing = false;
          } else {
            pulseAlpha = Math.sin(prog * Math.PI);
          }
        }

        // Uprights: Lighter grey (#5C7389) with prominent metallic sheen (#A6BED5)
        ctx.fillStyle = '#5C7389';
        ctx.fillRect(x - sw * 0.46, y - shh * 0.5, 4.8, shh);
        ctx.fillRect(x + sw * 0.46, y - shh * 0.5, 4.8, shh);

        ctx.fillStyle = '#A6BED5';
        ctx.fillRect(x - sw * 0.46, y - shh * 0.5, 1.8, shh);
        ctx.fillRect(x + sw * 0.46, y - shh * 0.5, 1.8, shh);

        // Cross Beams (Top Diamond)
        ctx.beginPath();
        ctx.moveTo(x - sw * 0.46, y);
        ctx.lineTo(x, y - sd * 0.5);
        ctx.lineTo(x + sw * 0.46, y);
        ctx.lineTo(x, y + sd * 0.5);
        ctx.closePath();

        if (pulseAlpha > 0) {
          // Extra vibrant, popping cyan glow (#00E5FF / #1E90FF)
          ctx.fillStyle = `rgba(0, 240, 255, ${0.55 + pulseAlpha * 0.45})`;
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2.0;
          ctx.stroke();
        } else {
          ctx.fillStyle = '#6C7F92'; // Lighter grey beam (+15% brightness)
          ctx.fill();
          ctx.strokeStyle = '#4D6277';
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Front Beam Edge
        ctx.beginPath();
        ctx.moveTo(x - sw * 0.46, y);
        ctx.lineTo(x, y + sd * 0.5);
        ctx.lineTo(x + sw * 0.46, y);
        ctx.lineTo(x + sw * 0.46, y + 5.5);
        ctx.lineTo(x, y + sd * 0.5 + 5.5);
        ctx.lineTo(x - sw * 0.46, y + 5.5);
        ctx.closePath();
        ctx.fillStyle = '#526678';
        ctx.fill();

        // Chilled Pallet Box (Clearly visible with temp ribbon)
        const bw = sw * 0.42;
        const bh = 16;
        const bx = x - bw * 0.5;
        const by = y - bh * 0.72;

        ctx.fillStyle = sh.boxColor;
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeStyle = '#4B708E';
        ctx.strokeRect(bx, by, bw, bh);

        // Cold indicator line
        ctx.fillStyle = sh.tier === 2 ? '#00E5FF' : sh.tier === 1 ? '#38BDF8' : '#60A5FA';
        ctx.fillRect(bx + 3, by + bh - 3.5, bw - 6, 2.5);

        // Intense shelf glow aura when active
        if (pulseAlpha > 0) {
          ctx.save();
          ctx.shadowColor = '#00E5FF';
          ctx.shadowBlur = 32 * pulseAlpha;
          ctx.fillStyle = `rgba(0, 229, 255, ${pulseAlpha * 0.75})`;
          ctx.fillRect(bx, by, bw, bh);
          ctx.restore();
        }
      }

      // 5. Brighter Sensor Data Packets (#FFA500, #FFD700) with Light Trails
      for (const sp of sensorPackets) {
        const path = railPaths[sp.pathIndex];
        if (!path) continue;

        sp.progress += sp.speed;
        if (sp.progress >= 1) {
          sp.progress = 0;
          sp.pathIndex = Math.floor(Math.random() * railPaths.length);
        }

        const px = path.start.x + (path.end.x - path.start.x) * sp.progress;
        const py = path.start.y + (path.end.y - path.start.y) * sp.progress;

        sp.trail.unshift({ x: px, y: py });
        if (sp.trail.length > 12) sp.trail.pop();

        // Trail with high visibility
        for (let t = 0; t < sp.trail.length; t++) {
          const pt = sp.trail[t];
          const tAlpha = (1 - t / sp.trail.length) * 0.75;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, sp.size * (1 - t / (sp.trail.length + 1)), 0, Math.PI * 2);
          ctx.fillStyle = sp.color;
          ctx.globalAlpha = tAlpha;
          ctx.fill();
        }
        ctx.globalAlpha = 1.0;

        // Vivid Glowing Packet Head
        ctx.save();
        ctx.shadowColor = sp.glowColor;
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(px, py, sp.size, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.restore();
      }

      // 6. High-Visibility Frost Particles (#F0FFFF, bright white, gentle sway)
      for (const fp of frostParticles) {
        fp.y += fp.vy;
        fp.swayOffset += fp.swaySpeed;
        const sx = fp.x + Math.sin(fp.swayOffset) * fp.swayAmp;

        if (fp.y > cssHeight + 10) {
          fp.y = -10;
          fp.x = Math.random() * cssWidth;
        }

        ctx.beginPath();
        ctx.arc(sx, fp.y, fp.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(240, 255, 255, ${fp.alpha})`;
        ctx.shadowColor = '#F0FFFF';
        ctx.shadowBlur = 4;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      window.removeEventListener('resize', setupCanvasSize);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (animId) cancelAnimationFrame(animId);
    };
  }, [mode]);

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 pointer-events-none overflow-hidden z-0 ${className}`}
    >
      {preferVideo && !videoError ? (
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
          onError={() => setVideoError(true)}
        >
          <source src={`/videos/warehouse-${mode}.mp4`} type="video/mp4" />
        </video>
      ) : (
        <canvas ref={canvasRef} className="w-full h-full block" />
      )}
    </div>
  );
};

export default WarehouseBackground;
