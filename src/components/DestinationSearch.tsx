import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { COLORS, CATEGORY_ICONS } from '../utils/constants';
import { useNavigationStore } from '../store/navigationStore';
import type { PointOfInterest, POICategory } from '../types/index';

/** All categories for the filter chip row. */
const ALL_CATEGORIES: { key: POICategory | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'meeting_room', label: 'Meeting Room' },
  { key: 'cafeteria', label: 'Cafeteria' },
  { key: 'restroom', label: 'Restroom' },
  { key: 'reception', label: 'Reception' },
  { key: 'office', label: 'Office' },
  { key: 'elevator', label: 'Elevator' },
  { key: 'stairs', label: 'Stairs' },
  { key: 'entrance', label: 'Entrance' },
  { key: 'server_room', label: 'Server Room' },
];

/** Euclidean distance between two 2D points. */
function dist2d(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/**
 * DestinationSearch — searchable POI directory screen.
 *
 * Features a search input with real-time filtering, horizontal category
 * chips, and a scrollable results list. Each result shows icon, name,
 * category badge, estimated distance, and a navigate button.
 */
const DestinationSearch: React.FC = () => {
  const navigate = useNavigate();

  const searchQuery = useNavigationStore((s) => s.searchQuery);
  const setSearchQuery = useNavigationStore((s) => s.setSearchQuery);
  const filteredDestinations = useNavigationStore((s) => s.filteredDestinations);
  const selectDestination = useNavigationStore((s) => s.selectDestination);
  const startNavigation = useNavigationStore((s) => s.startNavigation);
  const currentPosition = useNavigationStore((s) => s.currentPosition);
  const scannedAnchor = useNavigationStore((s) => s.scannedAnchor);

  const [categoryFilter, setCategoryFilter] = React.useState<POICategory | 'all'>('all');

  /** Destinations filtered by both search query (store) and local category chip. */
  const results: PointOfInterest[] = useMemo(() => {
    if (categoryFilter === 'all') return filteredDestinations;
    return filteredDestinations.filter((poi) => poi.category === categoryFilter);
  }, [filteredDestinations, categoryFilter]);

  /** Handle "Navigate" click for a destination. */
  const handleNavigate = (poi: PointOfInterest) => {
    selectDestination(poi);
    startNavigation();
    navigate('/navigate');
  };

  return (
    <div className="page-container animate-fade-in" style={{ gap: 0 }}>
      {/* ── Header ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button
          className="btn btn-ghost"
          style={{ fontSize: '1.3rem', padding: '4px 8px' }}
          onClick={() => navigate('/')}
          aria-label="Back"
        >
          ←
        </button>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>Select Destination</h2>
      </div>

      {/* ── Scanned Anchor Badge ────────────────────────────── */}
      {scannedAnchor && (
        <div
          className="badge"
          style={{
            marginBottom: 14,
            padding: '5px 12px',
            fontSize: '0.72rem',
            alignSelf: 'flex-start',
          }}
        >
          📍 Anchored at: {scannedAnchor.description ?? scannedAnchor.id}
        </div>
      )}

      {/* ── Search Input ────────────────────────────────────── */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <span
          style={{
            position: 'absolute',
            left: 14,
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '1.1rem',
            color: COLORS.textMuted,
            pointerEvents: 'none',
          }}
        >
          🔍
        </span>
        <input
          className="input-field"
          style={{ paddingLeft: 44 }}
          placeholder="Search destinations…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoFocus
        />
      </div>

      {/* ── Category Chips ──────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          paddingBottom: 8,
          marginBottom: 16,
          scrollbarWidth: 'none',
        }}
      >
        {ALL_CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            className={`chip${categoryFilter === cat.key ? ' chip--active' : ''}`}
            onClick={() => setCategoryFilter(cat.key)}
          >
            {cat.key !== 'all' && (
              <span style={{ fontSize: '0.85rem' }}>
                {CATEGORY_ICONS[cat.key] ?? '📍'}
              </span>
            )}
            {cat.label}
          </button>
        ))}
      </div>

      {/* ── Results List ────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {results.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '48px 0',
              color: COLORS.textMuted,
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔎</div>
            <p style={{ fontSize: '0.95rem' }}>No destinations found</p>
            <p style={{ fontSize: '0.8rem', marginTop: 4 }}>Try a different search term or category</p>
          </div>
        )}

        {results.map((poi, idx) => {
          const distance = currentPosition ? dist2d(currentPosition, poi.position) : null;
          return (
            <div
              key={poi.id}
              className="glass-card animate-slide-up"
              style={{
                padding: '16px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                animationDelay: `${idx * 0.04}s`,
                animationFillMode: 'both',
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: 'rgba(0,255,204,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.6rem',
                  flexShrink: 0,
                }}
              >
                {poi.icon}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 3 }}>
                  {poi.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span className="badge">{poi.category.replace(/_/g, ' ')}</span>
                  <span style={{ fontSize: '0.78rem', color: COLORS.textMuted }}>
                    {distance !== null ? `${distance.toFixed(1)}m` : '--'}
                  </span>
                </div>
              </div>

              {/* Navigate button */}
              <button
                className="btn btn-primary"
                style={{ padding: '8px 16px', fontSize: '0.82rem', flexShrink: 0 }}
                onClick={() => handleNavigate(poi)}
              >
                Navigate
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DestinationSearch;
