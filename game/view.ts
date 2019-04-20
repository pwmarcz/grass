import * as PIXI from 'pixi.js';
import * as redom from 'redom';
import { TILE_SIZE, TILE_TEXTURES, prepareTextures, makeTileElement } from './tiles';
import { World } from './world';

// @ts-ignore
import tilesetImage from './tileset.auto.png';
import { ActionType, Mobile, Pos } from './types';
import { makeGrid, makeEmptyGrid } from './utils';

const ATTACK_DISTANCE = 0.3;
const ATTACK_START_TIME = 0.1;

function lerp(a: number, b: number, t: number): number {
  return a * (1 - t) + b * t;
}

export class View {
  world: World;
  element: Element;
  infoElement: Element;
  app: PIXI.Application;
  backLayer = new PIXI.Container();
  mapLayer = new PIXI.Container();
  frontLayer = new PIXI.Container();
  mapSprites: PIXI.Sprite[][] = [];
  mobileSprites: Record<string, PIXI.Sprite> = {};
  highlightGraphics: PIXI.Graphics;
  highlightPos: Pos | null = null;
  goalGraphics: PIXI.Graphics;
  goalPos: Pos | null = null;
  pathGraphics: PIXI.Graphics;

  constructor(world: World, element: Element, infoElement: Element) {
    this.world = world;
    this.element = element;
    this.infoElement = infoElement;

    this.app = new PIXI.Application({
      width: this.world.mapW * TILE_SIZE,
      height: this.world.mapH * TILE_SIZE,
    });
    this.app.stage.addChild(this.backLayer);
    this.app.stage.addChild(this.mapLayer);
    this.app.stage.addChild(this.frontLayer);

    this.highlightGraphics = new PIXI.Graphics();
    this.highlightGraphics.lineStyle(1, 0x888888);
    this.highlightGraphics.beginFill(0x222222);
    this.highlightGraphics.drawRect(0, 0, TILE_SIZE, TILE_SIZE);
    this.highlightGraphics.visible = false;
    this.backLayer.addChild(this.highlightGraphics);

    this.pathGraphics = new PIXI.Graphics();
    this.frontLayer.addChild(this.pathGraphics);

    this.goalGraphics = new PIXI.Graphics();
    this.goalGraphics.lineStyle(1, 0x6D5000);
    this.goalGraphics.drawRect(0, 0, TILE_SIZE, TILE_SIZE);
    this.goalGraphics.visible = false;
    this.frontLayer.addChild(this.goalGraphics);
  }

  setup(onSuccess: Function): void {
    this.element.appendChild(this.app.view);
    PIXI.loader
    .add(tilesetImage)
    .load((): void => {
      prepareTextures();
      this.setupMapSprites();
      this.setupMobileSprites();
      onSuccess();
    });
    this.app.renderer.render(this.app.stage);
  }

  private setupMapSprites(): void {
    this.mapSprites = makeGrid(this.world.mapW, this.world.mapH, (x, y) => {
      const sprite = new PIXI.Sprite();
      sprite.x = x * TILE_SIZE;
      sprite.y = y * TILE_SIZE;
      this.mapLayer.addChild(sprite);
      return sprite;
    });
  }

  private setupMobileSprites(): void {
    for (const mob of this.world.mobiles) {
      const sprite = new PIXI.Sprite(TILE_TEXTURES[mob.tile]);
      this.mobileSprites[mob.id] = sprite;
      this.mapLayer.addChild(sprite);
    }
  }

