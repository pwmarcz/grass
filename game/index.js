
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

let frameNum = 0;
const FRAMES_PER_TURN = 7;

let keys = {};
let commands = {}, prevCommands = {};
const CAPTURED_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];

function keyDown(event) {
  if (CAPTURED_KEYS.indexOf(event.key) !== -1) {
    event.preventDefault();

    if (!keys[event.key]) {
      keys[event.key] = true;
      commands[event.key] = true;
    }
  }
}

function keyUp(event) {
  if (CAPTURED_KEYS.indexOf(event.key) !== -1) {
    event.preventDefault();

    if (keys[event.key]) {
      keys[event.key] = false;
      if (prevCommands[event.key]) {
        commands[event.key] = false;
      }
    }
  }
}

function gameLoop(delta) {
  frameNum += delta;

  const distance = (frameNum % FRAMES_PER_TURN) / FRAMES_PER_TURN;
  for (const m in mobiles) {
    redrawMobile(mobiles[m], distance);
  }

  while (frameNum > FRAMES_PER_TURN) {
    frameNum -= FRAMES_PER_TURN;
    turn();
  }
}

function turn() {
  const mob = mobiles.player;

  redrawMobile(mob, 1);
  mob.oldX = mob.x;
  mob.oldY = mob.y;

  prevCommands = Object.assign({}, commands);

  if (commands.ArrowUp) {
    moveMobile(mob, mob.x, mob.y - 1);
  } else if (commands.ArrowDown) {
    moveMobile(mob, mob.x, mob.y + 1);
  } else if (commands.ArrowLeft) {
    moveMobile(mob, mob.x - 1, mob.y);
  } else if (commands.ArrowRight) {
    moveMobile(mob, mob.x + 1, mob.y);
  }

  commands = Object.assign({}, keys);
}

function moveMobile(mob, x, y) {
  if (x < 0 || x >= mapW || y < 0 || y >= mapH) {
    return;
  }

  const newTile = map[y][x];

  if (newTile == 'DOOR_CLOSED') {
    map[y][x] = 'DOOR_OPEN';
    mapSprites[y][x].texture = tileTextures['DOOR_OPEN'];
    return;
  }

  if (tiles[newTile].pass === false) {
    return;
  }

  mob.x = x;
  mob.y = y;
}

function redrawMobile(mob, distance) {
  if (mob.x == mob.oldX && mob.y == mob.oldY) {
    mob.sprite.x = mob.x * TILE_SIZE;
    mob.sprite.y = mob.y * TILE_SIZE;
    mapSprites[mob.y][mob.x].alpha = 0;
  } else {
    mob.sprite.x = ((1 - distance) * mob.oldX + distance * mob.x) * TILE_SIZE;
    mob.sprite.y = ((1 - distance) * mob.oldY + distance * mob.y) * TILE_SIZE;
    mapSprites[mob.oldY][mob.oldX].alpha = distance;
    mapSprites[mob.y][mob.x].alpha = 1 - distance;
  }
}