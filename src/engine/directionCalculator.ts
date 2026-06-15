// ============================================================
// Inmap — Direction Calculator
// ============================================================
//
// Generates turn-by-turn navigation instructions from a
// sequence of waypoints. Analyzes the angle between consecutive
// path segments and classifies each transition as straight,
// slight turn, sharp turn, or U-turn.
// ============================================================

import type { Waypoint, DirectionInstruction } from '../types/index';
import { NAV_CONFIG, DIRECTION_ICONS } from '../utils/constants';

// ── Bearing ─────────────────────────────────────────────────

/**
 * Computes the compass bearing (0–360°) from point `from` to point `to`.
 *
 * 0° = north (positive Y), 90° = east (positive X).
 * Uses the standard atan2 convention rotated so 0° points up.
 */
export function getBearing(
  from: { x: number; y: number },
  to: { x: number; y: number },
): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  // atan2(dx, dy) gives angle from north, clockwise
  const radians = Math.atan2(dx, dy);
  const degrees = (radians * 180) / Math.PI;

  // Normalize to [0, 360)
  return ((degrees % 360) + 360) % 360;
}

// ── Turn Classification ─────────────────────────────────────

/**
 * Classifies a turn based on the signed angle delta between
 * two consecutive bearings.
 *
 * @param angleDelta - Signed angle difference in degrees (positive = right, negative = left).
 *                     Normalized to [-180, 180].
 * @returns The `DirectionInstruction['type']` classification.
 */
export function classifyTurn(angleDelta: number): DirectionInstruction['type'] {
  const abs = Math.abs(angleDelta);

  if (abs >= NAV_CONFIG.uTurnThreshold) {
    return 'u_turn';
  }
  if (abs >= NAV_CONFIG.slightTurnThreshold) {
    return angleDelta > 0 ? 'turn_right' : 'turn_left';
  }
  if (abs >= NAV_CONFIG.turnAngleThreshold) {
    return angleDelta > 0 ? 'slight_right' : 'slight_left';
  }
  return 'straight';
}

// ── Instruction Formatting ──────────────────────────────────

/**
 * Produces a human-readable string for a single instruction.
 */
export function formatInstruction(instruction: DirectionInstruction): string {
  const distStr = instruction.distanceMeters < 1
    ? `${Math.round(instruction.distanceMeters * 100)} cm`
    : `${Math.round(instruction.distanceMeters)} m`;

  switch (instruction.type) {
    case 'straight':
      return `Continue straight for ${distStr}`;
    case 'turn_left':
      return `Turn left, then continue for ${distStr}`;
    case 'turn_right':
      return `Turn right, then continue for ${distStr}`;
    case 'slight_left':
      return `Bear slightly left for ${distStr}`;
    case 'slight_right':
      return `Bear slightly right for ${distStr}`;
    case 'u_turn':
      return `Make a U-turn, then continue for ${distStr}`;
    case 'arrived':
      return 'You have arrived at your destination';
    case 'floor_change':
      return `Change floor, then continue for ${distStr}`;
    default:
      return `Continue for ${distStr}`;
  }
}

// ── Euclidean Distance (2D) ─────────────────────────────────

