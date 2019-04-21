import * as PIXI from 'pixi.js';
import { h } from 'preact';

// @ts-ignore
import tilesetImage from './tileset.auto.png';

export class TileMeta {
  id: number = 0;
  canEnter: boolean = true;
  char: string | null = null;

  constructor(options: { id: number; canEnter?: boolean; canPath?: boolean }) {
    Object.assign(this, options);
  }
}

export const TILES: Record<string, TileMeta> = {
  EMPTY: new TileMeta({ id: 99, canEnter: false }),
  FLOOR: new TileMeta({ id: 23 }),
  WALL: new TileMeta({ id: 21, canEnter: false }),
  WOOD: new TileMeta({ id: 30, canEnter: false }),
  GRASS: new TileMeta({ id: 22 }),
  GRASS_TALL: new TileMeta({ id: 13 }),

  TREE_A: new TileMeta({ id: 11, canEnter: false }),
  TREE_B: new TileMeta({ id: 12, canEnter: false }),

  DOOR_CLOSED: new TileMeta({ id: 31, canEnter: false }),
  DOOR_OPEN: new TileMeta({ id: 32 }),

  WATER_DEEP: new TileMeta({ id: 33, canEnter: false }),
  WATER_SHALLOW: new TileMeta({ id: 34 }),

  STAIR_UP: new TileMeta({ id: 40 }),
  STAIR_DOWN: new TileMeta({ id: 41 }),

  HUMAN: new TileMeta({ id: 10 }),
  GOBLIN: new TileMeta({ id: 1 }),

  GOLD: new TileMeta({ id: 0 }),
};

export const TILE_SIZE = 32;

export const TILE_TEXTURES: Record<string, PIXI.Texture> = {};

export const TILE_TEXT_STYLES: Record<string, PIXI.TextStyle> = {};

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

export class TileGlyph extends PIXI.Container {
  tile: string = 'EMPTY';

  constructor(tile: string) {
    super();
    this.update(tile);
  }

  updateSprite(tile: string): void {
    const sprite = new PIXI.Sprite(TILE_TEXTURES[tile]);
    this.removeChildren();
    this.addChild(sprite);
  }

  update(tile: string): void {
    if (this.tile !== tile) {
      this.tile = tile;
      if (tile === 'EMPTY') {
        this.removeChildren();
      } else {
        this.updateSprite(tile);
      }
    }
  }
}

export function TileElement({tile}: { tile: string }): preact.VNode {
  const id = TILES[tile].id;
  const x = (id % 10) * TILE_SIZE, y = Math.floor(id / 10) * TILE_SIZE;

  return h('span', {
    className: 'tile',
    style: {
      backgroundPositionX: -x + 'px',
      backgroundPositionY: -y + 'px',
    }
  });
}