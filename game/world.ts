import { tiles } from './tiles';
import { TileGrid, Command, Mobile, CommandType, ActionType } from './types';

const MOVEMENT_TIME: Record<string, number> = {
  'HUMAN': 10,
  'GOBLIN': 20,
};

const ATTACK_TIME = 45;

export class World {
  map: TileGrid;
  mobiles: Mobile[];
  mobileMap: Record<string, Mobile>;
  mapW: number;
  mapH: number;
  time: number;
  redrawMobile: Function;
  redrawMap: Function;

  constructor(map: TileGrid, mobiles: Mobile[]) {
    this.map = map;
    this.mobiles = mobiles;
    this.mobileMap = {};
    for (const mob of this.mobiles) {
      this.mobileMap[mob.id] = mob;
    }
    this.mapH = this.map.length;
    this.mapW = this.map[0].length;
    this.time = 0;

    this.redrawMobile = function(): void {};
    this.redrawMap = function(): void {};
  }

  onRedrawMobile(handler: Function): void {
    this.redrawMobile = handler;
  }

  onRedrawMap(handler: Function): void {
    this.redrawMap = handler;
  }

  turn(commands: Record<string, Command | null>): void {
    this.time++;

    for (const mob of this.mobiles) {
      this.turnMobile(mob, commands);
    }
  }

  turnMobile(mob: Mobile, commands: Record<string, Command | null>): void {
    if (mob.action) {
      if (this.time < mob.action.timeEnd) {
        return;
      }

      switch (mob.action.type) {
        case ActionType.MOVE:
        this.redrawMobile(mob, this.time);
        mob.x = mob.action.x;
        mob.y = mob.action.y;
        break;
      }

      this.redrawMobile(mob, this.time);
      mob.action = null;
    }

    const command = commands[mob.id];
    if (command) {
      switch (command.type) {
        case CommandType.MOVE:
          this.moveMobile(mob, mob.x + command.dx, mob.y + command.dy);
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

  moveMobile(mob: Mobile, x: number, y: number): void {
    if (!this.inBounds(x, y)) {
      return;
    }

    const newTile = this.map[y][x];

    if (newTile === 'DOOR_CLOSED') {
      this.map[y][x] = 'DOOR_OPEN';
      this.redrawMap(x, y, this.time);
      mob.action = {
        type: ActionType.OPEN_DOOR,
        timeStart: this.time,
        timeEnd: this.time + 5,
      };
      return;
    }

    if (this.findMobile(x, y)) {
      mob.action = {
        type: ActionType.ATTACK,
        x,
        y,
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
      x,
      y,
      timeStart: this.time,
      timeEnd: this.time + MOVEMENT_TIME[mob.tile],
    };
  }

  canMove(x: number, y: number): boolean {
    if (!this.inBounds(x, y)) {
      return false;
    }

    const newTile = this.map[y][x];

    if (tiles[newTile].pass === false) {
      return false;
    }

    return true;
  }

  findMobile(x: number, y: number): Mobile | null {
    for (const mob of this.mobiles) {
      if (mob.x === x && mob.y === y) {
        return mob;
      }
      if (mob.action && mob.action.type === ActionType.MOVE && mob.action.x === x && mob.action.y === y) {
        return mob;
      }
    }
    return null;
  }

  inBounds(x: number, y: number): boolean {
    return 0 <= x && x < this.mapW && 0 <= y && y < this.mapH;
  }
}
