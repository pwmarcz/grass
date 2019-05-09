import { MapData } from "./map-loader";
import { makeEmptyGrid, makeGrid, simpleDistance, randomChoice } from "./utils";
import { Terrain } from "./terrain";
import { Mob, MobType } from "./mob";
import { Item } from "./item";
import { Pos } from "./types";
import * as tumult from 'tumult';
import { DistanceMap } from "./path";

export class MapGenerator {
  readonly w: number;
  readonly h: number;
  readonly distanceMap: DistanceMap;
  map: Terrain[][];
  mobs: Mob[];

  constructor(w = 50, h = 50) {
    this.w = w;
    this.h = h;
    this.map = makeEmptyGrid(w, h, Terrain.WALL);
    this.distanceMap = new DistanceMap(this.mapFunc.bind(this), this.w, this.h, false);
    this.mobs = [];
  }

  generate(): MapData {
    const items: Item[] = [];

    this.fillRandomly(0.5, Terrain.FLOOR);
    this.applyCA(5, 5);
    this.applyCA(5, 0);
    this.applyCA(5, 0);
    this.applyCA(5, 0);

    const components = this.findComponents();
    this.connectComponents(components);

    this.translateWithNoise(Terrain.FLOOR, (x: number) => {
      if (x > 0.6) {
        return Terrain.WATER_SHALLOW;
      } else if (x > 0.2) {
        return Terrain.GRASS_TALL;
      } else if (x > 0) {
        return Terrain.GRASS;
      } else {
        return Terrain.FLOOR;
      }
    });

    const playerPos = this.findFloor();
    this.mobs.push(new Mob('player', MobType.HUMAN, playerPos));

    for (let i = 0; i < 10; i++) {
      const pos = this.findFloor();
      const type = Math.random() > 0.5 ? MobType.GOBLIN : MobType.GOBLIN_ARCHER;
      this.mobs.push(new Mob(`mob${i}`, type, pos));
    }

    return { map: this.map, mobs: this.mobs, items };
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

  connectComponents(components: Pos[][]): void {
    // Connect every component to ever other, so that the result doesn't
    // contain too long roundabout paths.
    for (let i = 0; i < components.length-1; i++) {
      for (let j = i+1; j < components.length; j++) {
        const pos0 = randomChoice(components[i]);
        const pos1 = randomChoice(components[j]);
        this.connect(pos0, pos1);
      }
    }
  }

  connect(pos0: Pos, pos1: Pos): void {
    this.distanceMap.update(pos0.x, pos0.y);
    const path = this.distanceMap.findPath(pos1.x, pos1.y);
    for (const {x, y} of path!) {
      if (!Terrain.passThrough(this.map[y][x])) {
        this.map[y][x] = Terrain.FLOOR;
      }
    }
  }

  mapFunc(x: number, y: number): number | null {
    if (x === 0 || x === this.w - 1 || y === 0 || y === this.h - 1) {
      return null;
    }
    return Terrain.passThrough(this.map[y][x]) ? 0 : 3;
  }
}
