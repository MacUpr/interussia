// ============================================================
// Inmap v2 — RouteInfoPanel Component
// ============================================================
//
// Turn-by-turn direction panel for the 2D map routing mode.
// Shown inside the bottom sheet when a route is active.
// Displays route summary, highlighted current instruction,
// scrollable step list, and action buttons.
// ============================================================

import React, { useMemo, useRef, useEffect } from 'react';
import type { Waypoint, DirectionInstruction } from '../types/index';
import { COLORS, DIRECTION_ICONS } from '../utils/constants';
import { calculateDirections } from '../engine/directionCalculator';

// ── Props ───────────────────────────────────────────────────

interface RouteInfoPanelProps {
  /** Ordered waypoints from A* pathfinding (start → goal). */
  path: Waypoint[];
  /** Pre-calculated instructions; if empty, will be generated from path. */
  instructions: DirectionInstruction[];
  /** Index of the current path segment (0-based). */
  currentSegment: number;
  /** Distance in meters to the next waypoint. */
  distanceToNext: number;
  /** Total remaining distance in meters. */
  totalRemaining: number;
  /** Display name of the navigation destination. */
  destinationName: string;
  /** Called when user wants to switch to AR view. */
  onStartAR: () => void;
  /** Called when user cancels the route. */
  onCancel: () => void;
}

// ── Constants ───────────────────────────────────────────────

/** Average walking speed in m/s for ETA calculation. */
const WALKING_SPEED_MPS = 1.2;

// ── Helpers ─────────────────────────────────────────────────

/**
 * Formats a distance value into a human-readable string.
 */