function distance2D(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Normalizes an angle delta to the range [-180, 180].
 */
function normalizeAngle(deg: number): number {
  let d = deg % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

// ── Direction Calculation ───────────────────────────────────

/**
 * Analyses a full path of waypoints and returns an ordered
 * list of turn-by-turn `DirectionInstruction`s.
 *
 * The first instruction is always "straight" (start walking).
 * The last instruction is always "arrived".
 *
 * @param path - Ordered waypoints from A* (start → goal).
 * @returns Array of instructions, one per path segment.
 */
export function calculateDirections(path: Waypoint[]): DirectionInstruction[] {
  if (path.length === 0) return [];

  if (path.length === 1) {
    return [{
      type: 'arrived',
      text: 'You have arrived at your destination',
      distanceMeters: 0,
      waypointId: path[0].id,
      icon: DIRECTION_ICONS.arrived,
    }];
  }

  const instructions: DirectionInstruction[] = [];

  // First segment: always start with "straight"
  const firstDist = distance2D(path[0], path[1]);
  const firstInstruction: DirectionInstruction = {
    type: 'straight',
    text: '',
    distanceMeters: firstDist,
    waypointId: path[0].id,
    icon: DIRECTION_ICONS.straight,
  };
  firstInstruction.text = formatInstruction(firstInstruction);
  instructions.push(firstInstruction);

  // Middle segments: classify each turn
  for (let i = 1; i < path.length - 1; i++) {
    const prev = path[i - 1];
    const curr = path[i];
    const next = path[i + 1];

    const bearingIn = getBearing(prev, curr);
    const bearingOut = getBearing(curr, next);
    const angleDelta = normalizeAngle(bearingOut - bearingIn);

    const segmentDist = distance2D(curr, next);

    // Check if this is a floor change
    const isFloorChange =
      curr.type === 'floor_connector' || next.type === 'floor_connector';

    const turnType: DirectionInstruction['type'] = isFloorChange
      ? 'floor_change'
      : classifyTurn(angleDelta);

    const instruction: DirectionInstruction = {
      type: turnType,
      text: '',
      distanceMeters: segmentDist,
      waypointId: curr.id,
      icon: DIRECTION_ICONS[turnType] ?? DIRECTION_ICONS.straight,
    };
    instruction.text = formatInstruction(instruction);
    instructions.push(instruction);
  }

  // Final instruction: arrived
  const arrivedInstruction: DirectionInstruction = {
    type: 'arrived',
    text: 'You have arrived at your destination',
    distanceMeters: 0,
    waypointId: path[path.length - 1].id,
    icon: DIRECTION_ICONS.arrived,
  };
  instructions.push(arrivedInstruction);

  return instructions;
}

// ── Current Instruction Lookup ──────────────────────────────

/**
 * Given the user's current position, determines which path
 * segment they are on and returns the appropriate instruction.
 *
 * The algorithm finds the closest path segment to the user and
 * returns the instruction for the next waypoint ahead.
 *
 * @param path     - The full waypoint path.
 * @param currentX - User's current X position.
 * @param currentY - User's current Y position.
 * @returns The current instruction context, or the arrival instruction
 *          if the user is near the end.
 */
export function getCurrentInstruction(
  path: Waypoint[],
  currentX: number,
  currentY: number,
): {
  instruction: DirectionInstruction;
  segmentIndex: number;
  distanceToNext: number;
} {
  const directions = calculateDirections(path);

  if (path.length === 0 || directions.length === 0) {
    const fallback: DirectionInstruction = {
      type: 'arrived',
      text: 'No path available',
      distanceMeters: 0,
      waypointId: '',
      icon: DIRECTION_ICONS.arrived,
    };
    return { instruction: fallback, segmentIndex: 0, distanceToNext: 0 };
  }

  const userPos = { x: currentX, y: currentY };

  // Find the closest waypoint index on the path
  let closestIdx = 0;
  let closestDist = Infinity;

  for (let i = 0; i < path.length; i++) {
    const d = distance2D(userPos, path[i]);
    if (d < closestDist) {
      closestDist = d;
      closestIdx = i;
    }
  }

  // If user is closest to the last waypoint and within arrival threshold, they've arrived
  if (closestIdx === path.length - 1) {
    return {
      instruction: directions[directions.length - 1],
      segmentIndex: path.length - 1,
      distanceToNext: closestDist,
    };
  }

  // Determine the segment index: we look ahead to the next waypoint
  const segmentIndex = closestIdx;
  const nextWaypoint = path[segmentIndex + 1];
  const distanceToNext = distance2D(userPos, nextWaypoint);

  // The instruction for this segment
  // `directions` has one entry per segment, plus the arrival
  const instructionIdx = Math.min(segmentIndex, directions.length - 1);

  return {
    instruction: directions[instructionIdx],
    segmentIndex,
    distanceToNext,
  };
}
