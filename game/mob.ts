import { Tile } from "./tiles";
import { Pos, Action } from "./types";

export enum MobType {
  GOBLIN = 'GOBLIN',
  HUMAN = 'HUMAN',
}

interface MobMeta {
  movementTime: number;
  maxHealth: number;
  damage: number;
  regenRate: number;
};

const MOB_META: Record<MobType, MobMeta> = {
  [MobType.GOBLIN]: {
    movementTime: 20,
    maxHealth: 15,
    damage: 3,
    regenRate: 120,
  },
  [MobType.HUMAN]: {
    movementTime: 10,
    maxHealth: 25,
    damage: 5,
    regenRate: 60,
  },
};

export class Mob {
  readonly id: string;
  readonly type: MobType;
  pos: Pos;
  action: Action | null = null;
  health: number;
  maxHealth: number;
  regenCounter: number;

  constructor(id: string, type: MobType, pos: Pos) {
    this.id = id;
    this.type = type;
    this.pos = pos;

    this.maxHealth = this.health = MOB_META[type].maxHealth;
    this.regenCounter = 0;
  }

  tile(): Tile {
    return this.type as string;
  }

  movementTime(): number {
    return MOB_META[this.type].movementTime;
  }

  damage(): number {
    return MOB_META[this.type].damage;
  }

  alive(): boolean {
    return this.health >= 0;
  }

  regenRate(): number {
    return MOB_META[this.type].regenRate;
  }
}
