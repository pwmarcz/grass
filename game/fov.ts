import { MapFunc } from "./global-map";
import { makeEmptyGrid } from "./utils";
import { PermissiveFov } from 'permissive-fov';

const FOV_RADIUS = 12;

export class VisibilityMap {
  mapFunc: MapFunc<boolean>;
  radius: number;
  fieldWidth: number;
  width: number;
  height: number;

  fields: (Uint8Array | null)[][];

  pfov: PermissiveFov;

  constructor(mapFunc: MapFunc<boolean>, width: number, height: number, radius = FOV_RADIUS) {
    this.mapFunc = mapFunc;
    this.width = width;
    this.height = height;
    this.radius = radius;
    this.fieldWidth = radius * 2 + 1;
    this.fields = makeEmptyGrid(width, height, null);
    this.pfov = new PermissiveFov(this.width, this.height, this.mapFunc);
  }

  invalidate(x0: number, y0: number): void {
    for (let y = y0 - this.radius; y < y0 + this.radius; y++) {
      for (let x = x0 - this.radius; x < x0 + this.radius; x++) {
        if (this.inBounds(x, y)) {
          this.fields[y][x] = null;
        }
      }
    }
  }

  visible(x0: number, y0: number, x1: number, y1: number): boolean {
    if (Math.abs(x1 - x0) > FOV_RADIUS || Math.abs(y1 - y0) > FOV_RADIUS) {
      return false;
    }

    const field = this.getField(x0, y0);

    const xField = x1 - x0 + this.radius;
    const yField = y1 - y0 + this.radius;

    return field[yField * this.fieldWidth + xField] <= this.radius;
  }

  forEach(x0: number, y0: number, f: (x: number, y: number) => void): void {
    const field = this.getField(x0, y0);
    for (let y = 0; y < this.fieldWidth; y++) {
      for (let x = 0; x < this.fieldWidth; x++) {
        if (field[y * this.fieldWidth + x] <= this.radius) {
          f(x + x0 - this.radius, y + y0 - this.radius);
        }
      }
    }
  }

  private getField(x0: number, y0: number): Uint8Array {
    let field = this.fields[y0][x0];
    if (field === null) {
      field = this.fields[y0][x0] = this.compute(x0, y0);;
    }
    return field;
  }

  private compute(x0: number, y0: number): Uint8Array {
    const field = new Uint8Array(this.fieldWidth * this.fieldWidth).fill(255);
    field[this.radius * this.fieldWidth + this.radius] = 0;

    this.pfov.compute(x0, y0, this.radius, (x, y) => {
      const dx = x - x0;
      const dy = y - y0;
      const index = (dy + this.radius) * this.fieldWidth + dx + this.radius;
      field[index] = this.getRadius(dx, dy);
    });

    return field;
  }

  inBounds(x: number, y: number): boolean {
    return (0 <= x && x < this.width && 0 <= y && y < this.height);
  }

  getRadius(dx: number, dy: number): number {
    return Math.ceil(Math.sqrt(dx * dx + dy * dy));
  }
}
