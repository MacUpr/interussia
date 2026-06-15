// ============================================================
// Inmap — Navigation Engine
// ============================================================
//
// Pure-logic state machine that orchestrates the full navigation
// lifecycle: scan → select → navigate → arrive.
//
// This class contains NO React or store logic. It is designed
// to be instantiated and driven by the Zustand store or any
// other consumer.
// ============================================================

import type {
  QRAnchor,
  PointOfInterest,
  Floor,
  Waypoint,
  NavigationState,
  NavigationPhase,
  DirectionInstruction,
} from '../types/index';
import { getPathBetweenPoints, getDistanceAlongPath } from './navmesh';
import {
  calculateDirections,
  getCurrentInstruction,
  formatInstruction,
} from './directionCalculator';
import { NAV_CONFIG } from '../utils/constants';

// ── Navigation Update (returned from updatePosition) ────────

export interface NavigationUpdate {
  /** Current turn-by-turn instruction. */
  instruction: DirectionInstruction;
  /** Index of the path segment the user is currently on. */
  segmentIndex: number;
  /** Distance in meters to the next waypoint. */
  distanceToNext: number;
  /** Total remaining distance along the path in meters. */
  totalRemaining: number;
  /** Whether the user has arrived at the destination. */
  arrived: boolean;
}

// ── Navigation Engine ───────────────────────────────────────

/**
 * Stateful navigation engine that manages the lifecycle of
 * a single navigation session.
 *
 * Usage:
 * ```ts
 * const engine = new NavigationEngine();
 * engine.initialize(scannedAnchor);
 * const path = engine.selectDestination(poi, floor);
 * if (path) {
 *   const update = engine.updatePosition(userX, userY);
 *   // render update.instruction, check update.arrived
 * }
 * engine.reset();
 * ```
 */
export class NavigationEngine {
  private phase: NavigationPhase = 'idle';
  private currentPosition: { x: number; y: number } | null = null;
  private currentFloor: string | null = null;
  private scannedAnchor: QRAnchor | null = null;
  private selectedDestination: PointOfInterest | null = null;
  private calculatedPath: Waypoint[] | null = null;
  private directions: DirectionInstruction[] = [];
  private currentSegment: number = 0;
  private currentInstruction: string = '';
  private distanceToNext: number = 0;
  private totalDistanceRemaining: number = 0;

  // ── Initialization ──────────────────────────────────────────

  /**
   * Initializes the engine with the user's position derived from
   * a scanned QR anchor. Transitions from `idle` or `scanning`
   * to `selecting_destination`.
   */
  initialize(anchor: QRAnchor): void {
    this.scannedAnchor = anchor;
    this.currentPosition = { x: anchor.position.x, y: anchor.position.y };
    this.currentFloor = anchor.floorId;
    this.phase = 'selecting_destination';
    this.currentInstruction = 'Select a destination to begin navigation';
  }

  // ── Destination Selection ─────────────────────────────────

  /**
   * Calculates the shortest path from the user's current position
   * to the selected destination's nearest waypoint.
   *
   * @param poi   - The destination the user selected.
   * @param floor - The floor data (graph) to route through.
   * @returns The computed waypoint path, or `null` if no route exists.
   */
  selectDestination(poi: PointOfInterest, floor: Floor): Waypoint[] | null {
    if (!this.currentPosition) return null;

    this.selectedDestination = poi;

    const path = getPathBetweenPoints(
      floor,
      this.currentPosition.x,
      this.currentPosition.y,
      poi.nearestWaypointId,
    );

    if (!path || path.length === 0) {
      this.currentInstruction = 'No route found to the selected destination';
      return null;
    }

    this.calculatedPath = path;
    this.directions = calculateDirections(path);
    this.currentSegment = 0;
    this.totalDistanceRemaining = getDistanceAlongPath(path);

    if (this.directions.length > 0) {
      this.currentInstruction = formatInstruction(this.directions[0]);
      this.distanceToNext = this.directions[0].distanceMeters;
    }

    // Stay in selecting_destination until startNavigation() is called
    // (or auto-transition — the store decides)
    this.phase = 'navigating';

    return path;
  }

