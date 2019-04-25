// @ts-ignore
import tilesetImage32 from '../tileset-32.auto.png';
// @ts-ignore
import tilesetImage64 from '../tileset-64.auto.png';

import * as PIXI from 'pixi.js';
import { TILES } from '../tiles';

export const TILE_SIZE = 32;
export const RESOLUTION = window.devicePixelRatio >= 2 ? 2 : 1;

export const TEXTURE_SIZE = RESOLUTION * TILE_SIZE;

export const TILESET_IMAGE = {
  1: tilesetImage32,
  2: tilesetImage64,
}[RESOLUTION];

export const TILE_TEXTURES: Record<string, PIXI.Texture> = {};

export function loadTextures(): Promise<void> {
  return new Promise((resolve, reject) => {
    PIXI.loader
    .add(TILESET_IMAGE)
    .load(() => {
      const baseTexture = PIXI.utils.TextureCache[TILESET_IMAGE];
      for (const tile in TILES) {
        const id = TILES[tile].id;
        const x = id % 10, y = Math.floor(id / 10);
        const frame = new PIXI.Rectangle(TEXTURE_SIZE * x, TEXTURE_SIZE * y, TEXTURE_SIZE, TEXTURE_SIZE);
        const texture = new PIXI.Texture(baseTexture, frame);
        TILE_TEXTURES[tile] = texture;
      }
      resolve();
    });
  });
}
