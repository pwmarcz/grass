import { DisplayObject } from "pixi.js";

type InteractionEvent = PIXI.interaction.InteractionEvent;

const CAPTURED_KEYS = [
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  '1', '2', '3', '4', '5', '6', '7', '8', '9',
  'y', 'u', 'h', 'j', 'k', 'l', 'b', 'n',
  'Shift',
];

const SINGLE_COMMAND_KEYS = [
  'f',
  '5',
  '.',
];

const MOVEMENT_KEYS = [
  {keys: [['ArrowLeft', 'ArrowUp'], 'y', '7'], dx: -1, dy: -1},
  {keys: [['ArrowRight', 'ArrowUp'], 'u', '9'], dx: 1, dy: -1},
  {keys: [['ArrowLeft', 'ArrowDown'],'b', '1'], dx: -1, dy: 1},
  {keys: [['ArrowRight', 'ArrowDown'], 'n', '3'], dx: 1, dy: 1},
  {keys: ['ArrowLeft', 'h', '4'], dx: -1, dy: 0},
  {keys: ['ArrowRight', 'l', '6'], dx: 1, dy: 0},
  {keys: ['ArrowUp', 'k', '8'], dx: 0, dy: -1},
  {keys: ['ArrowDown', 'j', '2'], dx: 0, dy: 1},
];

export class RawInput {
  keys: Record<string, boolean> = {};
  singleCommands: Record<string, boolean> = {};
  appElement: Element;
  stage: DisplayObject;
  mouse: {
    point: PIXI.Point | null;
    moved: boolean;
    lmb: boolean;
    rmb: boolean;
  };

  constructor(appElement: Element, stage: PIXI.DisplayObject) {
    this.appElement = appElement;
    this.stage = stage;
    this.mouse = { point: null, moved: false, lmb: false, rmb: false };
  }

  setup(): void {
    document.addEventListener('keydown', this.keyDown.bind(this));
    document.addEventListener('keyup', this.keyUp.bind(this));

    this.stage.on('mousemove', this.mouseMove.bind(this));
    this.stage.on('mouseout', this.mouseMove.bind(this));
    this.stage.on('pointertap', this.click.bind(this));
    this.stage.on('rightclick', this.rightClick.bind(this));
    this.appElement.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  keyDown(event: KeyboardEvent): void {
    if (CAPTURED_KEYS.indexOf(event.key) !== -1) {
      event.preventDefault();
      this.keys[event.key] = true;
    }
    if (SINGLE_COMMAND_KEYS.indexOf(event.key) !== -1) {
      event.preventDefault();
      this.singleCommands[event.key] = true;
    }
  }

  keyUp(event: KeyboardEvent): void {
    if (CAPTURED_KEYS.indexOf(event.key) !== -1) {
      event.preventDefault();
      this.keys[event.key] = false;
    }
  }

  getDirection(): {dx: number; dy: number} | null {
    for (const {keys, dx, dy} of MOVEMENT_KEYS) {
      for (const key of keys) {
        let pressed;
        if (typeof key === 'string') {
          pressed = this.keys[key];
        } else {
          pressed = key.every(k => this.keys[k]);
        }

        if (pressed) {
          return {dx, dy};
        }
      }
    }
    return null;
  }

  shooting(): boolean {
    return this.keys['Shift'];
  }

  mouseMove(event: InteractionEvent): void {
    const {x, y} = event.data.global;
    if (0 <= x && x < this.appElement.clientWidth &&
        0 <= y && y < this.appElement.clientHeight) {
      this.mouse.point = event.data.global;
    } else {
      this.mouse.point = null;
    }
    this.mouse.moved = true;
  }

  click(event: InteractionEvent): void {
    this.mouse.point = event.data.global;
    this.mouse.lmb = true;
  }

  rightClick(event: InteractionEvent): void {
    event.stopPropagation();
    this.mouse.rmb = true;
  }
}
