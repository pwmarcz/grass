import { TILES } from './tiles';
import { DistanceMap } from './path';
import { Command, Mob, CommandType, ActionType } from './types';

const MOVEMENT_TIME: Record<string, number> = {
  'HUMAN': 10,
  'GOBLIN': 20,
};

const ATTACK_TIME = 45;

export class World {
  map: string[][];
  mobs: Mob[];
  player: Mob;
  mapW: number;
  mapH: number;
  time: number;
  distanceMap: DistanceMap;

  constructor(map: string[][], mobs: Mob[]) {
    this.map = map;
    this.mobs = mobs;
    this.player = mobs.find(mob => mob.id === 'player') as Mob;
    this.mapH = this.map.length;
    this.mapW = this.map[0].length;
    this.time = 0;

    this.distanceMap = new DistanceMap(this.canPlayerPath.bind(this), this.mapW, this.mapH);
    this.distanceMap.calculate(this.player.pos.x, this.player.pos.y);
  }

  turn(commands: Record<string, Command | null>): void {
    this.time++;

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
        case ActionType.MOVE:
        mob.pos = mob.action.pos;
        if (mob.id === 'player') {
          this.distanceMap.calculate(mob.pos.x, mob.pos.y);
        }
        break;
      }

      mob.action = null;
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
      }
    }
  }

  moveMob(mob: Mob, x: number, y: number): void {
    if (!this.inBounds(x, y)) {
      return;
    }

    const newTile = this.map[y][x];

    if (newTile === 'DOOR_CLOSED') {
      this.map[y][x] = 'DOOR_OPEN';
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

    mob.action = {
      type: ActionType.MOVE,
      pos: {x, y},
      timeStart: this.time,
      timeEnd: this.time + MOVEMENT_TIME[mob.tile],
    };
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

  findMob(x: number, y: number): Mob | null {
    for (const mob of this.mobs) {
      if (mob.pos.x === x && mob.pos.y === y) {
        return mob;
      }
      if (mob.action && mob.action.type === ActionType.MOVE && mob.action.pos.x === x && mob.action.pos.y === y) {
        return mob;
      }
    }
    return null;
  }

  inBounds(x: number, y: number): boolean {
    return 0 <= x && x < this.mapW && 0 <= y && y < this.mapH;
  }
}
