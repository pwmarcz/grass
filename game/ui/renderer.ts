import * as PIXI from "pixi.js";

interface Layer {
  container: PIXI.Container;
  objects: Record<string, PIXI.DisplayObject>;
  seen: Set<string>;
}

type Init<P> = (p: P) => void;

export class Renderer {
  private root: PIXI.Container;
  private layers: Record<string, Layer>;

  constructor(root: PIXI.Container, layerNames: string[]) {
    this.root = root;
    this.layers = {};

    for (const layerName of layerNames) {
      const container = new PIXI.Container();
      this.root.addChild(container);
      this.layers[layerName] =  {
        container,
        objects: {},
        seen: new Set(),
      };
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
    const layer = this.layers[layerName];
    let obj = layer.objects[key] as T | undefined;
    if (!obj) {
      obj = construct();
      layer.container.addChild(obj);
      layer.objects[key] = obj;
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
    for (const layer of Object.values(this.layers)) {
      for (const key in layer.objects) {
        if (!layer.seen.has(key)) {
          const obj = layer.objects[key];
          delete layer.objects[key];
          layer.container.removeChild(obj);
          obj.destroy();
        }
      }
      layer.seen.clear();
    }
  }
}