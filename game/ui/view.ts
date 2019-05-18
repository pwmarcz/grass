import * as PIXI from 'pixi.js';
import { TILE_SIZE, RESOLUTION, setTexture } from './textures';
import { World } from '../world';
import { ActionType, Pos } from '../types';
import { renderWithRef } from '../utils';
import { Sidebar, ItemInfo, describeMob, MobInfo, describeItems } from './sidebar';
import { h } from 'preact';
import { StringRenderer, IndexRenderer } from './renderer';
import { Terrain } from '../terrain';
import { Mob } from '../mob';
import { Client } from '../client';
import { DEBUG } from '../debug';
import { InputState } from './input';
import { Tile } from '../tiles';
import { VisibilityMap } from '../fov';

const ATTACK_DISTANCE = 0.3;
const DARK_ALPHA = 0.4;

const SHOT_START_TIME = 0.3;
const SHOT_FULL_DISTANCE = 12 * TILE_SIZE;
const SHOT_LENGTH = TILE_SIZE;

const DEATH_OFFSET = 0.2;

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
      autoDensity: true,
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

  private redrawMobExtra(mob: Mob, time: number,
    mobDescriptions: MobDescriptionMap,
    goalMob: Mob | null
  ): void {
    const actionTime = mob.getActionTime(time);

    if (mob.action && mob.action.type === 'SHOOT_TERRAIN') {
      this.redrawShot(
        mob.id,
        mob.pos,
        mob.action.pos,
        1,
        actionTime
      );
    }
    if (mob.action && mob.action.type === 'SHOOT_MOB') {
      const targetMob = this.world.getTargetMob(mob);
      if (targetMob) {
        const desc = mobDescriptions[targetMob.id];
        if (!desc) {
          return;
        }
        const targetPos = desc.getExactPos();
        const targetAlpha = desc.alpha;
        this.redrawShot(
          mob.id,
          mob.pos,
          targetPos,
          targetAlpha,
          actionTime
        );
      }
    }

    if (goalMob && goalMob.id === mob.id) {
      const desc = mobDescriptions[mob.id];
      if (!desc) {
        return;
      }
      const g = this.frontLayer.make('goalMob', PIXI.Graphics, g => {
        g.lineStyle(1, 0x6D5000, 1, 0);
        g.drawRect(0, 0, TILE_SIZE, TILE_SIZE);
      });
      const pos = desc.getExactPos();
      g.x = pos.x * TILE_SIZE;
      g.y = pos.y * TILE_SIZE;
    }
  }

  redrawShot(
    id: string, sourcePos: Pos,
    targetPos: Pos, targetAlpha: number, actionTime: number
  ): void {
    const g = this.frontLayer.make(`shot.${id}`, PIXI.Graphics);
    g.clear();
    g.lineStyle(4, 0x6D5000, targetAlpha, 0.5);

    const x0 = (sourcePos.x + 0.5) * TILE_SIZE;
    const y0 = (sourcePos.y + 0.5) * TILE_SIZE;

    const x1 = (targetPos.x + 0.5) * TILE_SIZE;
    const y1 = (targetPos.y + 0.5) * TILE_SIZE;

    const dist = Math.sqrt((x1-x0)*(x1-x0) + (y1-y0)*(y1-y0));
    const shotLength = SHOT_LENGTH / dist;

    const time = SHOT_START_TIME * dist / SHOT_FULL_DISTANCE;

    const endDist = Math.min(1, actionTime / time);
    const startDist = Math.max(0, endDist - shotLength);
    const xa = lerp(x0, x1, startDist);
    const ya = lerp(y0, y1, startDist);
    const xb = lerp(x0, x1, endDist);
    const yb = lerp(y0, y1, endDist);

    g.moveTo(xa, ya);
    g.lineTo(xb, yb);
  }

  redraw(dirty: boolean, time: number, inputState: InputState): void {
    const movement = this.getPlayerMovement(time);
    this.updateViewport(movement);

    const alphaMap = new AlphaMap(
      this.world.visibilityMap,
      this.client.memory,
      movement,
    );

    const mobDescriptions: MobDescriptionMap = {};

    for (const mob of this.world.mobs) {
      const desc = new MobDescription(mob, this.world, alphaMap, time);
      mobDescriptions[mob.id] = desc;
      desc.updateAlphaMap(alphaMap);
      desc.draw(this.mobLayer);
    }

    for (const mob of this.world.mobs) {
      this.redrawMobExtra(mob, time, mobDescriptions, inputState.goalMob);
    }
    this.redrawMap(alphaMap);

    if (dirty) {
      this.redrawInfo(inputState.highlightPos);
    }
    if (inputState.highlightPos){
      this.redrawHighlight(inputState.highlightPos);
    }
    if (inputState.goalPos) {
      this.redrawGoal(inputState.goalPos);
    }
    if (inputState.aimPos) {
      this.redrawAim(inputState.aimPos, mobDescriptions);
    }
    if (inputState.path) {
      this.redrawPath(inputState.path, movement);
    }

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

  redrawMap(alphaMap: AlphaMap): void {
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
        const alpha = alphaMap.getTerrainAlpha(x, y);
        if (alpha === 0) {
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

          sprite.alpha = alpha;
          setTexture(sprite, tile);
        }
      }
    }
  }

  getPlayerMovement(time: number): Movement {
    const mob = this.client.player;

    const x0 = mob.pos.x, y0 = mob.pos.y;
    let x1: number, y1: number;
    let t: number;
    if (mob.action && mob.action.type === ActionType.MOVE) {
      t = (time - mob.action.timeStart) / (mob.action.timeEnd - mob.action.timeStart);
      x1 = mob.action.pos.x;
      y1 = mob.action.pos.y;
    } else {
      x1 = x0;
      y1 = y0;
      t = 0;
    }

    return {x0, y0, x1, y1, t};
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

  redrawAim(aimPos: Pos, mobDescriptions: MobDescriptionMap): void {
    const g = this.frontLayer.make('aim', PIXI.Graphics, g => {
      g.lineStyle(1, 0x6D0000, 1, 0);
      g.drawRect(0, 0, TILE_SIZE, TILE_SIZE);
    });
    g.x = aimPos.x * TILE_SIZE;
    g.y = aimPos.y * TILE_SIZE;

    const target = this.world.findTarget(
      this.client.player.pos, aimPos,
    );
    if (target) {
      let targetPos: Pos;
      if (target instanceof Mob) {
        const desc = mobDescriptions[target.id];
        targetPos = desc ? desc.getExactPos() : target.pos;
      } else {
        targetPos = target;
      }
      const g = this.frontLayer.make('target', PIXI.Graphics, g => {
        g.lineStyle(2, 0x6D0000, 1, 0);
        g.drawRect(0, 0, TILE_SIZE, TILE_SIZE);
      });
      g.x = targetPos.x * TILE_SIZE;
      g.y = targetPos.y * TILE_SIZE;
    }
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

  redrawPath(path: Pos[], movement: Movement): void {
    const g = this.frontLayer.make('path', PIXI.Graphics);
    g.clear();
    g.lineStyle(5, 0xFFFFFF, 0.3, 0.5);

    const x0 = lerp(movement.x0, movement.x1, movement.t) * TILE_SIZE;
    const y0 = lerp(movement.y0, movement.y1, movement.t) * TILE_SIZE;
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
    for (let y = 0; y < dm.h; y++) {
      for (let x = 0; x < dm.w; x++) {
        const prev = dm.data[y][x];
        if (prev.closed) {
          const g = this.frontLayer.make(`prev(${x},${y})`, PIXI.Graphics);
          g.clear();
          g.lineStyle(1, 0xffffff, 0.5, 0);
          g.moveTo((x + 0.5) * TILE_SIZE, (y + 0.5) * TILE_SIZE);
          g.lineTo((prev.x + 0.5) * TILE_SIZE, (prev.y + 0.5) * TILE_SIZE);
        }
      }
    }
  }
}

function offset(x: number, width: number, mapWidth: number): number {
  if (width > mapWidth * TILE_SIZE) {
    return Math.floor((width - mapWidth * TILE_SIZE) / 2);
  }
  const dx = -Math.floor((x + 0.5) * TILE_SIZE - width / 2);
  return clamp(dx, -mapWidth * TILE_SIZE + width, 0);
}

class MobDescription {
  readonly id: string;
  readonly tile: Tile;

  readonly pos: Pos;
  readonly nextPos: Pos;
  readonly movementTime: number;

  readonly dx: number;
  readonly dy: number;
  readonly alpha: number;

  constructor(mob: Mob, world: World, alphaMap: AlphaMap, time: number) {
    this.id = mob.id;
    this.tile = mob.tile;

    this.pos = mob.pos;
    this.nextPos = mob.pos;
    this.movementTime = 0;
    this.dx = 0;
    this.dy = 0;
    this.alpha = alphaMap.getMobAlpha(this.pos.x, this.pos.y);

    const actionTime = mob.getActionTime(time);

    if (mob.action) {
      switch (mob.action.type) {
        case ActionType.MOVE: {
          this.nextPos = mob.action.pos;
          this.movementTime = actionTime;
          this.alpha = lerp(
            this.alpha,
            alphaMap.getMobAlpha(this.nextPos.x, this.nextPos.y),
            actionTime,
          );
          break;
        }

        case ActionType.ATTACK: {
          let distance: number;
          if (mob.isBeforeEffect(time)) {
            distance = mob.getTimeBeforeEffect(time) * ATTACK_DISTANCE;
          } else {
            distance = (1 - mob.getTimeAfterEffect(time)) * ATTACK_DISTANCE;
          }

          let targetPos = mob.pos;
          const targetMob = world.getTargetMob(mob);
          if (targetMob) {
            if (targetMob.action && targetMob.action.type === ActionType.MOVE) {
              const targetActionTime = targetMob.getActionTime(time);
              targetPos = {
                x: lerp(targetMob.pos.x, targetMob.action.pos.x, targetActionTime),
                y: lerp(targetMob.pos.y, targetMob.action.pos.y, targetActionTime),
              };
            } else {
              targetPos = targetMob.pos;
            }
          }

          this.dx = distance * (targetPos.x - mob.pos.x);
          this.dy = distance * (targetPos.y - mob.pos.y);
          break;
        }

        case ActionType.DIE: {
          this.alpha *= 1 - actionTime;
          this.dy = actionTime * DEATH_OFFSET;
        }
      }
    }
  }

  updateAlphaMap(alphaMap: AlphaMap): void {
    if (this.movementTime === 0) {
      alphaMap.update(this.pos.x, this.pos.y, 1 - this.alpha);
    } else {
      alphaMap.update(
        this.pos.x, this.pos.y,
        lerp(1 - this.alpha, 1, this.movementTime)
      );
      alphaMap.update(
        this.nextPos.x, this.nextPos.y,
        lerp(1, 1 - this.alpha, this.movementTime)
      );
    }
  }

  draw(mobLayer: StringRenderer): PIXI.Sprite | null {
    if (this.alpha === 0) {
      return null;
    }

    const sprite = mobLayer.make(this.id, PIXI.Sprite, sprite => {
      sprite.width = TILE_SIZE;
      sprite.height = TILE_SIZE;
      setTexture(sprite, this.tile);
    });

    const {x, y} = this.getExactPos();
    sprite.x = x * TILE_SIZE;
    sprite.y = y * TILE_SIZE;
    sprite.alpha = this.alpha;

    return sprite;
  }

  getExactPos(): Pos {
    const x = lerp(
      this.pos.x, this.nextPos.x,
      this.movementTime
    ) + this.dx;
    const y = lerp(
      this.pos.y, this.nextPos.y,
      this.movementTime
    ) + this.dy;
    return {x, y};
  }
}

type MobDescriptionMap = Partial<Record<string, MobDescription>>;

class AlphaMap {
  readonly visibilityMap: VisibilityMap;
  readonly memory: boolean[][];
  readonly movement: Movement;
  readonly override: Partial<Record<number, number>>;

  constructor(visibilityMap: VisibilityMap, memory: boolean[][], movement: Movement) {
    this.visibilityMap = visibilityMap;
    this.memory = memory;

    this.movement = movement;
    this.override = {};
  }

  update(x: number, y: number, alpha: number): void {
    this.override[y * this.visibilityMap.width + x] = alpha;
  }

  private getAlpha(x: number, y: number, darkAlpha: number): number {
    if (DEBUG.fullVision) {
      return this.visibilityMap.visibleFromAnywhere(x, y) ? 1 : 0;
    }

    const {x0, y0, x1, y1, t} = this.movement;

    const visible = this.visibilityMap.visible(x0, y0, x, y);
    const remembered = this.memory[y][x];
    const alpha = visible ? 1 : remembered ? darkAlpha : 0;

    if (t === 0) {
      return alpha;
    }

    const nextVisible = this.visibilityMap.visible(x1, y1, x, y);
    const nextAlpha = nextVisible ? 1 : remembered ? darkAlpha : 0;
    return lerp(alpha, nextAlpha, t);
  }

  getTerrainAlpha(x: number, y: number): number {
    const result = this.getAlpha(x, y, DARK_ALPHA);
    const override = this.override[y * this.visibilityMap.width + x];
    return result * (override === undefined ? 1 : override);
  }

  getMobAlpha(x: number, y: number): number {
    return this.getAlpha(x, y, 0);
  }
}
