export interface Command {
  type: string;
  dx?: number;
  dy?: number;
  dt?: number;
}

export interface Action {
  type: string;
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
  action?: Action;
}

export type MobileMap = Record<string, Mobile>;

export type TileGrid = string[][];