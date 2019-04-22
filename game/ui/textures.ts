// @ts-ignore
import tilesetImage from '../tileset.auto.png';
import * as PIXI from 'pixi.js';
import { TILES } from '../tiles';

export const TILE_SIZE = 32;

export const TILE_TEXTURES: Record<string, PIXI.Texture> = {};

export function loadTextures(): Promise<void> {
  return new Promise((resolve, reject) => {
    PIXI.loader
    .add(tilesetImage)
    .load(() => {
      const baseTexture = PIXI.utils.TextureCache[tilesetImage];
      for (const tile in TILES) {
        const id = TILES[tile].id;
        const x = id % 10, y = Math.floor(id / 10);
        const frame = new PIXI.Rectangle(TILE_SIZE * x, TILE_SIZE * y, TILE_SIZE, TILE_SIZE);
        const texture = new PIXI.Texture(baseTexture, frame);
        TILE_TEXTURES[tile] = texture;
      }
      resolve();
    });
  });
}
