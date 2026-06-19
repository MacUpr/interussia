// ============================================================
// Inmap v2 — Zustand Navigation Store (2GIS-style)
// ============================================================
//
// Extends the v1 navigation store with 2D map state:
//   - selectedPOI / bottom sheet management
//   - Floor switching
//   - Category filtering
//   - Map vs AR view toggle
// ============================================================

import { create } from 'zustand';
import type {
  NavigationPhase,
  QRAnchor,
  PointOfInterest,
  Waypoint,
  BottomSheetState,
  MapViewState,
  POICategory,
} from '../types/index';
import { NavigationEngine } from '../engine/navigationEngine';
import { ALL_FLOORS, getFloorByLevel, getFloorById } from '../data/building';
import { findAnchorByPayload } from '../data/qrAnchors';
import {
  DESTINATIONS,
  searchDestinations,
  getDestinationsByCategory,
  getDestinationsByFloor,
} from '../data/destinations';

// ── Store Interface ─────────────────────────────────────────

export interface NavigationStore {
  // ── Navigation state (v1 — kept) ──
  phase: NavigationPhase;
  currentPosition: { x: number; y: number } | null;
  currentFloor: string | null;
  scannedAnchor: QRAnchor | null;
  selectedDestination: PointOfInterest | null;
  calculatedPath: Waypoint[] | null;
  currentPathSegment: number;
  currentInstruction: string;
  distanceToNext: number;
  totalDistanceRemaining: number;
  searchQuery: string;
  filteredDestinations: PointOfInterest[];

  // ── Map state (v2 — 2GIS-style) ──
  selectedPOI: PointOfInterest | null;
  currentFloorIndex: number;
  bottomSheetState: BottomSheetState;
  mapViewState: MapViewState;
  categoryFilter: POICategory | null;
  viewMode: 'map' | 'ar';

  // ── Navigation actions (v1) ──
  scanQRCode: (qrPayload: string) => boolean;
  selectDestination: (poi: PointOfInterest) => boolean;
  startNavigation: () => void;
  updatePosition: (x: number, y: number) => void;
  cancelNavigation: () => void;
  setSearchQuery: (query: string) => void;
  reset: () => void;

  // ── Map actions (v2) ──
  selectPOI: (poi: PointOfInterest) => void;
  clearPOI: () => void;
  setFloor: (level: number) => void;
  setBottomSheet: (state: BottomSheetState) => void;
  setCategoryFilter: (cat: POICategory | null) => void;
  toggleViewMode: () => void;
  navigateToPOI: (poi: PointOfInterest) => void;
}

// ── Engine Instance ─────────────────────────────────────────

let engine = new NavigationEngine();

// ── Internal helpers ────────────────────────────────────────

/**
 * Filters destinations combining: search query + category filter + active floor.
 */
function computeFilteredDestinations(
  query: string,
  category: POICategory | null,
  floorLevel: number,
): PointOfInterest[] {
  const hasQuery = query.trim().length > 0;

  // Start with search-filtered list
  let results = hasQuery ? searchDestinations(query) : [...DESTINATIONS];

  // Floor scoping:
  //  - When BROWSING (no query), scope the list to the active floor so the
  //    list and the visible map stay in sync.
  //  - When SEARCHING, return matches across ALL floors. Each result carries
  //    a floor badge in the SearchBar, and selecting one switches floors.
  if (!hasQuery) {
    const floor = getFloorByLevel(floorLevel);
    if (floor) {
      results = results.filter((d) => d.floorId === floor.id);
    }
  }

  // Filter by category (always applies)
  if (category) {
    results = results.filter((d) => d.category === category);
  }

  // When searching across floors, surface current-floor matches first, then
  // order by floor level, then alphabetically — so nearby results lead.
  if (hasQuery) {
    const activeFloorId = getFloorByLevel(floorLevel)?.id;
    results = [...results].sort((a, b) => {
      const aCurrent = a.floorId === activeFloorId ? 0 : 1;
      const bCurrent = b.floorId === activeFloorId ? 0 : 1;
      if (aCurrent !== bCurrent) return aCurrent - bCurrent;

      const aLevel = floorIdToLevel(a.floorId);
      const bLevel = floorIdToLevel(b.floorId);
      if (aLevel !== bLevel) return aLevel - bLevel;

      return a.name.localeCompare(b.name);
    });
  }

  return results;
}

