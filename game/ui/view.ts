import * as PIXI from 'pixi.js';
import { TILE_SIZE, TILE_TEXTURES } from './textures';
import { World } from '../world';
import { ActionType, Mob, Pos } from '../types';
import { makeEmptyGrid, renderWithRef } from '../utils';
import { Sidebar } from './sidebar';
import { h } from 'preact';
import { Renderer } from './renderer';

const ATTACK_DISTANCE = 0.3;
const ATTACK_START_TIME = 0.1;

function lerp(a: number, b: number, t: number): number {
  return a * (1 - t) + b * t;
}

export class View {
  private world: World;
  private element: Element;
  private infoElement: Element;
  app: PIXI.Application;
  private renderer: Renderer;
  private sidebar: Sidebar | null = null;

  highlightPos: Pos | null = null;
  goalPos: Pos | null = null;
  path: Pos[] | null = null;


  constructor(world: World, element: Element, infoElement: Element) {
    this.world = world;
    this.element = element;
    this.infoElement = infoElement;

    this.app = new PIXI.Application({
      width: this.element.clientWidth,
      height: this.element.clientHeight,
    });

    this.renderer = new Renderer(this.app.stage, [
      'back', 'map', 'mobs', 'front'
    ]);

    this.app.stage.interactive = true;
  }

  setup(): void {
    this.element.appendChild(this.app.view);
    this.app.renderer.render(this.app.stage);
    renderWithRef<Sidebar>(h(Sidebar, null), this.infoElement, this.infoElement)
    .then(sidebar => this.sidebar = sidebar);
  }

  private redrawMob(mob: Mob, time: number, alphaMap: number[][]): void {
    const sprite = this.renderer.sprite('mobs', mob.id, sprite => {
      sprite.texture = TILE_TEXTURES[mob.tile];
    });

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

  redraw(dirty: boolean, time: number): void {
    if (dirty) {
      this.calculatePath();
      this.redrawInfo();
    }
    this.redrawHighlight();
    this.redrawGoal();
    this.redrawPath();

    const alphaMap = makeEmptyGrid(this.world.mapW, this.world.mapH, 1);
    for (const mob of this.world.mobs) {
      this.redrawMob(mob, time, alphaMap);
    }
    this.redrawMap(alphaMap);

    this.renderer.flush();
  }

  redrawMap(alphaMap: number[][]): void {
    for (let y = 0; y < this.world.mapH; y++) {
      for (let x = 0; x < this.world.mapW; x++) {
        let tile = this.world.map[y][x];
        const items = this.world.findItems(x, y);
        if (items.length > 0) {
          tile = items[items.length - 1].tile;
        }

        if (tile !== 'EMPTY') {
          const sprite = this.renderer.sprite('map', `${x},${y}`, sprite => {
            sprite.x = x * TILE_SIZE;
            sprite.y = y * TILE_SIZE;
          });

          sprite.alpha = alphaMap[y][x];
          sprite.texture = TILE_TEXTURES[tile];
        }
      }
    }
  }

  redrawHighlight(): void {
    if (this.highlightPos) {
      const g = this.renderer.graphics('back', 'highlight', g => {
        g.lineStyle(1, 0x888888, 1, 0);
        g.beginFill(0x222222);
        g.drawRect(0, 0, TILE_SIZE, TILE_SIZE);
      });
      g.x = this.highlightPos.x * TILE_SIZE;
      g.y = this.highlightPos.y * TILE_SIZE;
    }
  }

  redrawGoal(): void {
    if (this.goalPos) {
      const g = this.renderer.graphics('back', 'goal', g => {
        g.lineStyle(1, 0x6D5000, 1, 0);
        g.drawRect(0, 0, TILE_SIZE, TILE_SIZE);
      });
      g.x = this.goalPos.x * TILE_SIZE;
      g.y = this.goalPos.y * TILE_SIZE;
    }
  }

  redrawInfo(): void {
    if (!this.sidebar) {
      return;
    }

    const inventory = this.world.findMobItems(this.world.player).map(item => item.tile);

    let terrainTile: string | null = null;
    let mobTile: string | null = null;
    let itemTiles: string[] | null = null;
    if (this.highlightPos) {
      const {x, y} = this.highlightPos;
      terrainTile = this.world.map[y][x];
      const mob = this.world.findMob(x, y);
      if (mob) {
        mobTile = mob.tile;
      }
      itemTiles = this.world.findItems(x, y).map(item => item.tile);
    }

    this.sidebar.setState({ inventory, terrainTile, mobTile, itemTiles });
  }

  calculatePath(): void {
    if (this.goalPos) {
      this.path = this.world.distanceMap.findPathToAdjacent(this.goalPos.x, this.goalPos.y);
    } else {
      this.path = null;
    }
  }

  redrawPath(): void {
    if (this.path) {
      const g = this.renderer.graphics('front', 'path');
      g.clear();
      g.lineStyle(5, 0xFFFFFF, 0.3);

      const {x: x0, y: y0} = this.renderer.sprite('mobs', 'player').position;
      g.moveTo(
        x0 + 0.5 * TILE_SIZE,
        y0 + 0.5 * TILE_SIZE
      );
      for (let i = 1; i < this.path.length; i++) {
        const {x, y} = this.path[i];
        g.lineTo(TILE_SIZE * (x + 0.5), TILE_SIZE * (y + 0.5));
      }
    }
  }
}
