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
  type: CommandType.ATTACK | CommandType.MOVE;
  dx: number;
  dy: number;
}

interface TimeCommand {
  type: CommandType.REST;
  dt: number;
}

export type Command = DirCommand | TimeCommand;

interface SimpleAction {
  type:  ActionType.REST | ActionType.OPEN_DOOR;
  timeStart: number;
  timeEnd: number;
}

interface PosAction {
  type: ActionType.ATTACK | ActionType.MOVE;
  timeStart: number;
  timeEnd: number;
  x: number;
  y: number;
}

export type Action = PosAction | SimpleAction;

export interface Mobile {
  id: string;
  x: number;
  y: number;
  tile: string;
  action: Action | null;
}

export type MobileMap = Record<string, Mobile>;

export type TileGrid = string[][];
