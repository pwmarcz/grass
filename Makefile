all: tiles/tileset.png game/tileset.auto.png game/map.auto.js

tiles/tileset.png: tiles/tileset.svg
	inkscape $< --export-png=$@

game/tileset.auto.png: tiles/tileset.png
	cp $< $@

game/map.auto.js: tiles/map.tmx
	tiled --export-map js $< $@