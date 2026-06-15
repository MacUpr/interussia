import React, { useEffect, useState } from 'react';
import { COLORS, DIRECTION_ICONS } from '../utils/constants';
import type { NavigationPhase } from '../types/index';

// ── Injected keyframes ────────────────────────────────────────
const OVERLAY_KEYFRAMES = `
@keyframes confetti-burst {
  0%   { opacity: 1; transform: translateY(0) scale(1) rotate(0deg); }
  100% { opacity: 0; transform: translateY(-120px) scale(0.4) rotate(360deg); }
}
@keyframes arrived-pop {
  0%   { transform: scale(0); opacity: 0; }
  60%  { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes instruction-slide {
  from { transform: translateY(10px); opacity: 0; }
  to   { transform: translateY(0); opacity: 1; }
}
`;

/** Detect instruction type from instruction text for icon/color. */
function detectType(instruction: string): string {
  const lower = instruction.toLowerCase();
  if (lower.includes('arrived') || lower.includes('destination')) return 'arrived';
  if (lower.includes('u-turn') || lower.includes('u turn')) return 'u_turn';
  if (lower.includes('slight left')) return 'slight_left';
  if (lower.includes('slight right')) return 'slight_right';
  if (lower.includes('turn left') || lower.includes('left')) return 'turn_left';
  if (lower.includes('turn right') || lower.includes('right')) return 'turn_right';
  if (lower.includes('floor') || lower.includes('elevator') || lower.includes('stairs')) return 'floor_change';
  return 'straight';
}

/** Color for instruction type. */
function colorForType(type: string): string {
  switch (type) {
    case 'arrived':
      return COLORS.accentSuccess;
    case 'turn_left':
    case 'turn_right':
    case 'slight_left':
    case 'slight_right':
    case 'u_turn':
      return COLORS.accentWarning;
    default:
      return COLORS.accentPrimary;
  }
}

interface DirectionOverlayProps {
  instruction: string;
  distance: number;
  totalRemaining: number;
  phase: NavigationPhase;
}

/**
 * DirectionOverlay — turn-by-turn HUD overlay for the AR view.
 *
 * Displays the current navigation instruction with a directional icon,
 * distance counters, and a celebration overlay on arrival.
 * Positioned absolutely over the 3D canvas.
 */
const DirectionOverlay: React.FC<DirectionOverlayProps> = ({
  instruction,
  distance,
  totalRemaining,
  phase,
}) => {
  const [instrKey, setInstrKey] = useState(0);

  useEffect(() => {
    const id = 'overlay-keyframes';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = OVERLAY_KEYFRAMES;
      document.head.appendChild(style);
    }
  }, []);

  // Bump key when instruction changes to retrigger slide animation
  useEffect(() => {
    setInstrKey((k) => k + 1);
  }, [instruction]);

  const type = detectType(instruction);
  const icon = DIRECTION_ICONS[type] ?? '⬆️';
  const color = colorForType(type);
  const isArrived = phase === 'arrived';

  // Confetti particles for arrival celebration
  const confetti = isArrived
    ? Array.from({ length: 18 }, (_, i) => ({
        id: i,
        emoji: ['🎉', '✨', '🌟', '💚', '🎯'][i % 5],
        left: 10 + Math.random() * 80,
        delay: Math.random() * 0.6,
        duration: 1.2 + Math.random() * 0.8,
      }))
    : [];

  return (
    <>
      {/* ── Top Instruction Banner ────────────────────────── */}
      <div
        className="hud-overlay hud-top"
        style={{ padding: '16px 16px 0' }}
      >
        <div
          className="glass-card--static"
          style={{
            padding: '18px 22px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            borderLeft: `3px solid ${color}`,
          }}
        >
          {/* Directional icon */}
          <div
            style={{
              fontSize: '2.2rem',
              lineHeight: 1,
              filter: `drop-shadow(0 0 8px ${color})`,
              flexShrink: 0,
            }}
          >
            {icon}
          </div>

          {/* Instruction text — animated on change */}
          <div
            key={instrKey}
            style={{
              flex: 1,
              animation: 'instruction-slide 0.35s ease-out',
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: '1.15rem',
                color: COLORS.textPrimary,
                lineHeight: 1.3,
              }}
            >
              {instruction || 'Calculating route…'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Info Bar ───────────────────────────────── */}
      <div
        className="hud-overlay hud-bottom"
        style={{ padding: '0 16px 16px' }}
      >
        <div
          className="glass-card--static"
          style={{
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', gap: 24 }}>
            <div>
              <div style={{ fontSize: '0.65rem', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Next
              </div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: COLORS.accentPrimary }}>
                {distance.toFixed(1)}m
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Total
              </div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: COLORS.textPrimary }}>
                {totalRemaining.toFixed(1)}m
              </div>
            </div>
          </div>

          <span
            className="badge"
            style={{
              background: isArrived
                ? 'rgba(16,185,129,0.15)'
                : 'rgba(0,255,204,0.12)',
              color: isArrived ? COLORS.accentSuccess : COLORS.accentPrimary,
            }}
          >
            {phase.replace('_', ' ').toUpperCase()}
          </span>
        </div>
      </div>

      {/* ── Arrival Celebration ───────────────────────────── */}
      {isArrived && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 250,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.55)',
            pointerEvents: 'none',
          }}
        >
          {/* Confetti */}
          {confetti.map((c) => (
            <span
              key={c.id}
              style={{
                position: 'absolute',
                left: `${c.left}%`,
                top: '55%',
                fontSize: '1.5rem',
                animation: `confetti-burst ${c.duration}s ease-out ${c.delay}s forwards`,
              }}
            >
              {c.emoji}
            </span>
          ))}

          {/* Checkmark badge */}
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${COLORS.accentSuccess}, ${COLORS.accentPrimary})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.8rem',
              color: '#fff',
              boxShadow: `0 0 50px ${COLORS.accentSuccess}`,
              animation: 'arrived-pop 0.6s ease-out',
            }}
          >
            ✓
          </div>
          <div
            style={{
              marginTop: 20,
              fontSize: '1.5rem',
              fontWeight: 800,
              color: COLORS.textPrimary,
              animation: 'arrived-pop 0.6s ease-out 0.15s both',
            }}
          >
            You've Arrived!
          </div>
        </div>
      )}
    </>
  );
};

export default DirectionOverlay;
