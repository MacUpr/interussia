import React, { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import BuildingScene from '../scene/BuildingScene';
import DirectionOverlay from './DirectionOverlay';
import FloorPlanMinimap from './FloorPlanMinimap';
import { useNavigationStore } from '../store/navigationStore';
import { pathToVector3Array, createDefaultMapper, map2DTo3D } from '../engine/coordinateMapper';
import { GROUND_FLOOR } from '../data/building';
import { COLORS, SCENE_CONFIG } from '../utils/constants';

/**
 * ARNavigationView — full-screen AR navigation viewport.
 *
 * Composites:
 *  - R3F Canvas with BuildingScene (3D environment + first-person controls)
 *  - DirectionOverlay HUD (top + bottom banners)
 *  - FloorPlanMinimap (bottom-right corner)
 *  - Cancel button (top-left)
 *
 * Reads navigation state from zustand store and converts the calculated
 * waypoint path to Vector3 positions using the coordinate mapper.
 */
const ARNavigationView: React.FC = () => {
  const navigate = useNavigate();

  // ── Store selectors ────────────────────────────────────
  const phase = useNavigationStore((s) => s.phase);
  const currentPosition = useNavigationStore((s) => s.currentPosition);
  const calculatedPath = useNavigationStore((s) => s.calculatedPath);
  const selectedDestination = useNavigationStore((s) => s.selectedDestination);
  const currentInstruction = useNavigationStore((s) => s.currentInstruction);
  const distanceToNext = useNavigationStore((s) => s.distanceToNext);
  const totalDistanceRemaining = useNavigationStore((s) => s.totalDistanceRemaining);
  const cancelNavigation = useNavigationStore((s) => s.cancelNavigation);
  const updatePosition = useNavigationStore((s) => s.updatePosition);
  const scannedAnchor = useNavigationStore((s) => s.scannedAnchor);

  // ── Coordinate mapper ──────────────────────────────────
  const mapper = useMemo(() => createDefaultMapper(), []);

  /** Path waypoints converted to 3D positions for BuildingScene. */
  const pathPoints = useMemo(() => {
    if (!calculatedPath || calculatedPath.length === 0) return undefined;
    return pathToVector3Array(calculatedPath, mapper);
  }, [calculatedPath, mapper]);

  /** Destination 3D descriptor for BuildingScene's DestinationMarker. */
  const destination = useMemo(() => {
    if (!selectedDestination) return undefined;
    const pos3d = map2DTo3D(
      selectedDestination.position.x,
      selectedDestination.position.y,
      mapper,
    );
    return {
      position: pos3d,
      label: selectedDestination.name,
      icon: selectedDestination.icon,
    };
  }, [selectedDestination, mapper]);

  /** Player start position from scanned anchor (converted to 3D). */
  const playerStart = useMemo(() => {
    if (!scannedAnchor) return { x: 5, z: -7 }; // default lobby position
    const pos3d = map2DTo3D(
      scannedAnchor.position.x,
      scannedAnchor.position.y,
      mapper,
    );
    return { x: pos3d.x, z: pos3d.z };
  }, [scannedAnchor, mapper]);

  /** Called by BuildingScene when the simulated player moves. */
  const handlePlayerMove = useCallback(
    (x: number, z: number) => {
      updatePosition(x, z);
    },
    [updatePosition],
  );

  /** Cancel navigation and return home. */
  const handleCancel = useCallback(() => {
    cancelNavigation();
    navigate('/');
  }, [cancelNavigation, navigate]);

  // ── Floor data ─────────────────────────────────────────
  const regions = GROUND_FLOOR.regions;
  const connections = GROUND_FLOOR.connections;
  const waypoints = GROUND_FLOOR.waypoints;
  const bounds = GROUND_FLOOR.bounds;
  const minimapPath = calculatedPath ?? null;
  const minimapPos = currentPosition ?? null;
  const minimapDest = selectedDestination?.position ?? null;

  return (
    <div style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', background: '#000' }}>
      {/* ── 3D Canvas ─────────────────────────────────────── */}
      <Canvas
        style={{ width: '100%', height: '100%' }}
        camera={{
          fov: SCENE_CONFIG.fov,
          near: SCENE_CONFIG.nearClip,
          far: SCENE_CONFIG.farClip,
          position: [playerStart.x, SCENE_CONFIG.cameraHeight, playerStart.z],
        }}
        gl={{ antialias: true, alpha: false }}
      >
        <BuildingScene
          regions={regions}
          connections={connections}
          waypoints={waypoints}
          pathPoints={pathPoints}
          destination={destination}
          onPlayerMove={handlePlayerMove}
          playerStart={playerStart}
          navigationActive={phase === 'navigating' || phase === 'arrived'}
        />
      </Canvas>

      {/* ── Direction Overlay (HUD) ───────────────────────── */}
      <DirectionOverlay
        instruction={currentInstruction}
        distance={distanceToNext}
        totalRemaining={totalDistanceRemaining}
        phase={phase}
      />

      {/* ── Cancel Button ─────────────────────────────────── */}
      <div
        className="hud-overlay"
        style={{ position: 'absolute', top: 20, left: 20, zIndex: 210 }}
      >
        <button
          className="glass-card--static btn-icon"
          style={{
            width: 44,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem',
            color: COLORS.accentDanger,
            cursor: 'pointer',
            border: `1px solid rgba(239,68,68,0.3)`,
            borderRadius: 12,
          }}
          onClick={handleCancel}
          aria-label="Cancel navigation"
        >
          ✕
        </button>
      </div>

      {/* ── Minimap ───────────────────────────────────────── */}
      <div
        className="hud-overlay hud-bottom-right"
        style={{ position: 'absolute', zIndex: 210 }}
      >
        <FloorPlanMinimap
          regions={regions}
          path={minimapPath}
          currentPosition={minimapPos}
          destination={minimapDest}
          bounds={bounds}
        />
      </div>
    </div>
  );
};

export default ARNavigationView;
