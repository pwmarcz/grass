import { Command, CommandType, ActionType } from './types';
import { Item } from './item';
import { Mob } from './mob';
import { makeEmptyGrid } from './utils';
import { Terrain } from './terrain';

const ATTACK_TIME = 45;

const PICK_UP_TIME = 20;

const SHOOT_TIME = 45;

export class World {
  map: Terrain[][];
  mobMap: (Mob | null)[][];
  mobs: Mob[];
  items: Item[];
  mapW: number;
  mapH: number;
  time: number;

  stateChanged: boolean = false;
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
    for (const mob of this.mobs) {
      this.mobMap[mob.pos.y][mob.pos.x] = mob;
    }
  }

  turn(commands: Record<string, Command | null>): void {
    this.time++;

    for (const mob of this.mobs) {
      if (!mob.action && commands[mob.id] === undefined) {
        commands[mob.id] = getAiCommand();
      }
    }

    this.stateChanged = false;
    this.visibilityChanged = false;
    this.visibilityChangedFor.clear();

    for (const mob of this.mobs) {
      this.turnMob(mob, commands);
    }
  }

  turnMob(mob: Mob, commands: Record<string, Command | null>): void {
    if (mob.action) {
      if (this.time < mob.action.timeEnd) {
        return;
      }

      switch (mob.action.type) {
        case ActionType.MOVE: {
          this.mobMap[mob.pos.y][mob.pos.x] = null;
          mob.pos = mob.action.pos;

          this.visibilityChangedFor.add(mob.id);
          break;
        }
        case ActionType.PICK_UP: {
          const itemId = mob.action.itemId;
          const item = this.items.find(item => item.id === itemId)!;
          item.pos = null;
          item.mobId = mob.id;
          break;
        }
      }

      mob.action = null;
      this.stateChanged = true;
    }

    const command = commands[mob.id];
    if (command) {
      switch (command.type) {
        case CommandType.MOVE:
          this.moveMob(mob, mob.pos.x + command.dx, mob.pos.y + command.dy);
          break;
        case CommandType.SHOOT:
          mob.action = {
            type: ActionType.SHOOT,
            timeStart: this.time,
            timeEnd: this.time + SHOOT_TIME,
            pos: { x: mob.pos.x + command.dx, y: mob.pos.y + command.dy },
          };
          break;
        case CommandType.REST:
          mob.action = {
            type: ActionType.REST,
            timeStart: this.time,
            timeEnd: this.time + command.dt,
          };
          break;
        case CommandType.PICK_UP:
          mob.action = {
            type: ActionType.PICK_UP,
            timeStart: this.time,
            timeEnd: this.time + PICK_UP_TIME,
            itemId: command.itemId,
          };
          break;
      }
      this.stateChanged = true;
    }
  }

  moveMob(mob: Mob, x: number, y: number): void {
    if (!this.inBounds(x, y)) {
      return;
    }

    const newTerrain = this.map[y][x];

    if (newTerrain === Terrain.DOOR_CLOSED) {
      this.map[y][x] = Terrain.DOOR_OPEN;
      this.visibilityChanged = true;
      mob.action = {
        type: ActionType.OPEN_DOOR,
        timeStart: this.time,
        timeEnd: this.time + 5,
      };
      return;
    }

    if (this.findMob(x, y)) {
      mob.action = {
        type: ActionType.ATTACK,
        pos: {x, y},
        timeStart: this.time,
        timeEnd: this.time + ATTACK_TIME,
      };
      return;
    }

    if (!this.canMove(x, y)) {
      return;
    }

    this.mobMap[y][x] = mob;
    mob.action = {
      type: ActionType.MOVE,
      pos: {x, y},
      timeStart: this.time,
      timeEnd: this.time + mob.movementTime(),
    };
    this.visibilityChangedFor.add(mob.id);
  }

  canMove(x: number, y: number): boolean {
    return this.inBounds(x, y) && Terrain.passThrough(this.map[y][x]);
  }

  findMob(x: number, y: number): Mob | null {
    return this.mobMap[y][x];
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
}

function getAiCommand(): Command | null {
  if (Math.random() < 0.8) {
    return { type: CommandType.REST, dt: Math.random() * 10 };
  }

  const dx = Math.floor(Math.random() * 3) - 1;
  const dy = Math.floor(Math.random() * 3) - 1;
  if (dx !== 0 || dy !== 0) {
    return { type: CommandType.MOVE, dx, dy };
  }
  return null;
}