  // ── Position Update ───────────────────────────────────────

  /**
   * Called as the user moves. Determines the current path
   * segment, updates the active instruction, and checks for
   * arrival.
   *
   * @returns A `NavigationUpdate` with the current instruction context.
   */
  updatePosition(x: number, y: number): NavigationUpdate {
    this.currentPosition = { x, y };

    // Default update (fallback)
    const defaultUpdate: NavigationUpdate = {
      instruction: {
        type: 'straight',
        text: this.currentInstruction,
        distanceMeters: 0,
        waypointId: '',
        icon: '⬆️',
      },
      segmentIndex: this.currentSegment,
      distanceToNext: this.distanceToNext,
      totalRemaining: this.totalDistanceRemaining,
      arrived: false,
    };

    if (!this.calculatedPath || this.calculatedPath.length === 0) {
      return defaultUpdate;
    }

    // Check arrival (distance to last waypoint)
    const lastWp = this.calculatedPath[this.calculatedPath.length - 1];
    const dxLast = x - lastWp.x;
    const dyLast = y - lastWp.y;
    const distToGoal = Math.sqrt(dxLast * dxLast + dyLast * dyLast);

    if (distToGoal <= NAV_CONFIG.arrivalThreshold) {
      this.phase = 'arrived';
      this.currentInstruction = 'You have arrived at your destination';
      this.currentSegment = this.calculatedPath.length - 1;
      this.distanceToNext = 0;
      this.totalDistanceRemaining = 0;

      return {
        instruction: {
          type: 'arrived',
          text: this.currentInstruction,
          distanceMeters: 0,
          waypointId: lastWp.id,
          icon: '🎯',
        },
        segmentIndex: this.currentSegment,
        distanceToNext: 0,
        totalRemaining: 0,
        arrived: true,
      };
    }

    // Find current instruction based on position
    const result = getCurrentInstruction(this.calculatedPath, x, y);

    this.currentSegment = result.segmentIndex;
    this.distanceToNext = result.distanceToNext;
    this.currentInstruction = formatInstruction(result.instruction);

    // Compute remaining distance from current segment onward
    let remaining = result.distanceToNext;
    for (let i = result.segmentIndex + 1; i < this.calculatedPath.length - 1; i++) {
      const a = this.calculatedPath[i];
      const b = this.calculatedPath[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      remaining += Math.sqrt(dx * dx + dy * dy);
    }
    this.totalDistanceRemaining = remaining;

    return {
      instruction: result.instruction,
      segmentIndex: result.segmentIndex,
      distanceToNext: result.distanceToNext,
      totalRemaining: remaining,
      arrived: false,
    };
  }

  // ── Arrival Check ─────────────────────────────────────────

  /**
   * Returns `true` if the engine has determined the user
   * has arrived at their destination.
   */
  isArrived(): boolean {
    return this.phase === 'arrived';
  }

  // ── Reset ─────────────────────────────────────────────────

  /**
   * Resets the engine to its initial idle state, clearing all
   * navigation data.
   */
  reset(): void {
    this.phase = 'idle';
    this.currentPosition = null;
    this.currentFloor = null;
    this.scannedAnchor = null;
    this.selectedDestination = null;
    this.calculatedPath = null;
    this.directions = [];
    this.currentSegment = 0;
    this.currentInstruction = '';
    this.distanceToNext = 0;
    this.totalDistanceRemaining = 0;
  }

  // ── State Snapshot ────────────────────────────────────────

  /**
   * Returns a read-only snapshot of the current navigation state.
   * Suitable for serialization or UI binding.
   */
  getState(): NavigationState {
    return {
      phase: this.phase,
      currentPosition: this.currentPosition
        ? { ...this.currentPosition }
        : null,
      currentFloor: this.currentFloor,
      scannedAnchor: this.scannedAnchor,
      selectedDestination: this.selectedDestination,
      calculatedPath: this.calculatedPath
        ? [...this.calculatedPath]
        : null,
      currentPathSegment: this.currentSegment,
      currentInstruction: this.currentInstruction,
      distanceToNext: this.distanceToNext,
      totalDistanceRemaining: this.totalDistanceRemaining,
    };
  }
}
