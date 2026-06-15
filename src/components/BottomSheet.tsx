// ============================================================
// Inmap v2 — BottomSheet
// Draggable bottom sheet overlay with snap points.
// 2GIS-style core interaction pattern.
// ============================================================

import React, { useRef, useCallback, useEffect, useMemo } from 'react';
import type { BottomSheetState } from '../types/index';
import { COLORS } from '../utils/constants';

// ── Props ───────────────────────────────────────────────────

export interface BottomSheetProps {
  /** Current sheet state: 'hidden' | 'collapsed' | 'expanded' | 'full' */
  state: BottomSheetState;
  /** Callback when the sheet state changes (from drag gestures) */
  onStateChange: (state: BottomSheetState) => void;
  /** Sheet content */
  children: React.ReactNode;
  /** Height in px when collapsed (default: 140) */
  collapsedHeight?: number;
  /** Ratio of viewport when expanded (default: 0.55 = 55%) */
  expandedRatio?: number;
}

// ── Internal types ──────────────────────────────────────────

interface DragInfo {
  active: boolean;
  startY: number;
  startTranslateY: number;
  currentY: number;
  moved: boolean;
}

// ── Constants ───────────────────────────────────────────────

const HANDLE_AREA_HEIGHT = 32;
const FULL_RATIO = 0.9; // 90% of viewport
const SNAP_TRANSITION = 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)';

// ── Styles ──────────────────────────────────────────────────

const sheetStyles: React.CSSProperties = {
  position: 'fixed',
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 100,
  background: COLORS.bgGlass,
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  borderTop: `1px solid ${COLORS.borderGlass}`,
  borderRadius: '20px 20px 0 0',
  boxShadow: `0 -4px 30px rgba(0, 0, 0, 0.4), 0 -1px 8px ${COLORS.borderAccent}`,
  willChange: 'transform',
  touchAction: 'none',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const handleAreaStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: `${HANDLE_AREA_HEIGHT}px`,
  cursor: 'grab',
  flexShrink: 0,
  userSelect: 'none',
  WebkitUserSelect: 'none',
};

const handleBarStyles: React.CSSProperties = {
  width: 40,
  height: 4,
  borderRadius: 2,
  background: 'rgba(255, 255, 255, 0.25)',
  transition: 'background 0.2s ease',
};

// ── Component ───────────────────────────────────────────────

/**
 * BottomSheet — Draggable bottom sheet overlay with snap points.
 *
 * Features:
 * - Four states: hidden, collapsed, expanded, full
 * - Smooth GPU-accelerated transitions via translateY
 * - Mouse & touch drag on the handle area
 * - Snaps to the nearest state on release
 * - Content is scrollable when expanded or full
 * - No backdrop overlay — map stays interactive
 */
const BottomSheet: React.FC<BottomSheetProps> = ({
  state,
  onStateChange,
  children,
  collapsedHeight = 140,
  expandedRatio = 0.55,
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragInfo>({
    active: false,
    startY: 0,
    startTranslateY: 0,
    currentY: 0,
    moved: false,
  });
  const isTransitioning = useRef(false);

  // ── Snap point calculations ─────────────────────────────

  /** Calculate translateY values for each snap point */
  const getSnapPoints = useCallback(() => {
    const vh = window.innerHeight;
    return {
      hidden: vh + 20, // fully off-screen
      collapsed: vh - collapsedHeight,
      expanded: vh * (1 - expandedRatio),
      full: vh * (1 - FULL_RATIO),
    };
  }, [collapsedHeight, expandedRatio]);

  /** Get the translateY for the current state */
  const getTranslateY = useCallback((s: BottomSheetState): number => {
    const snaps = getSnapPoints();
    return snaps[s];
  }, [getSnapPoints]);

  // Sheet needs a height large enough to cover the full state
  const sheetHeight = useMemo(() => {
    return window.innerHeight * FULL_RATIO + 20;
  }, []);

  // ── Apply transform ───────────────────────────────────────

  const applyTransform = useCallback((translateY: number, animate: boolean) => {
    const sheet = sheetRef.current;
    if (!sheet) return;

    sheet.style.transition = animate ? SNAP_TRANSITION : 'none';
    sheet.style.transform = `translateY(${translateY}px)`;
  }, []);

  // ── Update transform when state changes externally ────────

  useEffect(() => {
    const translateY = getTranslateY(state);
    applyTransform(translateY, true);
  }, [state, getTranslateY, applyTransform]);

  // ── Handle window resize ──────────────────────────────────

  useEffect(() => {
    const onResize = () => {
      const translateY = getTranslateY(state);
      applyTransform(translateY, false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [state, getTranslateY, applyTransform]);

  // ── Snap to nearest state ─────────────────────────────────

  const snapToNearest = useCallback((currentY: number) => {
    const snaps = getSnapPoints();
    const entries: [BottomSheetState, number][] = [
      ['hidden', snaps.hidden],
      ['collapsed', snaps.collapsed],
      ['expanded', snaps.expanded],
      ['full', snaps.full],
    ];

    let closest: BottomSheetState = 'collapsed';
    let minDist = Infinity;

    for (const [s, y] of entries) {
      const d = Math.abs(currentY - y);
      if (d < minDist) {
        minDist = d;
        closest = s;
      }
    }

    // If dragged below collapsed, go to hidden
    if (currentY > snaps.collapsed + 40) {
      closest = 'hidden';
    }

    applyTransform(snaps[closest], true);
    isTransitioning.current = true;

    // Notify parent after transition
    setTimeout(() => {
      isTransitioning.current = false;
    }, 360);

    onStateChange(closest);
  }, [getSnapPoints, applyTransform, onStateChange]);

  // ── Pointer event handlers (unified mouse + touch) ────────

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // Only handle drags from the handle area
    const sheet = sheetRef.current;
    if (!sheet) return;

    // Capture pointer for tracking
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const currentTranslateY = getTranslateY(state);
    dragRef.current = {
      active: true,
      startY: e.clientY,
      startTranslateY: currentTranslateY,
      currentY: currentTranslateY,
      moved: false,
    };

    // Remove transition during drag for responsiveness
    sheet.style.transition = 'none';
  }, [state, getTranslateY]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.active) return;

    const dy = e.clientY - dragRef.current.startY;
    const newY = dragRef.current.startTranslateY + dy;

    // Clamp: don't go above full state
    const snaps = getSnapPoints();
    const clampedY = Math.max(snaps.full - 20, newY);

    dragRef.current.currentY = clampedY;
    dragRef.current.moved = true;

    applyTransform(clampedY, false);
  }, [getSnapPoints, applyTransform]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;

    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    if (dragRef.current.moved) {
      snapToNearest(dragRef.current.currentY);
    }
  }, [snapToNearest]);

  // ── Content scrollability ─────────────────────────────────

  const isScrollable = state === 'expanded' || state === 'full';

  return (
    <div
      ref={sheetRef}
      style={{
        ...sheetStyles,
        height: `${sheetHeight}px`,
        transform: `translateY(${getTranslateY(state)}px)`,
      }}
      role="dialog"
      aria-label="Detail panel"
    >
      {/* Drag handle area */}
      <div
        style={handleAreaStyles}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div style={handleBarStyles} />
      </div>

      {/* Content container */}
      <div
        style={{
          flex: 1,
          overflowY: isScrollable ? 'auto' : 'hidden',
          overflowX: 'hidden',
          padding: '0 16px 24px 16px',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default BottomSheet;
