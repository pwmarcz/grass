import { TILES } from './tiles';
import { Item, ItemType } from './item';
import { Mob, MobType } from './mob';
import { makeEmptyGrid } from './utils';
import { Terrain } from './terrain';

function parseTmx(xml: string): { width: number; height: number; layers: number[][] } {
  const parser = new DOMParser;
  const doc = parser.parseFromString(xml, 'application/xml');
  const root = doc.documentElement;
  const width = parseInt(root.getAttribute('width')!, 10);
  const height = parseInt(root.getAttribute('height')!, 10);

  const layers = Array.from(doc.querySelectorAll('layer > data')).map(layer => {
    const text = layer.textContent!;
    return text.trim().split(',').map(s => parseInt(s, 10));
  });

  return { width, height, layers };
}

const TILES_BY_ID: Record<number, string> = {};

for (const tile in TILES) {
  TILES_BY_ID[TILES[tile].id] = tile;
}

function getTile(x: number, y: number, width: number, layer: number[]): string | null {
  const id = layer[y * width + x];
  return id === 0 ? null : TILES_BY_ID[id - 1];
}

export function loadMap(xml: string):
 { map: Terrain[][]; mobs: Mob[]; items: Item[] } {
  const { width, height, layers } = parseTmx(xml);
  const terrainLayer = layers[1];
  const itemLayer = layers[2];
  const mobLayer = layers[3];

  const mobs: Mob[] = [];
  let mobCounter = 0;
  const items: Item[] = [];
  let itemCounter = 0;

  const map: Terrain[][] = makeEmptyGrid(width, height, Terrain.EMPTY);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const terrainTile = getTile(x, y, width, terrainLayer);
      map[y][x] = terrainTile as Terrain || Terrain.WALL;

      const mobTile = getTile(x, y, width, mobLayer);
      if (mobTile) {
        const mobId = mobTile === 'HUMAN' ? 'player' : 'mob' + (mobCounter++);
        mobs.push(new Mob(
          mobId,
          mobTile as MobType,
          {x, y},
        ));
      }

      const itemTile = getTile(x, y, width, itemLayer);
      if (itemTile) {
        items.push(new Item(
          'item' + (itemCounter++),
          itemTile as ItemType,
          {x, y},
        ));
      }
    }
  }

  return { map, mobs, items };
}
