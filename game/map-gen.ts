import { MapData } from "./map-loader";
import { makeEmptyGrid } from "./utils";
import { Terrain } from "./terrain";
import { Mob, MobType } from "./mob";
import { Item } from "./item";

export function generateMap(w = 20, h = 20): MapData {
  const map = makeEmptyGrid(w, h, Terrain.WALL);
  const mobs: Mob[] = [];
  const items: Item[] = [];

  for (let y = 1; y < h-1; y++) {
    for (let x = 1; x < h-1; x++) {
      map[y][x] = Terrain.FLOOR;
    }
  }

  const x = Math.floor(w / 2);
  const y = Math.floor(h / 2);
  mobs.push(new Mob('player', MobType.HUMAN, {x, y}));

  return {map, mobs, items};
}
