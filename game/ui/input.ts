import { RawInput } from "./raw-input";
import { Pos, Command, ActionType } from "../types";
import { Mob } from "../mob";
import { World } from "../world";
import { Client } from "../client";
import { simpleDistance, minBy } from "../utils";
import { DEBUG } from "../debug";

export interface InputState {
  highlightPos: Pos | null;
  goalPos: Pos | null;
  goalMob: Mob | null;
  aimPos: Pos | null;
  path: Pos[] | null;
  shooting: boolean;
}

export class Input {
  world: World;
  client: Client;
  rawInput: RawInput;
  toPos: (point: PIXI.Point) => Pos | null;

  state: InputState = {
    highlightPos: null,
    goalPos: null,
    goalMob: null,
    path: null,
    aimPos: null,
    shooting: false,
  }

  constructor(world: World, client: Client, rawInput: RawInput,
    toPos: (point: PIXI.Point) => Pos | null) {
    this.world = world;
    this.client = client;
    this.rawInput = rawInput;
    this.toPos = toPos;
  }

  update(): boolean {
    const mousePoint = this.rawInput.mouse.point;
    const inputPos = mousePoint && this.toPos(mousePoint);
    let dirty = false;

    if (this.rawInput.shooting() && inputPos) {
      this.state.aimPos = inputPos;
    } else {
      this.state.aimPos = null;
    }

    if (this.rawInput.mouse.lmb) {
      if (this.state.aimPos) {
        this.state.goalPos = null;
        this.state.goalMob = null;
        this.state.shooting = true;
      } else if (inputPos) {
        const mob = this.world.findMob(inputPos.x, inputPos.y);

        if (mob && this.client.canSeeMob(mob)) {
          this.state.goalPos = null;
          this.state.goalMob = mob;
          this.state.shooting = false;
        } else {
          this.state.goalPos = inputPos;
          this.state.goalMob = null;
          this.state.shooting = false;
        }
      } else {
        this.state.goalPos = null;
        this.state.goalMob = null;
      }
      this.state.highlightPos = null;
      this.rawInput.mouse.lmb = false;
      dirty = true;
    }

    if (this.rawInput.mouse.rmb) {
      this.state.goalPos = null;
      this.state.goalMob = null;
      this.rawInput.mouse.rmb = false;
      dirty = true;
    }

    if (this.rawInput.mouse.moved) {
      this.state.highlightPos = inputPos;
      this.rawInput.mouse.moved = false;
      dirty = true;
    }
    return dirty;
  }

  getPlayerCommand(): Command | null {
    const player = this.client.player;

    if (!player.alive) {
      this.cancel();
      return null;
    }

    const dir = this.rawInput.getDirection();
    if (dir) {
      this.cancel();
      const pos = {
        x: player.pos.x + dir.dx,
        y: player.pos.y + dir.dy,
      };
      return {
        type: ActionType.MOVE,
        pos,
      };
    }

    if (this.rawInput.singleCommands['f']) {
      this.cancel();

      const targetMob = minBy(this.world.mobs, mob => {
        if (mob.id !== this.client.player.id &&
          this.client.canSeeMob(mob) &&
          this.world.hasClearShot(this.client.player.pos, mob))
        {
          return simpleDistance(this.client.player.pos, mob.pos);
        }
        return null;
      });

      if (targetMob) {
        return {
          type: ActionType.SHOOT_MOB,
          targetMob
        };
      }
    }

    if (this.rawInput.singleCommands['5'] || this.rawInput.singleCommands['.']) {
      this.cancel();
      return {
        type: ActionType.REST,
        dt: 15,
      };
    }

    this.state.path = null;
    if (this.state.aimPos && this.state.shooting) {
      this.state.shooting = false;
      return {
        type: ActionType.SHOOT_TERRAIN,
        pos: this.state.aimPos,
      };
    }

    if (this.state.goalPos) {
      const {x, y} = this.state.goalPos;
      if (this.client.memory[y][x]) {
        this.state.path = this.client.distanceMap.findPath(x, y);
      }
    }

    if (this.state.goalMob) {
      if (this.world.canAttack(player, this.state.goalMob)) {
        this.state.path = null;
        return {
          type: ActionType.ATTACK,
          targetMob: this.state.goalMob,
        };
      } else if (this.client.canSeeMob(this.state.goalMob)) {
        this.state.path = this.client.distanceMap.findPath(
          this.state.goalMob.pos.x, this.state.goalMob.pos.y);
      }
    }

    if (this.state.path && this.state.path.length > 1 &&
      this.world.canMoveOrOpen(this.state.path[1].x, this.state.path[1].y)) {
      return {
        type: ActionType.MOVE,
        pos: this.state.path[1],
      };
    } else {
      this.cancel();
    }

    if (!DEBUG.pause && this.client.enemy && this.world.canAttack(player, this.client.enemy)) {
      return {
        type: ActionType.ATTACK,
        targetMob: this.client.enemy,
      };
    }

    const items = this.world.findItems(player.pos.x, player.pos.y);
    if (items.length > 0) {
      return {
        type: ActionType.PICK_UP,
        item: items[items.length - 1],
      };
    }

    return null;
  }

  private cancel(): void {
    this.state.path = null;
    this.state.goalPos = null;
    this.state.goalMob = null;
    this.rawInput.singleCommands = {};
  }
}
