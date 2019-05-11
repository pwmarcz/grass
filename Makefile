.PHONY: all
all: files

TS_FILES = $(shell find game/ -name '*.ts' -or -name '*.tsx')

ICONS = game/icon-16.auto.png game/icon-32.auto.png game/icon-96.auto.png

TILESETS = game/tileset.auto.svg game/tileset-white.auto.svg game/tileset-gray.auto.svg

.PHONY: files
files: $(ICONS) $(TILESETS)

.PHONY: check
check:
	./node_modules/.bin/eslint $(TS_FILES)
	./node_modules/.bin/tsc --project tsconfig.json --noEmit

.PHONY: dist
dist: files
	rm -rf dist
	./node_modules/.bin/parcel build game/index.html --public-url /grass/ --cache-dir .cache/dist/

.PHONY: deploy
deploy: check dist
	rsync -rva --checksum --delete dist/ pwmarcz.pl:grass/

.PHONY: serve
serve: files
	./node_modules/.bin/parcel game/index.html

game/icon-%.auto.png: game/icon.svg
	inkscape $< --export-png=$@ --export-width=$*

game/tileset.auto.svg: game/tileset.svg
	inkscape $< --export-plain-svg=$@ --export-text-to-path
	./node_modules/.bin/svgo --multipass $@

game/tileset-white.auto.svg: game/tileset.auto.svg
	node convert.js white < $< > $@

game/tileset-gray.auto.svg: game/tileset.auto.svg
	node convert.js gray < $< > $@
