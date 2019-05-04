import { Mob } from "./mob";
import { World } from "./world";
import { Pos } from "./types";
import { Terrain } from "./terrain";
import { Item } from "./item";

export interface Action {
  readonly timeStart: number;
  readonly timeEnd: number;

  start(): void;
  end(): void;
  cancel(): void;
}

export interface ActionParams {
  mob: Mob;
  world: World;
  timeStart: number;
  timeEnd: number;
}

export type ActionBuilder = (params: ActionParams) => Action;

class BaseAction implements Action {
  readonly mob: Mob;
  readonly world: World;
  readonly timeStart: number;
  readonly timeEnd: number;

  constructor({mob, world, timeStart, timeEnd}: ActionParams) {
    this.mob = mob;
    this.world = world;
    this.timeStart = timeStart;
    this.timeEnd = timeEnd;
  }

  static from(): ActionBuilder {
    return params => new this(params);
  }

  start(): void {}
  end(): void {}
  cancel(): void {}
}

class PosAction extends BaseAction {
  readonly pos: Pos;

  static fromPos(pos: Pos): ActionBuilder {
    return params => new this(pos, params);
  }

  constructor(pos: Pos, params: ActionParams) {
    super(params);
    this.pos = pos;
  }
}

class MobAction extends BaseAction {
  readonly targetMob: Mob;

  static fromMob(targetMob: Mob): ActionBuilder {
    return params => new this(targetMob, params);
  }

  constructor(targetMob: Mob, params: ActionParams) {
    super(params);
    this.targetMob = targetMob;
  }
}

export class AttackAction extends MobAction {
  start(): void {
    this.world.damage(this.targetMob, this.mob.damage);
  }
}

export class MoveAction extends PosAction {
  start(): void {
    this.world.startMove(this.mob, this.pos);
  }

  end(): void {
    this.world.endMove(this.mob, this.pos);
  }

  cancel(): void {
    this.world.endMove(this.mob, this.mob.pos);
  }
}

export class RestAction extends BaseAction {}

export class OpenDoorAction extends PosAction {
  start(): void {
    this.world.changeMap(this.pos.x, this.pos.y, Terrain.DOOR_OPEN);
  }
}

export class PickUpAction extends BaseAction {
  readonly item: Item;

  constructor(item: Item, params: ActionParams) {
    super(params);
    this.item = item;
  }

  static fromItem(item: Item): ActionBuilder {
    return params => new this(item, params);
  }

  end(): void {
    this.item.pos = null;
    this.item.mobId = this.mob.id;
  }
}

export class DieAction extends BaseAction {
  end(): void {
    this.mob.removeMob(this.mob);
  }
}

export class ShootMobAction extends MobAction {
  end(): void {
    this.world.damage(this.targetMob, this.mob.damage * 3);
  }
}

export class ShootTerrainAction extends PosAction {}
