import * as PIXI from 'pixi.js';
import { TILE_SIZE, TILE_TEXTURES, RESOLUTION } from './textures';
import { World } from '../world';
import { ActionType, Pos } from '../types';
import { makeEmptyGrid, renderWithRef } from '../utils';
import { Sidebar, compactItems, ItemInfo } from './sidebar';
import { h } from 'preact';
import { StringRenderer, IndexRenderer } from './renderer';
import { Terrain } from '../terrain';
import { Mob } from '../mob';

const ATTACK_DISTANCE = 0.3;
const ATTACK_START_TIME = 0.1;
const DARK_ALPHA = 0.4;

function lerp(a: number, b: number, t: number): number {
  return a * (1 - t) + b * t;
}

function clamp(a: number, min: number, max: number): number {
  return Math.max(min, Math.min(a, max));
}

interface Movement {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  t: number;
}

export class View {
  private world: World;
  private element: Element;
  private infoElement: Element;
  app: PIXI.Application;
  private sidebar: Sidebar | null = null;

  private width: number;
  private height: number;

  private backLayer: StringRenderer;
  private mapLayer: IndexRenderer;
  private mobLayer: StringRenderer;
  private frontLayer: StringRenderer;

  highlightPos: Pos | null = null;
  goalPos: Pos | null = null;
  path: Pos[] | null = null;

  constructor(world: World, element: Element, infoElement: Element) {
    this.world = world;
    this.element = element;
    this.infoElement = infoElement;

    this.width = this.element.clientWidth;
    this.height = this.element.clientHeight;
    this.app = new PIXI.Application({
      width: this.width,
      height: this.height,
      resolution: RESOLUTION,
      autoResize: true,
    });

    this.backLayer = new StringRenderer(this.app.stage);
    this.mapLayer = new IndexRenderer(this.app.stage, this.world.mapW * this.world.mapH);
    this.mobLayer = new StringRenderer(this.app.stage);
    this.frontLayer = new StringRenderer(this.app.stage);

    this.app.stage.interactive = true;
  }

  setup(): void {
    this.element.appendChild(this.app.view);
    this.app.renderer.render(this.app.stage);
    renderWithRef<Sidebar>(h(Sidebar, null), this.infoElement, this.infoElement)
    .then(sidebar => this.sidebar = sidebar);
  }

  private redrawMob(mob: Mob, time: number, alphaMap: number[][], movement: Movement): void {
    const sprite = this.mobLayer.make(mob.id, PIXI.Sprite, sprite => {
      sprite.texture = TILE_TEXTURES[mob.tile()];
      sprite.width = TILE_SIZE;
      sprite.height = TILE_SIZE;
    });

    let actionTime = 0;
    if (mob.action) {
      actionTime = (time - mob.action.timeStart) / (mob.action.timeEnd - mob.action.timeStart);
    }

    const a1 = this.getVisibilityMultiplier(mob.pos.x, mob.pos.y, movement, 0);
    if (mob.action && mob.action.type === ActionType.MOVE) {
      const a2 = this.getVisibilityMultiplier(mob.action.pos.x, mob.action.pos.y, movement, 0);
      sprite.alpha = lerp(a1, a2, actionTime);
    } else {
      sprite.alpha = a1;
    }

    if (mob.action && mob.action.type === ActionType.MOVE) {
      sprite.x = TILE_SIZE * lerp(mob.pos.x, mob.action.pos.x, actionTime);
      sprite.y = TILE_SIZE * lerp(mob.pos.y, mob.action.pos.y, actionTime);

      alphaMap[mob.pos.y][mob.pos.x] = lerp(1, actionTime, sprite.alpha);
      alphaMap[mob.action.pos.y][mob.action.pos.x] = lerp(1, 1 - actionTime, sprite.alpha);
    } else if (mob.action && mob.action.type === ActionType.ATTACK) {
      let distance: number;
      if (actionTime <= ATTACK_START_TIME) {
        distance = actionTime / ATTACK_START_TIME * ATTACK_DISTANCE;
      } else {
        distance = (1 - (actionTime - ATTACK_START_TIME) / (1 - ATTACK_START_TIME)) * ATTACK_DISTANCE;
      }

      sprite.x = TILE_SIZE * lerp(mob.pos.x, mob.action.pos.x, distance);
      sprite.y = TILE_SIZE * lerp(mob.pos.y, mob.action.pos.y, distance);

      alphaMap[mob.pos.y][mob.pos.x] = 1 - sprite.alpha;
    } else {
      sprite.x = mob.pos.x * TILE_SIZE;
      sprite.y = mob.pos.y * TILE_SIZE;

      alphaMap[mob.pos.y][mob.pos.x] = 1 - sprite.alpha;
    }
  }

