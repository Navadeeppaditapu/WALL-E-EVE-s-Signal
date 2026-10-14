/**
 * A* Pathfinding and Geometric Utilities for Autonomous Navigation.
 * Guarantees optimal shortest-path planning around obstacles and accurate energy estimation.
 */

import { Point } from './types.ts';

export function manhattanDistance(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function euclideanDistance(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function pointEquals(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

export function pointToString(p: Point): string {
  return `${p.x},${p.y}`;
}

export function parsePoint(s: string): Point {
  const [x, y] = s.split(',').map(Number);
  return { x, y };
}

interface Node {
  point: Point;
  g: number;
  h: number;
  f: number;
  parent: Node | null;
}

/**
 * Finds shortest path between start and goal using A* algorithm avoiding given obstacles.
 * Returns null if no traversable path exists.
 */
export function aStarPath(
  start: Point,
  goal: Point,
  width: number,
  height: number,
  obstacles: Set<string> | Point[]
): Point[] | null {
  if (pointEquals(start, goal)) {
    return [start];
  }

  const obstacleSet: Set<string> =
    obstacles instanceof Set
      ? obstacles
      : new Set(obstacles.map(pointToString));

  // Goal must not be an obstacle
  if (obstacleSet.has(pointToString(goal))) {
    return null;
  }

  const openList: Node[] = [];
  const closedSet = new Set<string>();
  const gScores = new Map<string, number>();

  const startNode: Node = {
    point: start,
    g: 0,
    h: manhattanDistance(start, goal),
    f: manhattanDistance(start, goal),
    parent: null
  };

  openList.push(startNode);
  gScores.set(pointToString(start), 0);

  const neighbors = [
    { x: 0, y: -1 }, // North
    { x: 0, y: 1 },  // South
    { x: 1, y: 0 },  // East
    { x: -1, y: 0 }  // West
  ];

  while (openList.length > 0) {
    // Pick node with lowest f-score
    let bestIndex = 0;
    for (let i = 1; i < openList.length; i++) {
      if (
        openList[i].f < openList[bestIndex].f ||
        (openList[i].f === openList[bestIndex].f && openList[i].h < openList[bestIndex].h)
      ) {
        bestIndex = i;
      }
    }

    const current = openList.splice(bestIndex, 1)[0];
    const currentKey = pointToString(current.point);

    if (pointEquals(current.point, goal)) {
      // Reconstruct path
      const path: Point[] = [];
      let curr: Node | null = current;
      while (curr) {
        path.unshift(curr.point);
        curr = curr.parent;
      }
      return path;
    }

    closedSet.add(currentKey);

    for (const dir of neighbors) {
      const neighborPoint: Point = {
        x: current.point.x + dir.x,
        y: current.point.y + dir.y
      };

      // Boundary check
      if (
        neighborPoint.x < 0 ||
        neighborPoint.x >= width ||
        neighborPoint.y < 0 ||
        neighborPoint.y >= height
      ) {
        continue;
      }

      const neighborKey = pointToString(neighborPoint);

      if (obstacleSet.has(neighborKey) || closedSet.has(neighborKey)) {
        continue;
      }

      const tentativeG = current.g + 1;
      const existingG = gScores.get(neighborKey);

      if (existingG === undefined || tentativeG < existingG) {
        gScores.set(neighborKey, tentativeG);
        const h = manhattanDistance(neighborPoint, goal);
        const neighborNode: Node = {
          point: neighborPoint,
          g: tentativeG,
          h,
          f: tentativeG + h,
          parent: current
        };

        const openIndex = openList.findIndex(n => pointToString(n.point) === neighborKey);
        if (openIndex >= 0) {
          openList[openIndex] = neighborNode;
        } else {
          openList.push(neighborNode);
        }
      }
    }
  }

  return null; // Unreachable
}

/**
 * Finds shortest path to the closest target among a set of candidate targets (e.g., base or chargers).
 */
export function findShortestPathToClosest(
  start: Point,
  targets: Point[],
  width: number,
  height: number,
  obstacles: Set<string> | Point[]
): { target: Point; path: Point[]; distance: number } | null {
  if (targets.length === 0) return null;

  let best: { target: Point; path: Point[]; distance: number } | null = null;

  for (const t of targets) {
    const path = aStarPath(start, t, width, height, obstacles);
    if (path) {
      const distance = path.length - 1;
      if (!best || distance < best.distance) {
        best = { target: t, path, distance };
      }
    }
  }

  return best;
}
