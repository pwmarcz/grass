declare module 'tumult' {
  export abstract class Noise {
    constructor (s: string);
    seed(s: string): void;
  }

  export class Perlin2 extends Noise {
    gen(x: number, y: number): number;
  }
}
