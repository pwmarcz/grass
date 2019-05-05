import { MapData } from "./map-loader";
import { makeEmptyGrid, makeGrid, simpleDistance } from "./utils";
import { Terrain } from "./terrain";
import { Mob, MobType } from "./mob";
import { Item } from "./item";
import { Pos } from "./types";

export function generateMap(w = 20, h = 20): MapData {
  let map = makeEmptyGrid(w, h, Terrain.WALL);
  const mobs: Mob[] = [];
  const items: Item[] = [];

  fillRandomly(map, w, h, 0.5, Terrain.FLOOR);

  map = applyCA(map, w, h, 5, 5);
  map = applyCA(map, w, h, 5, 0);
  map = applyCA(map, w, h, 5, 0);

  const playerPos = findFloor(map, w, h);
  mobs.push(new Mob('player', MobType.HUMAN, playerPos));

  return {map, mobs, items};
}


function fillRandomly(
  map: Terrain[][], w: number, h: number, amount: number, terrain: Terrain
): void {
  for (let y = 1; y < h-1; y++) {
    for (let x = 1; x < h-1; x++) {
      if (Math.random() < amount)
      map[y][x] = terrain;
    }
  }
}

function findFloor(
  map: Terrain[][], w: number, h: number
): Pos {
  let x: number, y: number;

  do {
    x = Math.floor(Math.random() * w);
    y = Math.floor(Math.random() * h);
  } while (map[y][x] !== Terrain.FLOOR);

  return {x, y};
}

function applyCA(
  map: Terrain[][],
  w: number,
  h: number,
  nearThreshold: number,
  farThreshold: number,
): Terrain[][] {
  return makeGrid(w, h, (x, y) => {
    if (x === 0 || x === w-1 || y === 0 || y === h-1) {
      return map[y][x];
    }
    let numNear = 0;
    let numFar = 0;
    for (let y1 = y - 2; y1 <= y + 2; y1++) {
      for (let x1 = x - 2; x1 <= x + 2; x1++) {
        if (!(0 <= x1 && x1 < w && 0 <= y1 && y1 < h)) {
          continue;
        }
        if (map[y1][x1] === Terrain.WALL) {
          const distance = simpleDistance({x, y}, {x: x1, y: y1});
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
