import { TILES } from "./tiles";
import { Pos } from "./types";
import { makeEmptyGrid } from "./utils";

const NEIGHBORS = [
  // Prefer straight lines...
  [-1, 0], [1, 0],
  [0, -1], [0, 1],
  // to diagonals
  [-1, -1], [-1, 1],
  [1, -1], [1, 1]
];

function neighbors(x0: number, y0: number, w: number, h: number):
  Pos[] {

  const result = [];
  for (const [dx, dy] of NEIGHBORS) {
    const x = x0 + dx;
    const y = y0 + dy;
    const inBounds = 0 <= x && x < w && 0 <= y && y < h;
    if (inBounds) {
      result.push({x, y});
    }
  }

  return result;
}

export class DistanceMap {
  data: number[][];
  w: number;
  h: number;

  constructor(map: string[][], x0: number, y0: number) {
    this.w = map[0].length;
    this.h = map.length;
    this.data = makeEmptyGrid(this.w, this.h, -1);
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

      const tile = map[y][x];
      if (!(TILES[tile].canEnter || tile === 'DOOR_CLOSED')) {
        continue;
      }

      this.data[y][x] = dist;

      for (const pos of neighbors(x, y, this.w, this.h)) {
        queue.unshift([pos.x, pos.y, dist + 1]);
      }
    }
  }

  findPath(x0: number, y0: number): Pos[] | null {
    if (this.data[y0][x0] === -1) {
      return null;
    }
    const result = [];

    let pos = {x: x0, y: y0};
    result.push(pos);
    while (this.data[pos.y][pos.x] !== 0) {
      for (const pos1 of neighbors(pos.x, pos.y, this.w, this.h)) {
        if (this.data[pos1.y][pos1.x] === this.data[pos.y][pos.x] - 1) {
          pos = pos1;
          break;
        }
      }
      result.push(pos);
    }

    result.reverse();
    return result;
  }

  findPathToAdjacent(x: number, y: number): Pos[] | null {
    if (this.data[y][x] !== -1) {
      return this.findPath(x, y);
    }

    let bestDist = -1, bestPos = null;
    for (const pos of neighbors(x, y, this.w, this.h)) {
      const dist = this.data[pos.y][pos.x];
      if (dist !== -1 && (bestDist === -1 || bestDist > dist)) {
        bestDist = dist;
        bestPos = pos;
      }
    }

    if (bestPos) {
      const result = this.findPath(bestPos.x, bestPos.y);
      if (result) {
        result.push({x, y});
      }
      return result;
    }

    return null;
  }
}