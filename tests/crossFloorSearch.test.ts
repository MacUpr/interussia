// ============================================================
// Cross-floor global search — store behavior tests
// ============================================================
//
// Verifies the v2 search semantics:
//   - Browsing (no query) lists only the active floor's POIs.
//   - Searching returns matches across ALL floors.
//   - Current-floor matches are surfaced first when searching.
//   - The category filter still applies during cross-floor search.
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { useNavigationStore } from '../src/store/navigationStore';

describe('cross-floor global search', () => {
  beforeEach(() => {
    useNavigationStore.getState().reset();
  });

  it('browsing (no query) is scoped to the active floor', () => {
    useNavigationStore.getState().setFloor(0); // ground
    const results = useNavigationStore.getState().filteredDestinations;

    expect(results.length).toBeGreaterThan(0);
    expect(results.every((p) => p.floorId === 'FLOOR_GROUND')).toBe(true);
  });

  it('searching returns matches across all floors', () => {
    const store = useNavigationStore.getState();
    store.setFloor(0);
    store.setSearchQuery('restroom'); // restrooms exist on ground + first floor

    const results = useNavigationStore.getState().filteredDestinations;
    const floors = new Set(results.map((p) => p.floorId));

    expect(floors.has('FLOOR_GROUND')).toBe(true);
    expect(floors.has('FLOOR_1')).toBe(true);
    expect(floors.size).toBeGreaterThan(1);
  });

  it('surfaces current-floor matches first when searching', () => {
    const store = useNavigationStore.getState();
    store.setFloor(1); // first floor active
    store.setSearchQuery('elevator'); // elevators on every floor

    const results = useNavigationStore.getState().filteredDestinations;

    expect(results.length).toBeGreaterThan(1);
    expect(results[0].floorId).toBe('FLOOR_1'); // active floor leads
  });

  it('applies the category filter during cross-floor search', () => {
    const store = useNavigationStore.getState();
    store.setFloor(0);
    store.setSearchQuery('room');
    store.setCategoryFilter('meeting_room');

    const results = useNavigationStore.getState().filteredDestinations;

    expect(results.length).toBeGreaterThan(0);
    expect(results.every((p) => p.category === 'meeting_room')).toBe(true);
    // and they span more than the active floor
    expect(new Set(results.map((p) => p.floorId)).size).toBeGreaterThan(1);
  });
});
