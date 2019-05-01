import { RawInput } from "./raw-input";
import { Pos, Command, ActionType } from "../types";
import { Mob } from "../mob";
import { View } from "./view";
import { World } from "../world";
import { Client } from "../client";

export interface InputState {
  highlightPos: Pos | null;
  goalPos: Pos | null;
  goalMob: Mob | null;
  path: Pos[] | null;
}

export class Input {
  world: World;
  client: Client;
  rawInput: RawInput;
  view: View;

  state: InputState = {
    highlightPos: null,
    goalPos: null,
    goalMob: null,
    path: null,
  }

  constructor(world: World, client: Client, rawInput: RawInput, view: View) {
    this.world = world;
    this.client = client;
    this.rawInput = rawInput;
    this.view = view;
  }

  update(): boolean {
    const mousePoint = this.rawInput.mouse.point;
    const inputPos = mousePoint && this.view.toPos(mousePoint);
    let dirty = false;

    if (this.rawInput.mouse.lmb) {
      if (inputPos) {
        const mob = this.world.findMob(inputPos.x, inputPos.y);
        if (mob && this.client.canSeeMob(mob)) {
          this.state.goalPos = null;
          this.state.goalMob = mob;
        } else {
          this.state.goalPos = inputPos;
          this.state.goalMob = null;
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
          mobId: this.state.goalMob.id,
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

    if (this.client.enemy && this.world.canAttack(player, this.client.enemy)) {
      return {
        type: ActionType.ATTACK,
        mobId: this.client.enemy.id,
      };
    }

    const items = this.world.findItems(player.pos.x, player.pos.y);
    if (items.length > 0) {
      return {
        type: ActionType.PICK_UP,
        itemId: items[items.length - 1].id,
      };
    }

    return null;
  }

  private cancel(): void {
    this.state.path = null;
    this.state.goalPos = null;
    this.state.goalMob = null;
  }
}
