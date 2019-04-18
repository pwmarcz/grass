import './lib/normalize.css';

import { loadMap } from './map-loader.js';
import { View } from './view.js';
import { Input } from './input.js';
import { World } from './world.js';

const { map, mobiles } = loadMap();

let world = new World(map, mobiles);
let view = new View(world);
let input = new Input();

view.setup(document.getElementById('app'), () => {
  view.app.ticker.add(gameLoop);
  input.setup();
});

let time = 0;

function gameLoop(delta) {
  time += delta;

  while (world.time < Math.floor(time)) {
    const commands = {};
    if (!world.mobiles.player.action) {
      commands.player = input.getCommand();
    }
    if (!world.mobiles.goblin.action) {
      commands.goblin = getAiCommand('goblin');
    }
    world.turn(commands);
  }

  view.redraw(time);
}


function getAiCommand(m) {
  if (Math.random() < 0.8) {
    return { type: 'REST', dt: Math.random() * 10 };
  }

  const dx = Math.floor(Math.random() * 3) - 1;
  const dy = Math.floor(Math.random() * 3) - 1;
  if (dx !== 0 || dy !== 0) {
    return { type: 'MOVE', dx, dy };
  }
  return null;
}
