import * as PIXI from "pixi.js";

interface Layer {
  container: PIXI.Container;
  objects: Map<string, PIXI.DisplayObject>;
  seen: Set<string>;
}

type Init<P> = (p: P) => void;

export class Renderer {
  private root: PIXI.Container;
  private layers: Map<string, Layer>;

  constructor(root: PIXI.Container, layerNames: string[]) {
    this.root = root;
    this.layers = new Map();

    for (const layerName of layerNames) {
      const container = new PIXI.Container();
      this.root.addChild(container);
      this.layers.set(layerName, {
        container,
        objects: new Map(),
        seen: new Set(),
      });
    }
  }

  private get<T extends PIXI.DisplayObject>(
    layerName: string,
    key: string,
    prefix: string,
    construct: () => T,
    init: Init<T> | undefined
  ): T {
    key = `${prefix}.${key}`;
    const layer = this.layers.get(layerName)!;
    let obj = layer.objects.get(key) as T | undefined;
    if (!obj) {
      obj = construct();
      layer.container.addChild(obj);
      layer.objects.set(key, obj);
      if (init) {
        init(obj);
      }
    }
    layer.seen.add(key);
    return obj;
  }

  sprite(
    layerName: string,
    key: string,
    init?: Init<PIXI.Sprite>
  ): PIXI.Sprite {
    return this.get<PIXI.Sprite>(
      layerName, key, 'sprite', () => new PIXI.Sprite, init
    );
  }

  graphics(
    layerName: string,
    key: string,
    init?: Init<PIXI.Graphics>
  ): PIXI.Graphics {
    return this.get<PIXI.Graphics>(
      layerName, key, 'graphics', () => new PIXI.Graphics, init
    );
  }

  flush(): void {
    for (const layer of this.layers.values()) {
      for (const [key, obj] of layer.objects.entries()) {
        if (!layer.seen.has(key)) {
          layer.objects.delete(key);
          layer.container.removeChild(obj);
          obj.destroy();
        }
      }
      layer.seen.clear();
    }
  }
}