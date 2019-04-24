// Implementation from:
// http://www.roguebasin.com/index.php?title=Improved_Shadowcasting_in_Java

import { MapFunc } from "./types";
import { makeEmptyGrid } from "./utils";

const FOV_RADIUS = 12;

const DIAGONALS = [
  {dx: -1, dy: -1},
  {dx: -1, dy: 1},
  {dx: 1, dy: -1},
  {dx: 1, dy: 1},
];

export class VisibilityMap {
  readonly data: boolean[][];
  readonly radius: number;
  readonly w: number;
  readonly h: number;
  readonly mapFunc: MapFunc;

  // Origin on global map
  x0: number = 0;
  y0: number = 0;

  // Center on global map
  xc: number = 0;
  yc: number = 0;

  constructor(mapFunc: MapFunc, radius = FOV_RADIUS) {
    this.mapFunc = mapFunc;
    this.radius = radius;
    this.w = 2 * radius + 1;
    this.h = 2 * radius + 1;
    this.data = makeEmptyGrid(this.w, this.h, false);
  }

  visible(x: number, y: number): boolean {
    x -= this.x0;
    y -= this.y0;
    if (0 <= x && x < this.w && 0 <= y && y < this.h) {
      return this.data[y][x];
    }

    return false;
  }

  update(xc: number, yc: number): void {
    this.xc = xc;
    this.yc = yc;
    this.x0 = xc - this.radius;
    this.y0 = yc - this.radius;

    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        this.data[y][x] = false;
      }
    }

    this.data[this.radius][this.radius] = true;

    for (const {dx, dy} of DIAGONALS) {
      this.castLight(1, 1, 0, 0, dx, dy, 0);
      this.castLight(1, 1, 0, dx, 0, 0, dy);
    }
  }

  castLight(
    row: number, start: number, end: number,
    xx: number, xy: number, yx: number, yy: number
  ): void {
    if (start < end) {
      return;
    }
    let newStart = 0;
    let blocked = false;

    for (let distance = row; distance <= this.radius && !blocked; distance++) {
      const dy = -distance;
      for (let dx = -distance; dx <= 0; dx++) {
        const x = this.xc + dx * xx + dy * xy;
        const y = this.yc + dx * yx + dy * yy;
        const mx = x - this.x0;
        const my = y - this.y0;
        const leftSlope = (dx - 0.5) / (dy + 0.5);
        const rightSlope = (dx + 0.5) / (dy - 0.5);

        if (!(0 <= mx && mx < this.w) && !(0 <= my && my <= this.h)) {
          continue;
        }

        if (start < rightSlope) {
          continue;
        }

        if (end > leftSlope) {
          break;
        }

        if (this.inRadius(dx, dy)) {
          this.data[my][mx] = true;
        }

        if (blocked) {
          if (!this.mapFunc(x, y)) {
            newStart = rightSlope;
            continue;
          } else {
            blocked = false;
            start = newStart;
          }
        } else {
          if (!this.mapFunc(x, y)) {
            blocked = true;
            this.castLight(distance + 1, start, leftSlope, xx, xy, yx, yy);
            newStart = rightSlope;
          }
        }
      }
    }
  }

  inRadius(dx: number, dy: number): boolean {
    return dx * dx + dy * dy <= this.radius * this.radius;
  }
}