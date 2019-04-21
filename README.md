# Grass - a game demo

See it at https://pwmarcz.pl/grass.

## How to run

* Install Inkscape
* Run `make` to generate the image files
* Install Yarn and run `yarn` to install packages
* Run `make serve` to run dev server on `localhost:1234`

## Overview

I'm using the following components:

* [TypeScript](https://www.typescriptlang.org/) as language
* [Yarn](https://yarnpkg.com/en/) for JS packages
* [Parcel](https://parceljs.org/) for bundling the application
* [PixiJS](http://www.pixijs.com/) for game rendering
* [Preact](https://preactjs.com/) for the HTML parts
* [ESLint](https://eslint.org/) for linting

Content prepared using:

* [Inkscape](https://inkscape.org/) for editing tileset (`tiles/tileset.svg`)
* [Tiled](https://www.mapeditor.org/) for editing map (`tiles/map.tmx`)

The project should integrate nicely with Visual Studio Code, but be sure to install the ESLint plugin and enable it:

    "eslint.validate": [
      "javascript",
      "javascriptreact",
      "typescript",
      "typescriptreact"
    ],
