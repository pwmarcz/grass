import * as PIXI from 'pixi.js';
import { TILE_SIZE, TILE_TEXTURES, RESOLUTION } from './textures';
import { World } from '../world';
import { ActionType, Pos } from '../types';
import { makeEmptyGrid, renderWithRef } from '../utils';
import { Sidebar, ItemInfo, describeMob, MobInfo, describeItems } from './sidebar';
import { h } from 'preact';
import { StringRenderer, IndexRenderer } from './renderer';
import { Terrain } from '../terrain';
import { Mob } from '../mob';
import { Client } from '../client';
import { DEBUG } from '../debug';
import { InputState } from './input';

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
  private client: Client;
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

  constructor(world: World, client: Client, element: Element, infoElement: Element) {
    this.world = world;
    this.client = client;
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

  private redrawMob(mob: Mob, time: number, alphaMap: number[][],
    movement: Movement, goalMob: Mob | null
  ): void {
    if (!mob.alive && !mob.action) {
      return;
    }

    const sprite = this.mobLayer.make(mob.id, PIXI.Sprite, sprite => {
      sprite.texture = TILE_TEXTURES[mob.tile];
      sprite.width = TILE_SIZE;
      sprite.height = TILE_SIZE;
    });

    const actionTime = this.getActionTime(mob, time);

    const a1 = this.getVisibilityMultiplier(mob.pos.x, mob.pos.y, movement, 0);
    if (mob.action && mob.action.type === ActionType.MOVE) {
      const a2 = this.getVisibilityMultiplier(mob.action.pos.x, mob.action.pos.y, movement, 0);
      sprite.alpha = lerp(a1, a2, actionTime);
    } else {
      sprite.alpha = a1;
    }

    if (mob.action && mob.action.type === ActionType.MOVE) {
      const {x, y} = this.getCurrentPos(mob, time);
      sprite.x = TILE_SIZE * x;
      sprite.y = TILE_SIZE * y;

      alphaMap[mob.pos.y][mob.pos.x] = lerp(1, actionTime, sprite.alpha);
      alphaMap[mob.action.pos.y][mob.action.pos.x] = lerp(1, 1 - actionTime, sprite.alpha);
    } else if (mob.action && mob.action.type === ActionType.ATTACK) {
      let distance: number;
      if (actionTime <= ATTACK_START_TIME) {
        distance = actionTime / ATTACK_START_TIME * ATTACK_DISTANCE;
      } else {
        distance = (1 - (actionTime - ATTACK_START_TIME) / (1 - ATTACK_START_TIME)) * ATTACK_DISTANCE;
      }

      let targetPos = mob.pos;
      const targetMob = this.world.getTargetMob(mob);
      if (targetMob) {
        targetPos = this.getCurrentPos(targetMob, time);
      }

      sprite.x = TILE_SIZE * lerp(mob.pos.x, targetPos.x, distance);
      sprite.y = TILE_SIZE * lerp(mob.pos.y, targetPos.y, distance);

      alphaMap[mob.pos.y][mob.pos.x] = 1 - sprite.alpha;
    } else if (mob.action && mob.action.type === ActionType.DIE) {
      sprite.x = mob.pos.x * TILE_SIZE;
      sprite.y = mob.pos.y * TILE_SIZE;

      sprite.alpha = lerp(sprite.alpha, 0, actionTime);
      alphaMap[mob.pos.y][mob.pos.x] = 1 - sprite.alpha;
    } else {
      sprite.x = mob.pos.x * TILE_SIZE;
      sprite.y = mob.pos.y * TILE_SIZE;

      alphaMap[mob.pos.y][mob.pos.x] = 1 - sprite.alpha;
    }

    if (goalMob && goalMob.id === mob.id) {
      const g = this.frontLayer.make('goalMob', PIXI.Graphics, g => {
        g.lineStyle(1, 0x6D5000, 1, 0);
        g.drawRect(0, 0, TILE_SIZE, TILE_SIZE);
      });
      g.x = sprite.x;
      g.y = sprite.y;
    }
  }

  getActionTime(mob: Mob, time: number): number {
    if (mob.action) {
      return (time - mob.action.timeStart) / (mob.action.timeEnd - mob.action.timeStart);
    }
    return 0;
  }

  getCurrentPos(mob: Mob, time: number): Pos {
    if (mob.action && mob.action.type === ActionType.MOVE) {
      const actionTime = this.getActionTime(mob, time);
      return {
        x: lerp(mob.pos.x, mob.action.pos.x, actionTime),
        y: lerp(mob.pos.y, mob.action.pos.y, actionTime),
      };
    }
    return mob.pos;
  }

  redraw(dirty: boolean, time: number, inputState: InputState): void {
    const movement = this.getMovement(time);
    this.updateViewport(movement);

    if (dirty) {
      this.redrawInfo(inputState.highlightPos);
    }
    if (inputState.highlightPos){
      this.redrawHighlight(inputState.highlightPos);
    }
    if (inputState.goalPos) {
      this.redrawGoal(inputState.goalPos);
    }
    if (inputState.path) {
      this.redrawPath(inputState.path);
    }

    const alphaMap = makeEmptyGrid(this.world.mapW, this.world.mapH, 1);
    for (const mob of this.world.mobs) {
      this.redrawMob(mob, time, alphaMap, movement, inputState.goalMob);
    }
    this.redrawMap(alphaMap, movement);

    if (DEBUG.showLos && inputState.highlightPos) {
      this.redrawLos(inputState.highlightPos);
    }
    if (DEBUG.showDistance && inputState.path) {
      this.redrawDistance();
    }

    this.backLayer.flush();
    this.mapLayer.flush();
    this.mobLayer.flush();
    this.frontLayer.flush();
  }

  updateViewport(movement: Movement): void {
    if (this.element.clientWidth !== this.width ||
        this.element.clientHeight !== this.height) {
      this.width = this.element.clientWidth;
      this.height = this.element.clientHeight;
      this.app.renderer.resize(this.width, this.height);
    }

    const {x0, y0, x1, y1, t} = movement;

    const x = lerp(x0, x1, t);
    const y = lerp(y0, y1, t);

    this.app.stage.x = offset(x, this.width, this.world.mapW);
    this.app.stage.y = offset(y, this.height, this.world.mapH);
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
          tile = items[items.length - 1].tile;
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
    const player = this.client.player;

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
    x: number, y: number, {x0, y0, x1, y1, t}: Movement,
    darkAlpha = DARK_ALPHA
  ): number {
    const visible = this.world.visibilityMap.visible(
      x0, y0, x, y);
    const remembered = this.client.memory[y][x];
    const multiplier = visible ? 1 : remembered ? darkAlpha : 0;

    if (t === 0) {
      return multiplier;
    }

    const nextVisible = this.world.visibilityMap.visible(x1, y1, x, y);
    const nextMultiplier = nextVisible ? 1 : remembered ? darkAlpha : 0;
    return lerp(multiplier, nextMultiplier, t);
  }

  redrawHighlight(highlightPos: Pos): void {
    const g = this.backLayer.make('highlight', PIXI.Graphics, g => {
      g.lineStyle(1, 0x444444, 1, 0);
      g.beginFill(0x111111);
      g.drawRect(0, 0, TILE_SIZE, TILE_SIZE);
    });
    g.x = highlightPos.x * TILE_SIZE;
    g.y = highlightPos.y * TILE_SIZE;
  }

  redrawLos(highlightPos: Pos): void {
    const los = this.world.visibilityMap.line(
      this.client.player.pos.x, this.client.player.pos.y,
      highlightPos.x, highlightPos.y,
    );

    if (los) {
      const g = this.frontLayer.make('los.line', PIXI.Graphics);
      g.clear();
      g.lineStyle(5, 0x4444FF, 0.5, 0.5);
      g.moveTo((los[0].x + 0.5) * TILE_SIZE, (los[0].y + 0.5) * TILE_SIZE);
      for (let i = 1; i < los.length; i++) {
        g.lineTo((los[i].x + 0.5) * TILE_SIZE, (los[i].y + 0.5) * TILE_SIZE);
      }
    }
  }

  redrawGoal(goalPos: Pos): void {
    const g = this.frontLayer.make('goal', PIXI.Graphics, g => {
      g.lineStyle(1, 0x6D5000, 1, 0);
      g.drawRect(0, 0, TILE_SIZE, TILE_SIZE);
    });
    g.x = goalPos.x * TILE_SIZE;
    g.y = goalPos.y * TILE_SIZE;
  }

  redrawInfo(highlightPos: Pos | null): void {
    if (!this.sidebar) {
      return;
    }

    const inventory = describeItems(
      this.world.findMobItems(this.client.player));

    let terrainTile: string | null = null;
    let mob: MobInfo | null = null;
    let items: ItemInfo[] | null = null;
    if (highlightPos) {
      const {x, y} = highlightPos;

      if (this.client.memory[y][x]) {

        terrainTile = this.world.map[y][x];

        if (this.client.canSee(x, y)) {
          mob = describeMob(this.world.findMob(x, y));
        }

        items = describeItems(this.world.findItems(x, y));
      }
    }

    this.sidebar.setState({ inventory, terrainTile, mob, items });

    this.sidebar.setState({
      health: this.client.player.health,
      maxHealth: this.client.player.maxHealth
    });

    let enemy = null;
    if (this.client.enemy) {
      enemy = {
        tile: this.client.enemy.tile,
        health: this.client.enemy.health,
        maxHealth: this.client.enemy.maxHealth
      };
    }
    this.sidebar.setState({ enemy });
  }

  redrawPath(path: Pos[]): void {
    const g = this.frontLayer.make('path', PIXI.Graphics);
    g.clear();
    g.lineStyle(5, 0xFFFFFF, 0.3, 0.5);

    const {x: x0, y: y0} = this.mobLayer.get('player')!.position;
    g.moveTo(
      x0 + 0.5 * TILE_SIZE,
      y0 + 0.5 * TILE_SIZE
    );
    for (let i = 1; i < path.length; i++) {
      const {x, y} = path[i];
      g.lineTo(TILE_SIZE * (x + 0.5), TILE_SIZE * (y + 0.5));
    }
  }

  redrawDistance(): void {
    // Draw distance map
    const dm = this.client.distanceMap;
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
  }
}

function offset(x: number, width: number, mapWidth: number): number {
  if (width > mapWidth * TILE_SIZE) {
    return (width - mapWidth * TILE_SIZE) / 2;
  }
  const dx = -((x + 0.5) * TILE_SIZE - width / 2);
  return clamp(dx, -mapWidth * TILE_SIZE + width, 0);
}
