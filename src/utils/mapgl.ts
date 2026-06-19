// ============================================================
// Inmap — 2GIS MapGL SDK Loader & Configuration
// ============================================================
//
// Lazy-loads the 2GIS MapGL JS API and caches the reference.
// Also exports NSU geo-coordinates and helper constants.
//
// The SDK is only loaded when VITE_2GIS_API_KEY is set.
// Without it, all exports degrade gracefully (null / false).
// ============================================================

import { load } from '@2gis/mapgl';
import type { MapglAPI } from '@2gis/mapgl';

// ── Configuration ───────────────────────────────────────────

/** 2GIS MapGL API key from environment. Undefined when not configured. */
export const TWOGIS_API_KEY = import.meta.env.VITE_2GIS_API_KEY as string | undefined;

/** `true` only when a valid API key is present. */
export const is2GISConfigured = Boolean(TWOGIS_API_KEY?.trim());

// ── NSU Building Coordinates ────────────────────────────────
//
// 2GIS uses [longitude, latitude] order (the same as GeoJSON).
// Новосибирский государственный университет — Главный корпус
// Адрес: ул. Пирогова, 1, Новосибирск, 630090
//

/** NSU Main Building center [lng, lat]. */
export const NSU_MAIN_BUILDING: [number, number] = [83.0886, 54.8478];

/** NSU Main Building entrance (south side, facing ул. Пирогова). */
export const NSU_ENTRANCE: [number, number] = [83.0890, 54.8472];

/** Default zoom level for the building-level view. */
export const DEFAULT_BUILDING_ZOOM = 17;

/** Default zoom level for the campus-level view. */
export const DEFAULT_CAMPUS_ZOOM = 15;

// ── SDK Loader (Singleton) ──────────────────────────────────

let cachedPromise: Promise<MapglAPI> | null = null;

/**
 * Lazily loads the 2GIS MapGL API (singleton — subsequent calls
 * return the same cached promise).
 *
 * Returns `null` immediately if `VITE_2GIS_API_KEY` is not set,
 * so callers can gate on `is2GISConfigured` first.
 *
 * @example
 * ```ts
 * const api = await loadMapGL();
 * if (!api) return; // 2GIS not configured
 * const map = new api.Map(container, { ... });
 * ```
 */
export async function loadMapGL(): Promise<MapglAPI | null> {
  if (!is2GISConfigured) {
    console.warn('[2GIS] VITE_2GIS_API_KEY is not set — MapGL will not load.');
    return null;
  }

  if (!cachedPromise) {
    cachedPromise = load();
  }

  try {
    return await cachedPromise;
  } catch (err) {
    console.error('[2GIS] Failed to load MapGL SDK:', err);
    cachedPromise = null; // allow retry on next call
    return null;
  }
}
