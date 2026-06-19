// ============================================================
// Inmap — 2GIS API Client (Indoor-Focused)
// ============================================================
//
// REST API calls to the 2GIS Catalog (Places) API, scoped to
// Novosibirsk State University.
//
// Used to:
//   1. Search for rooms, departments, and services inside NSU
//   2. Look up NSU building metadata (floors, address, etc.)
//   3. Enrich indoor POIs with 2GIS catalog data
//
// All functions return null on error — never throw.
// ============================================================

import type { PointOfInterest, POICategory } from '../types/index';

// ── Configuration ───────────────────────────────────────────

const API_KEY = import.meta.env.VITE_2GIS_API_KEY as string | undefined;
const CATALOG_BASE = 'https://catalog.api.2gis.com/3.0';

/**
 * NSU Main Building ID in the 2GIS catalog.
 * You can find this by searching on 2gis.ru and extracting the firm/building ID
 * from the URL. This is used to scope searches to within NSU.
 */
const NSU_BUILDING_ID = '141373143530700'; // НГУ — Главный корпус

/** NSU campus center [longitude, latitude]. */
const NSU_CENTER: [number, number] = [83.0886, 54.8478];

/** Search radius around NSU in meters. */
const NSU_SEARCH_RADIUS = 500;

// ── Types ───────────────────────────────────────────────────

/** Raw item from 2GIS catalog API response. */
export interface TwoGISItem {
  id: string;
  name: string;
  full_name?: string;
  address_name?: string;
  purpose_name?: string;
  floor_id?: string;
  building_name?: string;
  type?: string;
  point?: { lat: number; lon: number };
  rubrics?: Array<{ id: string; name: string }>;
  schedule?: {
    Mon?: string;
    Tue?: string;
    Wed?: string;
    Thu?: string;
    Fri?: string;
    Sat?: string;
    Sun?: string;
  };
  contact_groups?: Array<{
    contacts: Array<{
      type: string;
      value: string;
    }>;
  }>;
  reviews?: { rating?: number; count?: number };
}

/** Simplified search result for UI display. */
export interface TwoGISSearchResult {
  /** 2GIS item ID. */
  id: string;
  /** Display name. */
  name: string;
  /** Full address or description. */
  description: string;
  /** Category type for icon mapping. */
  category: string;
  /** Geo coordinates if available. */
  point?: { lat: number; lon: number };
  /** Source marker: always '2gis' for these results. */
  source: '2gis';
}

// ── Category Mapping ────────────────────────────────────────

/** Maps 2GIS rubric keywords to our POICategory values. */
function mapRubricToCategory(rubricName: string): POICategory {
  const lower = rubricName.toLowerCase();
  if (lower.includes('столовая') || lower.includes('кафе') || lower.includes('буфет') || lower.includes('питан')) return 'cafeteria';
  if (lower.includes('библиотек')) return 'services';
  if (lower.includes('аудитория') || lower.includes('лекц') || lower.includes('конференц')) return 'meeting_room';
  if (lower.includes('деканат') || lower.includes('кафедра') || lower.includes('кабинет') || lower.includes('офис')) return 'office';
  if (lower.includes('туалет') || lower.includes('уборн')) return 'restroom';
  if (lower.includes('банкомат') || lower.includes('atm')) return 'atm';
  if (lower.includes('медиц') || lower.includes('здоровь') || lower.includes('медпункт')) return 'health';
  if (lower.includes('магазин') || lower.includes('копир') || lower.includes('печат')) return 'shopping';
  if (lower.includes('вход') || lower.includes('entrance')) return 'entrance';
  if (lower.includes('лифт') || lower.includes('elevator')) return 'elevator';
  if (lower.includes('лестниц') || lower.includes('stairs')) return 'stairs';
  return 'custom';
}

/** Maps a POICategory to an emoji icon. */
function categoryIcon(cat: POICategory): string {
  const icons: Record<string, string> = {
    cafeteria: '🍽️', food: '🍕', meeting_room: '🏫', office: '🏢',
    restroom: '🚻', elevator: '🛗', stairs: '🪜', entrance: '🚪',
    reception: '🛎️', services: '📚', health: '🏥', shopping: '🛍️',
    atm: '💳', custom: '📍', server_room: '🖥️', exit: '🚪',
    emergency_exit: '🚨', info_desk: 'ℹ️', entertainment: '🎭', parking: '🅿️',
  };
  return icons[cat] || '📍';
}

