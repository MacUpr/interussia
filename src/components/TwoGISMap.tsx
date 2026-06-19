// ============================================================
// Inmap — 2GIS Outdoor Map Component
// ============================================================
//
// Renders a full-screen 2GIS MapGL map centered on NSU.
// Shows a building marker and a "Go Inside" CTA to switch
// to the indoor FloorPlanCanvas view.
//
// Features:
//   • Lazy-loads the MapGL SDK only when VITE_2GIS_API_KEY is set
//   • Graceful error/loading states with animated overlays
//   • Building marker with label
//   • Optional route polyline overlay (for outdoor directions)
//   • Clean destroy on unmount (no memory leaks)
//
// ============================================================

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { MapglAPI, MapInstance, MarkerInstance, PolylineInstance } from '@2gis/mapgl';
import {
  loadMapGL,
  TWOGIS_API_KEY,
  NSU_MAIN_BUILDING,
  DEFAULT_BUILDING_ZOOM,
} from '../utils/mapgl';
import { COLORS } from '../utils/constants';

// ── Props ───────────────────────────────────────────────────

interface TwoGISMapProps {
  /** Called when the user taps "Go Inside" to switch to indoor view. */
  onEnterBuilding?: () => void;
  /** Whether to show the building marker on the map. */
  showMarker?: boolean;
  /** Override the map center [longitude, latitude]. */
  center?: [number, number];
  /** Override the initial zoom level. */
  zoom?: number;
  /** Optional outdoor route coordinates to draw on the map. */
  routeCoordinates?: [number, number][];
  /** Optional label for the building marker. */
  markerLabel?: string;
}

// ── Styles ──────────────────────────────────────────────────

const styles = {
  wrapper: {
    position: 'relative' as const,
    width: '100%',
    height: '100%',
    overflow: 'hidden' as const,
    background: COLORS.bgPrimary,
  },
  mapContainer: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute' as const,
    inset: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    zIndex: 5,
  },
  loadingOverlay: {
    background: 'rgba(10, 14, 26, 0.85)',
    backdropFilter: 'blur(8px)',
  },
  errorOverlay: {
    background: 'rgba(10, 14, 26, 0.92)',
    backdropFilter: 'blur(8px)',
  },
  spinnerRing: {
    width: 48,
    height: 48,
    border: `3px solid ${COLORS.borderGlass}`,
    borderTopColor: COLORS.accentPrimary,
    borderRadius: '50%',
    animation: 'twogis-spin 0.8s linear infinite',
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: '0.9rem',
    fontFamily: 'var(--font-sans, Inter, sans-serif)',
    letterSpacing: '0.02em',
  },
  errorIcon: {
    fontSize: '2.5rem',
    marginBottom: 4,
  },
  errorText: {
    color: COLORS.accentDanger,
    fontSize: '0.95rem',
    fontFamily: 'var(--font-sans, Inter, sans-serif)',
    textAlign: 'center' as const,
    maxWidth: 280,
    lineHeight: 1.5,
  },
  retryButton: {
    marginTop: 8,
    padding: '10px 24px',
    background: 'rgba(255, 255, 255, 0.06)',
    border: `1px solid ${COLORS.borderGlass}`,
    borderRadius: 10,
    color: COLORS.textPrimary,
    fontSize: '0.85rem',
    fontFamily: 'var(--font-sans, Inter, sans-serif)',
    cursor: 'pointer',
    transition: 'background 200ms ease, border-color 200ms ease',
  },
  enterButton: {
    position: 'absolute' as const,
    bottom: 90,
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '14px 36px',
    background: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: 14,
    fontSize: '1rem',
    fontWeight: 600,
    fontFamily: 'var(--font-sans, Inter, sans-serif)',
    cursor: 'pointer',
    zIndex: 10,
    boxShadow: '0 4px 24px rgba(0, 114, 255, 0.35), 0 0 60px rgba(0, 114, 255, 0.12)',
    letterSpacing: '0.01em',
    transition: 'transform 180ms ease, box-shadow 180ms ease',
    whiteSpace: 'nowrap' as const,
  },
  attribution: {
    position: 'absolute' as const,
    bottom: 8,
    right: 8,
    padding: '4px 10px',
    background: 'rgba(10, 14, 26, 0.65)',
    backdropFilter: 'blur(6px)',
    borderRadius: 6,
    color: COLORS.textMuted,
    fontSize: '0.7rem',
    fontFamily: 'var(--font-sans, Inter, sans-serif)',
    zIndex: 6,
    pointerEvents: 'none' as const,
  },
} as const;

// ── Spinner keyframes (injected once) ───────────────────────

