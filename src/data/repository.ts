// ============================================================
// Inmap — Data Repository
// ============================================================
//
// Single source of truth for app data. Reads from Supabase when
// configured; otherwise returns the bundled local data. Every
// getter is async and NEVER throws — on any remote error it logs
// a warning and falls back to local data, so the app keeps working
// offline and during development without a backend.
// ============================================================

import type { PointOfInterest, QRAnchor, Floor } from '../types/index';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { DESTINATIONS } from './destinations';
import { QR_ANCHORS } from './qrAnchors';
import { ALL_FLOORS } from './building';

// ── DB row shapes (snake_case, see supabase/schema.sql) ─────

interface DestinationRow {
  id: string;
  name: string;
  category: string;
  floor_id: string;
  position_x: number;
  position_y: number;
  icon: string | null;
  description: string | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  review_count: number | null;
  opening_hours: unknown | null;
  tags: string[] | null;
  entrance_note: string | null;
  nearest_waypoint_id: string;
}

interface LocationRow {
  id: string;
  qr_payload: string;
  floor_id: string;
  position_x: number;
  position_y: number;
  orientation_deg: number | null;
  height_from_floor: number | null;
  description: string | null;
}

interface BuildingRow {
  id: string;
  name: string;
  floor_data: Floor[]; // full Floor[] stored as JSONB
}

// ── Row → domain mappers ────────────────────────────────────

function levelForFloor(floorId: string): number {
  return ALL_FLOORS.find((f) => f.id === floorId)?.level ?? 0;
}

function mapDestination(row: DestinationRow): PointOfInterest {
  return {
    id: row.id,
    name: row.name,
    category: row.category as PointOfInterest['category'],
    position: { x: row.position_x, y: row.position_y },
    floorId: row.floor_id,
    icon: row.icon ?? '📍',
    description: row.description ?? undefined,
    nearestWaypointId: row.nearest_waypoint_id,
    phone: row.phone ?? undefined,
    website: row.website ?? undefined,
    rating: row.rating ?? undefined,
    reviewCount: row.review_count ?? undefined,
    openingHours: (row.opening_hours as PointOfInterest['openingHours']) ?? undefined,
    tags: row.tags ?? undefined,
    entranceNote: row.entrance_note ?? undefined,
    floor: levelForFloor(row.floor_id),
  };
}

function mapAnchor(row: LocationRow): QRAnchor {
  return {
    id: row.id,
    qrPayload: row.qr_payload,
    floorId: row.floor_id,
    position: { x: row.position_x, y: row.position_y },
    orientationDeg: row.orientation_deg ?? 0,
    heightFromFloor: row.height_from_floor ?? 1.5,
    description: row.description ?? undefined,
  };
}

// ── Public async getters (always resolve, never throw) ──────

/** All POIs/destinations. Remote when configured, else local. */
export async function getDestinations(): Promise<PointOfInterest[]> {
  if (!isSupabaseConfigured || !supabase) return DESTINATIONS;
  try {
    const { data, error } = await supabase.from('destinations').select('*');
    if (error) throw error;
    if (!data || data.length === 0) return DESTINATIONS;
    return (data as DestinationRow[]).map(mapDestination);
  } catch (err) {
    console.warn('[repository] destinations fetch failed, using local data:', err);
    return DESTINATIONS;
  }
}

/** All QR anchors. Remote when configured, else local. */
export async function getQRAnchors(): Promise<QRAnchor[]> {
  if (!isSupabaseConfigured || !supabase) return QR_ANCHORS;
  try {
    const { data, error } = await supabase.from('locations').select('*');
    if (error) throw error;
    if (!data || data.length === 0) return QR_ANCHORS;
    return (data as LocationRow[]).map(mapAnchor);
  } catch (err) {
    console.warn('[repository] anchors fetch failed, using local data:', err);
    return QR_ANCHORS;
  }
}

/** Full building floor geometry. Remote when configured, else local. */
export async function getFloors(): Promise<Floor[]> {
  if (!isSupabaseConfigured || !supabase) return ALL_FLOORS;
  try {
    const { data, error } = await supabase
      .from('buildings')
      .select('id,name,floor_data')
      .limit(1)
      .single();
    if (error) throw error;
    const building = data as BuildingRow | null;
    if (!building?.floor_data?.length) return ALL_FLOORS;
    return building.floor_data;
  } catch (err) {
    console.warn('[repository] building fetch failed, using local data:', err);
    return ALL_FLOORS;
  }
}
