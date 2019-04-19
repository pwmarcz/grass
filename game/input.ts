import { Command, CommandType } from "./types";
import { View } from "./view";

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
  keys: Record<string, boolean>;
  view: View;

  constructor(view: View) {
    this.view = view;
    this.keys = {};
  }

  setup(): void {
    document.addEventListener('keydown', this.keyDown.bind(this));
    document.addEventListener('keyup', this.keyUp.bind(this));
    const element = this.view.element;
    element.addEventListener('mouseenter', this.mouse.bind(this));
    element.addEventListener('mousemove', this.mouse.bind(this));
    element.addEventListener('mouseleave', this.mouse.bind(this));
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
    const coords = this.view.getCoords(mouseEvent.offsetX, mouseEvent.offsetY);
    if (coords) {
      const [x, y] = coords;
      this.view.setHighlight(x, y);
    } else {
      this.view.clearHighlight();
    }
  }
}
