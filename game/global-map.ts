import { makeEmptyGrid } from "./utils";

export type MapFunc<P> = (x: number, y: number) => P;

export class GlobalMap<T, P> {
  readonly data: T[][];
  readonly defaultValue: T;
  readonly w: number;
  readonly h: number;
  readonly mapFunc: MapFunc<P>;

  constructor(defaultValue: T, mapFunc: MapFunc<P>, w: number, h: number) {
    this.mapFunc = mapFunc;
    this.w = w;
    this.h = h;
    this.defaultValue = defaultValue;
    this.data = makeEmptyGrid<T>(this.w, this.h, this.defaultValue);
  }

  protected clear(): void {
    for (let y = 0; y < this.h; y++) {
        for (let x = 0; x < this.w; x++) {
          this.data[y][x] = this.defaultValue;
        }
    }
  }

  inBounds(x: number, y: number): boolean {
    return (0 <= x && x < this.w && 0 <= y && y < this.h);
  }

  get(x: number, y: number): T {
    return this.data[y][x];
  }

  set(x: number, y: number, value: T): void {
    this.data[y][x] = value;
  }
}