  redraw(dirty: boolean, time: number): void {
    const movement = this.getMovement(time);
    this.updateViewport(movement);

    if (dirty) {
      this.redrawInfo();
    }
    this.redrawHighlight();
    this.redrawGoal();
    this.redrawPath();

    const alphaMap = makeEmptyGrid(this.world.mapW, this.world.mapH, 1);
    for (const mob of this.world.mobs) {
      this.redrawMob(mob, time, alphaMap, movement);
    }
    this.redrawMap(alphaMap, movement);

    this.backLayer.flush();
    this.mapLayer.flush();
    this.mobLayer.flush();
    this.frontLayer.flush();
  }

  updateViewport(movement: Movement): void {
    const {x0, y0, x1, y1, t} = movement;

    const x = lerp(x0, x1, t);
    const y = lerp(y0, y1, t);

    let dx = -((x + 0.5) * TILE_SIZE - this.width / 2);
    let dy = -((y + 0.5) * TILE_SIZE - this.height / 2);

    // Don't scroll past map edge.
    dx = clamp(dx, -this.world.mapW * TILE_SIZE + this.width, 0);
    dy = clamp(dy, -this.world.mapH * TILE_SIZE + this.height, 0);

    this.app.stage.x = dx;
    this.app.stage.y = dy;
  }

  toPos(point: PIXI.Point): Pos | null {
    const local = this.app.stage.toLocal(point);
    const x = Math.floor(local.x / TILE_SIZE);
    const y = Math.floor(local.y / TILE_SIZE);
    if (0 <= x && x < this.world.mapW &&
        0 <= y && y < this.world.mapH) {
      return {x, y};
    }
    return null;
  }

