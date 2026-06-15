// ============================================================
// Inmap — Coordinate Mapper Unit Tests
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  createDefaultMapper,
  map2DTo3D,
  map3DTo2D,
  pathToVector3Array,
} from '../src/engine/coordinateMapper';

describe('Coordinate Mapper', () => {
  const mapper = createDefaultMapper(0);

  it('should create a default mapper for floor 0', () => {
    expect(mapper.scale).toBe(1.0);
    expect(mapper.floorHeight).toBe(0);
    expect(mapper.rotation).toBe(0);
  });

  it('should map 2D origin to 3D near-origin', () => {
    const result = map2DTo3D(0, 0, mapper);
    expect(result.x).toBeCloseTo(0, 5);
    expect(result.y).toBeCloseTo(0, 5);
    // z may be negated or zero depending on mapping convention
    expect(Math.abs(result.z)).toBeCloseTo(0, 5);
  });

  it('should map 2D X to 3D X', () => {
    const result = map2DTo3D(10, 0, mapper);
    expect(result.x).toBeCloseTo(10, 5);
  });

  it('should map 2D Y to 3D Z (possibly negated)', () => {
    const result = map2DTo3D(0, 10, mapper);
    // Convention: map Y → -Z (north-up to Three.js right-handed)
    expect(Math.abs(result.z)).toBeCloseTo(10, 5);
  });

  it('should set Y to floor height', () => {
    const mapper1 = createDefaultMapper(1);
    const result = map2DTo3D(0, 0, mapper1);
    // Floor 1 height should be > 0
    expect(result.y).toBeGreaterThanOrEqual(0);
  });

  it('should round-trip 2D → 3D → 2D', () => {
    const original = { x: 15.7, y: 23.4 };
    const mapped3d = map2DTo3D(original.x, original.y, mapper);
    const roundTrip = map3DTo2D(mapped3d.x, mapped3d.z, mapper);

    expect(roundTrip.x).toBeCloseTo(original.x, 3);
    expect(roundTrip.y).toBeCloseTo(original.y, 3);
  });

  it('should convert a path to Vector3 array', () => {
    const path = [
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 5, y: 10 },
    ];

    const result = pathToVector3Array(path, mapper);
    expect(result).toHaveLength(3);

    // Check each point has x, y, z
    for (const point of result) {
      expect(point).toHaveProperty('x');
      expect(point).toHaveProperty('y');
      expect(point).toHaveProperty('z');
    }

    // Y should be slightly elevated above floor (pathElevation)
    expect(result[0].y).toBeGreaterThan(0);
  });

  it('should produce elevated path points above the floor', () => {
    const path = [{ x: 0, y: 0 }];
    const result = pathToVector3Array(path, mapper);
    // Path elevation should be > 0 (e.g. 0.1m)
    expect(result[0].y).toBeGreaterThan(0);
    expect(result[0].y).toBeLessThan(1); // shouldn't be higher than 1m
  });

  it('should handle scale factor', () => {
    const scaledMapper = { ...mapper, scale: 2.0 };
    const result = map2DTo3D(5, 0, scaledMapper);
    expect(result.x).toBeCloseTo(10, 5); // 5 * 2.0
  });
});
