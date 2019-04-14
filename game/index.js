
const { map, mobiles } = loadMap();
const mapW = map.length;
const mapH = map[0].length;

let mapSprites = [];

let app = new PIXI.Application({
  width: mapW * TILE_SIZE,
  height: mapH * TILE_SIZE,
});
document.body.appendChild(app.view);

let keys = {};

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
    moveMobile(mobiles[m], mobiles[m].x, mobiles[m].y);
  }
  app.renderer.render(app.stage);
  app.ticker.add(gameLoop);

  keys.up = keyboard('ArrowUp');
  keys.down = keyboard('ArrowDown');
  keys.left = keyboard('ArrowLeft');
  keys.right = keyboard('ArrowRight');
}

let frameNum = 0;
const FRAMES_PER_TURN = 15;

function gameLoop(delta) {
  frameNum += delta;
  while (frameNum > FRAMES_PER_TURN) {
    frameNum -= FRAMES_PER_TURN;
    turn();
  }
}

function turn() {
  const mob = mobiles.player;
  if (keys.up.isDown) {
    moveMobile(mob, mob.x, mob.y - 1);
  } else if (keys.down.isDown) {
    moveMobile(mob, mob.x, mob.y + 1);
  } else if (keys.left.isDown) {
    moveMobile(mob, mob.x - 1, mob.y);
  } else if (keys.right.isDown) {
    moveMobile(mob, mob.x + 1, mob.y);
  }
}

function moveMobile(mob, x, y) {
  const newTile = map[y][x];
  if (['FLOOR', 'GRASS', 'GRASS_TALL', 'DOOR_OPEN'].indexOf(newTile) === -1) {
    return;
  }

  mapSprites[mob.y][mob.x].alpha = 1;
  mob.x = x;
  mob.y = y;
  mob.sprite.x = mob.x * TILE_SIZE;
  mob.sprite.y = mob.y * TILE_SIZE;
  mapSprites[mob.y][mob.x].alpha = 0;
}