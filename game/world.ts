import { Command, ActionType, Pos } from './types';
import { Item } from './item';
import { Mob } from './mob';
import { makeEmptyGrid, nextTo } from './utils';
import { Terrain } from './terrain';
import { VisibilityMap } from './fov';
import { MoveAction, ActionParams, Action, AttackAction, OpenDoorAction, DieAction, RestAction, PickUpAction, ShootMobAction, ShootTerrainAction } from './actions';

const ATTACK_TIME = 45;
const SHOOT_TIME = 60;
const PICK_UP_TIME = 20;
const DIE_TIME = 40;
const OPEN_DOOR_TIME = 5;

export class World {
  map: Terrain[][];
  private mobMap: (Mob | null)[][];
  mobs: Mob[];
  mobsById: Partial<Record<string, Mob>>;
  private items: Item[];
  mapW: number;
  mapH: number;
  time: number;

  stateChanged: boolean = false;
  visibilityMap: VisibilityMap;
  visibilityChanged: boolean = false;
  visibilityChangedFor: Set<string> = new Set();

  constructor(map: Terrain[][], mobs: Mob[], items: Item[]) {
    this.map = map;
    this.mobs = mobs;
    this.items = items;
    this.mapH = this.map.length;
    this.mapW = this.map[0].length;
    this.time = 0;

    this.mobMap = makeEmptyGrid(this.mapW, this.mapH, null);
    this.mobsById = {};
    for (const mob of this.mobs) {
      this.mobMap[mob.pos.y][mob.pos.x] = mob;
      this.mobsById[mob.id] = mob;
    }

    this.visibilityMap = new VisibilityMap(
      this.canSeeThrough.bind(this), this.mapW, this.mapH);
  }

  turn(commands: Record<string, Command | null>): void {
    this.time++;

    for (const mob of this.mobs) {
      if (mob.alive && !mob.action && commands[mob.id] === undefined) {
        commands[mob.id] = this.getAiCommand(mob);
      }
    }

    this.stateChanged = false;
    this.visibilityChanged = false;
    this.visibilityChangedFor.clear();

    for (const mob of this.mobs) {
      this.turnMob(mob, commands);
    }
  }

  private turnMob(mob: Mob, commands: Record<string, Command | null>): void {
    this.regenerate(mob);

    if (mob.action) {
      if (this.time < mob.action.timeEnd) {
        return;
      }

      this.endAction(mob);
    }

    const command = commands[mob.id];
    if (command) {
      switch (command.type) {
        case ActionType.MOVE:
          this.moveMob(mob, command.pos.x, command.pos.y);
          break;
        case ActionType.ATTACK: {
          const targetMob = this.mobsById[command.mobId];
          if (targetMob && this.canAttack(mob, targetMob)) {
            this.startAction(mob, ATTACK_TIME, AttackAction.fromMob(targetMob));
          }
          break;
        }
        case ActionType.REST:
          this.startAction(mob, command.dt, RestAction.from());
          break;
        case ActionType.PICK_UP:
          const item = this.items.find(item => item.id === command.itemId)!;
          this.startAction(mob, PICK_UP_TIME, PickUpAction.fromItem(item));
          break;
        case ActionType.SHOOT_MOB: {
          const targetMob = this.mobsById[command.mobId];
          if (targetMob && this.hasClearShot(mob.pos, targetMob)) {
            this.startAction(mob, SHOOT_TIME, ShootMobAction.fromMob(targetMob));
          }
          break;
        }
        case ActionType.SHOOT_TERRAIN: {
          const target = this.findTarget(mob.pos, command.pos);
          if (target) {
            if (target instanceof Mob) {
              this.startAction(mob, SHOOT_TIME, ShootMobAction.fromMob(target));
            } else {
              this.startAction(mob, SHOOT_TIME, ShootTerrainAction.fromPos(target));
            }
          }
          break;
        }
      }
    }
  }

  findTarget(sourcePos: Pos, aimPos: Pos): Mob | Pos | null {
    const pos = this.visibilityMap.findTarget(
      sourcePos.x, sourcePos.y, aimPos.x, aimPos.y,
      this.canShootThrough.bind(this),
    );
    if (!pos) {
      return null;
    }
    const mob = this.findMob(pos.x, pos.y);
    if (mob) {
      return mob;
    } else {
      return pos;
    }
  }

  hasClearShot(pos: Pos, targetMob: Mob): boolean {
    const target = this.findTarget(pos, targetMob.pos);
    if (target instanceof Mob && target.id === targetMob.id) {
      return true;
    }
    if (targetMob.action && targetMob.action instanceof MoveAction) {
      const target = this.findTarget(pos, targetMob.action.pos);
      if (target instanceof Mob && target.id === targetMob.id) {
        return true;
      }
    }
    return false;
  }

