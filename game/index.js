import { loadMap } from './map-loader.js';
import { tiles, TILE_SIZE, tileTextures, prepareTextures } from './tiles.js';

const { map, mobiles } = loadMap();
const mapW = map.length;
const mapH = map[0].length;

let mapSprites = [];

let app = new PIXI.Application({
  width: mapW * TILE_SIZE,
  height: mapH * TILE_SIZE,
});
document.getElementById('app').appendChild(app.view);

PIXI.loader
.add('tileset.auto.png')
.load(setup);

function setup() {
  prepareTextures();
  for (let y = 0; y < mapW; y++) {
    mapSprites[y] = [];
    for (let x = 0; x < mapH; x++) {
      const tile = map[y][x];
      const sprite = new PIXI.Sprite(tileTextures[tile]);
      sprite.x = x * TILE_SIZE;
      sprite.y = y * TILE_SIZE;
      app.stage.addChild(sprite);
      mapSprites[y][x] = sprite;
    }
  }
  for (const m in mobiles) {
    const sprite = new PIXI.Sprite(tileTextures[mobiles[m].tile]);
    mobiles[m].sprite = sprite;
    app.stage.addChild(sprite);
    redrawMobile(mobiles[m], 0);
  }
  app.renderer.render(app.stage);
  app.ticker.add(gameLoop);

  window.addEventListener('keydown', keyDown, false);
  window.addEventListener('keyup', keyUp, false);
}

let time = 0, timeLogic = 0;

const MOVEMENT_TIME = 10;

let keys = {};
const CAPTURED_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];

function keyDown(event) {
  if (CAPTURED_KEYS.indexOf(event.key) !== -1) {
    event.preventDefault();
    keys[event.key] = true;
  }
}

function keyUp(event) {
  if (CAPTURED_KEYS.indexOf(event.key) !== -1) {
    event.preventDefault();
    keys[event.key] = false;
  }
}

function gameLoop(delta) {
  time += delta;

  while (timeLogic < Math.floor(time)) {
    timeLogic++;
    turn(timeLogic);
  }

  for (const m in mobiles) {
    redrawMobile(mobiles[m], time);
  }
}

function turn() {
  const mob = mobiles.player;

  if (mob.action) {
    if (timeLogic < mob.action.timeEnd) {
      return;
    }

    if (mob.action.type == 'MOVE') {
      redrawMobile(mob, timeLogic);
      mob.x = mob.action.x;
      mob.y = mob.action.y;
    }
    mob.action = null;
  }
  if (keys.ArrowUp) {
    moveMobile(mob, mob.x, mob.y - 1);
  } else if (keys.ArrowDown) {
    moveMobile(mob, mob.x, mob.y + 1);
  } else if (keys.ArrowLeft) {
    moveMobile(mob, mob.x - 1, mob.y);
  } else if (keys.ArrowRight) {
    moveMobile(mob, mob.x + 1, mob.y);
  }
}

function moveMobile(mob, x, y) {
  if (x < 0 || x >= mapW || y < 0 || y >= mapH) {
    return;
  }

  const newTile = map[y][x];

  if (newTile == 'DOOR_CLOSED') {
    map[y][x] = 'DOOR_OPEN';
    mapSprites[y][x].texture = tileTextures['DOOR_OPEN'];
    mob.action = {
      type: 'OPEN_DOOR',
      timeStart: timeLogic,
      timeEnd: timeLogic + 5,
    };
    return;
  }

  if (tiles[newTile].pass === false) {
    return;
  }

  mob.action = {
    type: 'MOVE',
    x,
    y,
    timeStart: timeLogic,
    timeEnd: timeLogic + MOVEMENT_TIME,
  };
}

function redrawMobile(mob, time) {
  if (mob.action && mob.action.type == 'MOVE') {
    const distance = (time - mob.action.timeStart) / (mob.action.timeEnd - mob.action.timeStart);

    mob.sprite.x = ((1 - distance) * mob.x + distance * mob.action.x) * TILE_SIZE;
    mob.sprite.y = ((1 - distance) * mob.y + distance * mob.action.y) * TILE_SIZE;
    mapSprites[mob.y][mob.x].alpha = distance;
    mapSprites[mob.action.y][mob.action.x].alpha = 1 - distance;
  } else {
    mob.sprite.x = mob.x * TILE_SIZE;
    mob.sprite.y = mob.y * TILE_SIZE;
    mapSprites[mob.y][mob.x].alpha = 0;
  }
}
