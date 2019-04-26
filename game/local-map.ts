import { makeEmptyGrid } from "./utils";

export type MapFunc<P> = (x: number, y: number) => P;

export class LocalMap<T, P> {
  readonly data: T[][];
  readonly defaultValue: T;
  readonly radius: number;
  readonly w: number;
  readonly h: number;
  readonly mapFunc: MapFunc<P>;

  // Origin on global map
  x0: number = 0;
  y0: number = 0;

  // Center on global map
  xc: number = 0;
  yc: number = 0;

  constructor(defaultValue: T, mapFunc: MapFunc<P>, radius: number) {
    this.mapFunc = mapFunc;
    this.radius = radius;
    this.w = 2 * radius + 1;
    this.h = 2 * radius + 1;
    this.defaultValue = defaultValue;
    this.data = makeEmptyGrid<T>(this.w, this.h, this.defaultValue);
  }

  update(xc: number, yc: number): void {
    this.xc = xc;
    this.yc = yc;
    this.x0 = xc - this.radius;
    this.y0 = yc - this.radius;
  }

  protected clear(): void {
      for (let y = 0; y < this.h; y++) {
          for (let x = 0; x < this.w; x++) {
            this.data[y][x] = this.defaultValue;
          }
      }
  }

  inBounds(x: number, y: number): boolean {
    x -= this.x0;
    y -= this.y0;
    return (0 <= x && x < this.w && 0 <= y && y < this.h);
  }

  get(x: number, y: number): T {
    return this.data[y - this.y0][x - this.x0];
  }

  set(x: number, y: number, value: T): void {
    this.data[y - this.y0][x - this.x0] = value;
  }
}
