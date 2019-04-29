import { Pos } from "./types";
import FastPriorityQueue from 'fastpriorityqueue';
import { MapFunc, GlobalMap } from "./global-map";

const eps = 1 / 16;

const NEIGHBORS = [
  // Prefer straight lines...
  [-1, 0, 1],
  [1, 0, 1],
  [0, -1, 1],
  [0, 1, 1],
  // to diagonals
  [-1, -1, 1 + eps],
  [-1, 1, 1 + eps],
  [1, -1, 1 + eps],
  [1, 1, 1 + eps]
];

const MAX_DIST = 50;

function distance(x0: number, y0: number, x1: number, y1: number): number {
  return Math.max(Math.abs(x0-x1), Math.abs(y0-y1));
}

export class DistanceMap extends GlobalMap<number, boolean> {
  maxDist: number;
  xc: number;
  yc: number;

  constructor(mapFunc: MapFunc<boolean>, w: number, h: number, maxDist = MAX_DIST) {
    super(-1, mapFunc, w, h);
    this.maxDist = maxDist;
    this.xc = 0;
    this.yc = 0;
  }

  update(xc: number, yc: number): void {
    this.xc = xc;
    this.yc = yc;
  }

  findPath(xGoal: number, yGoal: number): Pos[] | null {
    this.clear();
    if (this.fill(xGoal, yGoal)) {
      return this.readPath(xGoal, yGoal);
    }
    return null;
  }

  private fill(xGoal: number, yGoal: number): boolean {
    const queue = new FastPriorityQueue((a: number[], b: number[]) => a[0] < b[0]);
    queue.add([distance(this.xc, this.yc, xGoal, yGoal), 0, this.xc, this.yc]);
    let next;
    while ((next = queue.poll())) {
      const [, dist, x, y] = next;

      if (this.get(x, y) !== -1) {
        continue;
      }

      if (x === xGoal && y === yGoal) {
        this.set(x, y, dist);
        return true;
      }

      if (!this.mapFunc(x, y)) {
        continue;
      }

      this.set(x, y, dist);

      for (const [dx, dy, cost] of NEIGHBORS) {
        const xNext = x + dx;
        const yNext = y + dy;
        if (this.inBounds(xNext, yNext)) {
          const nextDist = dist + cost;
          const nextPriority = nextDist + distance(xNext, yNext, xGoal, yGoal);
          queue.add([nextPriority, nextDist, xNext, yNext]);
        }
      }
    }
    return false;
  }

  private readPath(xGoal: number, yGoal: number): Pos[] {
    const result = [];

    let pos = {x: xGoal, y: yGoal};
    result.push(pos);
    let dist = this.get(xGoal, yGoal);
    while (dist > 0) {
      let best: [Pos, number] | null = null;
      for (const [dx, dy] of NEIGHBORS) {
        const x = pos.x + dx;
        const y = pos.y + dy;
        if (this.inBounds(x, y)) {
          const dist = this.get(x, y);
          if (dist !== -1) {
            if (best === null || best[1] > dist) {
              best = [{x, y}, dist];
            }
          }
        }
      }
      [pos, dist] = best!;
      result.push(pos);
    }

    result.reverse();
    return result;
  }
}
