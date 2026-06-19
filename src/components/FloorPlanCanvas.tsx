// ============================================================
// Inmap v2 — FloorPlanCanvas
// Interactive 2D floor plan rendered on HTML Canvas 2D.
// Supports zoom/pan, animated route, POI selection, user dot.
// ============================================================

import React, { useRef, useEffect, useState, useCallback } from 'react';
import type {
  Floor,
  PointOfInterest,
  Waypoint,
  POICategory,
  Region,
} from '../types/index';
import {
  COLORS,
  MAP_CONFIG,
  REGION_FILL_COLORS,
  CATEGORY_ICONS,
  INFRASTRUCTURE_CATEGORIES,
} from '../utils/constants';
import { ALL_FLOORS } from '../data/building';

// ── Multi-floor route helpers ───────────────────────────────

/** Short display label for a floor id, e.g. 'G', 'F1', 'F2'. */
function floorShortLabel(floorId: string): string {
  const f = ALL_FLOORS.find((fl) => fl.id === floorId);
  if (!f) return '?';
  return f.level === 0 ? 'G' : `F${f.level}`;
}

/** Level (ordinal) for a floor id; defaults to 0 if unknown. */
function floorLevelOf(floorId: string): number {
  return ALL_FLOORS.find((fl) => fl.id === floorId)?.level ?? 0;
}

/** Builds a rounded-rectangle path on the context (caller then fills/strokes). */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/**
 * A connector point where the route leaves the current floor.
 * Drawn on the 2D plan as a badge ("Elevator → F1 ↑").
 */
interface RouteTransition {
  x: number;
  y: number;
  connectorType: 'stairs' | 'elevator' | 'escalator';
  targetLabel: string; // e.g. 'F1'
  direction: 'up' | 'down';
}

/**
 * Splits a (possibly multi-floor) path into the contiguous segment(s) that lie
 * on the given floor, plus the transition points where the route changes floors.
 *
 * A waypoint belongs to `floor` if its id is present in `floor.waypoints`.
 * Floor-connector waypoints (elevators/stairs) carry `connectedFloor`, which we
 * use to label the transition and compute up/down direction.
 */
function splitPathByFloor(
  path: Waypoint[],
  floor: Floor,
): { segments: Waypoint[][]; transitions: RouteTransition[] } {
  const onFloor = new Set(floor.waypoints.map((w) => w.id));
  const segments: Waypoint[][] = [];
  const transitions: RouteTransition[] = [];

  let current: Waypoint[] = [];
  for (let i = 0; i < path.length; i++) {
    const wp = path[i];
    if (onFloor.has(wp.id)) {
      current.push(wp);

      // If the next waypoint leaves this floor and this is a connector, mark it.
      const next = path[i + 1];
      if (next && !onFloor.has(next.id) && wp.connectorType && wp.connectedFloor) {
        transitions.push({
          x: wp.x,
          y: wp.y,
          connectorType: wp.connectorType,
          targetLabel: floorShortLabel(wp.connectedFloor),
          direction: floorLevelOf(wp.connectedFloor) > floor.level ? 'up' : 'down',
        });
      }
    } else if (current.length > 0) {
      // Route left this floor — close the current on-floor segment.
      segments.push(current);
      current = [];
    }
  }
  if (current.length > 0) segments.push(current);

  return { segments, transitions };
}

// ── Props ───────────────────────────────────────────────────

export interface FloorPlanCanvasProps {
  /** The floor data containing regions, waypoints, connections */
  floor: Floor;
  /** All POIs to render on this floor */
  pois: PointOfInterest[];
  /** Currently selected POI (highlighted) */
  selectedPOI: PointOfInterest | null;
  /** Calculated navigation path to draw */
  path: Waypoint[] | null;
  /** User's current position on the map */
  userPosition: { x: number; y: number } | null;
  /** Navigation destination position */
  destination: { x: number; y: number } | null;
  /** Active category filter (null = show all) */
  categoryFilter: POICategory | null;
  /** Callback when a POI is tapped/clicked */
  onPOITap: (poi: PointOfInterest) => void;
  /** Callback when empty area is tapped/clicked */
  onEmptyTap: () => void;
  /**
   * Monotonically increasing token. Changing it re-runs the auto-fit logic,
   * recentering and fitting the current floor to the viewport. Used by the
   * "reset view" / compass control in the parent.
   */
  resetViewToken?: number;
}

