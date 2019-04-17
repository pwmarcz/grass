import { tiles } from './tiles.js';

/* global TileMaps */

export function loadMap() {
  const tilesById = {};
  for (const tile in tiles) {
    tilesById[tiles[tile].id] = tile;
  }

  const mapData = TileMaps['map'];
  const map = [];
  const mobiles = {};

  for (let y = 0; y < mapData.height; y++) {
    map[y] = [];
    for (let x = 0; x < mapData.width; x++) {
      const id = mapData.layers[1].data[y * mapData.width + x] - 1;

      let tile = id === -1 ? 'EMPTY' : tilesById[id];

      if (tile === 'HUMAN') {
        mobiles['player'] = {
          x, y,
          tile: 'HUMAN',
        };
        tile = 'FLOOR';
      }

      if (tile === 'GOBLIN') {
        mobiles['goblin'] = {
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
