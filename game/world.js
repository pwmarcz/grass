import { tiles } from './tiles.js';

const MOVEMENT_TIME= {
  'HUMAN': 10,
  'GOBLIN': 20,
};

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

  turn(commands) {
    this.time++;

    for (const m in this.mobiles) {
      this.turnMobile(m, commands);
    }
  }

  turnMobile(m, commands) {
    const mob = this.mobiles[m];

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

    const command = commands[m];
    if (command) {
      switch (command.type) {
        case 'MOVE':
          this.moveMobile(mob, mob.x + command.dx, mob.y + command.dy);
          break;
        case 'REST':
          mob.action = {
            type: 'REST',
            timeStart: this.time,
            timeEnd: this.time + command.dt,
          };
          break;
      }
    }
  }

  moveMobile(mob, x, y) {
    if (!this.inBounds(x, y)) {
      return false;
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

    if (!this.canMove(x, y)) {
      return;
    }

    mob.action = {
      type: 'MOVE',
      x,
      y,
      timeStart: this.time,
      timeEnd: this.time + MOVEMENT_TIME[mob.tile],
    };
  }

  canMove(x, y) {
    if (!this.inBounds(x, y)) {
      return false;
    }

    const newTile = this.map[y][x];

    if (tiles[newTile].pass === false) {
      return false;
    }

    for (const m in this.mobiles) {
      const mob = this.mobiles[m];
      if (mob.x == x && mob.y == y) {
        return false;
      }
      if (mob.action && mob.action.type == 'MOVE' && mob.action.x == x && mob.action.y == y) {
        return false;
      }
    }
    return true;
  }

  inBounds(x, y) {
    return  0 <= x && x < this.mapW && 0 <= y && y < this.mapH;
  }
}
