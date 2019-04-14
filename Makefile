all: tiles/tileset.png game/tileset.png

tiles/tileset.png: tiles/tileset.svg
	inkscape $< --export-png=$@

game/tileset.png: tiles/tileset.png
	cp $< $@