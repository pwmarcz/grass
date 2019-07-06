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

    // For some reason, t.valid is true even before the texture is actually
    // loaded, so we always wait for an event.
    t.on('update', () => {
      if (t.valid && !rejected) {
        clearTimeout(timeoutId);
        resolve(t);
      }
    });
  });
}

export function loadTextures(): Promise<void> {
  return Promise.all([
    load(tilesetImages.normal),
    load(tilesetImages.white),
    load(tilesetImages.gray),
  ])
  .then(([normal, white, gray]) => {
    for (const tile in TILES) {
      const id = TILES[tile].id;
      const x = id % 10, y = Math.floor(id / 10);
      const frame = new PIXI.Rectangle(TEXTURE_SIZE * x, TEXTURE_SIZE * y, TEXTURE_SIZE, TEXTURE_SIZE);

      TEXTURES_NORMAL[id] = new PIXI.Texture(normal, frame);
      TEXTURES_WHITE[id] = new PIXI.Texture(white, frame);
      TEXTURES_GRAY[id] = new PIXI.Texture(gray, frame);
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

function load(url: string): Promise<PIXI.BaseTexture> {
  console.log(`Loading ${url}`);
  const texture = PIXI.BaseTexture.from(
    url,
    {
      scaleMode: PIXI.SCALE_MODES.LINEAR,
      width: 320 * RESOLUTION,
      height: 320 * RESOLUTION,
  });
  return waitUntilLoaded(texture);
}
