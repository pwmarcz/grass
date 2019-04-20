import { Command, CommandType, Pos } from "./types";
import { TILE_SIZE } from "./tiles";
import { DisplayObject } from "pixi.js";

type InteractionEvent = PIXI.interaction.InteractionEvent;

const CAPTURED_KEYS = [
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  '1', '2', '3', '4', '5', '6', '7', '8', '9',
  'y', 'u', 'h', 'j', 'k', 'l', 'b', 'n'
];

const MOVEMENT_KEYS = [
  {keys: ['ArrowLeft', 'h', '4'], dx: -1, dy: 0},
  {keys: ['ArrowRight', 'l', '6'], dx: 1, dy: 0},
  {keys: ['ArrowUp', 'k', '8'], dx: 0, dy: -1},
  {keys: ['ArrowDown', 'j', '2'], dx: 0, dy: 1},
  {keys: ['y', '7'], dx: -1, dy: -1},
  {keys: ['u', '9'], dx: 1, dy: -1},
  {keys: ['b', '1'], dx: -1, dy: 1},
  {keys: ['n', '3'], dx: 1, dy: 1},
];

export class Input {
  keys: Record<string, boolean> = {};
  appElement: Element;
  stage: DisplayObject;
  mapW: number;
  mapH: number;
  goalPos: Pos | null = null;
  highlightPos: Pos | null = null;

  constructor(appElement: Element, stage: PIXI.DisplayObject, mapW: number, mapH: number) {
    this.appElement = appElement;
    this.stage = stage;
    this.mapW = mapW;
    this.mapH = mapH;
  }

  setup(): void {
    document.addEventListener('keydown', this.keyDown.bind(this));
    document.addEventListener('keyup', this.keyUp.bind(this));

    this.stage.on('mouseenter', this.mouse.bind(this));
    this.stage.on('mousemove', this.mouse.bind(this));
    this.stage.on('mouseleave', this.mouse.bind(this));
    this.stage.on('pointertap', this.click.bind(this));
    this.stage.on('rightclick', this.rightClick.bind(this));
    this.appElement.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  keyDown(event: KeyboardEvent): void {
    if (CAPTURED_KEYS.indexOf(event.key) !== -1) {
      event.preventDefault();
      this.keys[event.key] = true;
    }
  }

  keyUp(event: KeyboardEvent): void {
    if (CAPTURED_KEYS.indexOf(event.key) !== -1) {
      event.preventDefault();
      this.keys[event.key] = false;
    }
  }

  getCommand(): Command | null {
    for (const {keys, dx, dy} of MOVEMENT_KEYS) {
      for (const key of keys) {
        if (this.keys[key]) {
          return {type: CommandType.MOVE, dx, dy};
        }
      }
    }
    return null;
  }

  mouse(event: InteractionEvent): void {
    this.highlightPos = this.getPos(event);
  }

  click(event: InteractionEvent): void {
    const pos = this.getPos(event);
    if (pos) {
      this.goalPos = pos;
    }
  }

  rightClick(event: InteractionEvent): void {
    event.stopPropagation();
    if (this.goalPos) {
      this.goalPos = null;
    }
  }

  getPos(event: InteractionEvent): Pos | null {
    const offsetX = event.data.global.x - this.stage.position.x;
    const offsetY = event.data.global.y - this.stage.position.y;
    const x = Math.floor(offsetX / TILE_SIZE);
    const y = Math.floor(offsetY / TILE_SIZE);
    if (!(0 <= x && x < this.mapW &&
          0 <= y && y < this.mapH)) {
      return null;
    }
    return {x, y};
  }
}