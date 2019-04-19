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
  keys: Record<string, boolean> = {};
  view: View;
  touchStartData: {x: number; y: number; time: number} | null = null;
  cachedCommand: Command | null = null;

  constructor(view: View) {
    this.view = view;
  }

  setup(): void {
    document.addEventListener('keydown', this.keyDown.bind(this));
    document.addEventListener('keyup', this.keyUp.bind(this));
    const element = this.view.element;
    element.addEventListener('mouseenter', this.mouse.bind(this));
    element.addEventListener('mousemove', this.mouse.bind(this));
    element.addEventListener('mouseleave', this.mouse.bind(this));

    element.addEventListener('touchstart', this.touchStart.bind(this));
    element.addEventListener('touchend', this.touchEnd.bind(this));
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
    if (this.cachedCommand) {
      const command = this.cachedCommand;
      this.cachedCommand = null;
      return command;
    }

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

  touchStart(event: Event): void {
    const touchEvent = event as TouchEvent;
    this.touchStartData = {
      x: touchEvent.changedTouches[0].pageX,
      y: touchEvent.changedTouches[0].pageY,
      time: new Date().getTime(),
    };
  }

  touchEnd(event: Event): void {
    const touchEvent = event as TouchEvent;
    let data = this.touchStartData;
    this.touchStartData = null;
    if (!data) {
      return;
    }
    const dx = touchEvent.changedTouches[0].pageX - data.x;
    const dy = touchEvent.changedTouches[0].pageY - data.y;
    const dt = new Date().getTime() - data.time;

    const timeThreshold = 300;
    const distThreshold = 150;
    if (dt < timeThreshold) {
      const dxEffective = dx < -distThreshold ? -1 : dx > distThreshold ? 1 : 0;
      const dyEffective = dy < -distThreshold ? -1 : dy > distThreshold ? 1 : 0;
      if (dxEffective !== 0 || dyEffective !== 0) {
        this.cachedCommand = {
          type: CommandType.MOVE,
          dx: dxEffective,
          dy: dyEffective
        };
        setTimeout(() => this.cachedCommand = null, 100);
      }
    }
  }
}
