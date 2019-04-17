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
    world.turn(input.getCommand());
  }

  view.redraw(time);
}