let spinnerInjected = false;
function injectSpinnerKeyframes() {
  if (spinnerInjected) return;
  spinnerInjected = true;
  const sheet = document.createElement('style');
  sheet.textContent = `
    @keyframes twogis-spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(sheet);
}

// ── Component ───────────────────────────────────────────────

/**
 * TwoGISMap — renders the 2GIS outdoor map centered on NSU.
 *
 * Shows a loading spinner while the SDK loads, an error state with
 * retry if loading fails, and a "Go Inside" floating button to switch
 * to the indoor view.
 *
 * Falls back gracefully when `VITE_2GIS_API_KEY` is not set.
 */
const TwoGISMap: React.FC<TwoGISMapProps> = ({
  onEnterBuilding,
  showMarker = true,
  center = NSU_MAIN_BUILDING,
  zoom = DEFAULT_BUILDING_ZOOM,
  routeCoordinates,
  markerLabel = 'НГУ — Главный корпус',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapglAPIRef = useRef<MapglAPI | null>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const markerRef = useRef<MarkerInstance | null>(null);
  const polylineRef = useRef<PolylineInstance | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isHoveringEnter, setIsHoveringEnter] = useState(false);

  // ── Initialize Map ────────────────────────────────────────

  const initMap = useCallback(async () => {
    if (!containerRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      const api = await loadMapGL();
      if (!api) {
        setError('2GIS API key not configured.\nSet VITE_2GIS_API_KEY in .env.local');
        setIsLoading(false);
        return;
      }

      mapglAPIRef.current = api;

      // Create the map
      const map = new api.Map(containerRef.current, {
        center,
        zoom,
        key: TWOGIS_API_KEY!,
        zoomControl: true,
        maxZoom: 20,
        minZoom: 10,
      });

      mapRef.current = map;

      // Add building marker
      if (showMarker) {
        const marker = new api.Marker(map, {
          coordinates: center,
          label: {
            text: markerLabel,
            color: '#00ffcc',
            fontSize: 14,
            offset: [0, -60],
          },
        });
        markerRef.current = marker;
      }

      setIsLoading(false);
    } catch (err) {
      console.error('[TwoGISMap] Initialization failed:', err);
      setError(
        err instanceof Error
          ? `Map load error: ${err.message}`
          : 'Failed to load the 2GIS map. Check your network connection.'
      );
      setIsLoading(false);
    }
  }, [center, zoom, showMarker, markerLabel]);

  // ── Lifecycle ─────────────────────────────────────────────

  useEffect(() => {
    injectSpinnerKeyframes();
    initMap();

    return () => {
      polylineRef.current?.destroy();
      markerRef.current?.destroy();
      mapRef.current?.destroy();
      polylineRef.current = null;
      markerRef.current = null;
      mapRef.current = null;
      mapglAPIRef.current = null;
    };
  }, [initMap]);

  // ── Draw route polyline when routeCoordinates change ──────

  useEffect(() => {
    if (!mapRef.current || !mapglAPIRef.current || !routeCoordinates?.length) {
      polylineRef.current?.destroy();
      polylineRef.current = null;
      return;
    }

    // Remove previous polyline
    polylineRef.current?.destroy();

    polylineRef.current = new mapglAPIRef.current.Polyline(mapRef.current, {
      coordinates: routeCoordinates,
      color: '#00c6ff',
      width: 5,
      zIndex: 5,
    });
  }, [routeCoordinates]);

  // ── Retry handler ─────────────────────────────────────────

  const handleRetry = useCallback(() => {
    polylineRef.current?.destroy();
    markerRef.current?.destroy();
    mapRef.current?.destroy();
    polylineRef.current = null;
    markerRef.current = null;
    mapRef.current = null;
    mapglAPIRef.current = null;
    initMap();
  }, [initMap]);

  // ── Render ────────────────────────────────────────────────

  return (
    <div style={styles.wrapper}>
      {/* Map container — the SDK renders WebGL inside this div */}
      <div ref={containerRef} style={styles.mapContainer} />

      {/* Loading overlay */}
      {isLoading && (
        <div style={{ ...styles.overlay, ...styles.loadingOverlay }}>
          <div style={styles.spinnerRing} />
          <span style={styles.loadingText}>Загрузка карты 2ГИС…</span>
        </div>
      )}

      {/* Error overlay */}
      {error && !isLoading && (
        <div style={{ ...styles.overlay, ...styles.errorOverlay }}>
          <div style={styles.errorIcon}>🗺️</div>
          <p style={styles.errorText}>{error}</p>
          <button
            style={styles.retryButton}
            onClick={handleRetry}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              e.currentTarget.style.borderColor = COLORS.borderGlass;
            }}
          >
            Попробовать снова
          </button>
        </div>
      )}

      {/* "Go Inside" floating action button */}
      {!isLoading && !error && onEnterBuilding && (
        <button
          style={{
            ...styles.enterButton,
            transform: isHoveringEnter
              ? 'translateX(-50%) scale(1.04)'
              : 'translateX(-50%) scale(1)',
            boxShadow: isHoveringEnter
              ? '0 6px 32px rgba(0, 114, 255, 0.45), 0 0 80px rgba(0, 114, 255, 0.18)'
              : styles.enterButton.boxShadow,
          }}
          onClick={onEnterBuilding}
          onMouseEnter={() => setIsHoveringEnter(true)}
          onMouseLeave={() => setIsHoveringEnter(false)}
        >
          🏢 Войти в здание
        </button>
      )}

      {/* Attribution */}
      {!isLoading && !error && (
        <div style={styles.attribution}>
          Powered by 2GIS MapGL
        </div>
      )}
    </div>
  );
};

export default TwoGISMap;
