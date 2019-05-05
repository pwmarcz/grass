import { Mob } from "./mob";
import { Item } from "./item";

export interface Pos {
  readonly x: number;
  readonly y: number;
}

export enum ActionType {
  ATTACK = 'ATTACK',
  MOVE = 'MOVE',
  REST = 'REST',
  OPEN_DOOR = 'OPEN_DOOR',
  PICK_UP = 'PICK_UP',
  DIE = 'DIE',
  SHOOT_MOB = 'SHOOT_MOB',
  SHOOT_TERRAIN = 'SHOOT_TERRAIN',
}

interface SimpleCommand {
  readonly type: ActionType.DIE;
}

interface PosCommand {
  readonly type: ActionType.MOVE | ActionType.OPEN_DOOR | ActionType.SHOOT_TERRAIN;
  readonly pos: Pos;
}

interface TimeCommand {
  readonly type: ActionType.REST;
  readonly dt: number;
}

interface MobCommand {
  readonly type: ActionType.ATTACK | ActionType.SHOOT_MOB;
  readonly targetMob: Mob;
}

interface ItemCommand {
  readonly type: ActionType.PICK_UP;
  readonly item: Item;
}

export type Command = (
  SimpleCommand |
  PosCommand |
  TimeCommand |
  MobCommand |
  ItemCommand)
;

interface Timed {
  readonly timeStart: number;
  readonly timeEnd: number;
  readonly timeEffect: number;
}

export type Action = Timed & Command;

export type MapFunc<P> = (x: number, y: number) => P;
