import { tiles } from './tiles.js';

const MOVEMENT_TIME = 10;

export class World {
  constructor(map, mobiles) {
    this.map = map;
    this.mobiles = mobiles;
    this.mapH = this.map.length;
    this.mapW = this.map[0].length;
    this.time = 0;

    this.redrawMobile = function() {};
    this.redrawMap = function() {};
  }

  onRedrawMobile(handler) {
    this.redrawMobile = handler;
  }

  onRedrawMap(handler) {
    this.redrawMap = handler;
  }

  turn(command) {
    this.time++;
    const mob = this.mobiles.player;

    if (mob.action) {
      if (this.time < mob.action.timeEnd) {
        return;
      }

      if (mob.action.type == 'MOVE') {
        this.redrawMobile('player', this.time);
        mob.x = mob.action.x;
        mob.y = mob.action.y;
      }
      mob.action = null;
    }

    if (command) {
      switch (command.type) {
        case 'MOVE':
          this.moveMobile(mob, mob.x + command.dx, mob.y + command.dy);
          break;
      }
    }
  }

  moveMobile(mob, x, y) {
    if (x < 0 || x >= this.mapW || y < 0 || y >= this.mapH) {
      return;
    }

    const newTile = this.map[y][x];

    if (newTile == 'DOOR_CLOSED') {
      this.map[y][x] = 'DOOR_OPEN';
      this.redrawMap(x, y, this.time);
      mob.action = {
        type: 'OPEN_DOOR',
        timeStart: this.time,
        timeEnd: this.time + 5,
      };
      return;
    }

    if (tiles[newTile].pass === false) {
      return;
    }

    mob.action = {
      type: 'MOVE',
      x,
      y,
      timeStart: this.time,
      timeEnd: this.time + MOVEMENT_TIME,
    };
  }
}
