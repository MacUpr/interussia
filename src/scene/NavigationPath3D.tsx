// ============================================================
// Inmap — NavigationPath3D: Animated AR Navigation Path
// ============================================================

import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

import { SCENE_CONFIG } from '../utils/constants';

// ── Props ───────────────────────────────────────────────────

interface NavigationPath3DProps {
  pathPoints: Array<{ x: number; y: number; z: number }>;
  visible: boolean;
}

// ── Shader Source ────────────────────────────────────────────

const PATH_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const PATH_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    float dash = step(0.5, fract(vUv.x * 8.0 - uTime));
    float glow = 1.0 - abs(vUv.y - 0.5) * 2.0;
    glow = pow(glow, 1.5);
    float alpha = dash * glow * 0.85;
    gl_FragColor = vec4(uColor * (1.0 + glow * 0.5), alpha);
  }
`;

// ── Constants ───────────────────────────────────────────────

const TUBE_SEGMENTS = 64;
const TUBE_RADIAL_SEGMENTS = 8;
const ARROW_COUNT = 6;
const ARROW_SPEED = 0.12; // fraction of curve per second
const ARROW_SCALE: [number, number, number] = [0.08, 0.18, 0.08];
const PATH_COLOR = new THREE.Color('#00ffcc');

// ── Direction Arrow ─────────────────────────────────────────

interface ArrowRef {
  mesh: THREE.Mesh;
  offset: number; // 0‥1 starting position on the curve
}

/**
 * NavigationPath3D renders a glowing, animated tube along the navigation
 * spline together with small cone-shaped direction arrows that continuously
 * travel from start to finish.
 */
export default function NavigationPath3D({
  pathPoints,
  visible,
}: NavigationPath3DProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const materialRef = useRef<THREE.ShaderMaterial>(null!);
  const arrowRefs = useRef<ArrowRef[]>([]);

  // ── Build the smooth spline & geometries ──────────────────

  const { curve, tubeGeometry } = useMemo(() => {
    if (pathPoints.length < 2) return { curve: null, tubeGeometry: null };

    const vectors = pathPoints.map(
      (p) => new THREE.Vector3(p.x, p.y + SCENE_CONFIG.pathElevation, p.z),
    );

    const spline = new THREE.CatmullRomCurve3(vectors, false, 'catmullrom', 0.5);
    const tube = new THREE.TubeGeometry(
      spline,
      TUBE_SEGMENTS,
      SCENE_CONFIG.pathTubeRadius,
      TUBE_RADIAL_SEGMENTS,
      false,
    );

    return { curve: spline, tubeGeometry: tube };
  }, [pathPoints]);

  // ── Shader uniforms ───────────────────────────────────────

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: PATH_COLOR },
    }),
    [],
  );

  // ── Frame loop: scroll dash + move arrows ─────────────────

  useFrame((_state, delta) => {
    if (!visible || !curve) return;

    // Scroll the dash pattern
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta * 0.8;
    }

    // Move arrows along the spline
    const arrows = arrowRefs.current;
    for (const arrow of arrows) {
      arrow.offset = (arrow.offset + delta * ARROW_SPEED) % 1;

      const t = arrow.offset;
      const pos = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t);

      arrow.mesh.position.copy(pos);
      arrow.mesh.position.y += 0.04; // slight lift above tube

      // Orient cone along curve tangent
      const lookTarget = pos.clone().add(tangent);
      arrow.mesh.lookAt(lookTarget);
      arrow.mesh.rotateX(Math.PI / 2); // ConeGeometry points up by default

      // Pulsing opacity
      const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 4 + materialRef.current?.uniforms.uTime.value * 3);
      const mat = arrow.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.4 + pulse * 0.5;
    }
  });

  // ── Nothing to render ─────────────────────────────────────

  if (!curve || !tubeGeometry || !visible) return null;

  return (
    <group ref={groupRef} name="navigation-path">
      {/* ── Glowing tube ──────────────────────────────────── */}
      <mesh geometry={tubeGeometry} renderOrder={999}>
        <shaderMaterial
          ref={materialRef}
          vertexShader={PATH_VERTEX_SHADER}
          fragmentShader={PATH_FRAGMENT_SHADER}
          uniforms={uniforms}
          transparent
          depthTest={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ── Direction arrows ──────────────────────────────── */}
      {Array.from({ length: ARROW_COUNT }).map((_, i) => (
        <mesh
          key={`arrow-${i}`}
          renderOrder={1000}
          scale={ARROW_SCALE}
          ref={(mesh: THREE.Mesh | null) => {
            if (mesh) {
              // Initialise or update the arrow ref entry
              if (!arrowRefs.current[i] || arrowRefs.current[i].mesh !== mesh) {
                arrowRefs.current[i] = {
                  mesh,
                  offset: i / ARROW_COUNT,
                };
              }
            }
          }}
        >
          <coneGeometry args={[1, 1, 6]} />
          <meshBasicMaterial
            color="#00ffcc"
            transparent
            opacity={0.7}
            depthTest={false}
          />
        </mesh>
      ))}
    </group>
  );
}
