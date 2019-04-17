const CAPTURED_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];

export class Input {
  constructor() {
    this.keys = {};
  }

  setup() {
    document.addEventListener('keydown', this.keyDown.bind(this));
    document.addEventListener('keyup', this.keyUp.bind(this));
  }

  keyDown(event) {
    if (CAPTURED_KEYS.indexOf(event.key) !== -1) {
      event.preventDefault();
      this.keys[event.key] = true;
    }
  }

  keyUp(event) {
    if (CAPTURED_KEYS.indexOf(event.key) !== -1) {
      event.preventDefault();
      this.keys[event.key] = false;
    }
  }

  getCommand() {
    if (this.keys.ArrowUp) {
      return {type: 'MOVE', dx: 0, dy: -1};
    } else if (this.keys.ArrowDown) {
      return {type: 'MOVE', dx: 0, dy: 1};
    } else if (this.keys.ArrowLeft) {
      return {type: 'MOVE', dx: -1, dy: 0};
    } else if (this.keys.ArrowRight) {
      return {type: 'MOVE', dx: 1, dy: 0};
    }

    return null;
  }
}
