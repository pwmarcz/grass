.PHONY: all
all: files dist

.PHONY: files
files: tiles/tileset.png game/tileset.auto.png game/map.auto.js

.PHONY: check
check:
	./node_modules/.bin/eslint game/*.ts
	./node_modules/.bin/tsc --noEmit game/*.ts

.PHONY: dist
dist: files
	rm -rf dist
	yarn build

.PHONY: deploy
deploy: dist
	rsync -rva dist/* pwmarcz.pl:homepage/grass/

tiles/tileset.png: tiles/tileset.svg
	inkscape $< --export-png=$@

game/tileset.auto.png: tiles/tileset.png
	cp $< $@

game/map.auto.js: tiles/map.tmx
	tiled --export-map js $< $@
