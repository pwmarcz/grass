export interface Pos {
  readonly x: number;
  readonly y: number;
}

export enum CommandType {
  ATTACK = 'ATTACK',
  MOVE = 'MOVE',
  REST = 'REST',
  PICK_UP = 'PICK_UP',
}

export enum ActionType {
  ATTACK = 'ATTACK',
  MOVE = 'MOVE',
  REST = 'REST',
  OPEN_DOOR = 'OPEN_DOOR',
  PICK_UP = 'PICK_UP',
}

interface DirCommand {
  readonly type: CommandType.ATTACK | CommandType.MOVE;
  readonly dx: number;
  readonly dy: number;
}

interface TimeCommand {
  readonly type: CommandType.REST;
  readonly dt: number;
}

interface ItemCommand {
  readonly type: CommandType.PICK_UP;
  readonly itemId: string;
}

export type Command = DirCommand | TimeCommand | ItemCommand;

interface SimpleAction {
  readonly type: ActionType.REST | ActionType.OPEN_DOOR;
  readonly timeStart: number;
  readonly timeEnd: number;
}

interface PosAction {
  readonly type: ActionType.ATTACK | ActionType.MOVE;
  readonly timeStart: number;
  readonly timeEnd: number;
  readonly pos: Pos;
}

interface ItemAction {
  readonly type: ActionType.PICK_UP;
  readonly timeStart: number;
  readonly timeEnd: number;
  readonly itemId: string;
}

export type Action = PosAction | SimpleAction | ItemAction;

export interface Mob {
  readonly id: string;
  pos: Pos;
  readonly tile: string;
  action: Action | null;
}