/**
 * Resolves floor level from floor ID string.
 */
function floorIdToLevel(floorId: string): number {
  const floor = getFloorById(floorId);
  return floor ? floor.level : 0;
}

// ── Store Creation ──────────────────────────────────────────

export const useNavigationStore = create<NavigationStore>((set, get) => ({
  // ── Initial State ──
  phase: 'idle',
  currentPosition: null,
  currentFloor: null,
  scannedAnchor: null,
  selectedDestination: null,
  calculatedPath: null,
  currentPathSegment: 0,
  currentInstruction: '',
  distanceToNext: 0,
  totalDistanceRemaining: 0,
  searchQuery: '',
  filteredDestinations: getDestinationsByFloor('FLOOR_GROUND'),

  // v2 map state
  selectedPOI: null,
  currentFloorIndex: 0,
  bottomSheetState: 'hidden',
  mapViewState: 'browsing',
  categoryFilter: null,
  viewMode: 'map',

  // ── Navigation Actions (v1 — updated for v2 integration) ──

  scanQRCode: (qrPayload: string): boolean => {
    const anchor = findAnchorByPayload(qrPayload);
    if (!anchor) return false;

    engine.initialize(anchor);
    const state = engine.getState();
    const floorLevel = floorIdToLevel(anchor.floorId);

    set({
      phase: state.phase,
      currentPosition: { x: anchor.position.x, y: anchor.position.y },
      currentFloor: anchor.floorId,
      scannedAnchor: anchor,
      currentInstruction: state.currentInstruction,
      currentFloorIndex: floorLevel,
      // Reset destination-related state
      selectedDestination: null,
      calculatedPath: null,
      currentPathSegment: 0,
      distanceToNext: 0,
      totalDistanceRemaining: 0,
      searchQuery: '',
      filteredDestinations: computeFilteredDestinations('', null, floorLevel),
      // Keep map in browsing mode
      mapViewState: 'browsing',
      bottomSheetState: 'hidden',
      selectedPOI: null,
      categoryFilter: null,
    });

    return true;
  },

  selectDestination: (poi: PointOfInterest): boolean => {
    const floor = getFloorById(poi.floorId);
    if (!floor) return false;

    const path = engine.selectDestination(poi, floor);
    if (!path) {
      const state = engine.getState();
      set({ currentInstruction: state.currentInstruction });
      return false;
    }

    const state = engine.getState();

    set({
      phase: state.phase,
      selectedDestination: poi,
      calculatedPath: path,
      currentPathSegment: state.currentPathSegment,
      currentInstruction: state.currentInstruction,
      distanceToNext: state.distanceToNext,
      totalDistanceRemaining: state.totalDistanceRemaining,
    });

    return true;
  },

  startNavigation: (): void => {
    const current = get();
    if (current.calculatedPath) {
      set({
        phase: 'navigating',
        mapViewState: 'navigating',
      });
    }
  },

  updatePosition: (x: number, y: number): void => {
    const current = get();
    if (current.phase !== 'navigating') return;

    const update = engine.updatePosition(x, y);

    set({
      currentPosition: { x, y },
      currentPathSegment: update.segmentIndex,
      currentInstruction: update.instruction.text,
      distanceToNext: update.distanceToNext,
      totalDistanceRemaining: update.totalRemaining,
      phase: update.arrived ? 'arrived' : 'navigating',
      mapViewState: update.arrived ? 'browsing' : 'navigating',
    });
  },

  cancelNavigation: (): void => {
    const { scannedAnchor, currentFloorIndex, searchQuery, categoryFilter } = get();

    if (scannedAnchor) {
      engine.reset();
      engine.initialize(scannedAnchor);

      set({
        phase: 'selecting_destination',
        selectedDestination: null,
        calculatedPath: null,
        currentPathSegment: 0,
        currentInstruction: 'Select a destination to begin navigation',
        distanceToNext: 0,
        totalDistanceRemaining: 0,
        mapViewState: 'browsing',
        bottomSheetState: 'hidden',
        selectedPOI: null,
        filteredDestinations: computeFilteredDestinations(searchQuery, categoryFilter, currentFloorIndex),
      });
    } else {
      get().reset();
    }
  },

  setSearchQuery: (query: string): void => {
    const { categoryFilter, currentFloorIndex } = get();
    set({
      searchQuery: query,
      filteredDestinations: computeFilteredDestinations(query, categoryFilter, currentFloorIndex),
    });
  },

  reset: (): void => {
    engine.reset();
    engine = new NavigationEngine();

    set({
      phase: 'idle',
      currentPosition: null,
      currentFloor: null,
      scannedAnchor: null,
      selectedDestination: null,
      calculatedPath: null,
      currentPathSegment: 0,
      currentInstruction: '',
      distanceToNext: 0,
      totalDistanceRemaining: 0,
      searchQuery: '',
      filteredDestinations: getDestinationsByFloor('FLOOR_GROUND'),
      // v2 state
      selectedPOI: null,
      currentFloorIndex: 0,
      bottomSheetState: 'hidden',
      mapViewState: 'browsing',
      categoryFilter: null,
      viewMode: 'map',
    });
  },

  // ── Map Actions (v2) ──────────────────────────────────────

  selectPOI: (poi: PointOfInterest): void => {
    set({
      selectedPOI: poi,
      bottomSheetState: 'collapsed',
      mapViewState: 'poi_selected',
    });
  },

  clearPOI: (): void => {
    set({
      selectedPOI: null,
      bottomSheetState: 'hidden',
      mapViewState: 'browsing',
    });
  },

  setFloor: (level: number): void => {
    const { searchQuery, categoryFilter } = get();
    set({
      currentFloorIndex: level,
      filteredDestinations: computeFilteredDestinations(searchQuery, categoryFilter, level),
      // Clear POI selection when changing floors
      selectedPOI: null,
      bottomSheetState: 'hidden',
      mapViewState: 'browsing',
    });
  },

  setBottomSheet: (state: BottomSheetState): void => {
    set({ bottomSheetState: state });
    if (state === 'hidden') {
      set({ selectedPOI: null, mapViewState: 'browsing' });
    }
  },

  setCategoryFilter: (cat: POICategory | null): void => {
    const { searchQuery, currentFloorIndex } = get();
    set({
      categoryFilter: cat,
      filteredDestinations: computeFilteredDestinations(searchQuery, cat, currentFloorIndex),
    });
  },

  toggleViewMode: (): void => {
    const current = get().viewMode;
    set({ viewMode: current === 'map' ? 'ar' : 'map' });
  },

  navigateToPOI: (poi: PointOfInterest): void => {
    const store = get();
    const floor = getFloorById(poi.floorId);
    if (!floor) return;

    // If no anchor scanned yet, we can't compute a path
    if (!store.scannedAnchor) {
      set({
        selectedPOI: poi,
        selectedDestination: poi,
        bottomSheetState: 'collapsed',
        mapViewState: 'poi_selected',
        currentInstruction: 'Scan a QR code first to set your position',
      });
      return;
    }

    // Compute path
    const success = store.selectDestination(poi);
    if (success) {
      store.startNavigation();
      set({
        selectedPOI: poi,
        bottomSheetState: 'collapsed',
        mapViewState: 'routing',
      });
    }
  },
}));
