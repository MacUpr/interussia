// ============================================================
// Inmap — FloorSlice3D Component (Fixed Geometry)
// ============================================================
//
// Renders a single floor as a 3D layer using XZ-plane geometry:
//   - Flat slab (floor plane)
//   - Extruded room walls from Region polygon data
//   - Room labels as Billboard text
//   - Edge outlines using drei Line
//   - Color coded by region type
//
// All geometry is built directly in XZ plane (no rotation hacks).
// ============================================================

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Text, Billboard, Line } from '@react-three/drei';
import type { Floor, Region, PointOfInterest } from '../types/index';

// ── Props ───────────────────────────────────────────────────

interface FloorSlice3DProps {
  floor: Floor;
  yOffset: number;
  isActive: boolean;
  opacity: number;
  pois?: PointOfInterest[];
  selectedPOI?: PointOfInterest | null;
  onPOITap?: (poi: PointOfInterest) => void;
}

// ── Color Palette ───────────────────────────────────────────

const REGION_COLORS: Record<string, string> = {
  room:           '#2a3050',
  corridor:       '#1e2740',
  lobby:          '#252d48',
  stairwell:      '#2d3555',
  elevator_shaft: '#2d3555',
  restroom:       '#282f4a',
  outdoor:        '#151b2e',
};

const REGION_EDGE_COLORS: Record<string, string> = {
  room:           '#4a5580',
  corridor:       '#3a4565',
  lobby:          '#4a5580',
  stairwell:      '#5a6590',
  elevator_shaft: '#5a6590',
  restroom:       '#4a5580',
  outdoor:        '#3a4565',
};

const WALL_HEIGHT = 2.2;
const SLAB_THICKNESS = 0.3;

// ── Helpers ─────────────────────────────────────────────────

/** Compute the centroid of a 2D polygon. Returns [x, z] in 3D space. */
function regionCenter(polygon: [number, number][]): [number, number] {
  let cx = 0, cz = 0;
  for (const [x, z] of polygon) { cx += x; cz += z; }
  return [cx / polygon.length, cz / polygon.length];
}

/**
 * Creates a floor plane geometry DIRECTLY in the XZ plane.
 * No rotation needed — polygon [x, y] maps to 3D (x, 0, y).
 */
