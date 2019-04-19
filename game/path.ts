import { tiles } from "./tiles";

const NEIGHBORS = [
  // Prefer straight lines...
  [-1, 0], [1, 0],
  [0, -1], [0, 1],
  // to diagonals
  [-1, -1], [-1, 1],
  [1, -1], [1, 1]
];

function neighbors(x0: number, y0: number, w: number, h: number):
  [number, number][] {

  const result: [number, number][] = [];
  for (const [dx, dy] of NEIGHBORS) {
    const x = x0 + dx;
    const y = y0 + dy;
    const inBounds = 0 <= x && x < w && 0 <= y && y < h;
    if (inBounds) {
      result.push([x, y]);
    }
  }

  return result;
}

export class DistanceMap {
  data: number[][] = [];
  w: number;
  h: number;


  constructor(map: string[][], x0: number, y0: number) {
    this.w = map[0].length;
    this.h = map.length;

    for (let y = 0; y < this.h; y++) {
      this.data[y] = [];
      for (let x = 0; x < this.w; x++) {
        this.data[y][x] = -1;
      }
    }

    this.flood(map, x0, y0);
  }

  flood(map: string[][], x0: number, y0: number): void {
    const queue = [[x0, y0, 0]];
    let next;
    while ((next = queue.pop())) {
      const [x, y, dist] = next;

      if (this.data[y][x] !== -1) {
        continue;
      }

      if (tiles[map[y][x]].pass === false) {
        continue;
      }

      this.data[y][x] = dist;

      for (const [x1, y1] of neighbors(x, y, this.w, this.h)) {
        queue.unshift([x1, y1, dist + 1]);
      }
    }
  }

  findPath(x: number, y: number): [number, number][] | null {
    if (this.data[y][x] === -1) {
      return null;
    }
    const result: [number, number][] = [];

    if (this.data[y][x] !== -1) {
      result.push([x, y]);
    }
    while (this.data[y][x] !== 0) {
      for (const [x1, y1] of neighbors(x, y, this.w, this.h)) {
        if (this.data[y1][x1] === this.data[y][x] - 1) {
          x = x1;
          y = y1;
          break;
        }
      }
      result.push([x, y]);
    }

    result.reverse();
    return result;
  }

  findPathToAdjacent(x: number, y: number): [number, number][] | null {
    if (this.data[y][x] !== -1) {
      return this.findPath(x, y);
    }

    let bestDist = -1, bestX = 0, bestY = 0;
    for (const [x1, y1] of neighbors(x, y, this.w, this.h)) {
      const dist = this.data[y1][x1];
      if (dist !== -1 && (bestDist === -1 || bestDist > dist)) {
        bestDist = dist;
        bestX = x1;
        bestY = y1;
      }
    }

    if (bestDist !== -1) {
      const result = this.findPath(bestX, bestY);
      if (result) {
        result.push([x, y]);
      }
      return result;
    }

    return null;
  }
}