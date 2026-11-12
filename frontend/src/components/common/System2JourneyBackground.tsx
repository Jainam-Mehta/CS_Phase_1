import React, { useEffect, useRef, useState } from 'react';

export interface System2JourneyBackgroundProps {
  opacity?: number;
  className?: string;
  preferVideo?: boolean;
}

export const System2JourneyBackground: React.FC<System2JourneyBackgroundProps> = ({
  opacity = 1,
  className = '',
  preferVideo = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    if (preferVideo && !videoError) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;
    let animId: number;
    let startTime = performance.now();

    let cssW = window.innerWidth;
    let cssH = window.innerHeight;

    const setupCanvasSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cssW = window.innerWidth;
      cssH = window.innerHeight;
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
    };

    setupCanvasSize();
    window.addEventListener('resize', setupCanvasSize);

    const handleVisibility = () => {
      if (document.hidden) {
        isRunning = false;
        cancelAnimationFrame(animId);
      } else {
        if (!isRunning) {
          isRunning = true;
          animId = requestAnimationFrame(render);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Vector helper: Crisp checkmark (✓)
    const drawCheckmark = (x: number, y: number, size: number, color: string, alpha: number) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(x - size * 0.45, y);
      ctx.lineTo(x - size * 0.10, y + size * 0.40);
      ctx.lineTo(x + size * 0.50, y - size * 0.45);
      ctx.stroke();
      ctx.restore();
    };

    const render = (now: number) => {
      if (!isRunning) return;
      const t = ((now - startTime) / 1000.0) % 6.0; // 6.0s seamless loop
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      ctx.save();
      ctx.scale(dpr, dpr);

      const W = cssW;
      const H = cssH;

      // -----------------------------------------------------------------------
      // 1. UNIFIED CONTINUOUS SKY GRADIENT (NO DIVIDERS)
      // Deep Navy (#1E3A5F) -> Steel Blue (#475569) -> Warm Peach (#E8975F)
      // -----------------------------------------------------------------------
      const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
      skyGrad.addColorStop(0.00, '#1E3A5F');
      skyGrad.addColorStop(0.50, '#475569');
      skyGrad.addColorStop(1.00, '#E8975F');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, H);

      // -----------------------------------------------------------------------
      // 2. SUCCESS RAYS (Radiating down from top-center)
      // -----------------------------------------------------------------------
      const rayAlpha = 0.15 + 0.12 * (Math.sin(t * (2 * Math.PI / 3.0)) * 0.5 + 0.5);
      ctx.save();
      ctx.globalAlpha = rayAlpha;
      const rayAngles = [-0.34, -0.17, 0.0, 0.17, 0.34];
      rayAngles.forEach((ang) => {
        const targetX = W * 0.5 + Math.tan(ang) * (H * 0.45);
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(W * 0.5, 0);
        ctx.lineTo(targetX, H * 0.45);
        ctx.stroke();
      });
      ctx.restore();

      // -----------------------------------------------------------------------
      // 3. CLOUDS (Solid, opaque, cohesive white blobs - NO internal divisions)
      // -----------------------------------------------------------------------
      const cloudConfigs = [
        { xBase: W * 0.28, y: H * 0.27, w: 120, h: 36 },
        { xBase: W * 0.74, y: H * 0.31, w: 100, h: 30 },
        { xBase: W * 0.52, y: H * 0.20, w: 85, h: 25 },
      ];
      cloudConfigs.forEach((c, cIdx) => {
        const drift = Math.sin(t * (2 * Math.PI / 6.0) + cIdx * 1.6) * 10.0;
        const cx = c.xBase + drift;
        const cy = c.y;
        const cw = c.w;
        const ch = c.h;

        ctx.save();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(cx - cw * 0.55, cy + 2, cw * 1.1, ch, ch * 0.4);
        } else {
          ctx.rect(cx - cw * 0.55, cy + 2, cw * 1.1, ch);
        }
        ctx.arc(cx, cy, ch, 0, Math.PI * 2);
        ctx.arc(cx - cw * 0.35, cy + 4, ch * 0.82, 0, Math.PI * 2);
        ctx.arc(cx + cw * 0.35, cy + 3, ch * 0.78, 0, Math.PI * 2);
        ctx.arc(cx - cw * 0.55, cy + 8, ch * 0.58, 0, Math.PI * 2);
        ctx.arc(cx + cw * 0.55, cy + 8, ch * 0.58, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // -----------------------------------------------------------------------
      // 4. SUN & GOLDEN GLOW (Right side, ~85% X, just above horizon)
      // -----------------------------------------------------------------------
      const sunX = W * 0.85;
      const sunY = H * 0.60;
      const sunPulse = Math.sin(t * (2 * Math.PI / 6.0)) * 0.5 + 0.5;
      const sunScale = 1.0 + 0.15 * sunPulse;

      ctx.save();
      ctx.globalAlpha = 0.12 * (0.7 + 0.3 * sunPulse);
      ctx.fillStyle = '#F5DEB3';
      ctx.beginPath();
      ctx.arc(sunX, sunY, 95 * sunScale, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.40 * (0.7 + 0.3 * sunPulse);
      ctx.fillStyle = '#F5A623';
      ctx.beginPath();
      ctx.arc(sunX, sunY, 55 * sunScale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = '#FDB813';
      ctx.beginPath();
      ctx.arc(sunX, sunY, 28 * sunScale, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(sunX, sunY, 13 * sunScale, 0, Math.PI * 2);
      ctx.fill();

      // -----------------------------------------------------------------------
      // 5. UPWARD GROWTH LINES (Top 40%: rising from warehouse level to sky)
      // -----------------------------------------------------------------------
      const growthLines = [
        { startX: 0.18, endX: 0.26, color: '#FBBF24', w: 3.5, phase: 0.0 },
        { startX: 0.40, endX: 0.50, color: '#10B981', w: 3.5, phase: 1.0 },
        { startX: 0.64, endX: 0.74, color: '#FCD34D', w: 3.5, phase: 2.0 },
        { startX: 0.82, endX: 0.90, color: '#10B981', w: 3.0, phase: 3.0 },
      ];

      // (Removed: Growth trajectories and checkmarks for minimal aesthetic)

      // -----------------------------------------------------------------------
      // 6. FAR ROLLING HILL (Dark Sage #558B2F - Pure Green)
      // -----------------------------------------------------------------------
      const breathe = Math.sin(t * (2 * Math.PI / 6.0)) * 1.8;
      ctx.fillStyle = '#558B2F';
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 20) {
        const hy = H * 0.63 + Math.sin(x * 0.0028 + 0.5) * 36 + Math.cos(x * 0.006) * 14 + breathe;
        ctx.lineTo(x, hy);
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();

      // -----------------------------------------------------------------------
      // 7. MID ROLLING HILL (Primary Sage #7CB342 - Pure Green)
      // -----------------------------------------------------------------------
      ctx.fillStyle = '#7CB342';
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 15) {
        const hy = H * 0.72 + Math.sin(x * 0.0035 + 2.1) * 42 + Math.cos(x * 0.0075) * 15 - breathe;
        ctx.lineTo(x, hy);
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();

      // -----------------------------------------------------------------------
      // 8. WINDMILL (Left side, ~20% X, sitting directly on mid-hill)
      // -----------------------------------------------------------------------
      const wmX = W * 0.20;
      const wmBaseY = H * 0.72 + Math.sin(wmX * 0.0035 + 2.1) * 42 + Math.cos(wmX * 0.0075) * 15 - breathe;
      const wmTowerH = 70;
      const wmHubY = wmBaseY - wmTowerH;

      // Shadow
      ctx.save();
      ctx.globalAlpha = 0.20;
      ctx.fillStyle = '#142814';
      ctx.beginPath();
      ctx.ellipse(wmX, wmBaseY, 16, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Tower & Hub (Pure White #FFFFFF)
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(wmX, wmBaseY);
      ctx.lineTo(wmX, wmHubY);
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(wmX, wmHubY, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Blades (1 rotation per 6s)
      const rotAngle = t * (2 * Math.PI / 6.0);
      const bladeLen = 30;
      ctx.lineWidth = 2;
      for (let bIdx = 0; bIdx < 3; bIdx++) {
        const bAng = rotAngle + bIdx * (2 * Math.PI / 3.0);
        const bx = wmX + Math.sin(bAng) * bladeLen;
        const by = wmHubY - Math.cos(bAng) * bladeLen;
        ctx.beginPath();
        ctx.moveTo(wmX, wmHubY);
        ctx.lineTo(bx, by);
        ctx.stroke();
      }

      // -----------------------------------------------------------------------
      // 9. COLD STORAGE FACILITY (Warehouse centered, ~33% width, overlaps mid-hill)
      // -----------------------------------------------------------------------
      const whW = Math.min(634, W * 0.33);
      const whH = 165;
      const whX = W * 0.50 - whW * 0.5;
      const whY = H * 0.61;
      const whBaseY = whY + whH;
      const roofH = 52;

      // Drop shadow beneath building
      ctx.save();
      ctx.globalAlpha = 0.40;
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.ellipse(whX + whW * 0.5, whBaseY + 6, whW * 0.54, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Warehouse Body (#64748B steel grey)
      ctx.fillStyle = '#64748B';
      ctx.fillRect(whX, whY, whW, whH);

      // Pitched Roof (#4B5563 dark steel)
      ctx.fillStyle = '#4B5563';
      ctx.beginPath();
      ctx.moveTo(whX - 12, whY);
      ctx.lineTo(whX + whW * 0.5, whY - roofH);
      ctx.lineTo(whX + whW + 12, whY);
      ctx.closePath();
      ctx.fill();

      // Grid Pattern Overlay (20-32% alpha, 3s cycle)
      const gridAlpha = 0.20 + 0.12 * (Math.sin(t * (2 * Math.PI / 3.0)) * 0.5 + 0.5);
      ctx.save();
      ctx.globalAlpha = gridAlpha;
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 1;
      for (let gx = whX; gx <= whX + whW; gx += 16) {
        ctx.beginPath();
        ctx.moveTo(gx, whY);
        ctx.lineTo(gx, whBaseY);
        ctx.stroke();
      }
      for (let gy = whY; gy <= whBaseY; gy += 16) {
        ctx.beginPath();
        ctx.moveTo(whX, gy);
        ctx.lineTo(whX + whW, gy);
        ctx.stroke();
      }
      ctx.restore();

      // Crisp White Outline (#FFFFFF, 2px)
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.strokeRect(whX, whY, whW, whH);
      ctx.beginPath();
      ctx.moveTo(whX - 12, whY);
      ctx.lineTo(whX + whW * 0.5, whY - roofH);
      ctx.lineTo(whX + whW + 12, whY);
      ctx.closePath();
      ctx.stroke();

      // 6 Windows (3x2 grid, #2C5282 with dividers)
      const winW = 42;
      const winH = 28;
      const winSpacingX = (whW - 3 * winW) / 4;
      for (let cI = 0; cI < 3; cI++) {
        const wx = whX + winSpacingX * (cI + 1) + winW * cI;
        [whY + 38, whY + 95].forEach((wy) => {
          ctx.fillStyle = '#2C5282';
          ctx.fillRect(wx, wy, winW, winH);

          // Subtle reflection
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(wx + 3, wy + winH - 3);
          ctx.lineTo(wx + winW - 3, wy + 3);
          ctx.stroke();

          // White frame & cross
          ctx.strokeStyle = '#FFFFFF';
          ctx.strokeRect(wx, wy, winW, winH);
          ctx.beginPath();
          ctx.moveTo(wx + winW * 0.5, wy);
          ctx.lineTo(wx + winW * 0.5, wy + winH);
          ctx.moveTo(wx, wy + winH * 0.5);
          ctx.lineTo(wx + winW, wy + winH * 0.5);
          ctx.stroke();
        });
      }

      // Cooling Flow (3 vertical cyan lines on left of warehouse)
      const coolXStart = whX - 32;
      const coolLen = 130;
      const coolYBase = whY + 32;
      for (let ci = 0; ci < 3; ci++) {
        const lx = coolXStart + ci * 10;
        const flowOffset = (t / 2.0) % 1.0;
        ctx.strokeStyle = '#1E5766';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(lx, coolYBase);
        ctx.lineTo(lx, coolYBase + coolLen);
        ctx.stroke();

        ctx.strokeStyle = '#06B6D4';
        ctx.lineWidth = 3.2;
        for (let seg = 0; seg < 4; seg++) {
          const sy = coolYBase + ((flowOffset + seg / 4.0) % 1.0) * coolLen;
          ctx.beginPath();
          ctx.moveTo(lx, Math.max(coolYBase, sy - 14));
          ctx.lineTo(lx, Math.min(coolYBase + coolLen, sy + 6));
          ctx.stroke();
        }
      }

      // Digital Readout Panel (-18.4°C)
      const dispW = 120;
      const dispH = 44;
      const dispX = whX + whW - dispW - 28;
      const dispY = whY + 32;
      const panelPulse = Math.sin(t * (2 * Math.PI / 2.0)) * 0.5 + 0.5;
      ctx.save();
      ctx.globalAlpha = 0.85 + 0.15 * panelPulse;
      ctx.fillStyle = '#1A2540';
      ctx.fillRect(dispX, dispY, dispW, dispH);
      ctx.strokeStyle = '#06B6D4';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(dispX, dispY, dispW, dispH);
      ctx.fillStyle = '#00F0FF';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('-18.4 C', dispX + 10, dispY + 28);
      ctx.restore();

      // Status LED (Emerald Green #10B981)
      const ledX = whX + whW - 16;
      const ledY = whY + 16;
      const ledPulse = Math.sin(t * (2 * Math.PI / 2.0)) * 0.5 + 0.5;
      ctx.save();
      ctx.globalAlpha = 0.50 + 0.50 * ledPulse;
      ctx.fillStyle = '#10B981';
      ctx.beginPath();
      ctx.arc(ledX, ledY, 6 + ledPulse * 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = '#10B981';
      ctx.beginPath();
      ctx.arc(ledX, ledY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(ledX, ledY, 2, 0, Math.PI * 2);
      ctx.fill();

      // -----------------------------------------------------------------------
      // 10. FOREGROUND ROLLING HILL (Bright Highlight #9CCC65 - Pure Green)
      // Overlaps the lower base of the warehouse for grounded depth
      // -----------------------------------------------------------------------
      ctx.fillStyle = '#9CCC65';
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 15) {
        const hy = H * 0.81 + Math.cos(x * 0.0032 + 1.0) * 38 + Math.sin(x * 0.008) * 14 + breathe * 0.6;
        ctx.lineTo(x, hy);
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();

      // -----------------------------------------------------------------------
      // 11. CROP ROWS (Subtle green horizontal lines #558B2F, 12% alpha)
      // -----------------------------------------------------------------------
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.strokeStyle = '#558B2F';
      ctx.lineWidth = 1;
      for (let ry = H * 0.77; ry < H - 16; ry += 11) {
        ctx.beginPath();
        ctx.moveTo(0, ry);
        ctx.lineTo(W, ry);
        ctx.stroke();
      }
      ctx.restore();

      // -----------------------------------------------------------------------
      // 12. SOIL GROUND BAR (Brown #8B6D47, 16px at bottom)
      // -----------------------------------------------------------------------
      ctx.fillStyle = '#8B6D47';
      ctx.fillRect(0, H - 16, W, 16);

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      window.removeEventListener('resize', setupCanvasSize);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (animId) cancelAnimationFrame(animId);
    };
  }, [preferVideo, videoError]);

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 pointer-events-none overflow-hidden z-0 ${className}`}
      style={{ opacity }}
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
          <source src="/videos/system2-journey-loop.mp4" type="video/mp4" />
          <source src="/videos/warehouse-role-selection.mp4" type="video/mp4" />
        </video>
      ) : (
        <canvas ref={canvasRef} className="w-full h-full block" />
      )}
    </div>
  );
};

export default System2JourneyBackground;