  private regenerate(mob: Mob): void {
    if (mob.alive && mob.health < mob.maxHealth) {
      if (mob.action && mob.action instanceof RestAction) {
        mob.regenCounter += 1;
      } else {
        mob.regenCounter += 2;
      }
      if (mob.regenCounter >= 2 * mob.regenRate) {
        mob.regenCounter = 0;
        mob.health++;
        this.stateChanged = true;
      }
    }
  }

  private startAction(mob: Mob, dt: number, builder: (params: ActionParams) => Action): void {
    if (mob.action) {
      this.cancelAction(mob);
    }
    const action = builder({
      mob: mob,
      world: this,
      timeStart: this.time,
      timeEnd: this.time + dt,
    });
    mob.action = action;
    action.start();
    this.stateChanged = true;
  }

  private cancelAction(mob: Mob): void {
    const action = mob.action!;
    action.cancel();
    mob.action = null;
    this.stateChanged = true;
  }

  private endAction(mob: Mob): void {
    const action = mob.action!;
    action.end();
    mob.action = null;
    this.stateChanged = true;
  }

  private removeMob(mob: Mob): void {
    delete this.mobsById[mob.id];
    this.mobMap[mob.pos.y][mob.pos.x] = null;
    this.mobs.splice(this.mobs.indexOf(mob), 1);
  }

  private moveMob(mob: Mob, x: number, y: number): void {
    if (!this.inBounds(x, y)) {
      return;
    }

    const newTerrain = this.map[y][x];

    if (newTerrain === Terrain.DOOR_CLOSED) {
      this.startAction(mob, OPEN_DOOR_TIME, OpenDoorAction.fromPos({x, y}));
      return;
    }

    const targetMob = this.findMob(x, y);
    if (targetMob) {
      if (this.canAttack(mob, targetMob)) {
        this.startAction(mob, ATTACK_TIME, AttackAction.fromMob(targetMob));
      }
      return;
    }

    if (!this.canMove(x, y)) {
      return;
    }

    this.startAction(mob, mob.movementTime, MoveAction.fromPos({x, y}));
  }

  canMove(x: number, y: number): boolean {
    return this.inBounds(x, y) && Terrain.passThrough(this.map[y][x]);
  }

  canMoveOrOpen(x: number, y: number): boolean {
    if (!this.inBounds(x, y)) {
      return false;
    }
    const newTerrain = this.map[y][x];
    if (newTerrain === Terrain.DOOR_CLOSED) {
      return true;
    }
    return Terrain.passThrough(this.map[y][x]);
  }

  canShootThrough(x: number, y: number): boolean {
    return (
      this.inBounds(x, y) &&
      Terrain.shootThrough(this.map[y][x]) &&
      !this.findMob(x, y)
    );
  }

  canAttack(mob: Mob, targetMob: Mob): boolean {
    if (!targetMob.alive) {
      return false;
    }

    if (mob.team === targetMob.team) {
      return false;
    }

    if (nextTo(mob.pos, targetMob.pos)) {
      return true;
    }

    if (targetMob.action && targetMob.action instanceof MoveAction) {
      return nextTo(mob.pos, targetMob.action.pos);
    }

    return false;
  }

  findMob(x: number, y: number): Mob | null {
    return this.mobMap[y][x];
  }

  getTargetMob(mob: Mob): Mob | null {
    if (!mob.action) {
      return null;
    }
    if (mob.action instanceof AttackAction ||
      mob.action instanceof ShootMobAction) {

      return mob.action.targetMob;
    }
    return null;
  }

  findItems(x: number, y: number): Item[] {
    return this.items.filter(item =>
      item.pos && item.pos.x === x && item.pos.y === y
    );
  }

  findMobItems(mob: Mob): Item[] {
    return this.items.filter(item =>
      item.mobId && item.mobId === mob.id
    );
  }

  inBounds(x: number, y: number): boolean {
    return 0 <= x && x < this.mapW && 0 <= y && y < this.mapH;
  }

  private getAiCommand(mob: Mob): Command | null {
    const player = this.mobsById['player'];
    if (player && player.alive) {
      if (this.visibilityMap.visible(
        mob.pos.x, mob.pos.y,
        player.pos.x, player.pos.y
      )) {
        const line = this.visibilityMap.line(
          mob.pos.x, mob.pos.y, player.pos.x, player.pos.y,
          this.canMove.bind(this)
        );
        if (line.length > 1) {
          const pos = line[1];
          if (this.canMove(pos.x, pos.y)) {
            return {
              type: ActionType.MOVE,
              pos
            };
          }
        }
      }
    }

    if (Math.random() < 0.8) {
      return { type: ActionType.REST, dt: Math.random() * 10 };
    }

    const dx = Math.floor(Math.random() * 3) - 1;
    const dy = Math.floor(Math.random() * 3) - 1;
    const x = mob.pos.x + dx, y = mob.pos.y + dy;
    if (dx !== 0 || dy !== 0) {
      return { type: ActionType.MOVE, pos: {x, y} };
    }
    return null;
  }


  canSeeThrough(x: number, y: number): boolean {
    return this.inBounds(x, y) && Terrain.seeThrough(this.map[y][x]);
  }
}
