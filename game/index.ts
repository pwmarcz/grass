import './lib/normalize.css';
import './style.css';

// @ts-ignore
import mapFile1 from './maps/map1.xml';
// @ts-ignore
import mapFile2 from './maps/map2.xml';

import { loadMap } from './map-loader';
import { View } from './ui/view';
import { Input } from './ui/input';
import { World } from './world';
import { Command, CommandType } from './types';
import { loadTextures } from './ui/textures';
import { posEqual } from './utils';

let mapFile = mapFile1;
let speed = 1;

const parsedUrl = new URL(window.location.href);
if (parsedUrl.searchParams.get('map') === '2') {
  mapFile = mapFile2;
}

if (parsedUrl.searchParams.get('speed') !== null) {
  speed = parseFloat(parsedUrl.searchParams.get('speed')!);
}

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
  const { map, mobs, items } = loadMap(xml);
  const world = new World(map, mobs, items);
  const view = new View(world, appElement, infoElement);
  const input = new Input(appElement, view.app.stage, world.mapW, world.mapH);

  view.setup();
  view.app.ticker.add(delta => gameLoop(world, input, view, delta));
  input.setup();
});

let time = 0;

function gameLoop(world: World, input: Input, view: View, delta: number): void {
  time += delta * speed;
  let dirty = false;

  while (world.time < Math.floor(time)) {
    const commands: Record<string, Command | null> = {};
    let triedGoal = false;

    if (!world.player.action) {
      const playerCommand = input.getCommand();
      if (playerCommand) {
        input.goalPos = null;
        view.path = null;
        commands.player = playerCommand;
      } else if (input.goalPos) {
        triedGoal = true;
        if (world.memory[input.goalPos.y][input.goalPos.x]) {
          const path = world.distanceMap.findPath(input.goalPos.x, input.goalPos.y);
          if (path && path.length > 1) {
            const dx = path[1].x - world.player.pos.x;
            const dy = path[1].y - world.player.pos.y;
            commands.player = {
              type: CommandType.MOVE,
              dx,
              dy,
            };
            view.path = path;
          }
        }
      } else {
        const items = world.findItems(world.player.pos.x, world.player.pos.y);
        if (items.length > 0) {
          commands.player = {
            type: CommandType.PICK_UP,
            itemId: items[items.length - 1].id,
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
      view.path = null;
    }
  }

  if (!posEqual(view.goalPos, input.goalPos) ||
    !posEqual(view.highlightPos, input.highlightPos)) {
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
