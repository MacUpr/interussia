// ============================================================
// Inmap — RoutePath3D Component (Fixed)
// ============================================================
//
// Renders the navigation route as a 3D glowing animated line.
// Supports multi-floor routes with vertical segments for
// elevator/stairs transitions.
//
// Uses React Three Fiber / Three.js / drei
// ============================================================

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import type { Waypoint, Floor } from '../types/index';

// ── Props ───────────────────────────────────────────────────

interface RoutePath3DProps {
  path: Waypoint[];
  floors: Floor[];
  floorSpacing: number;
  userPosition?: { x: number; y: number } | null;
  userFloorId?: string | null;
}

// ── Constants ───────────────────────────────────────────────

const PATH_COLOR = '#00ffcc';
const USER_DOT_COLOR = '#00ffcc';
const DESTINATION_COLOR = '#ef4444';
const FLOOR_CHANGE_COLOR = '#f59e0b';

// ── Helpers ─────────────────────────────────────────────────

function getFloorYOffset(floorId: string, floors: Floor[], spacing: number): number {
  const floor = floors.find((f) => f.id === floorId);
  return floor ? floor.level * spacing : 0;
}

function waypointFloorId(wp: Waypoint, floors: Floor[]): string {
  for (const floor of floors) {
    if (floor.waypoints.some((w) => w.id === wp.id)) return floor.id;
  }
  if (wp.regionId.startsWith('G_')) return 'FLOOR_GROUND';
  if (wp.regionId.startsWith('F1_')) return 'FLOOR_1';
  if (wp.regionId.startsWith('F2_')) return 'FLOOR_2';
  return 'FLOOR_GROUND';
}

// ── Animated Path Tube ──────────────────────────────────────

const AnimatedPathTube: React.FC<{
  points: THREE.Vector3[];
  color: string;
}> = ({ points, color }) => {
  const glowRef = useRef<THREE.Mesh>(null);
  const startTime = useRef(performance.now());

  const { tubeGeo, glowGeo } = useMemo(() => {
    if (points.length < 2) return { tubeGeo: null, glowGeo: null };
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.3);
    return {
      tubeGeo: new THREE.TubeGeometry(curve, points.length * 8, 0.2, 8, false),
      glowGeo: new THREE.TubeGeometry(curve, points.length * 8, 0.5, 8, false),
    };
  }, [points]);

  useFrame(() => {
    if (glowRef.current) {
      const elapsed = (performance.now() - startTime.current) / 1000;
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.08 + Math.sin(elapsed * 2) * 0.04;
    }
  });

  if (!tubeGeo || !glowGeo) return null;

  return (
    <group>
      <mesh geometry={tubeGeo}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.6}
          transparent
          opacity={0.9}
        />
      </mesh>
      <mesh ref={glowRef} geometry={glowGeo}>
        <meshBasicMaterial color={color} transparent opacity={0.1} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

// ── User Position Dot ───────────────────────────────────────

const UserDot3D: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  const ringRef = useRef<THREE.Mesh>(null);
  const dotRef = useRef<THREE.Mesh>(null);
  const startTime = useRef(performance.now());

  useFrame(() => {
    const elapsed = (performance.now() - startTime.current) / 1000;
    if (ringRef.current) {
      const scale = 1 + Math.sin(elapsed * 3) * 0.3;
      ringRef.current.scale.set(scale, scale, 1);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.6 - Math.sin(elapsed * 3) * 0.3;
    }
    if (dotRef.current) {
      (dotRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        0.5 + Math.sin(elapsed * 4) * 0.3;
    }
  });

  return (
    <group position={position}>
      <mesh ref={dotRef}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial
          color={USER_DOT_COLOR}
          emissive={USER_DOT_COLOR}
          emissiveIntensity={0.5}
        />
      </mesh>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[0.7, 1.0, 32]} />
        <meshBasicMaterial
          color={USER_DOT_COLOR}
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};

// ── Destination Marker ──────────────────────────────────────

const DestinationMarker3D: React.FC<{
  position: [number, number, number];
}> = ({ position }) => {
  const groupRef = useRef<THREE.Group>(null);
  const startTime = useRef(performance.now());

  useFrame(() => {
    if (groupRef.current) {
      const elapsed = (performance.now() - startTime.current) / 1000;
      groupRef.current.position.y = position[1] + Math.sin(elapsed * 2) * 0.3;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh position={[0, 0.8, 0]}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial
          color={DESTINATION_COLOR}
          emissive={DESTINATION_COLOR}
          emissiveIntensity={0.5}
        />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.8, 8]} />
        <meshStandardMaterial color={DESTINATION_COLOR} />
      </mesh>
    </group>
  );
};

// ── Main Component ──────────────────────────────────────────

const RoutePath3D: React.FC<RoutePath3DProps> = ({
  path,
  floors,
  floorSpacing,
  userPosition,
  userFloorId,
}) => {
  const { floorSegments, floorChanges } = useMemo(() => {
    if (path.length < 2) return { floorSegments: [], floorChanges: [] };

    const segments: { floorId: string; points: THREE.Vector3[] }[] = [];
    const changes: { from: THREE.Vector3; to: THREE.Vector3 }[] = [];

    let curFloor = waypointFloorId(path[0], floors);
    let curPts: THREE.Vector3[] = [];

    for (const wp of path) {
      const wpFloor = waypointFloorId(wp, floors);
      const yOff = getFloorYOffset(wpFloor, floors, floorSpacing);

      if (wpFloor !== curFloor) {
        if (curPts.length > 0) segments.push({ floorId: curFloor, points: [...curPts] });
        const prevY = getFloorYOffset(curFloor, floors, floorSpacing);
        const fromPt = curPts.length > 0
          ? curPts[curPts.length - 1]
          : new THREE.Vector3(wp.x, prevY + 0.3, wp.y);
        changes.push({ from: fromPt, to: new THREE.Vector3(wp.x, yOff + 0.3, wp.y) });
        curFloor = wpFloor;
        curPts = [new THREE.Vector3(wp.x, yOff + 0.3, wp.y)];
      } else {
        curPts.push(new THREE.Vector3(wp.x, yOff + 0.3, wp.y));
      }
    }
    if (curPts.length > 0) segments.push({ floorId: curFloor, points: curPts });

    return { floorSegments: segments, floorChanges: changes };
  }, [path, floors, floorSpacing]);

  const userPos3D = useMemo<[number, number, number] | null>(() => {
    if (!userPosition || !userFloorId) return null;
    const yOff = getFloorYOffset(userFloorId, floors, floorSpacing);
    return [userPosition.x, yOff + 0.5, userPosition.y];
  }, [userPosition, userFloorId, floors, floorSpacing]);

  const destPos3D = useMemo<[number, number, number] | null>(() => {
    if (path.length === 0) return null;
    const last = path[path.length - 1];
    const floorId = waypointFloorId(last, floors);
    const yOff = getFloorYOffset(floorId, floors, floorSpacing);
    return [last.x, yOff + 0.5, last.y];
  }, [path, floors, floorSpacing]);

  return (
    <group>
      {floorSegments.map((seg, i) => (
        <AnimatedPathTube key={`seg-${i}`} points={seg.points} color={PATH_COLOR} />
      ))}
      {floorChanges.map((ch, i) => (
        <AnimatedPathTube
          key={`change-${i}`}
          points={[ch.from, ch.to]}
          color={FLOOR_CHANGE_COLOR}
        />
      ))}
      {userPos3D && <UserDot3D position={userPos3D} />}
      {destPos3D && <DestinationMarker3D position={destPos3D} />}
    </group>
  );
};

export default RoutePath3D;
