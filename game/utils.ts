export function makeEmptyGrid<T>(
  w: number, h: number, val: T
): T[][] {
  const result = new Array(h);
  for (let y = 0; y < h; y++) {
    result[y] = new Array(w);
    for (let x = 0; x < w; x++) {
      result[y][x] = val;
    }
  }
  return result;
}

export function makeGrid<T>(
  w: number, h: number,
  func: (x: number, y: number) => T
): T[][] {
  const result = new Array(h);
  for (let y = 0; y < h; y++) {
    result[y] = new Array(w);
    for (let x = 0; x < w; x++) {
      result[y][x] = func(x, y);
    }
  }
  return result;
}