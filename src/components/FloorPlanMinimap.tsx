import React, { useRef, useEffect, useCallback } from 'react';
import { COLORS, MAP_CONFIG } from '../utils/constants';
import type { Region, Waypoint } from '../types/index';

interface FloorPlanMinimapProps {
  regions: Region[];
  path: Waypoint[] | null;
  currentPosition: { x: number; y: number } | null;
  destination: { x: number; y: number } | null;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

const WIDTH = MAP_CONFIG.minimapWidth;   // 220
const HEIGHT = MAP_CONFIG.minimapHeight; // 160
const PAD = MAP_CONFIG.minimapPadding;   // 16

/**
 * FloorPlanMinimap — small 2D minimap overlay rendered on an HTML Canvas.
 *
 * Draws region outlines, the navigation path (animated cyan dashes),
 * the user's current position (pulsing dot + ring), and the destination
 * marker (indigo diamond).
 */
const FloorPlanMinimap: React.FC<FloorPlanMinimapProps> = ({
  regions,
  path,
  currentPosition,
  destination,
  bounds,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const dashOffset = useRef(0);
  const ringRadius = useRef(0);

  /** Map building coords → canvas coords. */
  const toCanvas = useCallback(
    (x: number, y: number): [number, number] => {
      const bw = bounds.maxX - bounds.minX || 1;
      const bh = bounds.maxY - bounds.minY || 1;
      const drawW = WIDTH - PAD * 2;
      const drawH = HEIGHT - PAD * 2;
      const scale = Math.min(drawW / bw, drawH / bh);
      const cx = PAD + (x - bounds.minX) * scale + (drawW - bw * scale) / 2;
      const cy = PAD + (y - bounds.minY) * scale + (drawH - bh * scale) / 2;
      return [cx, cy];
    },
    [bounds],
  );

  /** Main draw loop. */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = WIDTH * dpr;
    canvas.height = HEIGHT * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // ── Regions ──────────────────────────────────────────
    regions.forEach((region) => {
      if (region.polygon.length < 2) return;
      ctx.beginPath();
      const [sx, sy] = toCanvas(region.polygon[0][0], region.polygon[0][1]);
      ctx.moveTo(sx, sy);
      for (let i = 1; i < region.polygon.length; i++) {
        const [px, py] = toCanvas(region.polygon[i][0], region.polygon[i][1]);
        ctx.lineTo(px, py);
      }
      ctx.closePath();

      // Fill corridors / lobbies slightly brighter
      if (region.type === 'corridor' || region.type === 'lobby') {
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fill();
      }

      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    });

    // ── Path ─────────────────────────────────────────────
    if (path && path.length >= 2) {
      ctx.beginPath();
      const [px0, py0] = toCanvas(path[0].x, path[0].y);
      ctx.moveTo(px0, py0);
      for (let i = 1; i < path.length; i++) {
        const [px, py] = toCanvas(path[i].x, path[i].y);
        ctx.lineTo(px, py);
      }
      ctx.strokeStyle = COLORS.accentPrimary;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.lineDashOffset = dashOffset.current;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // ── Destination diamond ──────────────────────────────
    if (destination) {
      const [dx, dy] = toCanvas(destination.x, destination.y);
      const s = 6;
      ctx.beginPath();
      ctx.moveTo(dx, dy - s);
      ctx.lineTo(dx + s, dy);
      ctx.lineTo(dx, dy + s);
      ctx.lineTo(dx - s, dy);
      ctx.closePath();
      ctx.fillStyle = COLORS.accentSecondary;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // ── Current position ─────────────────────────────────
    if (currentPosition) {
      const [cx, cy] = toCanvas(currentPosition.x, currentPosition.y);

      // Expanding ring
      const r = ringRadius.current % 18;
      const alpha = 1 - r / 18;
      ctx.beginPath();
      ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0,255,204,${(alpha * 0.6).toFixed(2)})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Solid dot
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.accentPrimary;
      ctx.shadowColor = COLORS.accentPrimary;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Advance animation values
    dashOffset.current -= 0.4;
    ringRadius.current += 0.15;

    animRef.current = requestAnimationFrame(draw);
  }, [regions, path, currentPosition, destination, toCanvas]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  return (
    <div
      className="glass-card--static"
      style={{
        width: WIDTH,
        height: HEIGHT,
        borderRadius: 14,
        overflow: 'hidden',
        padding: 0,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: WIDTH, height: HEIGHT, display: 'block' }}
      />
    </div>
  );
};

export default FloorPlanMinimap;
