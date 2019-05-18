// @ts-ignore
import mapXml from './maps/*.xml';
// @ts-ignore
import tilesetSvg from './tileset*.auto.svg';

export const mapFiles = [
  mapXml.map1, mapXml.map2
];

export const tilesetImages = {
  normal: tilesetSvg[undefined],
  white: tilesetSvg['-white'],
  gray: tilesetSvg['-gray'],
};
