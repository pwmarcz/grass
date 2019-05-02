import './lib/normalize.css';
import './style.css';

// @ts-ignore
import mapFile1 from './maps/map1.xml';
// @ts-ignore
import mapFile2 from './maps/map2.xml';

import { loadMap } from './map-loader';
import { View } from './ui/view';
import { RawInput } from './ui/raw-input';
import { World } from './world';
import { loadTextures } from './ui/textures';
import { Client } from './client';
import { DEBUG } from './debug';
import { Input } from './ui/input';

// Hack around Parcel's inability to recognize links without index.html.

for (const link of Array.from(document.querySelectorAll("a[href*='index.html']"))) {
  link.setAttribute('href', link.getAttribute('href')!.replace('index.html', ''));
}

let mapFile = mapFile1;

if (DEBUG.mapName === '2') {
  mapFile = mapFile2;
}

if (DEBUG.fullScreen) {
  document.getElementById('game')!.classList.add('fullscreen');
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
  const rawInput = new RawInput(appElement, view.app.stage);
  const input = new Input(world, client, rawInput, view.toPos.bind(view));

  view.setup();
  view.app.ticker.add(delta => gameLoop(world, client, input, view, delta));
  rawInput.setup();
});

let time = 0;

function gameLoop(world: World, client: Client, input: Input, view: View, delta: number): void {
  let dirty = input.update();
  const lastTime = time;
  time += delta * DEBUG.speed;

  while (world.time < Math.floor(time)) {
    const playerCommand = client.player.action ? null : input.getPlayerCommand();

    if (DEBUG.pause && !client.player.action && !playerCommand) {
      time = lastTime;
      break;
    }

    if (client.turn(playerCommand)) {
      dirty = true;
    }
  }

  view.redraw(dirty, time, input.state);
}
