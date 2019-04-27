import { DistanceMap } from './path';
import { Command, Mob, CommandType, ActionType } from './types';
import { Item } from './item';
import { makeEmptyGrid } from './utils';
import { VisibilityMap } from './fov';
import { Terrain } from './terrain';

const MOVEMENT_TIME: Record<string, number> = {
  'HUMAN': 10,
  'GOBLIN': 20,
};

const ATTACK_TIME = 45;

const PICK_UP_TIME = 20;

export class World {
  map: Terrain[][];
  mobMap: (Mob | null)[][];
  mobs: Mob[];
  items: Item[];
  player: Mob;
  mapW: number;
  mapH: number;
  time: number;
  distanceMap: DistanceMap;
  memory: boolean[][];

  // Swapped to do double-buffering.
  visibilityMap: VisibilityMap;
  nextVisibilityMap: VisibilityMap;

  constructor(map: Terrain[][], mobs: Mob[], items: Item[]) {
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

    this.memory = makeEmptyGrid(this.mapW, this.mapH, false);
    this.updateMemory(this.visibilityMap);
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
            this.updateMemory(this.visibilityMap);
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

    const newTerrain = this.map[y][x];

    if (newTerrain === Terrain.DOOR_CLOSED) {
      this.map[y][x] = Terrain.DOOR_OPEN;
      this.visibilityMap.update(this.player.pos.x, this.player.pos.y);
      this.updateMemory(this.visibilityMap);
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

  updateMemory(vm: VisibilityMap): void {
    for (let my = 0; my < vm.h; my++) {
      for (let mx = 0; mx < vm.w; mx++) {
        const x = mx + vm.x0;
        const y = my + vm.y0;
        if (this.inBounds(x, y)) {
          this.memory[y][x] = this.memory[y][x] || vm.data[my][mx];
        }
      }
    }
  }

  canMove(x: number, y: number): boolean {
    return this.inBounds(x, y) && Terrain.passThrough(this.map[y][x]);
  }

  canPlayerPath(x: number, y: number): boolean {
    if (!this.inBounds(x, y)) {
      return false;
    }

    if (!this.memory[y][x]) {
      return false;
    }

    if (this.visibilityMap.visible(x, y)) {
      const mob = this.findMob(x, y);
      if (mob && mob.id !== 'player') {
        return false;
      }
    }

    return Terrain.pathThrough(this.map[y][x]);
  }

  canPlayerSeeThrough(x: number, y: number): boolean {
    return this.inBounds(x, y) && Terrain.seeThrough(this.map[y][x]);
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
