// ============================================================
// Inmap v2 — FloorSwitcher Component
// ============================================================
//
// Vertical floor selector docked to right side of the map.
// Displays floors in descending order (highest first) with
// glassmorphism styling and scale-pop animation on selection.
// ============================================================

import React, { useState, useEffect } from 'react';
import type { Floor } from '../types/index';
import { COLORS } from '../utils/constants';

// ── Props ───────────────────────────────────────────────────

interface FloorSwitcherProps {
  /** All available floors to display. */
  floors: Floor[];
  /** The currently active floor level number. */
  activeLevel: number;
  /** Callback when the user selects a different floor. */
  onFloorChange: (level: number) => void;
}

// ── Styles ──────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  position: 'absolute',
  right: 16,
  top: '50%',
  transform: 'translateY(-50%)',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  padding: 6,
  background: COLORS.bgGlass,
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: `1px solid ${COLORS.borderGlass}`,
  borderRadius: 12,
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
  zIndex: 50,
  animation: 'slide-in-right 0.35s ease-out',
};

const buttonBaseStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 8,
  border: 'none',
  cursor: 'pointer',
  fontSize: '0.8rem',
  fontWeight: 700,
  fontFamily: 'var(--font-sans)',
  transition: 'all 200ms ease',
  position: 'relative',
  outline: 'none',
};

// ── Helpers ─────────────────────────────────────────────────

/**
 * Returns the display label for a given floor level.
 * Level 0 → 'G' (Ground), negative levels → 'B1', 'B2', etc.
 * Positive levels → their number.
 */
function getFloorLabel(level: number): string {
  if (level === 0) return 'G';
  if (level < 0) return `B${Math.abs(level)}`;
  return String(level);
}

// ── Component ───────────────────────────────────────────────

/**
 * FloorSwitcher — vertical floor selector for 2D map view.
 *
 * Renders a compact column of floor buttons ordered from highest
 * to lowest. The active floor gets a filled accent background with
 * a subtle scale-pop animation on change.
 */
const FloorSwitcher: React.FC<FloorSwitcherProps> = ({
  floors,
  activeLevel,
  onFloorChange,
}) => {
  /** Track which button just became active to trigger the pop animation. */
  const [poppingLevel, setPoppingLevel] = useState<number | null>(null);
  const [hoveredLevel, setHoveredLevel] = useState<number | null>(null);

  // Sort floors descending by level (highest floor at top)
  const sortedFloors = [...floors].sort((a, b) => b.level - a.level);

  // Trigger pop animation on active floor change
  useEffect(() => {
    setPoppingLevel(activeLevel);
    const timer = setTimeout(() => setPoppingLevel(null), 300);
    return () => clearTimeout(timer);
  }, [activeLevel]);

  /**
   * Builds the inline style for a floor button based on its
   * active, hovered, and popping state.
   */
  const getButtonStyle = (level: number): React.CSSProperties => {
    const isActive = level === activeLevel;
    const isHovered = level === hoveredLevel;
    const isPopping = level === poppingLevel;

    return {
      ...buttonBaseStyle,
      background: isActive
        ? COLORS.accentPrimary
        : isHovered
          ? 'rgba(255, 255, 255, 0.1)'
          : 'rgba(255, 255, 255, 0.04)',
      color: isActive
        ? COLORS.bgPrimary
        : isHovered
          ? COLORS.textPrimary
          : COLORS.textMuted,
      transform: isPopping && isActive ? 'scale(1.15)' : 'scale(1)',
      boxShadow: isActive
        ? `0 0 12px rgba(0, 255, 204, 0.3), 0 2px 6px rgba(0, 0, 0, 0.3)`
        : 'none',
    };
  };

  return (
    <div style={containerStyle} className="no-select">
      {sortedFloors.map((floor) => (
        <button
          key={floor.id}
          style={getButtonStyle(floor.level)}
          onClick={() => onFloorChange(floor.level)}
          onMouseEnter={() => setHoveredLevel(floor.level)}
          onMouseLeave={() => setHoveredLevel(null)}
          title={floor.name}
          aria-label={`Switch to ${floor.name}`}
          aria-pressed={floor.level === activeLevel}
        >
          {getFloorLabel(floor.level)}
        </button>
      ))}
    </div>
  );
};

export default FloorSwitcher;
