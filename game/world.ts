import { TILES } from './tiles';
import { DistanceMap } from './path';
import { Command, Mob, CommandType, ActionType, Item } from './types';
import { makeEmptyGrid } from './utils';
import { VisibilityMap } from './fov';

const MOVEMENT_TIME: Record<string, number> = {
  'HUMAN': 10,
  'GOBLIN': 20,
};

const ATTACK_TIME = 45;

const PICK_UP_TIME = 20;

export class World {
  map: string[][];
  mobMap: (Mob | null)[][];
  mobs: Mob[];
  items: Item[];
  player: Mob;
  mapW: number;
  mapH: number;
  time: number;
  distanceMap: DistanceMap;

  // Swapped to do double-buffering.
  visibilityMap: VisibilityMap;
  nextVisibilityMap: VisibilityMap;

  constructor(map: string[][], mobs: Mob[], items: Item[]) {
    this.map = map;
    this.mobs = mobs;
    this.items = items;
    this.player = mobs.find(mob => mob.id === 'player')!;
    this.mapH = this.map.length;
    this.mapW = this.map[0].length;
    this.time = 0;

    this.mobMap = makeEmptyGrid(this.mapW, this.mapH, null);
    for (const mob of this.mobs) {
      this.mobMap[mob.pos.y][mob.pos.x] = mob;
    }

    this.distanceMap = new DistanceMap(this.canPlayerPath.bind(this), this.mapW, this.mapH);
    this.distanceMap.update(this.player.pos.x, this.player.pos.y);

    this.visibilityMap = new VisibilityMap(this.canPlayerSeeThrough.bind(this));
    this.visibilityMap.update(this.player.pos.x, this.player.pos.y);
    this.nextVisibilityMap = new VisibilityMap(this.canPlayerSeeThrough.bind(this));
  }

  turn(commands: Record<string, Command | null>): boolean {
    this.time++;
    let dirty = false;

    for (const mob of this.mobs) {
      if (this.turnMob(mob, commands)) {
        dirty = true;
      }
    }
    if (dirty) {
      this.distanceMap.update(this.player.pos.x, this.player.pos.y);
    }

    return dirty;
  }

  turnMob(mob: Mob, commands: Record<string, Command | null>): boolean {
    let dirty = false;
    if (mob.action) {
      if (this.time < mob.action.timeEnd) {
        return false;
      }

      switch (mob.action.type) {
        case ActionType.MOVE: {
          this.mobMap[mob.pos.y][mob.pos.x] = null;
          mob.pos = mob.action.pos;

          if (mob.id === 'player') {
            const temp = this.visibilityMap;
            this.visibilityMap = this.nextVisibilityMap;
            this.nextVisibilityMap = temp;
          }
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
      dirty = true;
    }

    const command = commands[mob.id];
    if (command) {
      switch (command.type) {
        case CommandType.MOVE:
          this.moveMob(mob, mob.pos.x + command.dx, mob.pos.y + command.dy);
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
      dirty = true;
    }

    return dirty;
  }

  moveMob(mob: Mob, x: number, y: number): void {
    if (!this.inBounds(x, y)) {
      return;
    }

    const newTile = this.map[y][x];

    if (newTile === 'DOOR_CLOSED') {
      this.map[y][x] = 'DOOR_OPEN';
      this.visibilityMap.update(this.player.pos.x, this.player.pos.y);
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
      timeEnd: this.time + MOVEMENT_TIME[mob.tile],
    };
    if (mob.id === 'player') {
      this.nextVisibilityMap.update(x, y);
    }
  }

  canMove(x: number, y: number): boolean {
    if (!this.inBounds(x, y)) {
      return false;
    }

    const newTile = this.map[y][x];
    if (!TILES[newTile].canEnter) {
      return false;
    }

    return true;
  }

  canPlayerPath(x: number, y: number): boolean {
    if (!this.inBounds(x, y)) {
      return false;
    }

    const mob = this.findMob(x, y);
    if (mob && mob.id !== 'player') {
      return false;
    }

    const newTile = this.map[y][x];
    if (!(TILES[newTile].canEnter || newTile === 'DOOR_CLOSED')) {
      return false;
    }

    return true;
  }

  canPlayerSeeThrough(x: number, y: number): boolean {
    if (!this.inBounds(x, y)) {
      return false;
    }
    const tile = this.map[y][x];
    return TILES[tile].canEnter; // TODO see through trees, etc.
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
