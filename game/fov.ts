import { MapFunc } from "./types";
import { makeEmptyGrid } from "./utils";

const FOV_RADIUS = 12;

export class VisibilityMap {
  readonly data: boolean[][];
  readonly radius: number;
  readonly w: number;
  readonly h: number;
  readonly mapFunc: MapFunc;

  // Origin on global map
  x0: number = 0;
  y0: number = 0;

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

  update(xCenter: number, yCenter: number): void {
    this.x0 = xCenter - this.radius;
    this.y0 = yCenter - this.radius;

    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const distSquared = (
          (y - this.radius) * (y - this.radius) +
          (x - this.radius) * (x - this.radius)
        );
        this.data[y][x] = distSquared <= this.radius * this.radius;
      }
    }
  }
}