import * as PIXI from 'pixi.js';
import tilesetImage from './tileset.auto.png';

export const tiles = {
  EMPTY: { id: 20, pass: false },
  FLOOR: { id: 23 },
  WALL: { id: 21, pass: false },
  WOOD: { id: 30, pass: false },
  GRASS: { id: 22 },
  GRASS_TALL: { id: 13 },

  TREE_A: { id: 11, pass: false },
  TREE_B: { id: 12, pass: false },

  DOOR_CLOSED: { id: 31, pass: false },
  DOOR_OPEN: { id: 32 },

  WATER_DEEP: { id: 33, pass: false },
  WATER_SHALLOW: { id: 34 },

  STAIR_UP: { id: 40 },
  STAIR_DOWN: { id: 41 },

  HUMAN: { id: 10 },
  GOBLIN: { id: 1 },

  GOLD: { id: 0 },
};

export const TILE_SIZE = 32;

export const tileTextures = {};

export function prepareTextures(): void {
  const baseTexture = PIXI.utils.TextureCache[tilesetImage];
  for (const tile in tiles) {
    const id = tiles[tile].id;
    const x = id % 10, y = Math.floor(id / 10);
    const frame = new PIXI.Rectangle(TILE_SIZE * x, TILE_SIZE * y, TILE_SIZE, TILE_SIZE);
    const texture = new PIXI.Texture(baseTexture, frame);
    tileTextures[tile] = texture;
  }
}
