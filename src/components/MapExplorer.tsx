// ============================================================
// Inmap v2 — MapExplorer Component
// ============================================================
//
// Main home screen that composes all 2GIS-style map components.
// Orchestrates FloorPlanCanvas, SearchBar, FloorSwitcher,
// BottomSheet, POIDetailCard, and RouteInfoPanel into a
// cohesive map browsing and navigation experience.
// ============================================================

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  PointOfInterest,
  POICategory,
  DirectionInstruction,
  MapViewState,
  BottomSheetState,
} from '../types/index';
import { useNavigationStore } from '../store/navigationStore';
import { COLORS } from '../utils/constants';
import { ALL_FLOORS, GROUND_FLOOR, getFloorByLevel } from '../data/building';
import { searchDestinations, getDestinationsByFloor } from '../data/destinations';
import { calculateDirections } from '../engine/directionCalculator';

// ── Component Imports ───────────────────────────────────────

import FloorSwitcher from './FloorSwitcher';
import SearchBar from './SearchBar';
import RouteInfoPanel from './RouteInfoPanel';
import FloorPlanCanvas from './FloorPlanCanvas';
import BottomSheet from './BottomSheet';
import POIDetailCard from './POIDetailCard';

// ── Component ───────────────────────────────────────────────

/**
 * MapExplorer — the main map exploration screen (2GIS-style).
 *
 * Layout:
 * - SearchBar at top (z-index: 100) with category chips
 * - FloorPlanCanvas filling the viewport
 * - FloorSwitcher docked right, vertically centered
 * - Floating action buttons (Locate Me, Compass)
 * - BottomSheet with POIDetailCard or RouteInfoPanel
 */
