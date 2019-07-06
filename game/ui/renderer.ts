import * as PIXI from "pixi.js";

abstract class Renderer<Key> {
  private container: PIXI.Container = new PIXI.Container();
  private seen: Set<Key> = new Set();

  constructor(root: PIXI.Container) {
    root.addChild(this.container);
  }

  abstract get(key: Key): PIXI.DisplayObject | null;
  abstract keys(): Key[];
  abstract set(key: Key, obj: PIXI.DisplayObject | null): void;

  make<T extends PIXI.DisplayObject>(
    key: Key,
    construct: (new () => T) | typeof PIXI.Sprite,
    init?: (obj: T) => void
  ): T {
    let obj = this.get(key) as T | undefined;
    if (!obj) {
      const _construct = construct as new () => T;
      obj = new _construct();
      this.container.addChild(obj);
      this.set(key, obj);
      if (init) {
        init(obj);
      }
    }
    this.seen.add(key);
    return obj;
  }

  flush(): void {
    for (const key of this.keys()) {
      if (!this.seen.has(key)) {
        const obj = this.get(key)!;
        this.container.removeChild(obj);
        obj.destroy();
        this.set(key, null);
      }
    }
    this.seen.clear();
  }
}

export class StringRenderer extends Renderer<string> {
  private objects: Record<string, PIXI.DisplayObject> = {};

  get(key: string): PIXI.DisplayObject | null {
    return this.objects[key] || null;
  }

  set(key: string, value: PIXI.DisplayObject | null): void {
    if (value) {
      this.objects[key] = value;
    } else {
      delete this.objects[key];
    }
  }

  keys(): string[] {
    return Object.keys(this.objects);
  }
}

export class IndexRenderer extends Renderer<number> {
  private objects: (PIXI.DisplayObject | null)[];

  constructor(root: PIXI.Container, size: number) {
    super(root);
    this.objects = new Array(size).fill(null);
  }

  get(key: number): PIXI.DisplayObject | null {
    return this.objects[key];
  }

  set(key: number, value: PIXI.DisplayObject | null): void {
    this.objects[key] = value;
  }

  keys(): number[] {
    const result = [];
    for (let i = 0; i < this.objects.length; i++) {
      if (this.objects[i]) {
        result.push(i);
      }
    }
    return result;
  }
}
