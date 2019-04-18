import { tiles } from './tiles';
import { TileGrid, MobileMap } from './types';

declare const TileMaps;

export function loadMap(): { map: TileGrid; mobiles: MobileMap } {
  const tilesById = {};
  for (const tile in tiles) {
    tilesById[tiles[tile].id] = tile;
  }

  const mapData = TileMaps['map'];
  const map: TileGrid = [];
  const mobiles: MobileMap = {};

  for (let y = 0; y < mapData.height; y++) {
    map[y] = [];
    for (let x = 0; x < mapData.width; x++) {
      const id = mapData.layers[1].data[y * mapData.width + x] - 1;

      let tile = id === -1 ? 'EMPTY' : tilesById[id];

      if (tile === 'HUMAN') {
        mobiles['player'] = {
          id: 'player',
          x, y,
          tile: 'HUMAN',
        };
        tile = 'FLOOR';
      }

      if (tile === 'GOBLIN') {
        mobiles['goblin'] = {
          id: 'goblin',
          x, y,
          tile: 'GOBLIN',
        };
        tile = 'FLOOR';
      }

      map[y][x] = tile;
    }
  }

  return { map, mobiles };
}

loadMap();
