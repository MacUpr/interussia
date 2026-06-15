import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { COLORS, CATEGORY_ICONS } from '../utils/constants';

// ── Inline keyframes injected once ────────────────────────────
const DASHBOARD_KEYFRAMES = `
@keyframes radar-ping {
  0%   { transform: scale(0.3); opacity: 0.9; }
  100% { transform: scale(1.8); opacity: 0; }
}
@keyframes radar-rotate {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes hero-gradient-shift {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
@keyframes entrance-fade-up {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;

/** Quick-access popular destinations shown on the Dashboard. */
const POPULAR_DESTINATIONS = [
  { id: 'poi_reception', name: 'Reception', category: 'reception', icon: '🛎️', route: '/search?dest=poi_reception' },
  { id: 'poi_cafe', name: 'Cafeteria', category: 'cafeteria', icon: '☕', route: '/search?dest=poi_cafe' },
  { id: 'poi_mr_alpha', name: 'Meeting Room A', category: 'meeting_room', icon: '🏢', route: '/search?dest=poi_mr_alpha' },
  { id: 'poi_restroom', name: 'Restrooms', category: 'restroom', icon: '🚻', route: '/search?dest=poi_restroom' },
];

/**
 * Dashboard — main landing screen.
 *
 * Features a bold INMAP branding hero, animated radar decoration,
 * primary CTA to scan a QR anchor, secondary CTA to search destinations,
 * quick-access popular destination cards, and a simulation-mode badge.
 */
const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Inject keyframes stylesheet once
    const id = 'dashboard-keyframes';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = DASHBOARD_KEYFRAMES;
      document.head.appendChild(style);
    }
    // Trigger entrance animations after mount
    requestAnimationFrame(() => setMounted(true));
  }, []);

  return (
    <div className="page-container" style={{ alignItems: 'center', gap: 0, paddingTop: 48, paddingBottom: 32 }}>
      {/* ── Branding ──────────────────────────────────────────── */}
      <div
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(24px)',
          transition: 'all 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
          textAlign: 'center',
          marginBottom: 8,
        }}
      >
        <h1
          style={{
            fontSize: '3.5rem',
            fontWeight: 900,
            letterSpacing: '-0.04em',
            lineHeight: 1.1,
            background: 'linear-gradient(135deg, #00ffcc 0%, #6366f1 50%, #00ffcc 100%)',
            backgroundSize: '200% 200%',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            animation: 'hero-gradient-shift 4s ease infinite',
          }}
        >
          INMAP
        </h1>
        <p
          style={{
            color: COLORS.textSecondary,
            fontSize: '0.95rem',
            marginTop: 6,
            letterSpacing: '0.02em',
          }}
        >
          Navigate Indoors with AR Precision
        </p>
      </div>

      {/* ── Radar Decoration ──────────────────────────────────── */}
      <div
        style={{
          opacity: mounted ? 1 : 0,
          transition: 'opacity 0.8s ease 0.2s',
          position: 'relative',
          width: 180,
          height: 180,
          margin: '28px 0 36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Concentric rings */}
        {[1, 0.7, 0.4].map((scale, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: 160 * scale,
              height: 160 * scale,
              borderRadius: '50%',
              border: `1.5px solid rgba(0,255,204,${0.12 + i * 0.06})`,
            }}
          />
        ))}
        {/* Pulsing ping rings */}
        {[0, 1, 2].map((i) => (
          <div
            key={`ping-${i}`}
            style={{
              position: 'absolute',
              width: 160,
              height: 160,
              borderRadius: '50%',
              border: '2px solid rgba(0,255,204,0.35)',
              animation: `radar-ping 3s ease-out ${i * 1}s infinite`,
            }}
          />
        ))}
        {/* Sweep hand */}
        <div
          style={{
            position: 'absolute',
            width: 80,
            height: 2,
            background: 'linear-gradient(90deg, transparent 0%, rgba(0,255,204,0.7) 100%)',
            transformOrigin: '0% 50%',
            animation: 'radar-rotate 4s linear infinite',
          }}
        />
        {/* Center dot */}
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: COLORS.accentPrimary,
            boxShadow: `0 0 16px ${COLORS.accentPrimary}, 0 0 40px rgba(0,255,204,0.3)`,
            zIndex: 2,
          }}
        />
      </div>

      {/* ── Primary CTA ───────────────────────────────────────── */}
      <div
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.25s',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <button
          className="btn btn-primary btn-lg animate-pulse-glow gradient-border"
          style={{ width: '100%', maxWidth: 380, fontSize: '1.05rem' }}
          onClick={() => navigate('/scan')}
        >
          <span style={{ fontSize: '1.3rem' }}>📷</span>
          Scan QR Code to Start Navigation
        </button>

        <button
          className="btn btn-secondary"
          style={{ fontSize: '0.9rem' }}
          onClick={() => navigate('/search')}
        >
          Or choose a destination
        </button>
      </div>

      {/* ── Popular Destinations ──────────────────────────────── */}
      <div
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.45s',
          width: '100%',
          marginTop: 40,
        }}
      >
        <h3
          style={{
            fontSize: '0.8rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: COLORS.textMuted,
            marginBottom: 14,
          }}
        >
          Popular Destinations
        </h3>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 12,
          }}
        >
          {POPULAR_DESTINATIONS.map((dest) => (
            <button
              key={dest.id}
              className="glass-card"
              style={{
                padding: '18px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 6,
                textAlign: 'left',
                cursor: 'pointer',
              }}
              onClick={() => navigate(dest.route)}
            >
              <span style={{ fontSize: '1.8rem', lineHeight: 1 }}>{dest.icon}</span>
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{dest.name}</span>
              <span className="badge">{dest.category.replace('_', ' ')}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Simulation Mode Badge ─────────────────────────────── */}
      <div
        style={{
          opacity: mounted ? 1 : 0,
          transition: 'opacity 0.6s ease 0.6s',
          marginTop: 'auto',
          paddingTop: 32,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div
          className="badge"
          style={{
            background: 'rgba(245, 158, 11, 0.12)',
            color: COLORS.accentWarning,
            padding: '4px 14px',
            fontSize: '0.7rem',
          }}
        >
          ⚡ Simulation Mode
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
