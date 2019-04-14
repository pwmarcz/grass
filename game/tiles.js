const tiles = {
  EMPTY: { id: 20 },
  FLOOR: { id: 23 },
  WALL: { id: 21 },
  WOOD: { id: 30 },
  GRASS: { id: 22 },
  GRASS_TALL: { id: 13 },

  TREE_A: { id: 11 },
  TREE_B: { id: 12 },

  DOOR_CLOSED: { id: 31 },
  DOOR_OPEN: { id: 32 },

  WATER_DEEP: { id: 33 },
  WATER_SHALLOW: { id: 34 },

  STAIR_UP: { id: 40 },
  STAIR_DOWN: { id: 41 },

  HUMAN: { id: 10 },
  GOLD: { id: 0 },
};

const tileTextures = {};

function prepareTextures() {
  const baseTexture = PIXI.utils.TextureCache['tileset.png'];
  for (const tile in tiles) {
    const id = tiles[tile].id;
    const x = id % 10, y = Math.floor(id / 10);
    const frame = new PIXI.Rectangle(32 * x, 32 * y, 32, 32);
    const texture = new PIXI.Texture(baseTexture, frame);
    tileTextures[tile] = texture;
  }
}
