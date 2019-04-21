import './lib/normalize.css';
import deepEqual from 'fast-deep-equal';

// @ts-ignore
import mapFile from './map.auto.xml';

import { loadMap } from './map-loader';
import { View } from './view';
import { Input } from './input';
import { World } from './world';
import { Command, CommandType } from './types';
import { loadTextures } from './tiles';


const appElement = document.getElementById('app');
const infoElement = document.getElementById('info');
if (!appElement || !infoElement) {
  throw 'app not found';
}

const mapPromise = fetch(mapFile).then(response => response.text());
const loadPromise = loadTextures();

Promise.all([mapPromise, loadPromise])
.then(result => {
  const [xml] = result;
  const { map, mobs } = loadMap(xml);
  const world = new World(map, mobs);
  const view = new View(world, appElement, infoElement);
  const input = new Input(appElement, view.app.stage, world.mapW, world.mapH);

  view.setup();
  view.app.ticker.add(delta => gameLoop(world, input, view, delta));
  input.setup();
});

let time = 0;

function gameLoop(world: World, input: Input, view: View, delta: number): void {
  time += delta;
  let dirty = false;

  while (world.time < Math.floor(time)) {
    const commands: Record<string, Command | null> = {};
    let triedGoal = false;

    if (!world.player.action) {
      const playerCommand = input.getCommand();
      if (playerCommand) {
        input.goalPos = null;
        commands.player = playerCommand;
      } else if (input.goalPos) {
        triedGoal = true;
        const path = world.distanceMap.findPathToAdjacent(input.goalPos.x, input.goalPos.y);
        if (path && path.length > 1) {
          const dx = path[1].x - world.player.pos.x;
          const dy = path[1].y - world.player.pos.y;
          commands.player = {
            type: CommandType.MOVE,
            dx,
            dy,
          };
        }
      }
    }
    for (const mob of world.mobs) {
      if (!mob.action) {
        if (mob.id !== 'player') {
          commands[mob.id] = getAiCommand();
        }
      }
    }

    if (world.turn(commands)) {
      dirty = true;
    }

    if (triedGoal && !world.player.action) {
      input.goalPos = null;
    }
  }

  if (!deepEqual(view.goalPos, input.goalPos) ||
    !deepEqual(view.highlightPos, input.highlightPos)) {
    view.goalPos = input.goalPos;
    view.highlightPos = input.highlightPos;
    dirty = true;
  }

  view.redraw(dirty, time);
}


function getAiCommand(): Command | null {
  if (Math.random() < 0.8) {
    return { type: CommandType.REST, dt: Math.random() * 10 };
  }

  const dx = Math.floor(Math.random() * 3) - 1;
  const dy = Math.floor(Math.random() * 3) - 1;
  if (dx !== 0 || dy !== 0) {
    return { type: CommandType.MOVE, dx, dy };
  }
  return null;
}
