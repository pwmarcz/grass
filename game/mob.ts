import { Tile } from "./tiles";
import { Pos, Action } from "./types";

export enum MobType {
  GOBLIN = 'GOBLIN',
  HUMAN = 'HUMAN',
}

interface MobMeta {
  movementTime: number;
};

const MOB_META: Record<MobType, MobMeta> = {
  [MobType.GOBLIN]: { movementTime: 20 },
  [MobType.HUMAN]: { movementTime: 10 },
};

export class Mob {
  readonly id: string;
  readonly type: MobType;
  pos: Pos;
  action: Action | null = null;

  constructor(id: string, type: MobType, pos: Pos) {
    this.id = id;
    this.type = type;
    this.pos = pos;
  }

  tile(): Tile {
    return this.type as string;
  }

  movementTime(): number {
    return MOB_META[this.type].movementTime;
  }
}
