import { MapFunc } from "./global-map";
import { makeEmptyGrid } from "./utils";
import { PermissiveFov } from 'permissive-fov';
import { Pos } from "./types";

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

  line(x0: number, y0: number, x1: number, y1: number): Pos[] {
    const q = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));

    let bestLine = this.truncatedLine(x0, y0, x1, y1, 0);
    for (let eps = 1; eps < q; eps++) {
      const line = this.truncatedLine(x0, y0, x1, y1, eps);
      if (line.length > bestLine.length) {
        bestLine = line;
      }
    }
    return bestLine;
  }

  private truncatedLine(
    x0: number, y0: number, x1: number, y1: number, eps: number): Pos[] {
    const line = bresenhamLine(x0, y0, x1, y1, eps);
    const n = this.blockLine(line);
    line.splice(n);
    return line;
  }

  private blockLine(line: Pos[]): number {
    for (let i = 0; i < line.length; i++) {
      if (!this.visible(line[0].x, line[0].y, line[i].x, line[i].y)) {
        return i;
      }
      if (!this.mapFunc(line[i].x, line[i].y)) {
        return i + 1;
      }
    }
    return line.length;
  }
}

function bresenhamLine(
  x0: number, y0: number, x1: number, y1: number, eps: number
): Pos[] {

  const dx = x1 - x0;
  const dy = y1 - y0;
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);
  const n = Math.max(adx, ady);

  let p, q;
  let dx0, dx1;
  let dy0, dy1;
  if (adx < ady) {
    p = adx;
    q = ady;
    dx0 = 0;
    dy0 = Math.sign(dy);
    dx1 = Math.sign(dx);
    dy1 = Math.sign(dy);
  } else {
    p = ady;
    q = adx;
    dx0 = Math.sign(dx);
    dy0 = 0;
    dx1 = Math.sign(dx);
    dy1 = Math.sign(dy);
  }

  const word = balancedWord(n, p, q, eps);

  const result = [];
  let x = x0, y = y0;
  result.push({x, y});
  for (const digit of word) {
    x += (digit === 0 ? dx0 : dx1);
    y += (digit === 0 ? dy0 : dy1);
    result.push({x, y});
  }

  return result;
}

function balancedWord(n: number, p: number, q: number, eps: number): number[] {
  const result = [];
  for (let i = 0; i < n; i++) {
    eps += p;
    if (eps < q) {
      result.push(0);
    } else {
      result.push(1);
      eps -= q;
    }
  }
  return result;
}
