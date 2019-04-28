import { Pos } from "./types";
import { VNode, render } from "preact";

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

export function posEqual(a: Pos | null, b: Pos | null): boolean {
  if (a === b) {
    return true;
  }
  if (a === null || b === null) {
    return false;
  }
  return a.x === b.x && a.y === b.y;
}

export function renderWithRef<P>(
  node: VNode,
  element: Element,
  mergeWith?: Element | undefined
): Promise<P> {
  return new Promise((resolve, reject) => {
    node.attributes = node.attributes || {};
    node.attributes.ref = resolve;
    render(node, element, mergeWith);
  });
}

export function nextTo(a: Pos, b: Pos): boolean {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return Math.max(dx, dy) === 1;
}
