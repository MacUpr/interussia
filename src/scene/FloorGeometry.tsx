// ============================================================
// Inmap — FloorGeometry: 3D Floor Plan Renderer
// ============================================================

import { useMemo } from 'react';
import * as THREE from 'three';
import { Text } from '@react-three/drei';

import type { Region, WaypointConnection, Waypoint, RegionType } from '../types/index';
import { COLORS, SCENE_CONFIG } from '../utils/constants';

// ── Props ───────────────────────────────────────────────────

interface FloorGeometryProps {
  regions: Region[];
  connections: WaypointConnection[];
  waypoints: Waypoint[];
}

// ── Region-type floor color map ─────────────────────────────

const FLOOR_COLORS: Record<RegionType, string> = {
  room: '#151b2e',
  corridor: '#171f33',
  lobby: '#1a2338',
  stairwell: '#12182a',
  elevator_shaft: '#101526',
  restroom: '#181e30',
  outdoor: '#0e1422',
};

// ── Helpers ─────────────────────────────────────────────────

interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Compute the axis-aligned bounding box of a polygon. */
function polygonBounds(polygon: [number, number][]): BBox {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of polygon) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

/** Check whether a point is within `threshold` meters of any door waypoint. */
function isNearDoor(
  px: number,
  pz: number,
  doorWaypoints: Waypoint[],
  threshold: number,
): boolean {
  for (const wp of doorWaypoints) {
    const dx = px - wp.x;
    const dz = pz - wp.y; // waypoint y → world z
    if (dx * dx + dz * dz < threshold * threshold) return true;
  }
  return false;
}

// ── Wall Segment ────────────────────────────────────────────

interface WallSegmentProps {
  position: [number, number, number];
  size: [number, number, number];
}

/** A single wall box. */
function WallSegment({ position, size }: WallSegmentProps) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={COLORS.wallColor}
        transparent
        opacity={0.7}
        side={THREE.DoubleSide}
        roughness={0.8}
        metalness={0.1}
      />
    </mesh>
  );
}

// ── Wall generation for one edge ────────────────────────────

interface WallEdge {
  /** World start x */
  sx: number;
  /** World start z */
  sz: number;
  /** World end x */
  ex: number;
  /** World end z */
  ez: number;
  /** 'x' for east/west walls (extends along z), 'z' for north/south (extends along x) */
  axis: 'x' | 'z';
}

/**
 * Build wall meshes for a single linear edge, punching gaps near door waypoints.
 * The edge is subdivided into 0.5 m slices; slices near doors are skipped.
 */
function buildEdgeWalls(
  edge: WallEdge,
  doorWaypoints: Waypoint[],
  wallHeight: number,
  wallThickness: number,
): WallSegmentProps[] {
  const SLICE = 0.5; // subdivision granularity (meters)
  const DOOR_RADIUS = 1.5;
  const results: WallSegmentProps[] = [];

  if (edge.axis === 'z') {
    // Wall runs along X (north or south edge)
    const z = edge.sz;
    const startX = Math.min(edge.sx, edge.ex);
    const endX = Math.max(edge.sx, edge.ex);
    let cursor = startX;

    while (cursor < endX) {
      const sliceEnd = Math.min(cursor + SLICE, endX);
      const midX = (cursor + sliceEnd) / 2;

      if (!isNearDoor(midX, z, doorWaypoints, DOOR_RADIUS)) {
        const width = sliceEnd - cursor;
        results.push({
          position: [midX, wallHeight / 2, z],
          size: [width, wallHeight, wallThickness],
        });
      }
      cursor = sliceEnd;
    }
  } else {
    // Wall runs along Z (east or west edge)
    const x = edge.sx;
    const startZ = Math.min(edge.sz, edge.ez);
    const endZ = Math.max(edge.sz, edge.ez);
    let cursor = startZ;

    while (cursor < endZ) {
      const sliceEnd = Math.min(cursor + SLICE, endZ);
      const midZ = (cursor + sliceEnd) / 2;

      if (!isNearDoor(x, midZ, doorWaypoints, DOOR_RADIUS)) {
        const depth = sliceEnd - cursor;
        results.push({
          position: [x, wallHeight / 2, midZ],
          size: [wallThickness, wallHeight, depth],
        });
      }
      cursor = sliceEnd;
    }
  }

  return results;
}

