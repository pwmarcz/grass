.PHONY: all
all: files

TS_FILES=$(shell find game/ -name '*.ts' -or -name '*.tsx')

.PHONY: files
files: game/tileset.auto.png game/icon.auto.png $(MAPS)

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
	rsync -rva --checksum --delete dist/ pwmarcz.pl:homepage/grass/

.PHONY: serve
serve: files
	./node_modules/.bin/parcel game/index.html

game/%.auto.png: game/%.svg
	inkscape $< --export-png=$@