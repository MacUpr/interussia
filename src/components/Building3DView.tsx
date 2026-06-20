// ============================================================
// Inmap — Building3DView Component (Fixed)
// ============================================================
//
// Main 3D scene that renders the entire NSU building with:
//   - Stacked floor slabs (active floor opaque, others ghosted)
//   - Orbital camera controls (rotate, zoom, tilt)
//   - 3D route path with animations
//   - POI markers with labels
//   - Atmospheric lighting and ground grid
//
// Uses React Three Fiber / Three.js / drei
// ============================================================

import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { Floor, PointOfInterest, Waypoint } from '../types/index';
import FloorSlice3D from './FloorSlice3D';
import RoutePath3D from './RoutePath3D';

// ── Props ───────────────────────────────────────────────────

interface Building3DViewProps {
  floors: Floor[];
  activeFloorLevel: number;
  path: Waypoint[] | null;
  userPosition: { x: number; y: number } | null;
  userFloorId?: string | null;
  pois: PointOfInterest[];
  selectedPOI: PointOfInterest | null;
  onPOITap: (poi: PointOfInterest) => void;
  onEmptyTap: () => void;
}

// ── Constants ───────────────────────────────────────────────

const FLOOR_SPACING = 6;
const INACTIVE_OPACITY = 0.12;
const ACTIVE_OPACITY = 1.0;

// ── Camera Controller ───────────────────────────────────────

interface CameraControllerProps {
  targetY: number;
  center: [number, number, number];
}

const CameraController: React.FC<CameraControllerProps> = ({ targetY, center }) => {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const initialized = useRef(false);

  // Set initial camera position on first render
  useEffect(() => {
    if (!initialized.current) {
      camera.position.set(center[0] + 50, targetY + 40, center[2] + 50);
      camera.lookAt(new THREE.Vector3(center[0], targetY, center[2]));
      initialized.current = true;
    }
  }, [camera, center, targetY]);

  // Animate to new floor when activeFloorLevel changes
  useEffect(() => {
    if (!controlsRef.current || !initialized.current) return;
    const controls = controlsRef.current;
    const newTarget = new THREE.Vector3(center[0], targetY + 1, center[2]);
    const startTarget = controls.target.clone();
    let start: number | null = null;

    const animate = (time: number) => {
      if (start === null) start = time;
      const t = Math.min((time - start) / 600, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      controls.target.lerpVectors(startTarget, newTarget, ease);
      controls.update();
      if (t < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [targetY, center]);

  return (
    <OrbitControls
      ref={controlsRef}
      target={[center[0], targetY + 1, center[2]]}
      minDistance={20}
      maxDistance={120}
      minPolarAngle={Math.PI * 0.1}
      maxPolarAngle={Math.PI * 0.45}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.5}
      zoomSpeed={0.8}
      panSpeed={0.5}
      enablePan
    />
  );
};

// ── Scene Content ───────────────────────────────────────────

const SceneContent: React.FC<Building3DViewProps & { center: [number, number, number] }> = ({
  floors,
  activeFloorLevel,
  path,
  userPosition,
  userFloorId,
  pois,
  selectedPOI,
  onPOITap,
  onEmptyTap,
  center,
}) => {
  const activeFloorY = activeFloorLevel * FLOOR_SPACING;

  return (
    <>
      <CameraController targetY={activeFloorY} center={center} />

      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[40, 60, 30]} intensity={0.8} castShadow />
      <directionalLight position={[-20, 40, -20]} intensity={0.3} />
      <pointLight position={[center[0], 25, center[2]]} intensity={0.15} color="#00ffcc" />

      {/* Background click plane */}
      <mesh
        position={[center[0], -2, center[2]]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={onEmptyTap}
        visible={false}
      >
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial />
      </mesh>

      {/* Ground plane */}
      <mesh
        position={[center[0], -0.5, center[2]]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[120, 80]} />
        <meshStandardMaterial color="#080c16" />
      </mesh>

      {/* Ground grid */}
      <gridHelper
        args={[120, 40, '#1a1f35', '#12162a']}
        position={[center[0], -0.49, center[2]]}
      />

      {/* Floor slices */}
      {floors.map((floor) => {
        const isActive = floor.level === activeFloorLevel;
        return (
          <FloorSlice3D
            key={floor.id}
            floor={floor}
            yOffset={floor.level * FLOOR_SPACING}
            isActive={isActive}
            opacity={isActive ? ACTIVE_OPACITY : INACTIVE_OPACITY}
            pois={isActive ? pois : []}
            selectedPOI={isActive ? selectedPOI : null}
            onPOITap={onPOITap}
          />
        );
      })}

      {/* Route path */}
      {path && path.length >= 2 && (
        <RoutePath3D
          path={path}
          floors={floors}
          floorSpacing={FLOOR_SPACING}
          userPosition={userPosition}
          userFloorId={userFloorId}
        />
      )}
    </>
  );
};

// ── Main Component ──────────────────────────────────────────

const Building3DView: React.FC<Building3DViewProps> = (props) => {
  const { floors } = props;

  const center = useMemo<[number, number, number]>(() => {
    if (floors.length === 0) return [30, 0, 12.5];
    const { bounds } = floors[0];
    return [
      (bounds.minX + bounds.maxX) / 2,
      0,
      (bounds.minY + bounds.maxY) / 2,
    ];
  }, [floors]);

  return (
    <div style={{ width: '100%', height: '100%', background: '#0a0e1a' }}>
      <Canvas
        shadows
        camera={{
          fov: 50,
          near: 0.5,
          far: 500,
          position: [center[0] + 50, 40, center[2] + 50],
        }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
        }}
        onPointerMissed={props.onEmptyTap}
        style={{ touchAction: 'none' }}
      >
        <SceneContent {...props} center={center} />
      </Canvas>
    </div>
  );
};

export default Building3DView;
