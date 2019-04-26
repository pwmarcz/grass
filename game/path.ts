import { Pos } from "./types";
import FastPriorityQueue from 'fastpriorityqueue';
import { LocalMap, MapFunc } from "./local-map";

const NEIGHBORS = [
  // Prefer straight lines...
  [-1, 0], [1, 0],
  [0, -1], [0, 1],
  // to diagonals
  [-1, -1], [-1, 1],
  [1, -1], [1, 1]
];

const MAX_RADIUS = 15;

export class DistanceMap extends LocalMap<number, boolean> {
  constructor(mapFunc: MapFunc<boolean>, radius = MAX_RADIUS) {
    super(-1, mapFunc, radius);
  }

  findPath(xGoal: number, yGoal: number): Pos[] | null {
    this.clear();
    if (this.runDijkstra(xGoal, yGoal)) {
      return this.readPath(xGoal, yGoal);
    }
    return null;
  }

  private runDijkstra(xGoal: number, yGoal: number): boolean {
    const queue = new FastPriorityQueue((a: number[], b: number[]) => a[0] < b[0]);
    queue.add([0, this.xc, this.yc]);
    let next;
    while ((next = queue.poll())) {
      const [dist, x, y] = next;

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

      for (const [dx, dy] of NEIGHBORS) {
        const xNext = x + dx;
        const yNext = y + dy;
        if (this.inBounds(xNext, yNext)) {
          const nextDist = dist + 1;
          queue.add([nextDist, xNext, yNext]);
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
      for (const [dx, dy] of NEIGHBORS) {
        const x = pos.x + dx;
        const y = pos.y + dy;
        if (this.inBounds(x, y) && this.get(x, y) === dist - 1) {
          pos = {x, y};
          dist--;
          break;
        }
      }
      result.push(pos);
    }

    result.reverse();
    return result;
  }
}
