// ============================================================
// Inmap — DestinationMarker: Floating 3D Destination Pin
// ============================================================

import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Text, Billboard } from '@react-three/drei';

import { COLORS, SCENE_CONFIG } from '../utils/constants';

// ── Props ───────────────────────────────────────────────────

interface DestinationMarkerProps {
  position: { x: number; y: number; z: number };
  label: string;
  icon: string;
  visible: boolean;
}

// ── Constants ───────────────────────────────────────────────

const INDIGO = new THREE.Color(COLORS.markerColor);
const RING_INNER = 0.4;
const RING_OUTER = 0.7;
const RING_SEGMENTS = 48;

/**
 * DestinationMarker renders a floating pin at the target location.
 *
 * Visual elements:
 * - A ConeGeometry "pin" that gently bobs up and down.
 * - A small sphere cap on top of the pin.
 * - An emoji icon floating above the pin (via drei `<Text>`).
 * - A text label below the icon, always facing the camera via `<Billboard>`.
 * - A pulsing glow ring projected onto the floor beneath the marker.
 */
export default function DestinationMarker({
  position,
  label,
  icon,
  visible,
}: DestinationMarkerProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const ringRef = useRef<THREE.Mesh>(null!);
  const pinRef = useRef<THREE.Group>(null!);

  // Stable base position
  const base = useMemo(
    () => new THREE.Vector3(position.x, position.y, position.z),
    [position.x, position.y, position.z],
  );

  // ── Animation loop ────────────────────────────────────────

  useFrame((state) => {
    if (!visible) return;

    const t = state.clock.elapsedTime;

    // Bob the pin up and down
    if (pinRef.current) {
      pinRef.current.position.y =
        SCENE_CONFIG.markerFloatHeight +
        Math.sin(t * SCENE_CONFIG.markerBobSpeed * Math.PI * 2) *
          SCENE_CONFIG.markerBobAmplitude;
    }

    // Pulse the floor ring
    if (ringRef.current) {
      const pulse = 0.4 + 0.4 * Math.sin(t * 3);
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = pulse;

      // Subtle scale breathing
      const s = 1 + 0.08 * Math.sin(t * 2);
      ringRef.current.scale.set(s, s, 1);
    }
  });

  if (!visible) return null;

  return (
    <group ref={groupRef} position={[base.x, base.y, base.z]} name="destination-marker">
      {/* ── Floor glow ring ───────────────────────────────── */}
      <mesh
        ref={ringRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.02, 0]}
        renderOrder={998}
      >
        <ringGeometry args={[RING_INNER, RING_OUTER, RING_SEGMENTS]} />
        <meshBasicMaterial
          color={INDIGO}
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
          depthTest={false}
        />
      </mesh>

      {/* ── Pin body ──────────────────────────────────────── */}
      <group ref={pinRef} position={[0, SCENE_CONFIG.markerFloatHeight, 0]}>
        {/* Cone */}
        <mesh rotation={[Math.PI, 0, 0]} castShadow>
          <coneGeometry args={[0.18, 0.45, 16]} />
          <meshStandardMaterial
            color={INDIGO}
            emissive={INDIGO}
            emissiveIntensity={0.4}
            roughness={0.3}
            metalness={0.5}
          />
        </mesh>

        {/* Sphere cap on top of cone (at the wide end) */}
        <mesh position={[0, 0.22, 0]} castShadow>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial
            color={INDIGO}
            emissive={INDIGO}
            emissiveIntensity={0.5}
            roughness={0.25}
            metalness={0.5}
          />
        </mesh>

        {/* ── Billboard label + icon ──────────────────────── */}
        <Billboard follow lockX={false} lockY={false} lockZ={false}>
          {/* Emoji icon */}
          <Text
            position={[0, 0.65, 0]}
            fontSize={0.35}
            anchorX="center"
            anchorY="middle"
          >
            {icon}
          </Text>

          {/* Text label */}
          <Text
            position={[0, 0.38, 0]}
            fontSize={0.16}
            color={COLORS.textPrimary}
            anchorX="center"
            anchorY="middle"
            fillOpacity={0.9}
            outlineWidth={0.015}
            outlineColor="#000000"
            maxWidth={2}
          >
            {label}
          </Text>
        </Billboard>
      </group>
    </group>
  );
}
