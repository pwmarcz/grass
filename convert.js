// eslint-disable-next-line
const fs = require('fs');

const mode = process.argv[2];

function toRGB(r, g, b) {
  return toByte(r) + toByte(g) + toByte(b);
}

function toByte(num) {
  if (num === 0) {
    return "00";
  } else if (num < 0x10) {
    return "0" + num.toString(16);
  } else {
    return num.toString(16);
  }
}

const data = fs.readFileSync(0).toString();
const replaced = data.replace(/"#([0-9a-f]+)"/g, function(match, color) {
  let r, g, b;
  if (color.length === 6) {
    r = parseInt(color.slice(0, 2), 16);
    g = parseInt(color.slice(2, 4), 16);
    b = parseInt(color.slice(4, 6), 16);
  } else {
    r = parseInt(color.slice(0, 1), 16) * 0x11;
    g = parseInt(color.slice(1, 2), 16) * 0x11;
    b = parseInt(color.slice(2, 3), 16) * 0x11;
  }

  let newColor;

  switch (mode) {
    case 'white': {
      newColor = 'ffffff';
      break;
    }
    case 'gray': {
      const gray = Math.round((r + g + b) / 3);
      newColor = toRGB(gray, gray, gray);
      break;
    }
    default:
      newColor = 'ff00ff';
      break;
  }

  return '"#' + newColor + '"';
});
process.stdout.write(replaced);
