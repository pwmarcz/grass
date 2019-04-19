import { tiles } from './tiles';
import { TileGrid, Mobile } from './types';

declare const TileMaps: {
  map: {
    width: number;
    height: number;
    layers: {data: number[]}[];
  };
};

export function loadMap(): { map: TileGrid; mobiles: Mobile[] } {
  const tilesById: Record<number, string> = {};
  for (const tile in tiles) {
    tilesById[tiles[tile].id] = tile;
  }

  const mapData = TileMaps['map'];
  const map: TileGrid = [];
  const mobiles: Mobile[] = [];

  for (let y = 0; y < mapData.height; y++) {
    map[y] = [];
    for (let x = 0; x < mapData.width; x++) {
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

      map[y][x] = tile;
    }
  }

  return { map, mobiles };
}
