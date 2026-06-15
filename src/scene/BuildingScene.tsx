// ============================================================
// Inmap — BuildingScene: Main 3D Scene Composition
// ============================================================

import { useMemo } from 'react';
import * as THREE from 'three';

import type {
  Region,
  WaypointConnection,
  Waypoint,
} from '../types/index';

import FloorGeometry from './FloorGeometry';
import NavigationPath3D from './NavigationPath3D';
import DestinationMarker from './DestinationMarker';
import PlayerCamera from './PlayerCamera';

// ── Props ───────────────────────────────────────────────────

interface BuildingSceneProps {
  regions: Region[];
  connections: WaypointConnection[];
  waypoints: Waypoint[];
  pathPoints?: Array<{ x: number; y: number; z: number }>;
  destination?: {
    position: { x: number; y: number; z: number };
    label: string;
    icon: string;
  };
  onPlayerMove?: (x: number, z: number) => void;
  playerStart?: { x: number; z: number };
  navigationActive: boolean;
}

// ── Constants ───────────────────────────────────────────────

const GROUND_SIZE = 100;
const GRID_SIZE = 60;
const GRID_DIVISIONS = 60;
const GRID_COLOR_CENTER = new THREE.Color(0x1a1a2e);
const GRID_COLOR_LINE = new THREE.Color(0x111122);
const FOG_COLOR = new THREE.Color('#0a0e1a');
const GROUND_COLOR = '#080c18';

/**
 * BuildingScene is the top-level R3F component placed directly inside a
 * `<Canvas>`. It wires up:
 *
 * - Ambient + directional + hemisphere lighting
 * - Linear fog for depth cue
 * - A large ground plane and faint grid helper
 * - FloorGeometry (building walls & floors)
 * - NavigationPath3D (animated route line)
 * - DestinationMarker (floating goal pin)
 * - PlayerCamera (WASD + mouse-look first-person controller)
 *
 * **Do NOT wrap this component in a `<Canvas>`** — it is a child of one.
 */
export default function BuildingScene({
  regions,
  connections,
  waypoints,
  pathPoints,
  destination,
  onPlayerMove,
  playerStart,
  navigationActive,
}: BuildingSceneProps) {
  // Stable empty array for when no path is supplied
  const stablePathPoints = useMemo(
    () => pathPoints ?? [],
    [pathPoints],
  );

  return (
    <>
      {/* ── Fog ────────────────────────────────────────────── */}
      <fog attach="fog" args={[FOG_COLOR, 1, 60]} />

      {/* ── Lighting ───────────────────────────────────────── */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[15, 20, 10]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.5}
        shadow-camera-far={80}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
      />
      <hemisphereLight
        args={['#1a1a3e', '#0a0a1a', 0.35]}
      />

      {/* ── Ground plane ───────────────────────────────────── */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.06, 0]}
        receiveShadow
      >
        <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
        <meshStandardMaterial
          color={GROUND_COLOR}
          roughness={1}
          metalness={0}
        />
      </mesh>

      {/* ── Grid helper ────────────────────────────────────── */}
      <gridHelper
        args={[GRID_SIZE, GRID_DIVISIONS, GRID_COLOR_CENTER, GRID_COLOR_LINE]}
        position={[0, -0.05, 0]}
      />

      {/* ── Building geometry ──────────────────────────────── */}
      <FloorGeometry
        regions={regions}
        connections={connections}
        waypoints={waypoints}
      />

      {/* ── Navigation path ────────────────────────────────── */}
      <NavigationPath3D
        pathPoints={stablePathPoints}
        visible={navigationActive && stablePathPoints.length >= 2}
      />

      {/* ── Destination marker ─────────────────────────────── */}
      {destination && (
        <DestinationMarker
          position={destination.position}
          label={destination.label}
          icon={destination.icon}
          visible={navigationActive}
        />
      )}

      {/* ── First-person camera ────────────────────────────── */}
      <PlayerCamera
        onPositionChange={onPlayerMove}
        startPosition={playerStart}
        enabled
      />
    </>
  );
}
