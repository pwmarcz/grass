.PHONY: all
all: files dist

.PHONY: files
files: tiles/tileset.png game/tileset.auto.png game/map.auto.js

.PHONY: dist
dist: files
	rm -rf dist
	yarn build

tiles/tileset.png: tiles/tileset.svg
	inkscape $< --export-png=$@

game/tileset.auto.png: tiles/tileset.png
	cp $< $@

game/map.auto.js: tiles/map.tmx
	tiled --export-map js $< $@