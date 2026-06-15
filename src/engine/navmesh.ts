// ============================================================
// Inmap — Navigation Mesh Utilities
// ============================================================
//
// Higher-level helpers that sit on top of the A* pathfinding
// engine. These functions work directly with `Floor` objects
// and `Waypoint` arrays, hiding the raw graph layer.
// ============================================================

import type { Floor, Waypoint, GraphNode } from '../types/index';
import { buildGraphFromFloor, astar } from './pathfinding';

// ── Nearest Waypoint Lookup ─────────────────────────────────

/**
 * Finds the closest waypoint on a floor to an arbitrary (x, y)
 * coordinate. Returns `null` if the floor has no waypoints.
 *
 * Complexity: O(n) — suitable for floors with hundreds of waypoints.
 */
export function findNearestWaypoint(
  floor: Floor,
  x: number,
  y: number,
): Waypoint | null {
  if (floor.waypoints.length === 0) return null;

  let nearest: Waypoint | null = null;
  let bestDist = Infinity;

  for (const wp of floor.waypoints) {
    const dx = wp.x - x;
    const dy = wp.y - y;
    const dist = dx * dx + dy * dy; // squared distance (avoids sqrt)
    if (dist < bestDist) {
      bestDist = dist;
      nearest = wp;
    }
  }

  return nearest;
}

// ── Path Between Arbitrary Points ───────────────────────────

/**
 * Computes a waypoint-level path from an arbitrary start position
 * to a known destination waypoint.
 *
 * 1. Finds the nearest waypoint to (startX, startY).
 * 2. Runs A* from that waypoint to `endWaypointId`.
 * 3. Returns the path as an array of `Waypoint` objects, or `null`
 *    if no path exists.
 *
 * @param floor          - The floor data (waypoints + connections).
 * @param startX         - User's current X position.
 * @param startY         - User's current Y position.
 * @param endWaypointId  - Destination waypoint ID.
 */
export function getPathBetweenPoints(
  floor: Floor,
  startX: number,
  startY: number,
  endWaypointId: string,
): Waypoint[] | null {
  const startWp = findNearestWaypoint(floor, startX, startY);
  if (!startWp) return null;

  // Check that the end waypoint exists
  const endWp = floor.waypoints.find((wp) => wp.id === endWaypointId);
  if (!endWp) return null;

  // If start and end are the same, return a single-node path
  if (startWp.id === endWaypointId) return [startWp];

  // Build graph and run A*
  const graph = buildGraphFromFloor(floor);
  const graphPath = astar(graph, startWp.id, endWaypointId);

  if (!graphPath) return null;

  // Map GraphNode results back to the full Waypoint objects
  return graphNodePathToWaypoints(graphPath, floor);
}

// ── Graph Validation ────────────────────────────────────────

/**
 * Validates the connectivity of a floor's navigation graph.
 *
 * Checks performed:
 * - All waypoints referenced in connections exist.
 * - The graph is fully connected (every node is reachable from every other node).
 * - No zero-cost or negative-cost edges exist.
 * - No self-loop connections.
 *
 * @returns An object with a `valid` flag and an array of human-readable `issues`.
 */
export function validateGraph(
  floor: Floor,
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  const waypointIds = new Set(floor.waypoints.map((wp) => wp.id));

  // ── Check connections reference valid waypoints ──
  for (const conn of floor.connections) {
    if (!waypointIds.has(conn.from)) {
      issues.push(`Connection references unknown 'from' waypoint: ${conn.from}`);
    }
    if (!waypointIds.has(conn.to)) {
      issues.push(`Connection references unknown 'to' waypoint: ${conn.to}`);
    }
    if (conn.from === conn.to) {
      issues.push(`Self-loop connection on waypoint: ${conn.from}`);
    }
    if (conn.cost <= 0) {
      issues.push(`Non-positive cost (${conn.cost}) on connection ${conn.from} → ${conn.to}`);
    }
  }

  // ── Check full connectivity via BFS ──
  if (floor.waypoints.length > 0) {
    const graph = buildGraphFromFloor(floor);
    const visited = new Set<string>();
    const queue: string[] = [floor.waypoints[0].id];
    visited.add(floor.waypoints[0].id);

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      const node = graph.get(nodeId);
      if (!node) continue;

      for (const neighbor of node.neighbors) {
        if (!visited.has(neighbor.nodeId)) {
          visited.add(neighbor.nodeId);
          queue.push(neighbor.nodeId);
        }
      }
    }

    const unreachable = floor.waypoints.filter((wp) => !visited.has(wp.id));
    if (unreachable.length > 0) {
      issues.push(
        `Disconnected waypoints (unreachable from ${floor.waypoints[0].id}): ` +
        unreachable.map((wp) => wp.id).join(', '),
      );
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

// ── Path Distance ───────────────────────────────────────────

/**
 * Computes the total Euclidean distance along an ordered path
 * of waypoints, in meters.
 */
export function getDistanceAlongPath(path: Waypoint[]): number {
  if (path.length < 2) return 0;

  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const dx = path[i].x - path[i - 1].x;
    const dy = path[i].y - path[i - 1].y;
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return total;
}

// ── Internal Helpers ────────────────────────────────────────

/**
 * Maps an A* result (GraphNode[]) back to full Waypoint objects
 * from the floor data.
 */
function graphNodePathToWaypoints(
  graphPath: GraphNode[],
  floor: Floor,
): Waypoint[] {
  const waypointMap = new Map<string, Waypoint>();
  for (const wp of floor.waypoints) {
    waypointMap.set(wp.id, wp);
  }

  const result: Waypoint[] = [];
  for (const node of graphPath) {
    const wp = waypointMap.get(node.id);
    if (wp) result.push(wp);
  }
  return result;
}
