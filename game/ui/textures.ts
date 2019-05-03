// @ts-ignore
import tilesetNormalImage from '../tileset.auto.svg';

// @ts-ignore
import tilesetWhiteImage from '../tileset-white.auto.svg';

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

interface TileTexture {
  readonly texture: PIXI.Texture;
  readonly tint: number;
}

export const TILE_TEXTURES: Record<string, TileTexture> = {};

function waitUntilLoaded(t: PIXI.BaseTexture): Promise<PIXI.BaseTexture> {
  return new Promise(resolve => {
    t.on('loaded', resolve);
  });
}

export function loadTextures(): Promise<void> {
  const normalTexture = PIXI.BaseTexture.fromImage(
    tilesetNormalImage, false, PIXI.SCALE_MODES.LINEAR, RESOLUTION
  );
  const whiteTexture = PIXI.BaseTexture.fromImage(
    tilesetWhiteImage, false, PIXI.SCALE_MODES.LINEAR, RESOLUTION
  );

  Promise.all([waitUntilLoaded(normalTexture), waitUntilLoaded(whiteTexture)])
  .then(() => {
    for (const tile in TILES) {
      const id = TILES[tile].id;
      const x = id % 10, y = Math.floor(id / 10);
      const frame = new PIXI.Rectangle(TEXTURE_SIZE * x, TEXTURE_SIZE * y, TEXTURE_SIZE, TEXTURE_SIZE);

      const tint = TILES[tile].tint || 0xFFFFFF;
      const texture = new PIXI.Texture(
        tint === 0xFFFFFF ? normalTexture : whiteTexture,
        frame
      );

      TILE_TEXTURES[tile] = {texture, tint};
    }
  });
  return new Promise((resolve, reject) => {
    const baseTexture = PIXI.BaseTexture.fromImage(
      tilesetWhiteImage, false, PIXI.SCALE_MODES.LINEAR, RESOLUTION
    );
    baseTexture.on('loaded', () => {

      resolve();
    });
  });
}