// ── Single Region Mesh ──────────────────────────────────────

interface RegionMeshProps {
  region: Region;
  doorWaypoints: Waypoint[];
}

function RegionMesh({ region, doorWaypoints }: RegionMeshProps) {
  const { wallHeight, wallThickness, floorThickness } = SCENE_CONFIG;
  const floorColor = FLOOR_COLORS[region.type] ?? COLORS.floorColor;

  const { bbox, walls } = useMemo(() => {
    const bb = polygonBounds(region.polygon);
    const width = bb.maxX - bb.minX;
    const depth = bb.maxY - bb.minY;

    // Four bounding-box edges
    const edges: WallEdge[] = [
      // North wall (minY edge, runs along X)
      { sx: bb.minX, sz: bb.minY, ex: bb.maxX, ez: bb.minY, axis: 'z' },
      // South wall (maxY edge, runs along X)
      { sx: bb.minX, sz: bb.maxY, ex: bb.maxX, ez: bb.maxY, axis: 'z' },
      // West wall (minX edge, runs along Z)
      { sx: bb.minX, sz: bb.minY, ex: bb.minX, ez: bb.maxY, axis: 'x' },
      // East wall (maxX edge, runs along Z)
      { sx: bb.maxX, sz: bb.minY, ex: bb.maxX, ez: bb.maxY, axis: 'x' },
    ];

    const allWalls: WallSegmentProps[] = [];
    for (const edge of edges) {
      allWalls.push(...buildEdgeWalls(edge, doorWaypoints, wallHeight, wallThickness));
    }

    return {
      bbox: { ...bb, width, depth },
      walls: allWalls,
    };
  }, [region.polygon, doorWaypoints, wallHeight, wallThickness]);

  const centerX = (bbox.minX + bbox.maxX) / 2;
  const centerZ = (bbox.minY + bbox.maxY) / 2;

  return (
    <group>
      {/* ── Floor plane ──────────────────────────────────── */}
      <mesh
        position={[centerX, -floorThickness / 2, centerZ]}
        receiveShadow
      >
        <boxGeometry args={[bbox.width, floorThickness, bbox.depth]} />
        <meshStandardMaterial
          color={floorColor}
          roughness={0.9}
          metalness={0.05}
        />
      </mesh>

      {/* ── Walls ────────────────────────────────────────── */}
      {walls.map((w, i) => (
        <WallSegment key={`wall-${region.id}-${i}`} position={w.position} size={w.size} />
      ))}

      {/* ── Region label ─────────────────────────────────── */}
      <Text
        position={[centerX, 2.5, centerZ]}
        fontSize={0.3}
        color={COLORS.textMuted}
        anchorX="center"
        anchorY="middle"
        fillOpacity={0.35}
        outlineWidth={0}
        font={undefined}
      >
        {region.name}
      </Text>
    </group>
  );
}

// ── Main Component ──────────────────────────────────────────

/**
 * FloorGeometry renders the complete 3D floor plan.
 *
 * It creates rectangular floor planes, bounding-box walls (with gaps at
 * door-type waypoints), and semi-transparent region name labels for every
 * region supplied via props.
 */
export default function FloorGeometry({
  regions,
  connections: _connections,
  waypoints,
}: FloorGeometryProps) {
  // Collect all door-type waypoints so walls can be punched
  const doorWaypoints = useMemo(
    () => waypoints.filter((wp) => wp.type === 'door'),
    [waypoints],
  );

  return (
    <group name="floor-geometry">
      {regions.map((region) => (
        <RegionMesh
          key={region.id}
          region={region}
          doorWaypoints={doorWaypoints}
        />
      ))}
    </group>
  );
}
