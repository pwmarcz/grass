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

interface ItemCommand {
  readonly type: ActionType.PICK_UP;
  readonly itemId: string;
}

export type Command = (PosCommand | TimeCommand | MobCommand | ItemCommand);

interface Timed {
  readonly timeStart: number;
  readonly timeEnd: number;
}

export type Action = Timed & Command;
