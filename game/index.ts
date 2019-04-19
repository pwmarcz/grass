import './lib/normalize.css';

import { loadMap } from './map-loader';
import { View } from './view';
import { Input } from './input';
import { World } from './world';
import { Command, CommandType } from './types';

const { map, mobiles } = loadMap();

const appElement = document.getElementById('app');
const infoElement = document.getElementById('info');
if (!appElement || !infoElement) {
  throw 'app not found';
}

let world = new World(map, mobiles);
let view = new View(world, appElement, infoElement);
let input = new Input(appElement, world.mapW, world.mapH);

view.setup((): void => {
  view.app.ticker.add(gameLoop);
  input.setup();
});

let time = 0;

function gameLoop(delta: number): void {
  time += delta;

  while (world.time < Math.floor(time)) {
    const commands: Record<string, Command | null> = {};
    const player = world.mobileMap.player;
    let triedGoal = false;

    if (!player.action) {
      const playerCommand = input.getCommand();
      if (playerCommand) {
        input.goalPos = null;
        commands.player = playerCommand;
      } else if (input.goalPos) {
        triedGoal = true;
        const path = world.distanceMap.findPathToAdjacent(input.goalPos.x, input.goalPos.y);
        if (path && path.length > 1) {
          const dx = path[1].x - player.x;
          const dy = path[1].y - player.y;
          commands.player = {
            type: CommandType.MOVE,
            dx,
            dy,
          };
        }
      }
    }
    if (!world.mobileMap.goblin.action) {
      commands.goblin = getAiCommand('goblin');
    }
    world.turn(commands);

    if (triedGoal && !player.action) {
      input.goalPos = null;
    }
  }

  view.goalPos = input.goalPos;
  view.highlightPos = input.highlightPos;

  view.redraw(time);
}


function getAiCommand(m: string): Command | null {
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
