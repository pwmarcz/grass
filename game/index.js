
const { map, mobiles } = loadMap();
const mapW = map.length;
const mapH = map[0].length;

let mapSprites = [];

let app = new PIXI.Application({
  width: mapW * TILE_SIZE, 
  height: mapH * TILE_SIZE,
});
document.body.appendChild(app.view);

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
    sprite.x = mobiles[m].x * TILE_SIZE;
    sprite.y = mobiles[m].y * TILE_SIZE;
    app.stage.addChild(sprite);
    mapSprites[mobiles[m].y][mobiles[m].x].alpha = 0;
  }
  app.renderer.render(app.stage);
}