const MapExplorer: React.FC = () => {
  const navigate = useNavigate();

  // ── Store State ───────────────────────────────────────────
  const phase = useNavigationStore((s) => s.phase);
  const currentPosition = useNavigationStore((s) => s.currentPosition);
  const currentFloor = useNavigationStore((s) => s.currentFloor);
  const selectedDestination = useNavigationStore((s) => s.selectedDestination);
  const calculatedPath = useNavigationStore((s) => s.calculatedPath);
  const searchQuery = useNavigationStore((s) => s.searchQuery);
  const filteredDestinations = useNavigationStore((s) => s.filteredDestinations);
  const currentInstruction = useNavigationStore((s) => s.currentInstruction);
  const distanceToNext = useNavigationStore((s) => s.distanceToNext);
  const totalDistanceRemaining = useNavigationStore((s) => s.totalDistanceRemaining);
  const currentPathSegment = useNavigationStore((s) => s.currentPathSegment);

  // ── Store Actions ─────────────────────────────────────────
  const setSearchQuery = useNavigationStore((s) => s.setSearchQuery);
  const selectDestination = useNavigationStore((s) => s.selectDestination);
  const cancelNavigation = useNavigationStore((s) => s.cancelNavigation);
  const startNavigation = useNavigationStore((s) => s.startNavigation);

  // ── Local State ───────────────────────────────────────────
  const [activeFloorLevel, setActiveFloorLevel] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<POICategory | null>(null);
  const [selectedPOI, setSelectedPOI] = useState<PointOfInterest | null>(null);
  const [bottomSheetState, setBottomSheetState] = useState<BottomSheetState>('hidden');
  const [mapViewState, setMapViewState] = useState<MapViewState>('browsing');

  // ── Derived State ─────────────────────────────────────────

  /** Current active floor object. */
  const activeFloor = useMemo(
    () => getFloorByLevel(activeFloorLevel) ?? GROUND_FLOOR,
    [activeFloorLevel],
  );

  /** POIs visible on the current floor, filtered by category if set. */
  const visiblePOIs = useMemo(() => {
    let pois = getDestinationsByFloor(activeFloor.id);
    if (categoryFilter) {
      pois = pois.filter((p) => p.category === categoryFilter);
    }
    return pois;
  }, [activeFloor.id, categoryFilter]);

  /** Search results — filtered by both query and category. */
  const searchResults = useMemo(() => {
    let results = searchQuery.length > 0
      ? searchDestinations(searchQuery)
      : [];
    if (categoryFilter) {
      results = results.filter((r) => r.category === categoryFilter);
    }
    return results;
  }, [searchQuery, categoryFilter]);

  /** Direction instructions for the current route. */
  const routeInstructions = useMemo<DirectionInstruction[]>(() => {
    if (!calculatedPath || calculatedPath.length < 2) return [];
    return calculateDirections(calculatedPath);
  }, [calculatedPath]);

  // ── Sync phase changes to local view state ────────────────
  useEffect(() => {
    if (phase === 'navigating' || phase === 'arrived') {
      setMapViewState('navigating');
      setBottomSheetState('collapsed');
    }
  }, [phase]);

  // ── Handlers ──────────────────────────────────────────────

  /** Handle floor change from FloorSwitcher. */
  const handleFloorChange = useCallback((level: number) => {
    setActiveFloorLevel(level);
  }, []);

  /** Handle category chip change. */
  const handleCategoryChange = useCallback((cat: POICategory | null) => {
    setCategoryFilter(cat);
  }, []);

  /** Handle POI tap on the canvas. */
  const handlePOISelect = useCallback((poi: PointOfInterest) => {
    setSelectedPOI(poi);
    setMapViewState('poi_selected');
    setBottomSheetState('collapsed');
  }, []);

  /** Handle empty tap on the canvas. */
  const handleEmptyTap = useCallback(() => {
    if (mapViewState === 'poi_selected') {
      setSelectedPOI(null);
      setMapViewState('browsing');
      setBottomSheetState('hidden');
    }
  }, [mapViewState]);

  /** Handle search result selection. */
  const handleResultSelect = useCallback((poi: PointOfInterest) => {
    // Switch to the POI's floor
    const floor = ALL_FLOORS.find((f) => f.id === poi.floorId);
    if (floor) setActiveFloorLevel(floor.level);
    // Select the POI
    handlePOISelect(poi);
    // Clear search
    setSearchQuery('');
  }, [handlePOISelect, setSearchQuery]);

  /** Handle navigate to selected POI. */
  const handleNavigateToPOI = useCallback(() => {
    if (!selectedPOI) return;
    const success = selectDestination(selectedPOI);
    if (success) {
      startNavigation();
      setMapViewState('routing');
      setBottomSheetState('expanded');
    }
  }, [selectedPOI, selectDestination, startNavigation]);

  /** Handle closing POI detail. */
  const handleClosePOI = useCallback(() => {
    setSelectedPOI(null);
    setMapViewState('browsing');
    setBottomSheetState('hidden');
  }, []);

  /** Handle opening AR view. */
  const handleStartAR = useCallback(() => {
    navigate('/ar');
  }, [navigate]);

  /** Handle QR scan button. */
  const handleQRScan = useCallback(() => {
    navigate('/scan');
  }, [navigate]);

  /** Handle cancelling the route. */
  const handleCancelRoute = useCallback(() => {
    cancelNavigation();
    setSelectedPOI(null);
    setMapViewState('browsing');
    setBottomSheetState('hidden');
  }, [cancelNavigation]);

  /** Handle locate-me button — re-center on current position. */
  const handleLocateMe = useCallback(() => {
    // In a real app, this would pan/zoom the canvas to currentPosition.
    // For now, it's a visual-only affordance.
  }, []);

  // ── Render ────────────────────────────────────────────────

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
        background: COLORS.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}
      className="no-select"
    >
      {/* ── SearchBar (top overlay) ────────────────────────────── */}
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        results={searchResults}
        onResultSelect={handleResultSelect}
        onQRScan={handleQRScan}
        categoryFilter={categoryFilter}
        onCategoryChange={handleCategoryChange}
        currentFloorName={activeFloor.name}
      />

      {/* ── FloorPlanCanvas (fills remaining space) ──────────── */}
      <div style={{ flex: 1, position: 'relative', marginTop: 0 }}>
        <FloorPlanCanvas
          floor={activeFloor}
          path={calculatedPath}
          userPosition={currentPosition}
          destination={
            selectedDestination
              ? selectedDestination.position
              : selectedPOI
                ? selectedPOI.position
                : null
          }
          pois={visiblePOIs}
          selectedPOI={selectedPOI}
          categoryFilter={categoryFilter}
          onPOITap={handlePOISelect}
          onEmptyTap={handleEmptyTap}
        />

        {/* ── FloorSwitcher (right side) ─────────────────────── */}
        <FloorSwitcher
          floors={ALL_FLOORS}
          activeLevel={activeFloorLevel}
          onFloorChange={handleFloorChange}
        />

        {/* ── Floating Action Buttons (bottom-right) ─────────── */}
        <div
          style={{
            position: 'absolute',
            bottom: bottomSheetState !== 'hidden' ? 200 : 24,
            right: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            zIndex: 50,
            transition: 'bottom 350ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {/* Locate Me button */}
          <button
            onClick={handleLocateMe}
            disabled={!currentPosition}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: COLORS.bgGlass,
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: `1px solid ${COLORS.borderGlass}`,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              cursor: currentPosition ? 'pointer' : 'default',
              opacity: currentPosition ? 1 : 0.4,
              transition: 'all 200ms ease',
              color: currentPosition ? COLORS.accentPrimary : COLORS.textMuted,
            }}
            title="Locate me"
            aria-label="Center on current position"
          >
            📍
          </button>

          {/* Compass button */}
          <button
            onClick={() => {/* Reset map rotation — placeholder */}}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: COLORS.bgGlass,
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: `1px solid ${COLORS.borderGlass}`,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              cursor: 'pointer',
              transition: 'all 200ms ease',
              color: COLORS.textSecondary,
            }}
            title="Reset compass"
            aria-label="Reset map orientation"
          >
            🧭
          </button>
        </div>
      </div>

      {/* ── BottomSheet ──────────────────────────────────────── */}
      <BottomSheet
        state={bottomSheetState}
        onStateChange={setBottomSheetState}
      >
        {/* POI Detail Card — shown when a POI is selected (not routing) */}
        {mapViewState === 'poi_selected' && selectedPOI && (
          <POIDetailCard
            poi={selectedPOI}
            isExpanded={bottomSheetState === 'expanded' || bottomSheetState === 'full'}
            onNavigate={() => handleNavigateToPOI()}
            onARView={handleStartAR}
            onClose={handleClosePOI}
          />
        )}

        {/* Route Info Panel — shown when routing or navigating */}
        {(mapViewState === 'routing' || mapViewState === 'navigating') && calculatedPath && (
          <RouteInfoPanel
            path={calculatedPath}
            instructions={routeInstructions}
            currentSegment={currentPathSegment}
            distanceToNext={distanceToNext}
            totalRemaining={totalDistanceRemaining}
            destinationName={selectedDestination?.name ?? selectedPOI?.name ?? 'Destination'}
            onStartAR={handleStartAR}
            onCancel={handleCancelRoute}
          />
        )}
      </BottomSheet>
    </div>
  );
};

export default MapExplorer;
