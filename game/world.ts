import { Command, ActionType, Action, Pos } from './types';
import { Item } from './item';
import { Mob } from './mob';
import { makeEmptyGrid, nextTo } from './utils';
import { Terrain } from './terrain';
import { VisibilityMap } from './fov';

const ATTACK_TIME = 45;
const SHOOT_TIME = 25;
const PICK_UP_TIME = 20;
const DIE_TIME = 40;
const OPEN_DOOR_TIME = 5;

export class World {
  map: Terrain[][];
  private mobMap: (Mob | null)[][];
  mobs: Mob[];
  private mobsById: Partial<Record<string, Mob>>;
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
            this.startAction(mob, ATTACK_TIME, command);
          }
          break;
        }
        case ActionType.REST:
          this.startAction(mob, command.dt, command);
          break;
        case ActionType.PICK_UP:
          this.startAction(mob, PICK_UP_TIME, command);
          break;
        case ActionType.SHOOT:
          const goal = this.findTarget(
            mob.pos, command.pos
          );
          if (goal) {
            this.startAction(mob, SHOOT_TIME, {
              type: ActionType.SHOOT,
              pos: goal
            });
          }
          break;
      }
    }
  }

  findTarget(sourcePos: Pos, aimPos: Pos): Pos | null {
    const line = this.visibilityMap.line(
      sourcePos.x, sourcePos.y, aimPos.x, aimPos.y);
    if (line.length > 1) {
      return line[line.length-1];
    }
    return null;
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

  private startAction(mob: Mob, dt: number, command: Command): void {
    if (mob.action) {
      this.cancelAction(mob);
    }
    const action: Action = {
      ...command,
      timeStart: this.time,
      timeEnd: this.time + dt,
    };
    switch(action.type) {
      case ActionType.MOVE: {
        this.mobMap[action.pos.y][action.pos.x] = mob;
        this.visibilityChangedFor.add(mob.id);
        break;
      }
      case ActionType.ATTACK: {
        const targetMob = this.mobsById[action.mobId];
        if (targetMob && targetMob.alive) {
          targetMob.health -= mob.damage;
          if (!targetMob.alive) {
            this.startAction(targetMob, DIE_TIME, { type: ActionType.DIE });
          }
        }
        break;
      }
      case ActionType.OPEN_DOOR:
        this.map[action.pos.y][action.pos.x] = Terrain.DOOR_OPEN;
        this.visibilityChanged = true;
        this.visibilityMap.invalidate(action.pos.x, action.pos.y);
        break;
    }
    mob.action = action;
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
      case ActionType.PICK_UP: {
        const itemId = action.itemId;
        const item = this.items.find(item => item.id === itemId)!;
        item.pos = null;
        item.mobId = mob.id;
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
      this.startAction(mob, OPEN_DOOR_TIME, {
        type: ActionType.OPEN_DOOR,
        pos: {x, y},
      });
      return;
    }

    const targetMob = this.findMob(x, y);
    if (targetMob) {
      if (this.canAttack(mob, targetMob)) {
        this.startAction(mob, ATTACK_TIME, {
          type: ActionType.ATTACK,
          mobId: targetMob.id,
        });
      }
      return;
    }

    if (!this.canMove(x, y)) {
      return;
    }

    this.startAction(mob, mob.movementTime, {
      type: ActionType.MOVE,
      pos: {x, y},
    });
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
    if (!(mob.action && mob.action.type === ActionType.ATTACK)) {
      return null;
    }
    return this.mobsById[mob.action.mobId] || null;
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
        const dxPlayer = player.pos.x - mob.pos.x;
        const dyPlayer = player.pos.y - mob.pos.y;

        const x = mob.pos.x + Math.sign(dxPlayer);
        const y = mob.pos.y + Math.sign(dyPlayer);
        if (this.canMove(x, y)) {
          return {
            type: ActionType.MOVE,
            pos: {
              x: mob.pos.x + Math.sign(dxPlayer),
              y: mob.pos.y + Math.sign(dyPlayer),
            }
          };
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