  redrawMap(alphaMap: number[][], movement: Movement): void {
    const {x: px, y: py} = this.app.stage.position;
    let x0 = Math.floor(-px / TILE_SIZE);
    let y0 = Math.floor(-py / TILE_SIZE);
    let x1 = Math.ceil((-px + this.width) / TILE_SIZE) + 1;
    let y1 = Math.ceil((-py + this.height) / TILE_SIZE) + 1;
    x0 = clamp(x0, 0, this.world.mapW - 1);
    y0 = clamp(y0, 0, this.world.mapH - 1);
    y1 = clamp(y1, 0, this.world.mapH);
    x1 = clamp(x1, 0, this.world.mapW);

    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const multiplier = this.getVisibilityMultiplier(x, y, movement);
        if (multiplier === 0) {
          continue;
        }

        let tile = Terrain.tile(this.world.map[y][x]);
        const items = this.world.findItems(x, y);
        if (items.length > 0) {
          tile = items[items.length - 1].tile();
        }

        if (tile !== 'EMPTY') {
          const sprite = this.mapLayer.make(x * this.world.mapW + y, PIXI.Sprite, sprite => {
            sprite.x = x * TILE_SIZE;
            sprite.y = y * TILE_SIZE;
            sprite.width = TILE_SIZE;
            sprite.height = TILE_SIZE;
          });

          sprite.alpha = alphaMap[y][x] * multiplier;
          sprite.texture = TILE_TEXTURES[tile];
        }
      }
    }
  }

  getMovement(time: number): Movement {
    const player = this.world.player;

    const x0 = player.pos.x, y0 = player.pos.y;
    let x1: number, y1: number;
    let t: number;
    if (player.action && player.action.type === ActionType.MOVE) {
      t = (time - player.action.timeStart) / (player.action.timeEnd - player.action.timeStart);
      x1 = player.action.pos.x;
      y1 = player.action.pos.y;
    } else {
      x1 = x0;
      y1 = y0;
      t = 0;
    }

    return {x0, y0, x1, y1, t};
  }

  getVisibilityMultiplier(
    x: number, y: number, {t}: Movement,
    darkAlpha = DARK_ALPHA
  ): number {
    const visible = this.world.visibilityMap.visible(x, y);
    const remembered = this.world.memory[y][x];
    const multiplier = visible ? 1 : remembered ? darkAlpha : 0;

    if (t === 0) {
      return multiplier;
    }

    const nextVisible = this.world.nextVisibilityMap.visible(x, y);
    const nextMultiplier = nextVisible ? 1 : remembered ? darkAlpha : 0;
    return lerp(multiplier, nextMultiplier, t);
  }

  redrawHighlight(): void {
    if (this.highlightPos) {
      const g = this.backLayer.make('highlight', PIXI.Graphics, g => {
        g.lineStyle(1, 0x444444, 1, 0);
        g.beginFill(0x111111);
        g.drawRect(0, 0, TILE_SIZE, TILE_SIZE);
      });
      g.x = this.highlightPos.x * TILE_SIZE;
      g.y = this.highlightPos.y * TILE_SIZE;
    }
  }

  redrawGoal(): void {
    if (this.goalPos) {
      const g = this.frontLayer.make('goal', PIXI.Graphics, g => {
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

    const inventory = compactItems(
      this.world.findMobItems(this.world.player));

    let terrainTile: string | null = null;
    let mobTile: string | null = null;
    let items: ItemInfo[] | null = null;
    if (this.highlightPos) {
      const {x, y} = this.highlightPos;

      if (this.world.memory[y][x]) {

        terrainTile = this.world.map[y][x];

        if (this.world.visibilityMap.visible(x, y)) {
          const mob = this.world.findMob(x, y);
          if (mob) {
            mobTile = mob.tile();
          }
        }

        items = compactItems(this.world.findItems(x, y));
      }
    }

    this.sidebar.setState({ inventory, terrainTile, mobTile, items });
  }

  redrawPath(): void {
    if (this.path) {
      const g = this.frontLayer.make('path', PIXI.Graphics);
      g.clear();
      g.lineStyle(5, 0xFFFFFF, 0.3);

      const {x: x0, y: y0} = this.mobLayer.get('player')!.position;
      g.moveTo(
        x0 + 0.5 * TILE_SIZE,
        y0 + 0.5 * TILE_SIZE
      );
      for (let i = 1; i < this.path.length; i++) {
        const {x, y} = this.path[i];
        g.lineTo(TILE_SIZE * (x + 0.5), TILE_SIZE * (y + 0.5));
      }

      /* // Draw distance map
      const dm = this.world.distanceMap;
      const textStyle = new PIXI.TextStyle({
        fill: 0xffffff,
        fontSize: 12,
      });
      for (let y = 0; y < dm.h; y++) {
        for (let x = 0; x < dm.w; x++) {
          const val = Math.floor(dm.get(x, y));
          if (val !== -1) {
            const t = this.frontLayer.make(`distance(${x},${y})`, PIXI.Text, t => {
              t.x = x * TILE_SIZE + 10;
              t.y = y * TILE_SIZE + 10;
              t.style = textStyle;
            });
            t.text = `${val}`;
          }
        }
      }
      */
    }
  }
}
