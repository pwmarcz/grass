import { TILES } from './tiles';
import { Mobile } from './types';
import { makeGrid } from './utils';

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

export function loadMap(xml: string): { map: string[][]; mobiles: Mobile[] } {
  const { width, height, layers } = parseTmx(xml);
  const mapData = layers[1];

  const tilesById: Record<number, string> = {};
  for (const tile in TILES) {
    tilesById[TILES[tile].id] = tile;
  }

  const mobiles: Mobile[] = [];
  let mobCounter = 0;

  const map = makeGrid(width, height, (x, y) => {
    const id = mapData[y * width + x] - 1;
    let tile = id === -1 ? 'EMPTY' : tilesById[id];

    if (tile === 'HUMAN') {
      mobiles.push({
        id: 'player',
        pos: {x, y},
        tile: 'HUMAN',
        action: null,
      });
      tile = 'FLOOR';
    }

    if (tile === 'GOBLIN') {
      mobiles.push({
        id: 'mob' + (mobCounter++),
        pos: {x, y},
        tile: 'GOBLIN',
        action: null,
      });
      tile = 'FLOOR';
    }

    return tile;
  });

  return { map, mobiles };
}
