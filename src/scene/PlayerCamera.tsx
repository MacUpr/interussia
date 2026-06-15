// ============================================================
// Inmap — PlayerCamera: First-Person Camera Controller
// ============================================================

import { useRef, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

import { SCENE_CONFIG } from '../utils/constants';

// ── Props ───────────────────────────────────────────────────

interface PlayerCameraProps {
  onPositionChange?: (x: number, z: number) => void;
  startPosition?: { x: number; z: number };
  enabled?: boolean;
}

// ── Internal state (non-reactive, lives across frames) ──────

interface MotionState {
  yaw: number;       // horizontal rotation (radians)
  pitch: number;     // vertical rotation (radians), clamped ±85°
  forward: number;   // smoothed forward velocity
  strafe: number;    // smoothed strafe velocity
  keys: Set<string>; // currently pressed keys
  locked: boolean;   // pointer lock active
}

const MAX_PITCH = THREE.MathUtils.degToRad(85);
const LERP_FACTOR = 8; // acceleration smoothing

/**
 * PlayerCamera provides a first-person controller that lives inside a
 * React Three Fiber `<Canvas>`.
 *
 * - Click the canvas to capture the pointer (pointer lock).
 * - WASD to move; mouse to look.
 * - Press Escape to release the pointer.
 * - A small crosshair is shown while the pointer is locked.
 */
export default function PlayerCamera({
  onPositionChange,
  startPosition,
  enabled = true,
}: PlayerCameraProps) {
  const { camera, gl } = useThree();
  const state = useRef<MotionState>({
    yaw: 0,
    pitch: 0,
    forward: 0,
    strafe: 0,
    keys: new Set(),
    locked: false,
  });

  const crosshairRef = useRef<HTMLDivElement | null>(null);

  // ── Initialise camera position ────────────────────────────

  useEffect(() => {
    const sx = startPosition?.x ?? 0;
    const sz = startPosition?.z ?? 0;
    camera.position.set(sx, SCENE_CONFIG.cameraHeight, sz);
    camera.rotation.order = 'YXZ';
  }, [camera, startPosition]);

  // ── Create crosshair overlay ──────────────────────────────

  useEffect(() => {
    const parent = gl.domElement.parentElement;
    if (!parent) return;

    const div = document.createElement('div');
    div.style.cssText = [
      'position:absolute',
      'top:50%',
      'left:50%',
      'transform:translate(-50%,-50%)',
      'width:20px',
      'height:20px',
      'pointer-events:none',
      'z-index:100',
      'display:none',
    ].join(';');

    // Simple "+" crosshair using two thin bars
    const h = document.createElement('div');
    h.style.cssText =
      'position:absolute;top:50%;left:0;width:100%;height:2px;background:rgba(255,255,255,0.6);transform:translateY(-50%)';
    const v = document.createElement('div');
    v.style.cssText =
      'position:absolute;left:50%;top:0;width:2px;height:100%;background:rgba(255,255,255,0.6);transform:translateX(-50%)';
    div.appendChild(h);
    div.appendChild(v);

    parent.style.position = 'relative'; // ensure parent stacking context
    parent.appendChild(div);
    crosshairRef.current = div;

    return () => {
      div.remove();
      crosshairRef.current = null;
    };
  }, [gl.domElement]);

  // ── Pointer Lock ──────────────────────────────────────────

  const requestLock = useCallback(() => {
    if (!enabled) return;
    gl.domElement.requestPointerLock();
  }, [gl.domElement, enabled]);

  useEffect(() => {
    const dom = gl.domElement;

    const onLockChange = () => {
      const locked = document.pointerLockElement === dom;
      state.current.locked = locked;
      if (crosshairRef.current) {
        crosshairRef.current.style.display = locked ? 'block' : 'none';
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!state.current.locked || !enabled) return;
      state.current.yaw -= e.movementX * SCENE_CONFIG.lookSensitivity;
      state.current.pitch -= e.movementY * SCENE_CONFIG.lookSensitivity;
      state.current.pitch = THREE.MathUtils.clamp(
        state.current.pitch,
        -MAX_PITCH,
        MAX_PITCH,
      );
    };

    const onKeyDown = (e: KeyboardEvent) => {
      state.current.keys.add(e.key.toLowerCase());
    };
    const onKeyUp = (e: KeyboardEvent) => {
      state.current.keys.delete(e.key.toLowerCase());
    };

    dom.addEventListener('click', requestLock);
    document.addEventListener('pointerlockchange', onLockChange);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    return () => {
      dom.removeEventListener('click', requestLock);
      document.removeEventListener('pointerlockchange', onLockChange);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
    };
  }, [gl.domElement, enabled, requestLock]);

  // ── Frame loop ────────────────────────────────────────────

  useFrame((_frameState, delta) => {
    if (!enabled) return;

    const s = state.current;
    const speed = SCENE_CONFIG.moveSpeed;

    // Target velocities from key state
    let targetFwd = 0;
    let targetStr = 0;
    if (s.keys.has('w')) targetFwd += 1;
    if (s.keys.has('s')) targetFwd -= 1;
    if (s.keys.has('a')) targetStr -= 1;
    if (s.keys.has('d')) targetStr += 1;

    // Smooth acceleration
    const lerpT = 1 - Math.exp(-LERP_FACTOR * delta);
    s.forward = THREE.MathUtils.lerp(s.forward, targetFwd, lerpT);
    s.strafe = THREE.MathUtils.lerp(s.strafe, targetStr, lerpT);

    // Compute direction vectors from yaw
    const sinY = Math.sin(s.yaw);
    const cosY = Math.cos(s.yaw);

    // Apply movement
    const fwd = s.forward * speed * delta;
    const str = s.strafe * speed * delta;

    camera.position.x += -sinY * fwd + cosY * str;
    camera.position.z += -cosY * fwd - sinY * str;
    camera.position.y = SCENE_CONFIG.cameraHeight;

    // Apply rotation
    camera.rotation.set(s.pitch, s.yaw, 0, 'YXZ');

    // Callback
    onPositionChange?.(camera.position.x, camera.position.z);
  });

  // This component renders nothing to the R3F scene graph
  return null;
}
