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
  SHOOT = 'SHOOT',
}

interface SimpleCommand {
  readonly type: ActionType.DIE;
}

interface PosCommand {
  readonly type: ActionType.MOVE | ActionType.OPEN_DOOR;
  readonly pos: Pos;
}

interface TimeCommand {
  readonly type: ActionType.REST;
  readonly dt: number;
}

interface MobCommand {
  readonly type: ActionType.ATTACK;
  readonly mobId: string;
}

export type Target = Pos | string;

export namespace Target {
  export function isPos(target: Target): target is Pos {
    return typeof target !== 'string';
  }

  export function isMobId(target: Target): target is string {
    return typeof target === 'string';
  }
}

interface TargetCommand {
  readonly type: ActionType.SHOOT;
  readonly target: Target;
}

interface ItemCommand {
  readonly type: ActionType.PICK_UP;
  readonly itemId: string;
}

export type Command = (
  SimpleCommand |
  PosCommand |
  TimeCommand |
  MobCommand |
  TargetCommand |
  ItemCommand)
;

interface Timed {
  readonly timeStart: number;
  readonly timeEnd: number;
}

export type Action = Timed & Command;