// ── API Functions ───────────────────────────────────────────

/**
 * Search the 2GIS catalog for places at/near NSU.
 *
 * Scoped to a tight radius around the NSU campus. Returns
 * simplified results ready for display in the SearchBar.
 *
 * @param query - User search string (e.g., "библиотека", "деканат ФИТ")
 * @returns Array of search results, or null on error
 *
 * @example
 * ```ts
 * const results = await searchNSU('столовая');
 * // → [{ id: '...', name: 'Столовая НГУ', ... }]
 * ```
 */
export async function searchNSU(query: string): Promise<TwoGISSearchResult[] | null> {
  if (!API_KEY) return null;
  if (!query.trim()) return null;

  try {
    const params = new URLSearchParams({
      q: query,
      key: API_KEY,
      type: 'branch,building',
      fields: 'items.point,items.full_name,items.address_name,items.purpose_name,items.rubrics,items.schedule,items.reviews',
      page_size: '10',
      lon: String(NSU_CENTER[0]),
      lat: String(NSU_CENTER[1]),
      radius: String(NSU_SEARCH_RADIUS),
      locale: 'ru_RU',
    });

    const response = await fetch(`${CATALOG_BASE}/items?${params}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const items: TwoGISItem[] = data.result?.items ?? [];

    return items.map((item) => {
      const rubricName = item.rubrics?.[0]?.name ?? '';
      return {
        id: item.id,
        name: item.name,
        description: item.address_name || item.purpose_name || item.full_name || '',
        category: rubricName,
        point: item.point,
        source: '2gis' as const,
      };
    });
  } catch (err) {
    console.warn('[2GIS] NSU search failed:', err);
    return null;
  }
}

/**
 * Look up a specific item by ID from the 2GIS catalog.
 *
 * @param itemId - 2GIS item ID
 * @returns The item data, or null on error
 */
export async function getItemById(itemId: string): Promise<TwoGISItem | null> {
  if (!API_KEY) return null;

  try {
    const params = new URLSearchParams({
      id: itemId,
      key: API_KEY,
      fields: 'items.point,items.full_name,items.address_name,items.rubrics,items.schedule,items.reviews,items.contact_groups',
    });

    const response = await fetch(`${CATALOG_BASE}/items/byid?${params}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    return (data.result?.items?.[0] as TwoGISItem) ?? null;
  } catch (err) {
    console.warn('[2GIS] Item lookup failed:', err);
    return null;
  }
}

/**
 * Converts a 2GIS search result into a PointOfInterest that can
 * be displayed in the indoor map UI.
 *
 * Since 2GIS results don't map directly to indoor waypoints, the
 * POI is placed at a default position and needs manual waypoint
 * association for routing to work.
 */
export function twogisResultToPOI(
  result: TwoGISSearchResult,
  floorId: string = 'FLOOR_GROUND',
  nearestWaypointId: string = 'G_WP_LOBBY_INT',
): PointOfInterest {
  const cat = mapRubricToCategory(result.category);
  return {
    id: `2gis_${result.id}`,
    name: result.name,
    category: cat,
    position: { x: 10, y: 7 }, // Default position — will be overridden by real mapping
    floorId,
    icon: categoryIcon(cat),
    description: result.description,
    nearestWaypointId,
    floor: 0,
    tags: result.category ? [result.category] : undefined,
  };
}

/**
 * Search NSU and return results merged as PointOfInterest objects.
 * This is a convenience wrapper that combines searchNSU + mapping.
 */
export async function search2GISAsPOIs(query: string): Promise<PointOfInterest[]> {
  const results = await searchNSU(query);
  if (!results) return [];
  return results.map((r) => twogisResultToPOI(r));
}

/**
 * Check whether 2GIS API is available and configured.
 */
export function is2GISApiAvailable(): boolean {
  return Boolean(API_KEY?.trim());
}
