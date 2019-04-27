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
import { Client } from './client';

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
  const client = new Client(world, 'player');
  const view = new View(world, client, appElement, infoElement);
  const input = new Input(appElement, view.app.stage, world.mapW, world.mapH);

  view.setup();
  view.app.ticker.add(delta => gameLoop(world, client, input, view, delta));
  input.setup();
});

let time = 0;

function gameLoop(world: World, client: Client, input: Input, view: View, delta: number): void {
  time += delta * speed;
  let dirty = false;

  const mousePoint = input.mouse.point;
  const inputPos = mousePoint && view.toPos(mousePoint);
  let highlightPos = view.highlightPos;
  let goalPos = view.goalPos;
  let path = view.path;

  if (input.mouse.lmb) {
    goalPos = inputPos;
    highlightPos = null;
    input.mouse.lmb = false;
  }
  if (input.mouse.rmb) {
    goalPos = null;
    input.mouse.rmb = false;
  }
  if (input.mouse.moved) {
    highlightPos = inputPos;
    input.mouse.moved = false;
  }

  while (world.time < Math.floor(time)) {
    let playerCommand: Command | null = null;
    let triedGoal = false;

    if (!client.player.action) {
      playerCommand = input.getCommand();
      if (playerCommand) {
        goalPos = null;
      } else if (goalPos) {
        triedGoal = true;
        if (client.memory[goalPos.y][goalPos.x]) {
          path = client.distanceMap.findPath(goalPos.x, goalPos.y);
          if (path && path.length > 1) {
            const dx = path[1].x - client.player.pos.x;
            const dy = path[1].y - client.player.pos.y;
            playerCommand = {
              type: CommandType.MOVE,
              dx,
              dy,
            };
          }
        }
      } else {
        const items = world.findItems(client.player.pos.x, client.player.pos.y);
        if (items.length > 0) {
          playerCommand = {
            type: CommandType.PICK_UP,
            itemId: items[items.length - 1].id,
          };
        }
      }
    }

    if (client.turn(playerCommand)) {
      dirty = true;
    }

    if (triedGoal && !client.player.action) {
      goalPos = null;
    }
  }

  if (!posEqual(goalPos, view.goalPos) ||
    !posEqual(highlightPos, view.highlightPos)) {
    view.goalPos = goalPos;
    view.highlightPos = highlightPos;
    dirty = true;
  }
  view.path = goalPos && path;

  view.redraw(dirty, time);
}
