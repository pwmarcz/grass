import { World } from "./world";
import { Mob } from "./mob";
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

  enemy: Mob | null;
  enemyTime: number;

  constructor(world: World, playerId: string) {
    this.world = world;
    this.player = this.world.mobs.find(mob => mob.id === playerId)!;

    this.distanceMap = new DistanceMap(this.canPlayerPath.bind(this), this.world.mapW, this.world.mapH);
    this.distanceMap.update(this.player.pos.x, this.player.pos.y);

    this.memory = makeEmptyGrid(this.world.mapW, this.world.mapH, false);
    this.updateMemory();

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
      this.updateMemory();
    }

    if (this.player.action && this.player.action.type === ActionType.ATTACK) {
      this.enemy = this.world.getTargetMob(this.player);
      this.enemyTime = ENEMY_TIME;
    }

    if (this.enemy) {
      if (!this.enemy.alive || !this.canSeeMob(this.enemy)) {
        this.enemy = null;
      } else if (--this.enemyTime <= 0) {
        this.enemy = null;
      }
    }

    return this.world.stateChanged;
  }

  updateMemory(): void {
    this.world.visibilityMap.forEach(this.player.pos.x, this.player.pos.y,
      (x, y) => this.memory[y][x] = true
    );
  }

  canPlayerPath(x: number, y: number): boolean {
    if (!this.world.inBounds(x, y)) {
      return false;
    }

    if (!this.memory[y][x]) {
      return false;
    }

    if (this.canSee(x, y)) {
      const mob = this.world.findMob(x, y);
      if (mob && mob.id !== this.player.id) {
        return false;
      }
    }

    return Terrain.pathThrough(this.world.map[y][x]);
  }

  canSee(x: number, y: number): boolean {
    return this.world.visibilityMap.visible(this.player.pos.x, this.player.pos.y, x, y);
  }

  canSeeMob(mob: Mob): boolean {
    return this.canSee(mob.pos.x, mob.pos.y);
  }
}
