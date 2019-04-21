import * as PIXI from 'pixi.js';
import { TILE_SIZE, TileGlyph, TileElement } from './tiles';
import { World } from './world';
import { ActionType, Mob, Pos } from './types';
import { makeGrid, makeEmptyGrid, renderWithRef } from './utils';
import { Component, ComponentChild, h } from 'preact';

const ATTACK_DISTANCE = 0.3;
const ATTACK_START_TIME = 0.1;

function lerp(a: number, b: number, t: number): number {
  return a * (1 - t) + b * t;
}

export class View {
  world: World;
  element: Element;
  infoElement: Element;
  sidebar: Sidebar | null = null;
  app: PIXI.Application;
  backLayer = new PIXI.Container();
  mapLayer = new PIXI.Container();
  frontLayer = new PIXI.Container();
  mapGlyphs: TileGlyph[][] = [];
  mobGlyphs: Record<string, TileGlyph> = {};
  highlightGraphics: PIXI.Graphics;
  highlightPos: Pos | null = null;
  goalGraphics: PIXI.Graphics;
  goalPos: Pos | null = null;
  path: Pos[] | null = null;
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
    this.app.stage.interactive = true;

    this.highlightGraphics = new PIXI.Graphics();
    this.highlightGraphics.lineStyle(1, 0x888888, 1, 0);
    this.highlightGraphics.beginFill(0x222222);
    this.highlightGraphics.drawRect(0, 0, TILE_SIZE, TILE_SIZE);
    this.highlightGraphics.visible = false;
    this.backLayer.addChild(this.highlightGraphics);

    this.pathGraphics = new PIXI.Graphics();
    this.frontLayer.addChild(this.pathGraphics);

    this.goalGraphics = new PIXI.Graphics();
    this.goalGraphics.lineStyle(1, 0x6D5000, 1, 0);
    this.goalGraphics.drawRect(0, 0, TILE_SIZE, TILE_SIZE);
    this.goalGraphics.visible = false;
    this.frontLayer.addChild(this.goalGraphics);
  }

  setup(): void {
    this.element.appendChild(this.app.view);
    this.app.renderer.render(this.app.stage);
    this.setupMapSprites();
    this.setupMobSprites();
    renderWithRef<Sidebar>(h(Sidebar, null), this.infoElement, this.infoElement)
    .then(sidebar => this.sidebar = sidebar);
  }

  private setupMapSprites(): void {
    this.mapGlyphs = makeGrid(this.world.mapW, this.world.mapH, (x, y) => {
      const glyph = new TileGlyph('EMPTY');
      glyph.x = x * TILE_SIZE;
      glyph.y = y * TILE_SIZE;
      this.mapLayer.addChild(glyph);
      return glyph;
    });
  }

  private setupMobSprites(): void {
    for (const mob of this.world.mobs) {
      const glyph = new TileGlyph(mob.tile);
      this.mobGlyphs[mob.id] = glyph;
      this.mapLayer.addChild(glyph);
    }
  }

  private redrawMob(mob: Mob, time: number, alphaMap: number[][]): void {
    const glyph = this.mobGlyphs[mob.id];

    let actionTime = 0;
    if (mob.action) {
      actionTime = (time - mob.action.timeStart) / (mob.action.timeEnd - mob.action.timeStart);
    }

    if (mob.action && mob.action.type === ActionType.MOVE) {
      glyph.x = TILE_SIZE * lerp(mob.pos.x, mob.action.pos.x, actionTime);
      glyph.y = TILE_SIZE * lerp(mob.pos.y, mob.action.pos.y, actionTime);

      alphaMap[mob.pos.y][mob.pos.x] = actionTime;
      alphaMap[mob.action.pos.y][mob.action.pos.x] = 1 - actionTime;
    } else if (mob.action && mob.action.type === ActionType.ATTACK) {
      let distance: number;
      if (actionTime <= ATTACK_START_TIME) {
        distance = actionTime / ATTACK_START_TIME * ATTACK_DISTANCE;
      } else {
        distance = (1 - (actionTime - ATTACK_START_TIME) / (1 - ATTACK_START_TIME)) * ATTACK_DISTANCE;
      }

      glyph.x = TILE_SIZE * lerp(mob.pos.x, mob.action.pos.x, distance);
      glyph.y = TILE_SIZE * lerp(mob.pos.y, mob.action.pos.y, distance);

      alphaMap[mob.pos.y][mob.pos.x] = 0;
    } else {
      glyph.x = mob.pos.x * TILE_SIZE;
      glyph.y = mob.pos.y * TILE_SIZE;

      alphaMap[mob.pos.y][mob.pos.x] = 0;
    }
  }

  redraw(dirty: boolean, time: number): void {
    if (dirty) {
      this.calculatePath();
      this.redrawHighlight();
      this.redrawInfo();
      this.redrawGoal();
    }
    this.redrawPath();

    const alphaMap = makeEmptyGrid(this.world.mapW, this.world.mapH, 1);
    for (const mob of this.world.mobs) {
      this.redrawMob(mob, time, alphaMap);
    }
    this.redrawMap(alphaMap);
  }

  redrawMap(alphaMap: number[][]): void {
    for (let y = 0; y < this.world.mapH; y++) {
      for (let x = 0; x < this.world.mapW; x++) {
        const glyph = this.mapGlyphs[y][x];
        glyph.alpha = alphaMap[y][x];
        const tile = this.world.map[y][x];
        glyph.update(tile);
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
    if (!this.sidebar) {
      return;
    }

    let terrainTile: string | null = null;
    let mobTile: string | null = null;
    if (this.highlightPos) {
      const {x, y} = this.highlightPos;
      terrainTile = this.world.map[y][x];
      const mob = this.world.findMob(x, y);
      if (mob) {
        mobTile = mob.tile;
      }
    }

    this.sidebar.setState({ terrainTile, mobTile });
  }

  calculatePath(): void {
    if (this.goalPos) {
      this.path = this.world.distanceMap.findPathToAdjacent(this.goalPos.x, this.goalPos.y);
    } else {
      this.path = null;
    }
  }

  redrawPath(): void {
    this.pathGraphics.clear();
    if (!this.path)
      return;

    this.pathGraphics.lineStyle(5, 0xFFFFFF, 0.3);
    const {x: x0, y: y0} = this.mobGlyphs.player.position;
    this.pathGraphics.moveTo(
      x0 + 0.5 * TILE_SIZE,
      y0 + 0.5 * TILE_SIZE
    );
    for (let i = 1; i < this.path.length; i++) {
      const {x, y} = this.path[i];
      this.pathGraphics.lineTo(TILE_SIZE * (x + 0.5), TILE_SIZE * (y + 0.5));
    }
  }
}

interface SidebarState {
  terrainTile: string | null;
  mobTile: string | null;
}

class Sidebar extends Component<{}, SidebarState> {
  render(props: {}, { terrainTile, mobTile }: SidebarState): ComponentChild {
    return h('div', {id: 'info'},
      terrainTile && h('div', null,
        h(TileElement, {tile: terrainTile}),
        h('span', {class: 'desc'}, terrainTile.toLowerCase()),
      ),
      mobTile && h('div', null,
        h(TileElement, {tile: mobTile}),
        h('span', {class: 'desc'}, mobTile.toLowerCase()),
      )
    );
  }
}