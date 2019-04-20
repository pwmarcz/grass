import './lib/normalize.css';
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
  const { map, mobiles } = loadMap(xml);
  const world = new World(map, mobiles);
  const view = new View(world, appElement, infoElement);
  const input = new Input(appElement, view.app.stage, world.mapW, world.mapH);

  view.setup();
  view.app.ticker.add(delta => gameLoop(world, input, view, delta));
  input.setup();
});

let time = 0;

function gameLoop(world: World, input: Input, view: View, delta: number): void {
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
          const dx = path[1].x - player.pos.x;
          const dy = path[1].y - player.pos.y;
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
