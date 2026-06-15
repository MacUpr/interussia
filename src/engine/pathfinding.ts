// ============================================================
// Inmap — A* Pathfinding Engine
// ============================================================

import type { GraphNode, Floor, WaypointConnection } from '../types/index';

// ── Min-Heap (Priority Queue) ───────────────────────────────

/**
 * Generic min-heap ordered by an `fScore` map.
 * Used internally by A* to efficiently retrieve the lowest-cost open node.
 */
export class MinHeap<T> {
  private heap: T[] = [];
  private scoreMap: Map<T, number> = new Map();

  /** Current number of elements in the heap. */
  get size(): number {
    return this.heap.length;
  }

  /** Peek at the minimum element without removing it. Returns `undefined` if empty. */
  peek(): T | undefined {
    return this.heap[0];
  }

  /** Push an element with its associated f-score. */
  push(item: T, fScore: number): void {
    this.scoreMap.set(item, fScore);
    this.heap.push(item);
    this.bubbleUp(this.heap.length - 1);
  }

  /** Remove and return the element with the lowest f-score. Returns `undefined` if empty. */
  pop(): T | undefined {
    if (this.heap.length === 0) return undefined;

    const min = this.heap[0];
    const last = this.heap.pop()!;

    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.sinkDown(0);
    }

    this.scoreMap.delete(min);
    return min;
  }

  /** Check whether the heap contains a given item. */
  has(item: T): boolean {
    return this.scoreMap.has(item);
  }

  /** Update the f-score for an existing item (removes and re-inserts). */
  updateScore(item: T, newFScore: number): void {
    const idx = this.heap.indexOf(item);
    if (idx === -1) return;

    this.scoreMap.set(item, newFScore);
    this.bubbleUp(idx);
    this.sinkDown(idx);
  }

  // ── Internal helpers ────────────────────────────────────────

  private getScore(item: T): number {
    return this.scoreMap.get(item) ?? Infinity;
  }

  private bubbleUp(idx: number): void {
    while (idx > 0) {
      const parentIdx = Math.floor((idx - 1) / 2);
      if (this.getScore(this.heap[idx]) >= this.getScore(this.heap[parentIdx])) break;
      [this.heap[idx], this.heap[parentIdx]] = [this.heap[parentIdx], this.heap[idx]];
      idx = parentIdx;
    }
  }

  private sinkDown(idx: number): void {
    const length = this.heap.length;

    while (true) {
      const left = 2 * idx + 1;
      const right = 2 * idx + 2;
      let smallest = idx;

      if (left < length && this.getScore(this.heap[left]) < this.getScore(this.heap[smallest])) {
        smallest = left;
      }
      if (right < length && this.getScore(this.heap[right]) < this.getScore(this.heap[smallest])) {
        smallest = right;
      }

      if (smallest === idx) break;

      [this.heap[idx], this.heap[smallest]] = [this.heap[smallest], this.heap[idx]];
      idx = smallest;
    }
  }
}

// ── Euclidean Distance Heuristic ────────────────────────────

/**
 * Computes the Euclidean distance between two graph nodes.
 * Used as the admissible heuristic for A*.
 */
export function euclideanDistance(a: GraphNode, b: GraphNode): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// ── Path Reconstruction ─────────────────────────────────────

/**
 * Walks the `cameFrom` map backward from the goal to the start
 * and returns the path as an ordered array of GraphNodes.
 */
function reconstructPath(
  cameFrom: Map<string, string>,
  graph: Map<string, GraphNode>,
  currentId: string,
): GraphNode[] {
  const path: GraphNode[] = [];
  let id: string | undefined = currentId;

  while (id !== undefined) {
    const node = graph.get(id);
    if (node) path.unshift(node);
    id = cameFrom.get(id);
  }

  return path;
}

// ── A* Search ───────────────────────────────────────────────

/**
 * Runs A* shortest-path search on a graph of `GraphNode` entries.
 *
 * @param graph  - Map of node ID → GraphNode (with neighbor lists).
 * @param startId - Starting node ID.
 * @param goalId  - Goal node ID.
 * @returns Ordered array of GraphNodes from start to goal, or `null` if no path exists.
 */
export function astar(
  graph: Map<string, GraphNode>,
  startId: string,
  goalId: string,
): GraphNode[] | null {
  const startNode = graph.get(startId);
  const goalNode = graph.get(goalId);

  if (!startNode || !goalNode) return null;
  if (startId === goalId) return [startNode];

  // gScore: best known cost from start to each node
  const gScore = new Map<string, number>();
  gScore.set(startId, 0);

  // fScore: gScore + heuristic estimate to goal
  const fScore = new Map<string, number>();
  fScore.set(startId, euclideanDistance(startNode, goalNode));

  // cameFrom: for path reconstruction
  const cameFrom = new Map<string, string>();

  // Open set (priority queue)
  const openSet = new MinHeap<string>();
  openSet.push(startId, fScore.get(startId)!);

  // Closed set
  const closedSet = new Set<string>();

  while (openSet.size > 0) {
    const currentId = openSet.pop()!;

    // Goal reached
    if (currentId === goalId) {
      return reconstructPath(cameFrom, graph, goalId);
    }

    closedSet.add(currentId);

    const currentNode = graph.get(currentId);
    if (!currentNode) continue;

    for (const neighbor of currentNode.neighbors) {
      if (closedSet.has(neighbor.nodeId)) continue;

      const tentativeG = (gScore.get(currentId) ?? Infinity) + neighbor.cost;

      if (tentativeG < (gScore.get(neighbor.nodeId) ?? Infinity)) {
        // This path to the neighbor is better than any previous one
        cameFrom.set(neighbor.nodeId, currentId);
        gScore.set(neighbor.nodeId, tentativeG);

        const neighborNode = graph.get(neighbor.nodeId);
        const h = neighborNode ? euclideanDistance(neighborNode, goalNode) : Infinity;
        const f = tentativeG + h;
        fScore.set(neighbor.nodeId, f);

        if (openSet.has(neighbor.nodeId)) {
          openSet.updateScore(neighbor.nodeId, f);
        } else {
          openSet.push(neighbor.nodeId, f);
        }
      }
    }
  }

  // No path found
  return null;
}

// ── Graph Builder ───────────────────────────────────────────

/**
 * Converts a `Floor` object (waypoints + connections) into a
 * graph suitable for A* search.
 *
 * Bidirectional connections produce edges in both directions.
 * Each waypoint becomes a `GraphNode` keyed by its `id`.
 */
export function buildGraphFromFloor(floor: Floor): Map<string, GraphNode> {
  const graph = new Map<string, GraphNode>();

  // Create a node for every waypoint
  for (const wp of floor.waypoints) {
    graph.set(wp.id, {
      id: wp.id,
      x: wp.x,
      y: wp.y,
      neighbors: [],
    });
  }

  // Add edges from connections
  for (const conn of floor.connections) {
    addEdge(graph, conn);
  }

  return graph;
}

/**
 * Adds an edge (or bidirectional pair of edges) from a WaypointConnection
 * to the graph's neighbor lists.
 */
function addEdge(graph: Map<string, GraphNode>, conn: WaypointConnection): void {
  const fromNode = graph.get(conn.from);
  const toNode = graph.get(conn.to);

  if (!fromNode || !toNode) return;

  // Forward edge
  fromNode.neighbors.push({ nodeId: conn.to, cost: conn.cost });

  // Reverse edge (if bidirectional)
  if (conn.bidirectional) {
    toNode.neighbors.push({ nodeId: conn.from, cost: conn.cost });
  }
}