function formatDistance(meters: number): string {
  if (meters < 1) return `${Math.round(meters * 100)} cm`;
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

/**
 * Formats seconds into a human-readable time string.
 */
function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (minutes < 60) return secs > 0 ? `${minutes}m ${secs}s` : `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

/**
 * Returns a background gradient color based on direction type.
 * Cyan for straight, amber for turns, green for arrived.
 */
function getInstructionGradient(type: DirectionInstruction['type']): string {
  switch (type) {
    case 'straight':
      return `linear-gradient(135deg, rgba(0, 255, 204, 0.15) 0%, rgba(0, 255, 204, 0.05) 100%)`;
    case 'turn_left':
    case 'turn_right':
    case 'slight_left':
    case 'slight_right':
    case 'u_turn':
      return `linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.05) 100%)`;
    case 'arrived':
      return `linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.05) 100%)`;
    case 'floor_change':
      return `linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(99, 102, 241, 0.05) 100%)`;
    default:
      return `linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)`;
  }
}

/**
 * Returns the accent color for a given direction type.
 */
function getInstructionAccent(type: DirectionInstruction['type']): string {
  switch (type) {
    case 'straight':
      return COLORS.accentPrimary;
    case 'turn_left':
    case 'turn_right':
    case 'slight_left':
    case 'slight_right':
    case 'u_turn':
      return COLORS.accentWarning;
    case 'arrived':
      return COLORS.accentSuccess;
    case 'floor_change':
      return COLORS.accentSecondary;
    default:
      return COLORS.textSecondary;
  }
}

// ── Component ───────────────────────────────────────────────

/**
 * RouteInfoPanel — turn-by-turn direction panel.
 *
 * Shows a route summary header, highlighted current instruction card,
 * scrollable step list with past/current/future state styling,
 * and action buttons for AR view and cancellation.
 *
 * When the last instruction is 'arrived', displays a celebration
 * state with a 'Done' button.
 */
const RouteInfoPanel: React.FC<RouteInfoPanelProps> = ({
  path,
  instructions: propsInstructions,
  currentSegment,
  distanceToNext,
  totalRemaining,
  destinationName,
  onStartAR,
  onCancel,
}) => {
  const stepListRef = useRef<HTMLDivElement>(null);

  // Use provided instructions, or calculate from path
  const instructions = useMemo(() => {
    if (propsInstructions.length > 0) return propsInstructions;
    return calculateDirections(path);
  }, [propsInstructions, path]);

  // Determine if user has arrived
  const hasArrived = instructions.length > 0 &&
    instructions[instructions.length - 1].type === 'arrived' &&
    currentSegment >= instructions.length - 1;

  // Current instruction (clamped to valid range)
  const currentIdx = Math.min(currentSegment, instructions.length - 1);
  const current = instructions[currentIdx] ?? null;

  // Estimated time for remaining distance
  const etaSeconds = totalRemaining / WALKING_SPEED_MPS;

  // Auto-scroll to current step in the list
  useEffect(() => {
    if (stepListRef.current) {
      const activeEl = stepListRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [currentSegment]);

  // ── Arrived Celebration State ─────────────────────────────
  if (hasArrived) {
    return (
      <div
        style={{
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          animation: 'slide-up 0.4s ease-out',
        }}
      >
        {/* Celebration icon */}
        <div
          style={{
            fontSize: '3rem',
            animation: 'float-bob 2s ease-in-out infinite',
          }}
        >
          🎯
        </div>

        {/* Arrived text */}
        <div style={{ textAlign: 'center' }}>
          <h3
            style={{
              fontSize: '1.3rem',
              fontWeight: 800,
              color: COLORS.accentSuccess,
              marginBottom: 4,
            }}
          >
            You have arrived!
          </h3>
          <p
            style={{
              fontSize: '0.85rem',
              color: COLORS.textSecondary,
            }}
          >
            {destinationName}
          </p>
        </div>

        {/* Glow ring */}
        <div
          style={{
            width: 80,
            height: 4,
            borderRadius: 2,
            background: `linear-gradient(90deg, transparent, ${COLORS.accentSuccess}, transparent)`,
            opacity: 0.5,
          }}
        />

        {/* Done button */}
        <button
          className="btn btn-primary"
          style={{
            width: '100%',
            maxWidth: 280,
            background: `linear-gradient(135deg, ${COLORS.accentSuccess} 0%, #059669 100%)`,
          }}
          onClick={onCancel}
        >
          ✓ Done
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '12px 0 16px 0',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        animation: 'slide-up 0.3s ease-out',
      }}
    >
      {/* ── Route Summary Header ─────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '1.1rem' }}>🎯</span>
          <div>
            <h3
              style={{
                fontSize: '0.95rem',
                fontWeight: 700,
                color: COLORS.textPrimary,
                lineHeight: 1.2,
              }}
            >
              {destinationName}
            </h3>
            <p
              style={{
                fontSize: '0.72rem',
                color: COLORS.textMuted,
                marginTop: 1,
              }}
            >
              {formatDistance(totalRemaining)} · ~{formatTime(etaSeconds)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Current Instruction Card ─────────────────────────── */}
      {current && (
        <div
          style={{
            margin: '0 16px',
            padding: '14px 16px',
            background: getInstructionGradient(current.type),
            border: `1px solid ${getInstructionAccent(current.type)}40`,
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            boxShadow: `0 0 16px ${getInstructionAccent(current.type)}15`,
            transition: 'all 300ms ease',
          }}
        >
          {/* Direction icon */}
          <span
            style={{
              fontSize: '1.8rem',
              width: 44,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255, 255, 255, 0.06)',
              borderRadius: 10,
              flexShrink: 0,
            }}
          >
            {current.icon || DIRECTION_ICONS[current.type] || '⬆️'}
          </span>

          {/* Instruction text + distance */}
          <div style={{ flex: 1 }}>
            <p
              style={{
                fontSize: '0.95rem',
                fontWeight: 700,
                color: COLORS.textPrimary,
                lineHeight: 1.3,
              }}
            >
              {current.text}
            </p>
            {distanceToNext > 0 && (
              <p
                style={{
                  fontSize: '0.75rem',
                  color: getInstructionAccent(current.type),
                  fontWeight: 600,
                  marginTop: 2,
                }}
              >
                in {formatDistance(distanceToNext)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Step List ────────────────────────────────────────── */}
      {instructions.length > 1 && (
        <div
          ref={stepListRef}
          style={{
            maxHeight: 200,
            overflowY: 'auto',
            padding: '0 16px',
          }}
        >
          {instructions.map((step, idx) => {
            const isPast = idx < currentIdx;
            const isCurrent = idx === currentIdx;
            const isFuture = idx > currentIdx;

            return (
              <div
                key={`${step.waypointId}-${idx}`}
                data-active={isCurrent ? 'true' : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 10,
                  marginBottom: 2,
                  opacity: isPast ? 0.4 : 1,
                  background: isCurrent ? 'rgba(0, 255, 204, 0.06)' : 'transparent',
                  borderLeft: isCurrent
                    ? `3px solid ${COLORS.accentPrimary}`
                    : '3px solid transparent',
                  transition: 'all 200ms ease',
                }}
              >
                {/* Step icon */}
                <span
                  style={{
                    fontSize: '1rem',
                    width: 24,
                    textAlign: 'center',
                    flexShrink: 0,
                    opacity: isPast ? 0.5 : 1,
                    filter: isPast ? 'grayscale(0.8)' : 'none',
                  }}
                >
                  {step.icon || DIRECTION_ICONS[step.type] || '⬆️'}
                </span>

                {/* Step text */}
                <p
                  style={{
                    flex: 1,
                    fontSize: '0.8rem',
                    color: isCurrent
                      ? COLORS.textPrimary
                      : isPast
                        ? COLORS.textMuted
                        : COLORS.textSecondary,
                    fontWeight: isCurrent ? 600 : 400,
                    lineHeight: 1.3,
                  }}
                >
                  {step.text}
                </p>

                {/* Distance */}
                {step.distanceMeters > 0 && (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      color: COLORS.textMuted,
                      flexShrink: 0,
                      fontWeight: 500,
                    }}
                  >
                    {formatDistance(step.distanceMeters)}
                  </span>
                )}

                {/* Checkmark for past steps */}
                {isPast && (
                  <span style={{ fontSize: '0.7rem', color: COLORS.accentSuccess, flexShrink: 0 }}>
                    ✓
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Action Buttons ───────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          padding: '4px 16px 0 16px',
        }}
      >
        {/* Open AR View */}
        <button
          className="btn"
          onClick={onStartAR}
          style={{
            flex: 2,
            background: 'linear-gradient(135deg, #00ffcc 0%, #6366f1 100%)',
            color: COLORS.bgPrimary,
            fontWeight: 700,
            fontSize: '0.9rem',
            padding: '12px 16px',
            borderRadius: 12,
            boxShadow: '0 0 20px rgba(0, 255, 204, 0.15), 0 4px 12px rgba(0, 0, 0, 0.3)',
          }}
        >
          <span style={{ fontSize: '1.1rem' }}>🔮</span>
          Open AR View
        </button>

        {/* Cancel Route */}
        <button
          className="btn btn-danger"
          onClick={onCancel}
          style={{
            flex: 1,
            fontSize: '0.85rem',
            padding: '12px 12px',
            borderRadius: 12,
          }}
        >
          ✕ Cancel
        </button>
      </div>
    </div>
  );
};

export default RouteInfoPanel;
