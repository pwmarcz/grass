import { Pos, MapFunc } from "./types";
import FastPriorityQueue from 'fastpriorityqueue';
import { makeGrid, simpleDistance } from "./utils";

// Add a small penalty to bias against diagonals, and ensure stability.
const eps = 1/16;

const NEIGHBORS: [number, number, number][] = [
  [-1, 0, 1],
  [1, 0, 1],
  [0, -1, 1 + eps],
  [0, 1, 1 + eps],
  [-1, -1, 1 + 2 * eps],
  [-1, 1, 1 + 2 * eps],
  [1, -1, 1 + 2 * eps],
  [1, 1, 1 + 2 * eps]
];

interface DistanceCell {
  x: number;
  y: number;
  cost: number;
  open: boolean;
  closed: boolean;
}

export class DistanceMap {
  readonly data: DistanceCell[][];
  readonly w: number;
  readonly h: number;
  readonly mapFunc: MapFunc<number | null>;
  xc: number;
  yc: number;

  neighbors: [number, number, number][];

  constructor(mapFunc: MapFunc<number | null>, w: number, h: number, useDiagonals = true) {
    this.mapFunc = mapFunc;
    this.w = w;
    this.h = h;
    this.xc = 0;
    this.yc = 0;
    this.data = makeGrid(w, h, (x, y) => ({
      x: 0, y: 0,
      cost: 0,
      open: false, closed: false,
    }));

    if (useDiagonals) {
      this.neighbors = NEIGHBORS;
    } else {
      this.neighbors = NEIGHBORS.slice(0, 4);
    }
  }

  update(xc: number, yc: number): void {
    this.xc = xc;
    this.yc = yc;
  }

  clear(): void {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        this.data[y][x].open = false;
        this.data[y][x].closed = false;
      }
    }
  }

  inBounds(x: number, y: number): boolean {
    return (0 <= x && x < this.w && 0 <= y && y < this.h);
  }

  findPath(xGoal: number, yGoal: number): Pos[] | null {
    this.clear();
    if (this.fill(xGoal, yGoal)) {
      return this.readPath(xGoal, yGoal);
    }
    return null;
  }

  private fill(xGoal: number, yGoal: number): boolean {
    const queue = new FastPriorityQueue<[number, Pos]>((a, b) => a[0] < b[0]);
    const startPos: Pos = {x: this.xc, y: this.yc};
    const goalPos = {x: xGoal, y: yGoal};

    this.data[this.yc][this.xc].x = this.xc;
    this.data[this.yc][this.xc].y = this.yc;
    this.data[this.yc][this.xc].cost = 0;

    queue.add([0, startPos]);
    let next;
    while ((next = queue.poll())) {
      const [, pos] = next;

      const cost = this.data[pos.y][pos.x].cost;

      this.data[pos.y][pos.x].closed = true;

      if (pos.x === xGoal && pos.y === yGoal) {
        return true;
      }

      for (const [dx, dy, neighborCost] of this.neighbors) {
        const x = pos.x + dx;
        const y = pos.y + dy;

        if (!this.inBounds(x, y) || this.data[y][x].closed) {
          continue;
        }

        const cellCost = this.mapFunc(x, y);
        if (cellCost === null && !(x === xGoal && y === yGoal)) {
          continue;
        }
        const nextCost = cost + (cellCost || 0) + neighborCost;
        if (this.data[y][x].open && this.data[y][x].cost <= nextCost) {
          continue;
        }

        this.data[y][x].open = true;
        this.data[y][x].cost = nextCost;
        this.data[y][x].x = pos.x;
        this.data[y][x].y = pos.y;

        const nextPos = {x, y};
        const nextPriority = nextCost + simpleDistance(nextPos, goalPos);
        queue.add([nextPriority, nextPos]);
      }
    }
    return false;
  }

  private readPath(xGoal: number, yGoal: number): Pos[] {
    const result = [];

    let pos = {x: xGoal, y: yGoal};
    result.push(pos);
    while (pos.x !== this.xc || pos.y !== this.yc) {
      const {x, y} = this.data[pos.y][pos.x];
      pos = {x, y};
      result.push(pos);
    }

    result.reverse();
    return result;
  }
}
