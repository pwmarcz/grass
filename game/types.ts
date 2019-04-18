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

export interface Command {
  type: CommandType;
  dx?: number;
  dy?: number;
  dt?: number;
}

export interface Action {
  type: ActionType;
  timeStart: number;
  timeEnd: number;
  x?: number;
  y?: number;
}

export interface Mobile {
  id: string;
  x: number;
  y: number;
  tile: string;
  action: Action | null;
}

export type MobileMap = Record<string, Mobile>;

export type TileGrid = string[][];