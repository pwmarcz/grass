
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
  KEY: new TileMeta({ id: 50 }),
  SWORD: new TileMeta({ id: 51 }),
};
