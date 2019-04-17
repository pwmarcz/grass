import { TILE_SIZE, tileTextures, prepareTextures } from './tiles.js';

export class View {
  constructor(world) {
    this.world = world;
    this.app = new PIXI.Application({
      width: this.world.mapW * TILE_SIZE,
      height: this.world.mapH * TILE_SIZE,
    });
    this.mapSprites = [];
    this.mobileSprites = {};
  }

  setup(element, onSuccess) {
    element.appendChild(this.app.view);
    PIXI.loader
    .add('tileset.auto.png')
    .load(() => {
      prepareTextures();
      this.setupMapSprites();
      this.setupMobileSprites();
      onSuccess();
    });
    this.app.renderer.render(this.app.stage);
    this.world.onRedrawMobile(this.redrawMobile.bind(this));
    this.world.onRedrawMap(this.redrawMap.bind(this));
  }

  setupMapSprites() {
    for (let y = 0; y < this.world.mapW; y++) {
      this.mapSprites[y] = [];
      for (let x = 0; x < this.world.mapH; x++) {
        const tile = this.world.map[y][x];
        const sprite = new PIXI.Sprite(tileTextures[tile]);
        sprite.x = x * TILE_SIZE;
        sprite.y = y * TILE_SIZE;
        this.app.stage.addChild(sprite);
        this.mapSprites[y][x] = sprite;
      }
    }
  }

  setupMobileSprites() {
    for (const m in this.world.mobiles) {
      const sprite = new PIXI.Sprite(tileTextures[this.world.mobiles[m].tile]);
      this.mobileSprites[m] = sprite;
      this.app.stage.addChild(sprite);
      this.redrawMobile(m, 0);
    }
  }

  redrawMobile(m, time) {
    const mob = this.world.mobiles[m];
    const sprite = this.mobileSprites[m];
    if (mob.action && mob.action.type == 'MOVE') {
      const distance = (time - mob.action.timeStart) / (mob.action.timeEnd - mob.action.timeStart);

      sprite.x = ((1 - distance) * mob.x + distance * mob.action.x) * TILE_SIZE;
      sprite.y = ((1 - distance) * mob.y + distance * mob.action.y) * TILE_SIZE;
      this.mapSprites[mob.y][mob.x].alpha = distance;
      this.mapSprites[mob.action.y][mob.action.x].alpha = 1 - distance;
    } else {
      sprite.x = mob.x * TILE_SIZE;
      sprite.y = mob.y * TILE_SIZE;
      this.mapSprites[mob.y][mob.x].alpha = 0;
    }
  }

  redrawMap(x, y, time) {
    this.mapSprites[y][x].texture = tileTextures[this.world.map[y][x]];
  }

  redraw(time) {
    for (const m in this.world.mobiles) {
      this.redrawMobile(m, time);
    }
  }
}
