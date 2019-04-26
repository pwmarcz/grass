// Implementation from:
// http://www.roguebasin.com/index.php?title=Improved_Shadowcasting_in_Java

import { LocalMap, MapFunc } from "./local-map";

const FOV_RADIUS = 12;

const DIAGONALS = [
  {dx: -1, dy: -1},
  {dx: -1, dy: 1},
  {dx: 1, dy: -1},
  {dx: 1, dy: 1},
];

export class VisibilityMap extends LocalMap<boolean, boolean> {
  constructor(mapFunc: MapFunc<boolean>, radius = FOV_RADIUS) {
    super(false, mapFunc, FOV_RADIUS);
  }

  visible(x: number, y: number): boolean {
    return this.inBounds(x, y) && this.get(x, y);
  }

  update(xc: number, yc: number): void {
    super.update(xc, yc);
    super.clear();

    this.set(xc, yc, true);

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
        const leftSlope = (dx - 0.5) / (dy + 0.5);
        const rightSlope = (dx + 0.5) / (dy - 0.5);

        if (!this.inBounds(x, y)) {
          continue;
        }

        if (start < rightSlope) {
          continue;
        }

        if (end > leftSlope) {
          break;
        }

        if (this.inRadius(dx, dy)) {
          this.set(x, y, true);
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
    const r = this.radius + 1;
    return dx * dx + dy * dy < r * r;
  }
}
