export interface Pos {
  readonly x: number;
  readonly y: number;
}

export enum CommandType {
  ATTACK = 'ATTACK',
  MOVE = 'MOVE',
  REST = 'REST',
}

export enum ActionType {
  ATTACK = 'ATTACK',
  MOVE = 'MOVE',
  REST = 'REST',
  OPEN_DOOR = 'OPEN_DOOR',
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

export type Command = DirCommand | TimeCommand;

interface SimpleAction {
  readonly type: ActionType.REST | ActionType.OPEN_DOOR;
  readonly timeStart: number;
  readonly timeEnd: number;
}

interface PosAction {
  readonly type: ActionType.ATTACK | ActionType.MOVE;
  readonly timeStart: number;
  readonly timeEnd: number;
  readonly x: number;
  readonly y: number;
}

export type Action = PosAction | SimpleAction;

export interface Mobile {
  readonly id: string;
  pos: Pos;
  readonly tile: string;
  action: Action | null;
}

export type MobileMap = Record<string, Mobile>;

export type TileGrid = string[][];
