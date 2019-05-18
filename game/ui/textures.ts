import { tilesetImages } from '../assets';
import * as PIXI from 'pixi.js';
import { TILES, Tile } from '../tiles';

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

const TEXTURES_NORMAL: PIXI.Texture[] = new Array(100);
const TEXTURES_WHITE: PIXI.Texture[] = new Array(100);
const TEXTURES_GRAY: PIXI.Texture[] = new Array(100);

const TEXTURE_TIMEOUT = 5*1000;

function waitUntilLoaded(t: PIXI.BaseTexture): Promise<PIXI.BaseTexture> {
  return new Promise((resolve, reject) => {
    let rejected = false;
    const timeoutId = setTimeout(() => {
      rejected = true;
      reject(`Error loading texture: ${t.imageUrl}`);
    }, TEXTURE_TIMEOUT);
    t.on('loaded', () => {
      if (!rejected) {
        clearTimeout(timeoutId);
        resolve(t);
      }
    });
  });
}

export function loadTextures(): Promise<void> {
  const normalTexture = PIXI.BaseTexture.fromImage(
    tilesetImages.normal, false, PIXI.SCALE_MODES.LINEAR, RESOLUTION
  );
  const whiteTexture = PIXI.BaseTexture.fromImage(
    tilesetImages.white, false, PIXI.SCALE_MODES.LINEAR, RESOLUTION
  );
  const grayTexture = PIXI.BaseTexture.fromImage(
    tilesetImages.gray, false, PIXI.SCALE_MODES.LINEAR, RESOLUTION
  );

  return Promise.all([
    waitUntilLoaded(normalTexture),
    waitUntilLoaded(whiteTexture),
    waitUntilLoaded(grayTexture),
  ])
  .then(() => {
    for (const tile in TILES) {
      const id = TILES[tile].id;
      const x = id % 10, y = Math.floor(id / 10);
      const frame = new PIXI.Rectangle(TEXTURE_SIZE * x, TEXTURE_SIZE * y, TEXTURE_SIZE, TEXTURE_SIZE);

      TEXTURES_NORMAL[id] = new PIXI.Texture(normalTexture, frame);
      TEXTURES_WHITE[id] = new PIXI.Texture(whiteTexture, frame);
      TEXTURES_GRAY[id] = new PIXI.Texture(grayTexture, frame);
    }
  });
}

export function setTexture(sprite: PIXI.Sprite, tile: Tile): void {
  const { id, tint } = TILES[tile];
  if (tint === undefined) {
    sprite.texture = TEXTURES_NORMAL[id];
    sprite.tint = 0xffffff;
  } else {
    sprite.texture = TEXTURES_WHITE[id];
    sprite.tint = tint;
  }
}
