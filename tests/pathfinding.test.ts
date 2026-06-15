// ============================================================
// Inmap — A* Pathfinding Unit Tests
// ============================================================

import { describe, it, expect } from 'vitest';
import { MinHeap, astar, buildGraphFromFloor } from '../src/engine/pathfinding';
import { getDistanceAlongPath, validateGraph } from '../src/engine/navmesh';
import { GROUND_FLOOR } from '../src/data/building';
import type { GraphNode, Floor, Waypoint, WaypointConnection } from '../src/types/index';

// ── MinHeap Tests ─────────────────────────────────────────────

describe('MinHeap', () => {
  it('should push and pop items in order of fScore', () => {
    const heap = new MinHeap<string>();
    heap.push('c', 30);
    heap.push('a', 10);
    heap.push('b', 20);

    expect(heap.pop()).toBe('a');
    expect(heap.pop()).toBe('b');
    expect(heap.pop()).toBe('c');
  });

  it('should return undefined when popping empty heap', () => {
    const heap = new MinHeap<string>();
    expect(heap.pop()).toBeUndefined();
  });

  it('should report correct size', () => {
    const heap = new MinHeap<string>();
    expect(heap.size).toBe(0);
    heap.push('x', 1);
    expect(heap.size).toBe(1);
    heap.push('y', 2);
    expect(heap.size).toBe(2);
    heap.pop();
    expect(heap.size).toBe(1);
  });
});

// ── Helper: build a simple graph ──────────────────────────────

function makeGraph(nodes: GraphNode[]): Map<string, GraphNode> {
  const map = new Map<string, GraphNode>();
  for (const node of nodes) {
    map.set(node.id, node);
  }
  return map;
}

// ── A* Tests ──────────────────────────────────────────────────

describe('A* Pathfinding', () => {
  it('should find a direct path between two connected nodes', () => {
    const graph = makeGraph([
      { id: 'A', x: 0, y: 0, neighbors: [{ nodeId: 'B', cost: 5 }] },
      { id: 'B', x: 5, y: 0, neighbors: [{ nodeId: 'A', cost: 5 }] },
    ]);

    const path = astar(graph, 'A', 'B');
    expect(path).not.toBeNull();
    expect(path!.length).toBe(2);
    expect(path![0].id).toBe('A');
    expect(path![1].id).toBe('B');
  });

  it('should find the shortest path in a diamond graph', () => {
    //     B (short)
    //    / \
    //   A   D
    //    \ /
    //     C (long)
    const graph = makeGraph([
      { id: 'A', x: 0, y: 0, neighbors: [{ nodeId: 'B', cost: 1 }, { nodeId: 'C', cost: 10 }] },
      { id: 'B', x: 1, y: 1, neighbors: [{ nodeId: 'A', cost: 1 }, { nodeId: 'D', cost: 1 }] },
      { id: 'C', x: 1, y: -1, neighbors: [{ nodeId: 'A', cost: 10 }, { nodeId: 'D', cost: 10 }] },
      { id: 'D', x: 2, y: 0, neighbors: [{ nodeId: 'B', cost: 1 }, { nodeId: 'C', cost: 10 }] },
    ]);

    const path = astar(graph, 'A', 'D');
    expect(path).not.toBeNull();
    expect(path!.map(n => n.id)).toEqual(['A', 'B', 'D']);
  });

  it('should return null for unreachable destination', () => {
    const graph = makeGraph([
      { id: 'A', x: 0, y: 0, neighbors: [] },
      { id: 'B', x: 10, y: 10, neighbors: [] },
    ]);

    const path = astar(graph, 'A', 'B');
    expect(path).toBeNull();
  });

  it('should return single-node path when start === goal', () => {
    const graph = makeGraph([
      { id: 'A', x: 0, y: 0, neighbors: [] },
    ]);

    const path = astar(graph, 'A', 'A');
    expect(path).not.toBeNull();
    expect(path!.length).toBe(1);
    expect(path![0].id).toBe('A');
  });

  it('should find a path through a linear chain', () => {
    const graph = makeGraph([
      { id: 'A', x: 0, y: 0, neighbors: [{ nodeId: 'B', cost: 3 }] },
      { id: 'B', x: 3, y: 0, neighbors: [{ nodeId: 'A', cost: 3 }, { nodeId: 'C', cost: 4 }] },
      { id: 'C', x: 7, y: 0, neighbors: [{ nodeId: 'B', cost: 4 }, { nodeId: 'D', cost: 2 }] },
      { id: 'D', x: 9, y: 0, neighbors: [{ nodeId: 'C', cost: 2 }] },
    ]);

    const path = astar(graph, 'A', 'D');
    expect(path).not.toBeNull();
    expect(path!.map(n => n.id)).toEqual(['A', 'B', 'C', 'D']);
  });
});

// ── Building Graph Tests ──────────────────────────────────────

describe('Building Navigation Graph', () => {
  it('should build a graph from the ground floor data', () => {
    const graph = buildGraphFromFloor(GROUND_FLOOR);
    expect(graph.size).toBeGreaterThan(0);
    expect(graph.size).toBe(GROUND_FLOOR.waypoints.length);
  });

  it('should validate that the ground floor graph is fully connected', () => {
    const validation = validateGraph(GROUND_FLOOR);
    expect(validation.valid).toBe(true);
    expect(validation.issues).toHaveLength(0);
  });

  it('should find a path from lobby to cafeteria', () => {
    const graph = buildGraphFromFloor(GROUND_FLOOR);

    // Find lobby and cafeteria waypoints
    const lobbyWp = GROUND_FLOOR.waypoints.find(w => w.id.includes('LOBBY') && w.type !== 'door');
    const cafeWp = GROUND_FLOOR.waypoints.find(w => w.id.includes('CAFE') && w.type !== 'door');

    expect(lobbyWp).toBeDefined();
    expect(cafeWp).toBeDefined();

    const path = astar(graph, lobbyWp!.id, cafeWp!.id);
    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThanOrEqual(3); // at least lobby → corridor → cafe
  });

  it('should find a path from lobby to every destination', () => {
    const graph = buildGraphFromFloor(GROUND_FLOOR);
    const lobbyWp = GROUND_FLOOR.waypoints.find(w => w.id.includes('LOBBY') && w.type !== 'door');
    expect(lobbyWp).toBeDefined();

    for (const wp of GROUND_FLOOR.waypoints) {
      const path = astar(graph, lobbyWp!.id, wp.id);
      expect(path).not.toBeNull();
    }
  });

  it('should calculate positive distance along any valid path', () => {
    const graph = buildGraphFromFloor(GROUND_FLOOR);
    const waypoints = GROUND_FLOOR.waypoints;

    if (waypoints.length >= 2) {
      const path = astar(graph, waypoints[0].id, waypoints[waypoints.length - 1].id);
      if (path && path.length > 1) {
        const dist = getDistanceAlongPath(path);
        expect(dist).toBeGreaterThan(0);
      }
    }
  });

  it('should complete pathfinding in under 10ms for the building graph', () => {
    const graph = buildGraphFromFloor(GROUND_FLOOR);
    const waypoints = GROUND_FLOOR.waypoints;
    const start = waypoints[0];
    const end = waypoints[waypoints.length - 1];

    const t0 = performance.now();
    for (let i = 0; i < 100; i++) {
      astar(graph, start.id, end.id);
    }
    const elapsed = (performance.now() - t0) / 100;

    expect(elapsed).toBeLessThan(10); // <10ms per pathfind
  });
});
