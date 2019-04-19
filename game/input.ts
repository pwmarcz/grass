import { Command, CommandType, Pos } from "./types";
import { TILE_SIZE } from "./tiles";

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
  element: Element;
  mapW: number;
  mapH: number;
  goalPos: Pos | null = null;
  highlightPos: Pos | null = null;

  constructor(element: Element, mapW: number, mapH: number) {
    this.element = element;
    this.mapW = mapW;
    this.mapH = mapH;
  }

  setup(): void {
    document.addEventListener('keydown', this.keyDown.bind(this));
    document.addEventListener('keyup', this.keyUp.bind(this));

    this.element.addEventListener('mouseenter', this.mouse.bind(this));
    this.element.addEventListener('mousemove', this.mouse.bind(this));
    this.element.addEventListener('mouseleave', this.mouse.bind(this));
    this.element.addEventListener('click', this.click.bind(this));
    this.element.addEventListener('contextmenu', this.rightClick.bind(this));
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

  mouse(event: Event): void {
    const mouseEvent = event as MouseEvent;
    this.highlightPos = this.getPos(mouseEvent.offsetX, mouseEvent.offsetY);
  }

  click(event: Event): void {
    const mouseEvent = event as MouseEvent;
    const pos = this.getPos(mouseEvent.offsetX, mouseEvent.offsetY);
    if (pos) {
      this.goalPos = pos;
    }
  }

  rightClick(event: Event): void {
    event.preventDefault();
    if (this.goalPos) {
      this.goalPos = null;
    }
  }

  getPos(offsetX: number, offsetY: number): Pos | null {
    const x = Math.floor(offsetX / TILE_SIZE);
    const y = Math.floor(offsetY / TILE_SIZE);
    if (!(0 <= x && x < this.mapW &&
          0 <= y && y < this.mapH)) {
      return null;
    }
    return {x, y};
  }
}