  private redrawMobile(mob: Mobile, time: number, alphaMap: number[][]): void {
    const sprite = this.mobileSprites[mob.id];

    let actionTime = 0;
    if (mob.action) {
      actionTime = (time - mob.action.timeStart) / (mob.action.timeEnd - mob.action.timeStart);
    }

    if (mob.action && mob.action.type === ActionType.MOVE) {
      sprite.x = TILE_SIZE * lerp(mob.pos.x, mob.action.pos.x, actionTime);
      sprite.y = TILE_SIZE * lerp(mob.pos.y, mob.action.pos.y, actionTime);

      alphaMap[mob.pos.y][mob.pos.x] = actionTime;
      alphaMap[mob.action.pos.y][mob.action.pos.x] = 1 - actionTime;
    } else if (mob.action && mob.action.type === ActionType.ATTACK) {
      let distance: number;
      if (actionTime <= ATTACK_START_TIME) {
        distance = actionTime / ATTACK_START_TIME * ATTACK_DISTANCE;
      } else {
        distance = (1 - (actionTime - ATTACK_START_TIME) / (1 - ATTACK_START_TIME)) * ATTACK_DISTANCE;
      }

      sprite.x = TILE_SIZE * lerp(mob.pos.x, mob.action.pos.x, distance);
      sprite.y = TILE_SIZE * lerp(mob.pos.y, mob.action.pos.y, distance);

      alphaMap[mob.pos.y][mob.pos.x] = 0;
    } else {
      sprite.x = mob.pos.x * TILE_SIZE;
      sprite.y = mob.pos.y * TILE_SIZE;

      alphaMap[mob.pos.y][mob.pos.x] = 0;
    }
  }

  redraw(time: number): void {
    const alphaMap = makeEmptyGrid(this.world.mapW, this.world.mapH, 1);
    for (const mob of this.world.mobiles) {
      this.redrawMobile(mob, time, alphaMap);
    }
    this.redrawMap(alphaMap);
    this.redrawHighlight();
    this.redrawInfo();
    this.redrawPath();
    this.redrawGoal();
  }

  redrawMap(alphaMap: number[][]): void {
    for (let y = 0; y < this.world.mapH; y++) {
      for (let x = 0; x < this.world.mapW; x++) {
        const sprite = this.mapSprites[y][x];
        sprite.alpha = alphaMap[y][x];
        const tile = this.world.map[y][x];
        sprite.texture = TILE_TEXTURES[tile];
      }
    }
  }

  redrawHighlight(): void {
    if (this.highlightPos) {
      this.highlightGraphics.x = this.highlightPos.x * TILE_SIZE;
      this.highlightGraphics.y = this.highlightPos.y * TILE_SIZE;
      this.highlightGraphics.visible = true;
    } else {
      this.highlightGraphics.visible = false;
    }
  }

  redrawGoal(): void {
    if (this.goalPos) {
      this.goalGraphics.x = this.goalPos.x * TILE_SIZE;
      this.goalGraphics.y = this.goalPos.y * TILE_SIZE;
      this.goalGraphics.visible = true;
    } else {
      this.goalGraphics.visible = false;
    }
  }

  redrawInfo(): void {
    this.infoElement.innerHTML = '';
    if (!this.highlightPos)
      return;

    const {x, y} = this.highlightPos;
    let tile = this.world.map[y][x];
    const mob = this.world.findMobile(x, y);
    if (mob) {
      tile = mob.tile;
    }

    this.infoElement.innerHTML = '';
    redom.mount(this.infoElement, redom.el('div',
      makeTileElement(tile),
      redom.el('span.desc', ` ${tile.toLowerCase()}`),
    ));
  }

  redrawPath(): void {
    this.pathGraphics.clear();
    if (!this.goalPos)
      return;

    const {x, y} = this.goalPos;
    const path = this.world.distanceMap.findPathToAdjacent(x, y);
    if (!path) {
      return;
    }

    const {x: xStart, y: yStart} = path[0];
    this.pathGraphics.lineStyle(5, 0xFFFFFF, 0.3);
    this.pathGraphics.moveTo(TILE_SIZE * (xStart + 0.5), TILE_SIZE * (yStart + 0.5));
    for (const pos of path) {
      this.pathGraphics.lineTo(TILE_SIZE * (pos.x + 0.5), TILE_SIZE * (pos.y + 0.5));
    }
  }
}
