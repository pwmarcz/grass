import { Pos } from "./types";
import Denque from 'denque';
import { LocalMap, MapFunc } from "./local-map";

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

const MAX_RADIUS = 15;

export class DistanceMap extends LocalMap<number, boolean> {
  private dirty: boolean = true;

  constructor(mapFunc: MapFunc<boolean>, radius = MAX_RADIUS) {
    super(-1, mapFunc, radius);
  }

  update(xc: number, yc: number): void {
    super.update(xc, yc);
    this.dirty = true;
  }

  private recalculate(): void {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        this.data[y][x] = -1;
      }
    }

    const queue = new Denque([[this.radius, this.radius, 0]]);
    let next;
    while ((next = queue.pop())) {
      const [x, y, dist] = next;

      if (this.data[y][x] !== -1) {
        continue;
      }

      if (!this.mapFunc(x + this.x0, y + this.y0)) {
        continue;
      }

      this.data[y][x] = dist;

      for (const pos of neighbors(x, y, this.w, this.h)) {
        queue.unshift([pos.x, pos.y, dist + 1]);
      }
    }

    this.dirty = false;
  }

  findPath(x: number, y: number): Pos[] | null {
    if (this.dirty) {
      this.recalculate();
    }

    if (this.data[y - this.y0][x - this.x0] === -1) {
      return null;
    }
    const result = [];

    result.push({x, y});
    let pos = {x: x - this.x0, y: y - this.y0};
    while (this.data[pos.y][pos.x] !== 0) {
      for (const pos1 of neighbors(pos.x, pos.y, this.w, this.h)) {
        if (this.data[pos1.y][pos1.x] === this.data[pos.y][pos.x] - 1) {
          pos = pos1;
          break;
        }
      }
      result.push({x: pos.x + this.x0, y: pos.y + this.y0});
    }

    result.reverse();
    return result;
  }

  findPathToAdjacent(x: number, y: number): Pos[] | null {
    if (this.dirty) {
      this.recalculate();
    }

    if (this.data[y - this.y0][x - this.x0] !== -1) {
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
        result.push({x: x + this.x0, y: y + this.y0});
      }
      return result;
    }

    return null;
  }
}
