
const map = [
  ['WALL', 'WALL', 'WALL', 'WALL', 'WALL'],
  ['WALL', 'FLOOR', 'FLOOR', 'FLOOR', 'WALL'],
  ['WALL', 'FLOOR', 'FLOOR', 'FLOOR', 'WALL'],
  ['WALL', 'FLOOR', 'FLOOR', 'FLOOR', 'WALL'],
  ['WALL', 'WALL', 'WALL', 'WALL', 'WALL'],
];
const mapW = map.length;
const mapH = map[0].length;

let mapSprites = [];

let mobiles = {
  player: {
    x: 2, y: 2,
    tile: 'HUMAN',
    sprite: null,
  }
};

let app = new PIXI.Application({
  width: 320, 
  height: 320,
});
document.body.appendChild(app.view);

PIXI.loader
.add('tileset.png')
.load(setup);

function setup() {
  prepareTextures();
  for (let y = 0; y < mapW; y++) {
    mapSprites[y] = [];
    for (let x = 0; x < mapH; x++) {
      const tile = map[y][x];
      const sprite = new PIXI.Sprite(tileTextures[tile]);
      sprite.x = x * 32;
      sprite.y = y * 32;
      app.stage.addChild(sprite);
      mapSprites[y][x] = sprite;
    }
  }
  for (const m in mobiles) {    
    const sprite = new PIXI.Sprite(tileTextures[mobiles[m].tile]);
    sprite.x = mobiles[m].x * 32;
    sprite.y = mobiles[m].y * 32;
    app.stage.addChild(sprite);
    mapSprites[mobiles[m].y][mobiles[m].x].alpha = 0;
  }
  app.renderer.render(app.stage);
}
