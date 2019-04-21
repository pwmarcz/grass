import { TILES } from './tiles';
import { Mobile } from './types';
import { makeEmptyGrid } from './utils';

function parseTmx(xml: string): { width: number; height: number; layers: number[][] } {
  const parser = new DOMParser;
  const doc = parser.parseFromString(xml, 'application/xml');
  const root = doc.documentElement;
  const width = parseInt(root.getAttribute('width') as string, 10);
  const height = parseInt(root.getAttribute('height') as string, 10);

  const layers = Array.from(doc.querySelectorAll('layer > data')).map(layer => {
    const text = layer.textContent as string;
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

export function loadMap(xml: string): { map: string[][]; mobiles: Mobile[] } {
  const { width, height, layers } = parseTmx(xml);
  const terrainLayer = layers[1];
  const itemLayer = layers[2];
  const mobileLayer = layers[3];

  const mobiles: Mobile[] = [];
  let mobCounter = 0;

  const map: string[][] = makeEmptyGrid(width, height, '');

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const terrainTile = getTile(x, y, width, terrainLayer);
      map[y][x] = terrainTile || 'EMPTY';

      const mobTile = getTile(x, y, width, mobileLayer);
      if (mobTile) {
        const mobId = mobTile === 'HUMAN' ? 'player' : 'mob' + (mobCounter++);
        mobiles.push({
          id: mobId,
          pos: {x, y},
          tile: mobTile,
          action: null,
        });
      }

      const itemTile = getTile(x, y, width, itemLayer);
      if (itemTile) {
          map[y][x] = itemTile;
      }
    }
  }

  return { map, mobiles };
}
