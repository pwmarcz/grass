import { Command, ActionType } from './types';
import { Item } from './item';
import { Mob } from './mob';
import { makeEmptyGrid, nextTo } from './utils';
import { Terrain } from './terrain';

const ATTACK_TIME = 45;
const PICK_UP_TIME = 20;
const DIE_TIME = 40;
const SEEK_DISTANCE = 10;

export class World {
  map: Terrain[][];
  private mobMap: (Mob | null)[][];
  mobs: Mob[];
  private mobsById: Record<string, Mob>;
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
    this.mobsById = {};
    for (const mob of this.mobs) {
      this.mobMap[mob.pos.y][mob.pos.x] = mob;
      this.mobsById[mob.id] = mob;
    }
  }

  turn(commands: Record<string, Command | null>): void {
    this.time++;

    for (const mob of this.mobs) {
      if (mob.alive() && !mob.action && commands[mob.id] === undefined) {
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

  turnMob(mob: Mob, commands: Record<string, Command | null>): void {
    if (mob.action) {
      if (this.time < mob.action.timeEnd) {
        if (mob.action.type === ActionType.REST) {
          this.regenerate(mob);
        }
        return;
      }

      this.actionEnd(mob);

      mob.action = null;
      this.stateChanged = true;
    }

    this.regenerate(mob);

    const command = commands[mob.id];
    if (command) {
      switch (command.type) {
        case ActionType.MOVE:
          this.moveMob(mob, command.pos.x, command.pos.y);
          break;
        case ActionType.ATTACK: {
          const targetMob = this.mobsById[command.mobId];
          if (targetMob && this.canAttack(mob, targetMob)) {
            mob.action = {
              ...command,
              timeStart: this.time,
              timeEnd: this.time + ATTACK_TIME,
            };
          }
          break;
        }
        case ActionType.REST:
          mob.action = {
            ...command,
            timeStart: this.time,
            timeEnd: this.time + command.dt,
          };
          break;
        case ActionType.PICK_UP:
          mob.action = {
            ...command,
            timeStart: this.time,
            timeEnd: this.time + PICK_UP_TIME,
          };
          break;
      }
      if (mob.action) {
        this.actionStart(mob);
      }
      this.stateChanged = true;
    }
  }

  regenerate(mob: Mob): void {
    if (mob.alive() && mob.health < mob.maxHealth) {
      if (++mob.regenCounter === mob.regenRate()) {
        mob.regenCounter = 0;
        mob.health++;
        this.stateChanged = true;
      }
    }
  }

  actionStart(mob: Mob): void {
    const action = mob.action!;
    switch(action.type) {
      case ActionType.MOVE: {
        this.mobMap[action.pos.y][action.pos.x] = mob;
        break;
      }
      case ActionType.ATTACK: {
        const targetMob = this.mobsById[action.mobId];
        if (targetMob && targetMob.alive()) {
          targetMob.health -= mob.damage();
          if (!targetMob.alive()) {
            if (targetMob.action) {
              this.actionCancel(targetMob);
            }
            targetMob.action = {
              type: ActionType.DIE,
              timeStart: this.time,
              timeEnd: this.time + DIE_TIME,
            };
            this.actionStart(targetMob);
          }
        }
        break;
      }
      case ActionType.OPEN_DOOR:
        this.map[action.pos.y][action.pos.x] = Terrain.DOOR_OPEN;
        this.visibilityChanged = true;
        break;
    }
  }

  actionCancel(mob: Mob): void {
    const action = mob.action!;
    switch (action.type) {
      case ActionType.MOVE: {
        this.mobMap[action.pos.y][action.pos.x] = null;
        break;
      }
    }
  }

  actionEnd(mob: Mob): void {
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
  }

  removeMob(mob: Mob): void {
    delete this.mobsById[mob.id];
    this.mobMap[mob.pos.y][mob.pos.x] = null;
    this.mobs.splice(this.mobs.indexOf(mob), 1);
  }

  moveMob(mob: Mob, x: number, y: number): void {
    if (!this.inBounds(x, y)) {
      return;
    }

    const newTerrain = this.map[y][x];

    if (newTerrain === Terrain.DOOR_CLOSED) {
      mob.action = {
        type: ActionType.OPEN_DOOR,
        pos: {x, y},
        timeStart: this.time,
        timeEnd: this.time + 5,
      };
      return;
    }

    const targetMob = this.findMob(x, y);
    if (targetMob) {
      if (this.canAttack(mob, targetMob)) {
        mob.action = {
          type: ActionType.ATTACK,
          mobId: targetMob.id,
          timeStart: this.time,
          timeEnd: this.time + ATTACK_TIME,
        };
      }
      return;
    }

    if (!this.canMove(x, y)) {
      return;
    }

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

  canAttack(mob: Mob, targetMob: Mob): boolean {
    if (!targetMob.alive()) {
      return false;
    }

    if (mob.team() === targetMob.team()) {
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

  getAiCommand(mob: Mob): Command | null {
    const player = this.mobsById['player'];
    if (player && player.alive()) {
      const dxPlayer = player.pos.x - mob.pos.x;
      const dyPlayer = player.pos.y - mob.pos.y;

      if (Math.abs(dxPlayer) <= SEEK_DISTANCE && Math.abs(dyPlayer) <= SEEK_DISTANCE) {
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
}