// ── Internal types ──────────────────────────────────────────

interface Transform {
  offsetX: number;
  offsetY: number;
  zoom: number;
}

interface DragState {
  isDragging: boolean;
  lastX: number;
  lastY: number;
}

interface PinchState {
  active: boolean;
  initialDistance: number;
  initialZoom: number;
  lastCenterX: number;
  lastCenterY: number;
}

// ── Helpers ─────────────────────────────────────────────────

/** Distance between two 2D points */
function dist(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Distance between two touch points */
function touchDistance(t1: React.Touch | Touch, t2: React.Touch | Touch): number {
  return dist(t1.clientX, t1.clientY, t2.clientX, t2.clientY);
}

/** Midpoint of two touches */
function touchCenter(t1: React.Touch | Touch, t2: React.Touch | Touch): { x: number; y: number } {
  return {
    x: (t1.clientX + t2.clientX) / 2,
    y: (t1.clientY + t2.clientY) / 2,
  };
}

/** Check if a point is inside a polygon (ray-casting algorithm) */
function pointInPolygon(px: number, py: number, polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    const intersect = ((yi > py) !== (yj > py)) &&
      (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Clamp a value between min and max */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Check if a wall segment (edge of a polygon) is near any door waypoint.
 * If so, we skip drawing that wall segment to leave a visual gap.
 */
function isNearDoor(
  x1: number, y1: number,
  x2: number, y2: number,
  doors: Waypoint[],
  threshold: number
): boolean {
  for (const door of doors) {
    // Point-to-segment distance (approximate: check distance to midpoint and endpoints)
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    if (
      dist(door.x, door.y, mx, my) < threshold ||
      dist(door.x, door.y, x1, y1) < threshold ||
      dist(door.x, door.y, x2, y2) < threshold
    ) {
      return true;
    }
    // More precise: project point onto segment
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    if (len2 > 0) {
      const t = clamp(((door.x - x1) * dx + (door.y - y1) * dy) / len2, 0, 1);
      const projX = x1 + t * dx;
      const projY = y1 + t * dy;
      if (dist(door.x, door.y, projX, projY) < threshold) {
        return true;
      }
    }
  }
  return false;
}

// ── Component ───────────────────────────────────────────────

/**
 * FloorPlanCanvas — Interactive 2D floor plan rendered on HTML Canvas 2D.
 *
 * Features:
 * - Mouse wheel / pinch-to-zoom (0.3x–4.0x)
 * - Click-drag / one-finger pan
 * - Region polygons with type-based fill colors
 * - Walls with door-gap detection
 * - Animated dashed route path
 * - POI emoji icons and labels
 * - User position blue dot with pulsing glow
 * - Destination diamond pin
 * - Tap/click POI detection (15px radius)
 */
const FloorPlanCanvas: React.FC<FloorPlanCanvasProps> = ({
  floor,
  pois,
  selectedPOI,
  path,
  userPosition,
  destination,
  categoryFilter,
  onPOITap,
  onEmptyTap,
  resetViewToken,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const dragRef = useRef<DragState>({ isDragging: false, lastX: 0, lastY: 0 });
  const pinchRef = useRef<PinchState>({ active: false, initialDistance: 0, initialZoom: 1, lastCenterX: 0, lastCenterY: 0 });
  const timeRef = useRef<number>(0);

  const [transform, setTransform] = useState<Transform>({
    offsetX: 0,
    offsetY: 0,
    zoom: MAP_CONFIG.canvasDefaultZoom,
  });

  // We use a ref mirror for the transform so requestAnimationFrame sees the latest
  const transformRef = useRef(transform);
  transformRef.current = transform;

  // Collect door waypoints for gap detection
  const doorWaypoints = floor.waypoints.filter(wp => wp.type === 'door');

  // ── Coordinate transforms ─────────────────────────────────

  /** Convert world (map) coordinates to canvas pixel coordinates */
  const worldToCanvas = useCallback((wx: number, wy: number, t: Transform, canvasW: number, canvasH: number) => {
    const cx = (wx * t.zoom) + t.offsetX + canvasW / 2;
    const cy = (wy * t.zoom) + t.offsetY + canvasH / 2;
    return { cx, cy };
  }, []);

  /** Convert canvas pixel coordinates back to world (map) coordinates */
  const canvasToWorld = useCallback((cx: number, cy: number, t: Transform, canvasW: number, canvasH: number) => {
    const wx = (cx - t.offsetX - canvasW / 2) / t.zoom;
    const wy = (cy - t.offsetY - canvasH / 2) / t.zoom;
    return { wx, wy };
  }, []);

  // ── Auto-center on mount / floor change ───────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { bounds } = floor;
    const cw = canvas.width;
    const ch = canvas.height;

    // Calculate zoom to fit the floor bounds with some padding
    const floorW = bounds.maxX - bounds.minX;
    const floorH = bounds.maxY - bounds.minY;
    if (floorW <= 0 || floorH <= 0) return;

    const padding = 60; // px
    const zoomX = (cw - padding * 2) / floorW;
    const zoomY = (ch - padding * 2) / floorH;
    const fitZoom = clamp(Math.min(zoomX, zoomY), MAP_CONFIG.canvasMinZoom, MAP_CONFIG.canvasMaxZoom);

    // Center the floor
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    setTransform({
      offsetX: -centerX * fitZoom,
      offsetY: -centerY * fitZoom,
      zoom: fitZoom,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floor, resetViewToken]);

  // ── Canvas sizing via ResizeObserver ───────────────────────

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    };

    resize();

    const observer = new ResizeObserver(() => resize());
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // ── Render loop ───────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let startTime = performance.now();

    const render = (now: number) => {
      const elapsed = (now - startTime) / 1000; // seconds
      timeRef.current = elapsed;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const cw = canvas.width / dpr;
      const ch = canvas.height / dpr;
      const t = transformRef.current;

      // Clear
      ctx.clearRect(0, 0, cw, ch);

      // Background
      ctx.fillStyle = COLORS.mapBg;
      ctx.fillRect(0, 0, cw, ch);

      // Draw order: regions → walls → doors → route → POI icons → labels → user dot → destination
      drawRegions(ctx, t, cw, ch);
      drawWalls(ctx, t, cw, ch);
      drawDoors(ctx, t, cw, ch);
      drawRoute(ctx, t, cw, ch, elapsed);
      drawPOIs(ctx, t, cw, ch);
      drawUserPosition(ctx, t, cw, ch, elapsed);
      drawDestination(ctx, t, cw, ch, elapsed);

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
    // Re-subscribe when data dependencies change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floor, pois, selectedPOI, path, userPosition, destination, categoryFilter]);

  // ── Drawing functions ─────────────────────────────────────

  /** Draw all floor regions as filled polygons */
  const drawRegions = useCallback((ctx: CanvasRenderingContext2D, t: Transform, cw: number, ch: number) => {
    for (const region of floor.regions) {
      if (region.polygon.length < 3) continue;

      const fillColor = REGION_FILL_COLORS[region.type] || COLORS.mapRoomFill;
      const isSelected = selectedPOI?.regionId === region.id;

      ctx.beginPath();
      const first = worldToCanvas(region.polygon[0][0], region.polygon[0][1], t, cw, ch);
      ctx.moveTo(first.cx, first.cy);

      for (let i = 1; i < region.polygon.length; i++) {
        const p = worldToCanvas(region.polygon[i][0], region.polygon[i][1], t, cw, ch);
        ctx.lineTo(p.cx, p.cy);
      }
      ctx.closePath();

      // Fill
      ctx.fillStyle = isSelected ? COLORS.mapSelectedRegion : fillColor;
      ctx.fill();

      // Selected region accent border
      if (isSelected) {
        ctx.strokeStyle = COLORS.accentSecondary;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }, [floor.regions, selectedPOI, worldToCanvas]);

  /** Draw wall lines along polygon edges, skipping door gaps */
  const drawWalls = useCallback((ctx: CanvasRenderingContext2D, t: Transform, cw: number, ch: number) => {
    ctx.strokeStyle = COLORS.mapWallStroke;
    ctx.lineWidth = MAP_CONFIG.wallLineWidth * Math.min(t.zoom, 2);
    ctx.lineCap = 'round';

    for (const region of floor.regions) {
      const poly = region.polygon;
      if (poly.length < 3) continue;

      for (let i = 0; i < poly.length; i++) {
        const j = (i + 1) % poly.length;
        const [x1, y1] = poly[i];
        const [x2, y2] = poly[j];

        // Skip wall segments near doors (leave gap)
        if (isNearDoor(x1, y1, x2, y2, doorWaypoints, 1.5)) continue;

        const p1 = worldToCanvas(x1, y1, t, cw, ch);
        const p2 = worldToCanvas(x2, y2, t, cw, ch);

        ctx.beginPath();
        ctx.moveTo(p1.cx, p1.cy);
        ctx.lineTo(p2.cx, p2.cy);
        ctx.stroke();
      }
    }
  }, [floor.regions, doorWaypoints, worldToCanvas]);

  /** Draw door indicators as short colored segments */
  const drawDoors = useCallback((ctx: CanvasRenderingContext2D, t: Transform, cw: number, ch: number) => {
    ctx.strokeStyle = COLORS.mapDoorStroke;
    ctx.lineWidth = 3 * Math.min(t.zoom, 2);
    ctx.lineCap = 'round';

    for (const door of doorWaypoints) {
      const p = worldToCanvas(door.x, door.y, t, cw, ch);
      const halfLen = 6 * t.zoom;

      ctx.beginPath();
      ctx.moveTo(p.cx - halfLen, p.cy);
      ctx.lineTo(p.cx + halfLen, p.cy);
      ctx.stroke();
    }
  }, [doorWaypoints, worldToCanvas]);

  /** Draw animated dashed route path (current floor segment only) + cross-floor badges */
  const drawRoute = useCallback((ctx: CanvasRenderingContext2D, t: Transform, cw: number, ch: number, elapsed: number) => {
    if (!path || path.length < 2) return;

    const { segments, transitions } = splitPathByFloor(path, floor);
    if (segments.length === 0 && transitions.length === 0) return;

    const dashOffset = elapsed * MAP_CONFIG.routeAnimSpeed * (MAP_CONFIG.routeDashLength + MAP_CONFIG.routeGapLength) * 3;

    ctx.save();
    ctx.strokeStyle = COLORS.mapRouteLine;
    ctx.lineWidth = MAP_CONFIG.routeLineWidth * Math.min(t.zoom, 2.5);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([
      MAP_CONFIG.routeDashLength * t.zoom,
      MAP_CONFIG.routeGapLength * t.zoom,
    ]);
    ctx.lineDashOffset = -dashOffset;

    // Route glow
    ctx.shadowColor = COLORS.pathGlow;
    ctx.shadowBlur = 8 * Math.min(t.zoom, 2);

    // Draw each on-floor segment independently so the line never "jumps"
    // across floors via an elevator/stairwell.
    for (const segment of segments) {
      if (segment.length < 2) continue;
      ctx.beginPath();
      const first = worldToCanvas(segment[0].x, segment[0].y, t, cw, ch);
      ctx.moveTo(first.cx, first.cy);
      for (let i = 1; i < segment.length; i++) {
        const p = worldToCanvas(segment[i].x, segment[i].y, t, cw, ch);
        ctx.lineTo(p.cx, p.cy);
      }
      ctx.stroke();
    }
    ctx.restore();

    // Draw cross-floor transition badges (elevator/stairs + target floor)
    for (const tr of transitions) {
      const p = worldToCanvas(tr.x, tr.y, t, cw, ch);
      const r = 13 * Math.min(t.zoom, 2);
      const icon = tr.connectorType === 'elevator' ? '🛗' : tr.connectorType === 'escalator' ? '🪜' : '🪜';
      const arrow = tr.direction === 'up' ? '↑' : '↓';
      const label = `${arrow} ${tr.targetLabel}`;

      ctx.save();
      // Pulsing ring to draw attention to the floor change
      const pulse = 0.5 + 0.5 * Math.sin(elapsed * 0.005);
      ctx.beginPath();
      ctx.arc(p.cx, p.cy, r + 4 + pulse * 3, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.pathGlow;
      ctx.globalAlpha = 0.25;
      ctx.fill();
      ctx.globalAlpha = 1;

      // Badge disc
      ctx.beginPath();
      ctx.arc(p.cx, p.cy, r, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.mapRouteLine;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Connector icon
      ctx.font = `${r * 1.1}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(icon, p.cx, p.cy + 0.5);

      // Floor pill ("↑ F1") below the disc
      const pillText = label;
      ctx.font = `600 ${Math.max(10, r * 0.85)}px system-ui, sans-serif`;
      const tw = ctx.measureText(pillText).width;
      const pillW = tw + 12;
      const pillH = r * 1.25;
      const pillX = p.cx - pillW / 2;
      const pillY = p.cy + r + 4;
      ctx.fillStyle = COLORS.mapRouteLine;
      roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(pillText, p.cx, pillY + pillH / 2 + 0.5);

      ctx.restore();
    }
  }, [path, floor, worldToCanvas]);

  /** Draw POI icons and labels */
  const drawPOIs = useCallback((ctx: CanvasRenderingContext2D, t: Transform, cw: number, ch: number) => {
    const showLabels = t.zoom >= MAP_CONFIG.poiLabelMinZoom;

    for (const poi of pois) {
      // Category filter
      if (categoryFilter && poi.category !== categoryFilter) continue;

      // Infrastructure icons always visible; others only at sufficient zoom
      const isInfra = INFRASTRUCTURE_CATEGORIES.has(poi.category);
      if (!isInfra && t.zoom < MAP_CONFIG.infraIconMinZoom) continue;

      const p = worldToCanvas(poi.position.x, poi.position.y, t, cw, ch);

      // Highlight selected POI
      const isSelected = selectedPOI?.id === poi.id;
      if (isSelected) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.cx, p.cy, 22 * Math.min(t.zoom, 2), 0, Math.PI * 2);
        ctx.fillStyle = COLORS.mapSelectedRegion;
        ctx.fill();
        ctx.strokeStyle = COLORS.accentSecondary;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }

      // Icon (emoji)
      const icon = poi.icon || CATEGORY_ICONS[poi.category] || '📍';
      const iconSize = MAP_CONFIG.poiIconFontSize * Math.min(t.zoom, 2.5);
      ctx.font = `${iconSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(icon, p.cx, p.cy);

      // Label (below icon at higher zoom)
      if (showLabels || isSelected) {
        const labelFontSize = MAP_CONFIG.regionLabelFontSize * Math.min(t.zoom, 2);
        ctx.font = `500 ${labelFontSize}px 'Inter', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        const labelY = p.cy + iconSize / 2 + 4;
        const textMetrics = ctx.measureText(poi.name);
        const labelPadX = 4;
        const labelPadY = 2;

        // Label background pill
        ctx.fillStyle = COLORS.mapPoiLabelBg;
        const rx = p.cx - textMetrics.width / 2 - labelPadX;
        const ry = labelY - labelPadY;
        const rw = textMetrics.width + labelPadX * 2;
        const rh = labelFontSize + labelPadY * 2 + 2;
        const radius = 4;

        ctx.beginPath();
        ctx.moveTo(rx + radius, ry);
        ctx.lineTo(rx + rw - radius, ry);
        ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + radius);
        ctx.lineTo(rx + rw, ry + rh - radius);
        ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - radius, ry + rh);
        ctx.lineTo(rx + radius, ry + rh);
        ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - radius);
        ctx.lineTo(rx, ry + radius);
        ctx.quadraticCurveTo(rx, ry, rx + radius, ry);
        ctx.closePath();
        ctx.fill();

        // Label text
        ctx.fillStyle = COLORS.mapPoiLabel;
        ctx.fillText(poi.name, p.cx, labelY);
      }
    }
  }, [pois, selectedPOI, categoryFilter, worldToCanvas]);

  /** Draw user position blue dot with pulsing ring */
  const drawUserPosition = useCallback((ctx: CanvasRenderingContext2D, t: Transform, cw: number, ch: number, elapsed: number) => {
    if (!userPosition) return;

    const p = worldToCanvas(userPosition.x, userPosition.y, t, cw, ch);
    const pulsePhase = (Math.sin(elapsed * 3) + 1) / 2; // 0..1 oscillation

    // Pulsing glow ring
    const pulseRadius = MAP_CONFIG.userDotRadius + (MAP_CONFIG.userDotPulseRadius - MAP_CONFIG.userDotRadius) * pulsePhase;
    ctx.beginPath();
    ctx.arc(p.cx, p.cy, pulseRadius, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.mapUserGlow;
    ctx.globalAlpha = 0.6 * (1 - pulsePhase);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Outer ring (white border)
    ctx.beginPath();
    ctx.arc(p.cx, p.cy, MAP_CONFIG.userDotRadius + 2, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Inner blue dot
    ctx.beginPath();
    ctx.arc(p.cx, p.cy, MAP_CONFIG.userDotRadius, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.mapUserDot;
    ctx.fill();
  }, [userPosition, worldToCanvas]);

  /** Draw destination diamond pin */
  const drawDestination = useCallback((ctx: CanvasRenderingContext2D, t: Transform, cw: number, ch: number, elapsed: number) => {
    if (!destination) return;

    const p = worldToCanvas(destination.x, destination.y, t, cw, ch);
    const size = 10 * Math.min(t.zoom, 2.5);
    const bobOffset = Math.sin(elapsed * 2.5) * 3;

    ctx.save();

    // Shadow / glow
    ctx.shadowColor = COLORS.mapDestinationPin;
    ctx.shadowBlur = 12;

    // Diamond shape
    ctx.beginPath();
    ctx.moveTo(p.cx, p.cy - size + bobOffset);        // top
    ctx.lineTo(p.cx + size * 0.6, p.cy + bobOffset);  // right
    ctx.lineTo(p.cx, p.cy + size * 0.4 + bobOffset);  // bottom
    ctx.lineTo(p.cx - size * 0.6, p.cy + bobOffset);  // left
    ctx.closePath();

    ctx.fillStyle = COLORS.mapDestinationPin;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }, [destination, worldToCanvas]);

  // ── Mouse events (zoom + pan) ─────────────────────────────

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const cw = canvas.width / dpr;
    const ch = canvas.height / dpr;

    setTransform(prev => {
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const newZoom = clamp(prev.zoom * zoomFactor, MAP_CONFIG.canvasMinZoom, MAP_CONFIG.canvasMaxZoom);
      const scale = newZoom / prev.zoom;

      // Zoom toward mouse position
      const newOffsetX = mouseX - cw / 2 - (mouseX - cw / 2 - prev.offsetX) * scale;
      const newOffsetY = mouseY - ch / 2 - (mouseY - ch / 2 - prev.offsetY) * scale;

      return { offsetX: newOffsetX, offsetY: newOffsetY, zoom: newZoom };
    });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return; // left click only
    dragRef.current = { isDragging: true, lastX: e.clientX, lastY: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragRef.current.isDragging) return;

    const dx = e.clientX - dragRef.current.lastX;
    const dy = e.clientY - dragRef.current.lastY;
    dragRef.current.lastX = e.clientX;
    dragRef.current.lastY = e.clientY;

    setTransform(prev => ({
      ...prev,
      offsetX: prev.offsetX + dx,
      offsetY: prev.offsetY + dy,
    }));
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const wasDragging = dragRef.current.isDragging;
    const movedDistance = wasDragging
      ? 0 // We'll check from the initial position if needed
      : 0;

    dragRef.current.isDragging = false;

    // Only handle click if the mouse didn't move much (not a drag)
    // We track this by comparing the accumulated movement
    // For simplicity: if mouse up happened near mouse down, treat as click
  }, []);

  /** Handle click/tap on canvas to detect POI hits */
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const cw = canvas.width / dpr;
    const ch = canvas.height / dpr;

    const t = transformRef.current;

    // Check if any POI is within 15px
    const hitRadius = 15;
    let closestPOI: PointOfInterest | null = null;
    let closestDist = Infinity;

    for (const poi of pois) {
      if (categoryFilter && poi.category !== categoryFilter) continue;

      const p = worldToCanvas(poi.position.x, poi.position.y, t, cw, ch);
      const d = dist(clickX, clickY, p.cx, p.cy);

      if (d < hitRadius && d < closestDist) {
        closestDist = d;
        closestPOI = poi;
      }
    }

    if (closestPOI) {
      onPOITap(closestPOI);
    } else {
      onEmptyTap();
    }
  }, [pois, categoryFilter, onPOITap, onEmptyTap, worldToCanvas]);

  // ── Touch events (pinch-zoom + pan) ───────────────────────

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2) {
      // Pinch start
      const d = touchDistance(e.touches[0], e.touches[1]);
      const center = touchCenter(e.touches[0], e.touches[1]);
      pinchRef.current = {
        active: true,
        initialDistance: d,
        initialZoom: transformRef.current.zoom,
        lastCenterX: center.x,
        lastCenterY: center.y,
      };
      dragRef.current.isDragging = false;
    } else if (e.touches.length === 1) {
      dragRef.current = {
        isDragging: true,
        lastX: e.touches[0].clientX,
        lastY: e.touches[0].clientY,
      };
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();

    if (e.touches.length === 2 && pinchRef.current.active) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const dpr = window.devicePixelRatio || 1;
      const cw = canvas.width / dpr;
      const ch = canvas.height / dpr;

      const d = touchDistance(e.touches[0], e.touches[1]);
      const center = touchCenter(e.touches[0], e.touches[1]);
      const rect = canvas.getBoundingClientRect();
      const centerX = center.x - rect.left;
      const centerY = center.y - rect.top;

      const zoomRatio = d / pinchRef.current.initialDistance;
      const newZoom = clamp(
        pinchRef.current.initialZoom * zoomRatio,
        MAP_CONFIG.canvasMinZoom,
        MAP_CONFIG.canvasMaxZoom
      );

      setTransform(prev => {
        const scale = newZoom / prev.zoom;
        const newOffsetX = centerX - cw / 2 - (centerX - cw / 2 - prev.offsetX) * scale;
        const newOffsetY = centerY - ch / 2 - (centerY - ch / 2 - prev.offsetY) * scale;

        // Also apply pan from center movement
        const lastCenter = pinchRef.current;
        const panDX = (center.x - lastCenter.lastCenterX);
        const panDY = (center.y - lastCenter.lastCenterY);

        pinchRef.current.lastCenterX = center.x;
        pinchRef.current.lastCenterY = center.y;

        return {
          offsetX: newOffsetX + panDX,
          offsetY: newOffsetY + panDY,
          zoom: newZoom,
        };
      });
    } else if (e.touches.length === 1 && dragRef.current.isDragging && !pinchRef.current.active) {
      const dx = e.touches[0].clientX - dragRef.current.lastX;
      const dy = e.touches[0].clientY - dragRef.current.lastY;
      dragRef.current.lastX = e.touches[0].clientX;
      dragRef.current.lastY = e.touches[0].clientY;

      setTransform(prev => ({
        ...prev,
        offsetX: prev.offsetX + dx,
        offsetY: prev.offsetY + dy,
      }));
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length < 2) {
      pinchRef.current.active = false;
    }
    if (e.touches.length === 0) {
      // Detect tap (no drag)
      dragRef.current.isDragging = false;

      if (e.changedTouches.length === 1) {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        const tapX = e.changedTouches[0].clientX - rect.left;
        const tapY = e.changedTouches[0].clientY - rect.top;
        const cw = canvas.width / dpr;
        const ch = canvas.height / dpr;
        const t = transformRef.current;

        const hitRadius = 20; // slightly larger for touch
        let closestPOI: PointOfInterest | null = null;
        let closestDist = Infinity;

        for (const poi of pois) {
          if (categoryFilter && poi.category !== categoryFilter) continue;
          const p = worldToCanvas(poi.position.x, poi.position.y, t, cw, ch);
          const d = dist(tapX, tapY, p.cx, p.cy);

          if (d < hitRadius && d < closestDist) {
            closestDist = d;
            closestPOI = poi;
          }
        }

        if (closestPOI) {
          onPOITap(closestPOI);
        } else {
          onEmptyTap();
        }
      }
    }
  }, [pois, categoryFilter, onPOITap, onEmptyTap, worldToCanvas]);

  // ── Render ────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      <canvas
        ref={canvasRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          display: 'block',
          cursor: dragRef.current.isDragging ? 'grabbing' : 'grab',
        }}
      />
    </div>
  );
};

export default FloorPlanCanvas;
