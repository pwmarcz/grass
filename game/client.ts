import { World } from "./world";
import { Mob } from "./mob";
import { DistanceMap } from "./path";
import { makeEmptyGrid } from "./utils";
import { Command } from "./types";
import { Terrain } from "./terrain";
import { DEBUG } from "./debug";

// Display enemy for how long
const ENEMY_TIME = 60 * 5;

export class Client {
  world: World;
  player: Mob;

  distanceMap: DistanceMap;
  memory: boolean[][];

  enemy: Mob | null;
  enemyLastSeen: number;

  constructor(world: World, playerId: string) {
    this.world = world;
    this.player = this.world.mobs.find(mob => mob.id === playerId)!;

    this.distanceMap = new DistanceMap(this.mapFunc.bind(this), this.world.mapW, this.world.mapH);
    this.distanceMap.update(this.player.pos.x, this.player.pos.y);

    this.memory = makeEmptyGrid(this.world.mapW, this.world.mapH, false);
    if (DEBUG.fullMemory || DEBUG.fullVision) {
      for (let y = 0; y < this.world.mapH; y++) {
        for (let x = 0; x < this.world.mapW; x++) {
          this.memory[y][x] = this.world.visibilityMap.visibleFromAnywhere(x, y);
        }
      }
    }

    this.updateMemory();

    this.enemy = null;
    this.enemyLastSeen = 0;
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
      this.updateMemory();
    }

    const nextEnemy = this.findEnemy();
    if (nextEnemy) {
      this.enemy = nextEnemy;
      this.enemyLastSeen = this.world.time;
    }

    if (this.enemy) {
      if (!this.enemy.alive || !this.canSeeMob(this.enemy)) {
        this.enemy = null;
      }
      if (this.world.time > this.enemyLastSeen + ENEMY_TIME) {
        this.enemy = null;
      }
    }

    return this.world.stateChanged;
  }

  findEnemy(): Mob | null {
    let enemy: Mob | null = null;
    let t = 0;

    if (this.player.action) {
      const mob = this.world.getTargetMob(this.player);
      if (mob) {
        enemy = mob;
        t = this.player.action.timeStart;
      }
    }

    for (const mob of this.world.mobs) {
      if (mob.action) {
        const targetMob = this.world.getTargetMob(mob);
        if (targetMob && targetMob.id === this.player.id &&
          mob.action.timeStart > t) {

          enemy = mob;
          t = mob.action.timeStart;
        }
      }
    }

    return enemy;
  }

  updateMemory(): void {
    this.world.visibilityMap.forEach(this.player.pos.x, this.player.pos.y,
      (x, y) => this.memory[y][x] = true
    );
  }

  mapFunc(x: number, y: number): number | null {
    if (!this.world.inBounds(x, y)) {
      return null;
    }

    if (!this.memory[y][x]) {
      return null;
    }

    if (this.canSee(x, y)) {
      const mob = this.world.findMob(x, y);
      if (mob && mob.id !== this.player.id) {
        return null;
      }
    }

    return Terrain.pathThrough(this.world.map[y][x]) ? 0 : null;
  }

  canSee(x: number, y: number): boolean {
    return this.world.visibilityMap.visible(this.player.pos.x, this.player.pos.y, x, y);
  }

  canSeeMob(mob: Mob): boolean {
    return this.canSee(mob.pos.x, mob.pos.y);
  }
}
