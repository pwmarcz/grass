import { describe, test } from 'mocha';
import assert from 'assert';
import { DistanceMap } from './path';

describe('DistanceMap', () => {
  test('findPath failed', () => {
    const dm = makeDistanceMap([
      "..#..",
      "..#..",
      "..#..",
    ]);
    dm.update(0, 2);
    const path = dm.findPath(3, 0);
    assert.strictEqual(path, null);
  });

  test('findPath successful', () => {
    const dm = makeDistanceMap([
      "....",
      "###.",
      "..#.",
      "..#.",
      "....",
    ]);
    dm.update(0, 4);
    const path = dm.findPath(3, 0);
    assert.deepStrictEqual(path, [
      { x: 0, y: 4 },
      { x: 1, y: 4 },
      { x: 2, y: 4 },
      { x: 3, y: 3 },
      { x: 3, y: 2 },
      { x: 3, y: 1 },
      { x: 3, y: 0 },
    ]);
  });

  test('findPath to wall', () => {
    const dm = makeDistanceMap([
      "..#..",
      "..#..",
      "..#..",
    ]);
    dm.update(0, 2);
    const path = dm.findPath(2, 0);
    assert.deepStrictEqual(path, [
      { x: 0, y: 2 },
      { x: 1, y: 1 },
      { x: 2, y: 0 },
    ]);
  });
});

function makeDistanceMap(data: string[]): DistanceMap {
  const w = data[0].length;
  const h = data.length;
  const mapFunc = (x: number, y: number): boolean => data[y].charAt(x) === '.';

  return new DistanceMap(mapFunc, w, h);
}