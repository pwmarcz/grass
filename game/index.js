
const map = [
  ['WALL', 'WALL', 'WALL', 'WALL', 'WALL'],
  ['WALL', 'FLOOR', 'FLOOR', 'FLOOR', 'WALL'],
  ['WALL', 'FLOOR', 'FLOOR', 'FLOOR', 'WALL'],
  ['WALL', 'FLOOR', 'FLOOR', 'FLOOR', 'WALL'],
  ['WALL', 'WALL', 'WALL', 'WALL', 'WALL'],
];
const mapW = map.length;
const mapH = map[0].length;

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
    for (let x = 0; x < mapH; x++) {
      const tile = map[y][x];
      const sprite = new PIXI.Sprite(tileTextures[tile]);
      sprite.x = x * 32;
      sprite.y = y * 32;
      app.stage.addChild(sprite);
    }
  }
  app.renderer.render(app.stage);
}
