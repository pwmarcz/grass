import { Command, ActionType, Action, Pos } from './types';
import { Item } from './item';
import { Mob } from './mob';
import { makeEmptyGrid, nextTo } from './utils';
import { Terrain } from './terrain';
import { VisibilityMap } from './fov';
import { DEBUG } from './debug';


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

    if (DEBUG.noEnemies) {
      this.mobs = this.mobs.filter(mob => mob.id === 'player');
    }

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
      if (this.time === mob.action.timeEffect) {
        this.effectAction(mob);
      }
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
          if (this.canAttack(mob, command.targetMob)) {
            this.startAction(mob, command);
          }
          break;
        }
        case ActionType.REST:
          this.startAction(mob, command);
          break;
        case ActionType.PICK_UP:
          this.startAction(mob, command);
          break;
        case ActionType.SHOOT_MOB: {
          if (this.hasClearShot(mob.pos, command.targetMob)) {
            this.startAction(mob, command);
          }
          break;
        }
        case ActionType.SHOOT_TERRAIN: {
          const target = this.findTarget(mob.pos, command.pos);
          if (target) {
            if (target instanceof Mob) {
              this.startAction(mob, {
                type: ActionType.SHOOT_MOB,
                targetMob: target,
              });
            } else {
              this.startAction(mob, {
                type: ActionType.SHOOT_TERRAIN,
                pos: target,
              });
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
    if (targetMob.action && targetMob.action.type === 'MOVE') {
      const target = this.findTarget(pos, targetMob.action.pos);
      if (target instanceof Mob && target.id === targetMob.id) {
        return true;
      }
    }
    return false;
  }

  private regenerate(mob: Mob): void {
    if (mob.alive && mob.health < mob.maxHealth) {
      if (mob.action && mob.action.type !== ActionType.REST) {
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

  private startAction(mob: Mob, command: Command): void {
    if (mob.action) {
      this.cancelAction(mob);
    }

    const {dtEnd, dtEffect} = getActionTime(mob, command);

    const action: Action = {
      ...command,
      timeStart: this.time,
      timeEnd: this.time + dtEnd,
      timeEffect: this.time + dtEffect,
    };
    switch(action.type) {
      case ActionType.MOVE: {
        this.mobMap[action.pos.y][action.pos.x] = mob;
        this.visibilityChangedFor.add(mob.id);
        break;
      }
    }
    mob.action = action;
    if (dtEffect === 0) {
      this.effectAction(mob);
    }
    this.stateChanged = true;
  }

  private effectAction(mob: Mob): void {
    const action = mob.action!;
    switch(action.type) {
      case ActionType.ATTACK: {
        this.damageMob(action.targetMob, mob.damage);
        break;
      }
      case ActionType.OPEN_DOOR:
        this.map[action.pos.y][action.pos.x] = Terrain.DOOR_OPEN;
        this.visibilityChanged = true;
        this.visibilityMap.invalidate(action.pos.x, action.pos.y);
        break;
      case ActionType.PICK_UP: {
        const item = action.item;
        item.pos = null;
        item.mobId = mob.id;
        break;
      }
      case ActionType.SHOOT_MOB: {
        this.damageMob(action.targetMob, mob.damage * 2);
        break;
      }
    }
    this.stateChanged = true;
  }

  private cancelAction(mob: Mob): void {
    const action = mob.action!;
    switch (action.type) {
      case ActionType.MOVE: {
        this.mobMap[action.pos.y][action.pos.x] = null;
        break;
      }
    }
    mob.action = null;
    this.stateChanged = true;
  }

  private endAction(mob: Mob): void {
    const action = mob.action!;
    switch (action.type) {
      case ActionType.MOVE: {
        this.mobMap[mob.pos.y][mob.pos.x] = null;
        mob.pos = action.pos;

        this.visibilityChangedFor.add(mob.id);
        break;
      }
      case ActionType.DIE: {
        this.removeMob(mob);
        break;
      }
    }
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
      this.startAction(mob, {
        type: ActionType.OPEN_DOOR,
        pos: {x, y},
      });
      return;
    }

    const targetMob = this.findMob(x, y);
    if (targetMob) {
      if (this.canAttack(mob, targetMob)) {
        this.startAction(mob, {
          type: ActionType.ATTACK,
          targetMob
        });
      }
      return;
    }

    if (!this.canMove(x, y)) {
      return;
    }

    this.startAction(mob, {
      type: ActionType.MOVE,
      pos: {x, y},
    });
  }

  private damageMob(mob: Mob, damage: number): void {
    const wasAlive = mob.alive;
    mob.health -= damage;
    if (wasAlive && !mob.alive) {
      this.startAction(mob, { type: ActionType.DIE });
    }
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

    if (targetMob.action && targetMob.action.type === ActionType.MOVE) {
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
    if (mob.action.type === ActionType.ATTACK ||
      mob.action.type === ActionType.SHOOT_MOB) {

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
        if (mob.shoots && this.hasClearShot(mob.pos, player)) {
          return {
            type: ActionType.SHOOT_MOB,
            targetMob: player
          };
        }

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

function getActionTime(mob: Mob, command: Command): {dtEnd: number; dtEffect: number} {
  let dtEnd: number;
  let dtEffect: number;

  switch (command.type) {
    case ActionType.ATTACK:
      dtEnd = 45;
      dtEffect = 4;
      break;

    case ActionType.SHOOT_MOB:
    case ActionType.SHOOT_TERRAIN:
      dtEnd = 60;
      dtEffect = 18;
      break;

    case ActionType.PICK_UP:
      dtEnd = dtEffect = 60;
      break;

    case ActionType.DIE:
      dtEnd = dtEffect = 60;
      break;

    case ActionType.OPEN_DOOR:
      dtEnd = 5;
      dtEffect = 0;
      break;

    case ActionType.REST:
      dtEnd = dtEffect = command.dt;
      break;

    case ActionType.MOVE:
      dtEnd = dtEffect = mob.movementTime;
      break;

    default:
      // eslint-disable-next-line no-console
      console.warn(`getActionTime: unrecognized action ${command!.type}`);
      dtEnd = dtEffect = 10;
      break;
  }

  return {dtEnd, dtEffect};
}
