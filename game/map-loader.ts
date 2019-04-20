import { TILES } from './tiles';
import { Mobile } from './types';
import { makeGrid } from './utils';

declare const TileMaps: {
  map: {
    width: number;
    height: number;
    layers: {data: number[]}[];
  };
};

export function loadMap(): { map: string[][]; mobiles: Mobile[] } {
  const tilesById: Record<number, string> = {};
  for (const tile in TILES) {
    tilesById[TILES[tile].id] = tile;
  }

  const mapData = TileMaps['map'];
  const mobiles: Mobile[] = [];

  const map = makeGrid(mapData.width, mapData.height, (x, y) => {
    const id = mapData.layers[1].data[y * mapData.width + x] - 1;

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
        id: 'goblin',
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