function createFloorPlaneGeometry(polygon: [number, number][]): THREE.BufferGeometry {
  if (polygon.length < 3) return new THREE.BufferGeometry();

  const vertices: number[] = [];
  for (const [x, z] of polygon) {
    vertices.push(x, 0, z);
  }

  // Simple fan triangulation from vertex 0
  const indices: number[] = [];
  for (let i = 1; i < polygon.length - 1; i++) {
    indices.push(0, i, i + 1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates wall geometry for a room. Each polygon edge becomes a
 * vertical quad from y=0 to y=height.
 * Polygon [x, y] maps to 3D (x, 0..height, y).
 */
function createWallGeometry(polygon: [number, number][], height: number): THREE.BufferGeometry {
  const vertices: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i < polygon.length; i++) {
    const [x1, z1] = polygon[i];
    const [x2, z2] = polygon[(i + 1) % polygon.length];
    const baseIdx = vertices.length / 3;

    vertices.push(x1, 0,      z1);  // bottom-left
    vertices.push(x2, 0,      z2);  // bottom-right
    vertices.push(x2, height, z2);  // top-right
    vertices.push(x1, height, z1);  // top-left

    indices.push(baseIdx, baseIdx + 1, baseIdx + 2);
    indices.push(baseIdx, baseIdx + 2, baseIdx + 3);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// ── Room Mesh Sub-Component ─────────────────────────────────

interface RoomMeshProps {
  region: Region;
  yOffset: number;
  isActive: boolean;
  opacity: number;
}

const RoomMesh: React.FC<RoomMeshProps> = React.memo(({ region, yOffset, isActive, opacity }) => {
  const fillColor = REGION_COLORS[region.type] || REGION_COLORS.room;
  const edgeColor = REGION_EDGE_COLORS[region.type] || REGION_EDGE_COLORS.room;
  const isCorridorLike = region.type === 'corridor' || region.type === 'lobby';
  const wallH = isCorridorLike ? 0 : WALL_HEIGHT;

  // Floor plane — built directly in XZ, no rotation needed
  const floorGeo = useMemo(
    () => createFloorPlaneGeometry(region.polygon),
    [region.polygon],
  );

  // Walls (rooms only)
  const wallGeo = useMemo(
    () => (wallH > 0 ? createWallGeometry(region.polygon, wallH) : null),
    [region.polygon, wallH],
  );

  // Edge outline points for drei <Line>: closed loop in 3D
  const edgePoints = useMemo((): [number, number, number][] => {
    const pts: [number, number, number][] = region.polygon.map(
      ([x, z]) => [x, 0.05, z] as [number, number, number],
    );
    // Close the loop
    if (pts.length > 0) pts.push(pts[0]);
    return pts;
  }, [region.polygon]);

  const [cx, cz] = useMemo(() => regionCenter(region.polygon), [region.polygon]);

  // Extract the short label (first part before " / ")
  const shortLabel = region.name.includes(' / ')
    ? region.name.split(' / ')[0]
    : region.name;

  return (
    <group position={[0, yOffset, 0]}>
      {/* Floor plane (XZ) */}
      <mesh geometry={floorGeo} receiveShadow>
        <meshStandardMaterial
          color={fillColor}
          transparent
          opacity={opacity * (isActive ? 1 : 0.6)}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Walls (rooms only, active floor only) */}
      {wallGeo && isActive && (
        <mesh geometry={wallGeo}>
          <meshStandardMaterial
            color={fillColor}
            transparent
            opacity={opacity * 0.8}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Edge outline using drei Line */}
      {edgePoints.length > 1 && (
        <Line
          points={edgePoints}
          color={isActive ? edgeColor : '#3a4565'}
          lineWidth={isActive ? 1.5 : 0.8}
          transparent
          opacity={opacity * (isActive ? 1 : 0.4)}
        />
      )}

      {/* Wall top edges for active rooms (gives a crisp 3D outline) */}
      {wallGeo && isActive && (
        <Line
          points={region.polygon.map(
            ([x, z]) => [x, wallH, z] as [number, number, number],
          ).concat([region.polygon[0]].map(
            ([x, z]) => [x, wallH, z] as [number, number, number],
          ))}
          color={edgeColor}
          lineWidth={1}
          transparent
          opacity={opacity * 0.7}
        />
      )}

      {/* Room label (active floor, not corridors) */}
      {isActive && region.type !== 'corridor' && (
        <Billboard position={[cx, wallH > 0 ? wallH + 0.6 : 0.8, cz]}>
          <Text
            fontSize={1.0}
            color="#c4c9de"
            anchorX="center"
            anchorY="middle"
            maxWidth={14}
            textAlign="center"
            outlineWidth={0.06}
            outlineColor="#0a0e1a"
          >
            {shortLabel}
          </Text>
        </Billboard>
      )}
    </group>
  );
});

RoomMesh.displayName = 'RoomMesh';

// ── POI Marker Sub-Component ────────────────────────────────

interface POIMarker3DProps {
  poi: PointOfInterest;
  yOffset: number;
  isSelected: boolean;
  onTap: () => void;
}

const POIMarker3D: React.FC<POIMarker3DProps> = React.memo(({ poi, yOffset, isSelected, onTap }) => {
  const markerY = yOffset + WALL_HEIGHT + 0.8;
  const scale = isSelected ? 1.3 : 1;

  // Show Russian name (before " / ") if available
  const displayName = poi.name.includes(' / ')
    ? poi.name.split(' / ')[0]
    : poi.name;

  return (
    <group
      position={[poi.position.x, markerY, poi.position.y]}
      onClick={(e) => { e.stopPropagation(); onTap(); }}
      scale={[scale, scale, scale]}
    >
      {/* Marker sphere */}
      <mesh>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial
          color={isSelected ? '#00ffcc' : '#6366f1'}
          emissive={isSelected ? '#00ffcc' : '#6366f1'}
          emissiveIntensity={isSelected ? 0.8 : 0.3}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Vertical line from floor to marker */}
      <Line
        points={[[0, -(WALL_HEIGHT + 0.8), 0], [0, -0.4, 0]]}
        color={isSelected ? '#00ffcc' : '#6366f1'}
        lineWidth={1}
        transparent
        opacity={0.3}
      />

      {/* Ring around selected */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.6, 0.8, 32]} />
          <meshBasicMaterial color="#00ffcc" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Label */}
      <Billboard position={[0, 1.2, 0]}>
        <Text
          fontSize={0.7}
          color={isSelected ? '#00ffcc' : '#e5e7eb'}
          anchorX="center"
          anchorY="bottom"
          maxWidth={10}
          textAlign="center"
          outlineWidth={0.06}
          outlineColor="#0a0e1a"
        >
          {poi.icon} {displayName}
        </Text>
      </Billboard>
    </group>
  );
});

POIMarker3D.displayName = 'POIMarker3D';

// ── Main Component ──────────────────────────────────────────

const FloorSlice3D: React.FC<FloorSlice3DProps> = ({
  floor,
  yOffset,
  isActive,
  opacity,
  pois = [],
  selectedPOI,
  onPOITap,
}) => {
  const { bounds } = floor;
  const slabWidth = bounds.maxX - bounds.minX;
  const slabDepth = bounds.maxY - bounds.minY;

  // Short floor label (Russian first)
  const floorLabel = floor.name.includes(' / ')
    ? floor.name.split(' / ')[0]
    : (floor.level === 0 ? 'G' : `F${floor.level}`);

  return (
    <group>
      {/* Floor slab base */}
      <mesh
        position={[
          bounds.minX + slabWidth / 2,
          yOffset - SLAB_THICKNESS / 2,
          bounds.minY + slabDepth / 2,
        ]}
        receiveShadow
      >
        <boxGeometry args={[slabWidth + 0.5, SLAB_THICKNESS, slabDepth + 0.5]} />
        <meshStandardMaterial
          color="#111827"
          transparent
          opacity={opacity * 0.9}
        />
      </mesh>

      {/* Slab edge wireframe */}
      {!isActive && (
        <mesh
          position={[
            bounds.minX + slabWidth / 2,
            yOffset - SLAB_THICKNESS / 2,
            bounds.minY + slabDepth / 2,
          ]}
        >
          <boxGeometry args={[slabWidth + 0.5, SLAB_THICKNESS, slabDepth + 0.5]} />
          <meshStandardMaterial
            color="#2a3050"
            transparent
            opacity={opacity * 0.5}
            wireframe
          />
        </mesh>
      )}

      {/* Regions (rooms, corridors, etc.) */}
      {floor.regions.map((region) => (
        <RoomMesh
          key={region.id}
          region={region}
          yOffset={yOffset}
          isActive={isActive}
          opacity={opacity}
        />
      ))}

      {/* POI markers (only on active floor) */}
      {isActive && pois.map((poi) => (
        <POIMarker3D
          key={poi.id}
          poi={poi}
          yOffset={yOffset}
          isSelected={selectedPOI?.id === poi.id}
          onTap={() => onPOITap?.(poi)}
        />
      ))}

      {/* Floor level label (on the left side) */}
      <Billboard position={[-4, yOffset + 1.5, bounds.minY + slabDepth / 2]}>
        <Text
          fontSize={1.6}
          color={isActive ? '#00ffcc' : '#4b5563'}
          anchorX="center"
          anchorY="middle"
          fontWeight={700}
          outlineWidth={0.05}
          outlineColor="#0a0e1a"
        >
          {floorLabel}
        </Text>
      </Billboard>
    </group>
  );
};

export default FloorSlice3D;
