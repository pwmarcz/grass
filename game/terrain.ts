import { Tile } from "./tiles";

export enum Terrain {
  EMPTY = 'EMPTY',
  WALL = 'WALL',
  WOOD = 'WOOD',

  FLOOR = 'FLOOR',
  GRASS = 'GRASS',
  GRASS_TALL = 'GRASS_TALL',

  TREE_A = 'TREE_A',
  TREE_B = 'TREE_B',

  DOOR_CLOSED = 'DOOR_CLOSED',
  DOOR_OPEN = 'DOOR_OPEN',

  WATER_DEEP = 'WATER_DEEP',
  WATER_SHALLOW = 'WATER_SHALLOW',
  LAVA = 'LAVA',

  STAIR_UP = 'STAIR_UP',
  STAIR_DOWN = 'STAIR_DOWN',
}

interface TerrainMeta {
  passThrough: boolean;
  seeThrough: boolean;
  shootThrough: boolean;
}

const wall = {passThrough: false, seeThrough: false, shootThrough: false};
const floor = {passThrough: true, seeThrough: true, shootThrough: true};
const obstacle = {passThrough: false, seeThrough: true, shootThrough: false};
const water = {passThrough: false, seeThrough: true, shootThrough: true};

const TERRAIN: Record<Terrain, TerrainMeta> = {
  [Terrain.EMPTY]: {...wall},
  [Terrain.WALL]: {...wall},
  [Terrain.WOOD]: {...wall},

  [Terrain.FLOOR]: {...floor},
  [Terrain.GRASS]: {...floor},
  [Terrain.GRASS_TALL]: {...floor},

  [Terrain.TREE_A]: {...obstacle},
  [Terrain.TREE_B]: {...obstacle},

  [Terrain.DOOR_CLOSED]: {...wall},
  [Terrain.DOOR_OPEN]: {...floor},

  [Terrain.WATER_DEEP]: {...water},
  [Terrain.WATER_SHALLOW]: {...floor},
  [Terrain.LAVA]: {...water},

  [Terrain.STAIR_UP]: {...floor},
  [Terrain.STAIR_DOWN]: {...floor},
};

export namespace Terrain {
  export function tile(terrain: Terrain): Tile {
    return terrain as string;
  }

  export function seeThrough(terrain: Terrain): boolean {
    return TERRAIN[terrain].seeThrough;
  }

  export function passThrough(terrain: Terrain): boolean {
    return TERRAIN[terrain].passThrough;
  }

  export function pathThrough(terrain: Terrain): boolean {
    return TERRAIN[terrain].passThrough || terrain === Terrain.DOOR_CLOSED;
  }

  export function shootThrough(terrain: Terrain): boolean {
    return TERRAIN[terrain].shootThrough;
  }
}
