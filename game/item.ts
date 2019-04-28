import { Tile } from "./tiles";
import { Pos } from "./types";

export enum ItemType {
  GOLD = 'GOLD',
  SWORD = 'SWORD',
  SHIELD = 'SHIELD',
  KEY = 'KEY',
}

export class Item {
  readonly id: string;
  readonly type: ItemType;
  pos: Pos | null;
  mobId: string | null = null;

  constructor(id: string, type: ItemType, pos: Pos | null) {
    this.id = id;
    this.type = type;
    this.pos = pos;
  }

  get tile(): Tile {
    return this.type as string;
  }
}
