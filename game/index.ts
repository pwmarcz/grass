import './lib/normalize.css';

import { loadMap } from './map-loader';
import { View } from './view';
import { Input } from './input';
import { World } from './world';
import { Command, CommandType } from './types';

const { map, mobiles } = loadMap();

let world = new World(map, mobiles);
let view = new View(world);
let input = new Input();

view.setup(document.getElementById('app'), (): void => {
  view.app.ticker.add(gameLoop);
  input.setup();
});

let time = 0;

function gameLoop(delta): void {
  time += delta;

  while (world.time < Math.floor(time)) {
    const commands: Record<string, Command> = {};
    if (!world.mobileMap.player.action) {
      commands.player = input.getCommand();
    }
    if (!world.mobileMap.goblin.action) {
      commands.goblin = getAiCommand('goblin');
    }
    world.turn(commands);
  }

  view.redraw(time);
}


function getAiCommand(m: string): Command {
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
