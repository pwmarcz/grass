// @ts-ignore
import tilesetImage32 from '../tileset-32.auto.png';
// @ts-ignore
import tilesetImage64 from '../tileset-64.auto.png';
// @ts-ignore
import tilesetImage128 from '../tileset-128.auto.png';

import * as PIXI from 'pixi.js';
import { TILES } from '../tiles';

export const TILE_SIZE = 32;
export const [RESOLUTION, TILESET_IMAGE] = (function() {
  const ratio = window.devicePixelRatio;
  if (ratio > 2) {
    return [4, tilesetImage128];
  } else if (ratio > 1) {
    return [2, tilesetImage64];
  } else {
    return [1, tilesetImage32];
  }
})();

export const TEXTURE_SIZE = RESOLUTION * TILE_SIZE;

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
