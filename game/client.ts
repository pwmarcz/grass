import { World } from "./world";
import { Mob } from "./mob";
import { VisibilityMap } from "./fov";
import { DistanceMap } from "./path";
import { makeEmptyGrid } from "./utils";
import { Command, ActionType } from "./types";
import { Terrain } from "./terrain";

// Display enemy for how long
const ENEMY_TIME = 60 * 5;

export class Client {
  world: World;
  player: Mob;

  distanceMap: DistanceMap;
  memory: boolean[][];

  visibilityMap: VisibilityMap;
  nextVisibilityMap: VisibilityMap;

  enemy: Mob | null;
  enemyTime: number;

  constructor(world: World, playerId: string) {
    this.world = world;
    this.player = this.world.mobs.find(mob => mob.id === playerId)!;

    this.distanceMap = new DistanceMap(this.canPlayerPath.bind(this), this.world.mapW, this.world.mapH);
    this.distanceMap.update(this.player.pos.x, this.player.pos.y);

    this.visibilityMap = new VisibilityMap(this.canPlayerSeeThrough.bind(this));
    this.visibilityMap.update(this.player.pos.x, this.player.pos.y);
    this.nextVisibilityMap = new VisibilityMap(this.canPlayerSeeThrough.bind(this));

    this.memory = makeEmptyGrid(this.world.mapW, this.world.mapH, false);
    this.updateMemory(this.visibilityMap);

    this.enemy = null;
    this.enemyTime = 0;
  }

  turn(command: Command | null): boolean {
    const commands: Record<string, Command | null> = {};
    commands[this.player.id] = command;
    // TODO other commands
    this.world.turn(commands);

    if (this.world.stateChanged) {
      this.distanceMap.update(this.player.pos.x, this.player.pos.y);
    }
    if (this.world.visibilityChanged ||
      this.world.visibilityChangedFor.has(this.player.id)) {
      this.visibilityMap.update(this.player.pos.x, this.player.pos.y);
      this.updateMemory(this.visibilityMap);
      if (this.player.action && this.player.action.type === ActionType.MOVE) {
        const {x, y} = this.player.action.pos;
        this.nextVisibilityMap.update(x, y);
      }
    }

    if (this.player.action && this.player.action.type === ActionType.ATTACK) {
      this.enemy = this.world.mobsById[this.player.action.mobId];
      this.enemyTime = ENEMY_TIME;
    }

    if (this.enemy) {
      if (!this.enemy.alive() || !this.canSeeMob(this.enemy)) {
        this.enemy = null;
      } else if (--this.enemyTime <= 0) {
        this.enemy = null;
      }
    }

    return this.world.stateChanged;
  }

  updateMemory(vm: VisibilityMap): void {
    for (let my = 0; my < vm.h; my++) {
      for (let mx = 0; mx < vm.w; mx++) {
        const x = mx + vm.x0;
        const y = my + vm.y0;
        if (this.world.inBounds(x, y)) {
          this.memory[y][x] = this.memory[y][x] || vm.data[my][mx];
        }
      }
    }
  }

  canPlayerPath(x: number, y: number): boolean {
    if (!this.world.inBounds(x, y)) {
      return false;
    }

    if (!this.memory[y][x]) {
      return false;
    }

    if (this.visibilityMap.visible(x, y)) {
      const mob = this.world.findMob(x, y);
      if (mob && mob.id !== this.player.id) {
        return false;
      }
    }

    return Terrain.pathThrough(this.world.map[y][x]);
  }

  canPlayerSeeThrough(x: number, y: number): boolean {
    return this.world.inBounds(x, y) && Terrain.seeThrough(this.world.map[y][x]);
  }

  canSeeMob(mob: Mob): boolean {
    return this.visibilityMap.visible(mob.pos.x, mob.pos.y);
  }
}
