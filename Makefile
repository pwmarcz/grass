.PHONY: all
all: files

.PHONY: files
files: game/tileset.auto.png game/icon.auto.png game/map.auto.xml

.PHONY: check
check:
	./node_modules/.bin/eslint game/*.ts
	./node_modules/.bin/tsc --noEmit game/*.ts

.PHONY: dist
dist: files
	rm -rf dist
	./node_modules/.bin/parcel build game/index.html --public-url /grass/ --cache-dir .cache/dist/

.PHONY: deploy
deploy: check dist
	rsync -rva --checksum dist/* pwmarcz.pl:homepage/grass/

.PHONY: serve
serve: files
	./node_modules/.bin/parcel game/index.html

game/%.auto.png: tiles/%.svg
	inkscape $< --export-png=$@

game/map.auto.xml: tiles/map.tmx
	cp $< $@
