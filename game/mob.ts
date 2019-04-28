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
  team: string;
};

const MOB_META: Record<MobType, MobMeta> = {
  [MobType.GOBLIN]: {
    movementTime: 20,
    maxHealth: 15,
    damage: 3,
    regenRate: 120,
    team: 'goblins',
  },
  [MobType.HUMAN]: {
    movementTime: 10,
    maxHealth: 35,
    damage: 4,
    regenRate: 60,
    team: 'humans',
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

  get tile(): Tile {
    return this.type as string;
  }

  get movementTime(): number {
    return MOB_META[this.type].movementTime;
  }

  get damage(): number {
    return MOB_META[this.type].damage;
  }

  get alive(): boolean {
    return this.health >= 0;
  }

  get regenRate(): number {
    return MOB_META[this.type].regenRate;
  }

  get team(): string {
    return MOB_META[this.type].team;
  }
}
