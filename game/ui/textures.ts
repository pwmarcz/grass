// @ts-ignore
import tilesetImage from '../tileset.auto.svg';

import * as PIXI from 'pixi.js';
import { TILES } from '../tiles';

export const TILE_SIZE = 32;
export const RESOLUTION = (function() {
  const ratio = window.devicePixelRatio;
  for (const r of [4, 3, 2]) {
    if (ratio >= r) {
      return r;
    }
  }
  return 1;
})();

export const TEXTURE_SIZE = TILE_SIZE * RESOLUTION;

export const TILE_TEXTURES: Record<string, PIXI.Texture> = {};

export function loadTextures(): Promise<void> {
  return new Promise((resolve, reject) => {
    const baseTexture = PIXI.BaseTexture.fromImage(
      tilesetImage, false, PIXI.SCALE_MODES.LINEAR, RESOLUTION
    );
    baseTexture.on('loaded', () => {
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
