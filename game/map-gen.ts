import { MapData } from "./map-loader";
import { makeEmptyGrid, makeGrid, simpleDistance } from "./utils";
import { Terrain } from "./terrain";
import { Mob, MobType } from "./mob";
import { Item } from "./item";
import { Pos } from "./types";
import * as tumult from 'tumult';

export class MapGenerator {
  readonly w: number;
  readonly h: number;
  map: Terrain[][];

  constructor(w = 20, h = 20) {
    this.w = w;
    this.h = h;
    this.map = makeEmptyGrid(w, h, Terrain.WALL);
  }

  generate(): MapData {
    const mobs: Mob[] = [];
    const items: Item[] = [];

    this.fillRandomly(0.5, Terrain.FLOOR);
    this.applyCA(5, 5);
    this.applyCA(5, 0);
    this.applyCA(5, 0);

    const components = this.findComponents();
    console.log(components); // TODO connect

    this.translateWithNoise(Terrain.FLOOR, (x: number) => {
      if (x > 0.2) {
        return Terrain.GRASS_TALL;
      } else if (x > 0) {
        return Terrain.GRASS;
      } else {
        return Terrain.FLOOR;
      }
    });

    const playerPos = this.findFloor();
    mobs.push(new Mob('player', MobType.HUMAN, playerPos));
    return { map: this.map, mobs, items };
  }

  fillRandomly(amount: number, terrain: Terrain): void {
    for (let y = 1; y < this.h - 1; y++) {
      for (let x = 1; x < this.h - 1; x++) {
        if (Math.random() < amount) {
          this.map[y][x] = terrain;
        }
      }
    }
  }

  findFloor(): Pos {
    let x: number, y: number;

    do {
      x = Math.floor(Math.random() * this.w);
      y = Math.floor(Math.random() * this.h);
    } while (!Terrain.passThrough(this.map[y][x]));

    return { x, y };
  }

  applyCA(nearThreshold: number, farThreshold: number): void {
    this.map = makeGrid(this.w, this.h, (x, y) => {
      if (x === 0 || x === this.w - 1 || y === 0 || y === this.h - 1) {
        return this.map[y][x];
      }
      let numNear = 0;
      let numFar = 0;
      for (let y1 = y - 2; y1 <= y + 2; y1++) {
        for (let x1 = x - 2; x1 <= x + 2; x1++) {
          if (!this.inBounds(x1, y1)) {
            continue;
          }
          if (this.map[y1][x1] === Terrain.WALL) {
            const distance = simpleDistance({ x, y }, { x: x1, y: y1 });
            if (distance < 2) {
              numNear++;
            } else {
              numFar++;
            }
          }
        }
      }

      if (numNear < nearThreshold && numFar >= farThreshold) {
        return Terrain.FLOOR;
      } else {
        return Terrain.WALL;
      }
    });
  }

  inBounds(x: number, y: number): boolean {
    return 0 <= x && x < this.w && 0 <= y && y < this.h;
  }

  translateWithNoise(
    from: Terrain,
    to: (x: number) => Terrain
  ): void {
    const noise = new tumult.Perlin2("" + Math.random());

    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.map[y][x] === from) {
          this.map[y][x] = to(noise.gen(4 * x / this.w, 4 * y / this.h));
        }
      }
    }
  }

  findComponents(): Pos[][] {
    const seen = makeEmptyGrid(this.w, this.h, false);
    const components: Pos[][] = [];

    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.map[y][x] === Terrain.FLOOR && !seen[y][x]) {
          components.push(this.flood(seen, x, y));
        }
      }
    }

    return components;
  }

  flood(seen: boolean[][], x: number, y: number): Pos[] {
    const result = [];
    const stack: Pos[] = [{ x, y }];
    while (stack.length > 0) {
      const pos = stack.pop()!;
      if (!seen[pos.y][pos.x]) {
        seen[pos.y][pos.x] = true;
        result.push(pos);
        for (let y1 = pos.y - 1; y1 <= pos.y + 1; y1++) {
          for (let x1 = pos.x - 1; x1 <= pos.x + 1; x1++) {
            if (this.inBounds(x1, y1) &&
              this.map[y1][x1] === Terrain.FLOOR && !seen[y1][x1]) {
              stack.push({ x: x1, y: y1 });
            }
          }
        }
      }
    }
    return result;
  }
}
