// ============================================================
// Inmap — useDeviceOrientation
// ============================================================
// Reads the phone's compass/orientation so the 3D/AR view can
// rotate to match where the device is physically pointing.
//
// Notes:
//  - iOS 13+ requires an explicit permission request triggered by
//    a user gesture: call `requestOrientationPermission()` from a
//    button's onClick (see ARNavigationView).
//  - Heading prefers `webkitCompassHeading` (true compass on iOS);
//    on other platforms it derives an approximate heading from
//    `alpha`. The exact zero-offset can vary by device, so this is
//    best validated on real hardware.
//  - The latest reading is exposed via a ref so the render loop can
//    read it every frame without triggering React re-renders.
// ============================================================

import { useEffect, useRef, useState } from 'react';

export interface DeviceReading {
  /** Compass heading in degrees, 0 = north. Null until first event. */
  heading: number | null;
  /** Front-back tilt in degrees (beta), for optional pitch. */
  beta: number | null;
}

type IOSDeviceOrientationEvent = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>;
};

interface CompassEvent extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
}

/** True if the DeviceOrientation API exists in this browser. */
export function isOrientationSupported(): boolean {
  return typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;
}

/**
 * Requests motion/orientation permission. On iOS this MUST be called
 * from a user gesture. Resolves true when granted (or when no explicit
 * permission is required, e.g. Android/desktop).
 */
export async function requestOrientationPermission(): Promise<boolean> {
  if (!isOrientationSupported()) return false;
  const Ctor = window.DeviceOrientationEvent as IOSDeviceOrientationEvent;
  if (typeof Ctor.requestPermission === 'function') {
    try {
      const result = await Ctor.requestPermission();
      return result === 'granted';
    } catch {
      return false;
    }
  }
  // No explicit permission model — assume available.
  return true;
}

/**
 * Subscribes to device orientation while `enabled`. Returns a ref with
 * the latest reading (for use inside animation frames) plus a `live`
 * flag indicating that real sensor data is arriving.
 */
export function useDeviceOrientation(enabled: boolean) {
  const readingRef = useRef<DeviceReading>({ heading: null, beta: null });
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!enabled || !isOrientationSupported()) return;

    const handler = (event: DeviceOrientationEvent) => {
      const e = event as CompassEvent;
      let heading: number | null = null;
      if (typeof e.webkitCompassHeading === 'number') {
        heading = e.webkitCompassHeading; // iOS: already a true compass heading
      } else if (typeof e.alpha === 'number') {
        heading = (360 - e.alpha) % 360; // approximate heading from alpha
      }
      readingRef.current = { heading, beta: e.beta ?? null };
      if (heading !== null) setLive(true);
    };

    window.addEventListener('deviceorientation', handler, true);
    return () => window.removeEventListener('deviceorientation', handler, true);
  }, [enabled]);

  return { readingRef, live };
}
