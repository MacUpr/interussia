// ============================================================
// Inmap — Coordinate Mapper (2D ↔ 3D)
// ============================================================
//
// Transforms between the 2D map coordinate system used by the
// navigation graph and the 3D world-space coordinate system
// used by the Three.js scene renderer.
//
// Convention:
//   2D map:  x = east/right, y = north/up (plan view)
//   3D world: x = east/right, y = up (vertical), z = south (into screen)
//
// This module is kept free of Three.js imports so it can be
// used on the server or in workers.
// ============================================================

import type { CoordinateMapper } from '../types/index';
import { MAP_CONFIG, SCENE_CONFIG } from '../utils/constants';

// ── Factory ─────────────────────────────────────────────────

/**
 * Creates a default `CoordinateMapper` for a given floor level.
 *
 * @param floorLevel - Ordinal floor number (0 = ground). Defaults to 0.
 * @returns A `CoordinateMapper` with identity scale and offsets appropriate for the floor.
 */
export function createDefaultMapper(floorLevel: number = 0): CoordinateMapper {
  return {
    scale: MAP_CONFIG.scale,
    originX: 0,
    originY: MAP_CONFIG.defaultFloorHeight + floorLevel * MAP_CONFIG.floorHeightStep,
    originZ: 0,
    rotation: 0,
    floorHeight: MAP_CONFIG.defaultFloorHeight + floorLevel * MAP_CONFIG.floorHeightStep,
  };
}

// ── 2D → 3D ─────────────────────────────────────────────────

/**
 * Converts a 2D map position to a 3D world-space point.
 *
 * - `mapX` maps to world `x` (scaled and offset).
 * - `mapY` maps to world `z` (negated so positive map-Y = negative world-Z,
 *   keeping the "north-up" convention consistent with OpenGL/Three.js).
 * - World `y` is set to the mapper's `floorHeight`.
 *
 * If the mapper has a non-zero `rotation`, the horizontal components
 * are rotated around the origin by that angle.
 */
export function map2DTo3D(
  mapX: number,
  mapY: number,
  mapper: CoordinateMapper,
): { x: number; y: number; z: number } {
  let worldX = mapX * mapper.scale + mapper.originX;
  let worldZ = -(mapY * mapper.scale) + mapper.originZ; // negate Y for Z
  const worldY = mapper.floorHeight;

  // Apply rotation around origin if specified
  if (mapper.rotation !== 0) {
    const cos = Math.cos(mapper.rotation);
    const sin = Math.sin(mapper.rotation);
    const rx = worldX * cos - worldZ * sin;
    const rz = worldX * sin + worldZ * cos;
    worldX = rx;
    worldZ = rz;
  }

  return { x: worldX, y: worldY, z: worldZ };
}

// ── 3D → 2D ─────────────────────────────────────────────────

/**
 * Converts a 3D world-space position back to 2D map coordinates.
 * Only the horizontal plane is considered (worldX, worldZ);
 * the vertical component (worldY) is ignored.
 */
export function map3DTo2D(
  worldX: number,
  worldZ: number,
  mapper: CoordinateMapper,
): { x: number; y: number } {
  let wx = worldX;
  let wz = worldZ;

  // Reverse rotation
  if (mapper.rotation !== 0) {
    const cos = Math.cos(-mapper.rotation);
    const sin = Math.sin(-mapper.rotation);
    const rx = wx * cos - wz * sin;
    const rz = wx * sin + wz * cos;
    wx = rx;
    wz = rz;
  }

  const mapX = (wx - mapper.originX) / mapper.scale;
  const mapY = -(wz - mapper.originZ) / mapper.scale; // un-negate

  return { x: mapX, y: mapY };
}

// ── Path Conversion ─────────────────────────────────────────

/**
 * Converts an array of 2D path points (from A*) to an array of
 * 3D world-space vectors. Points are elevated slightly above the
 * floor plane so the rendered path hovers visibly over the surface.
 *
 * @param path   - Ordered 2D points (e.g., from `astar`).
 * @param mapper - Coordinate mapper for the active floor.
 * @returns Array of `{x, y, z}` objects suitable for Three.js Vector3 construction.
 */
export function pathToVector3Array(
  path: Array<{ x: number; y: number }>,
  mapper: CoordinateMapper,
): Array<{ x: number; y: number; z: number }> {
  const elevation = SCENE_CONFIG.pathElevation; // 0.1 m above floor

  return path.map((point) => {
    const p3d = map2DTo3D(point.x, point.y, mapper);
    return {
      x: p3d.x,
      y: p3d.y + elevation,
      z: p3d.z,
    };
  });
}
