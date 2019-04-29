export interface DebugOptions {
  mapName: string;
  speed: number;
  fullScreen: boolean;
  showDistance: boolean;
  showLos: boolean;
}

const params = new URL(window.location.href).searchParams;

export const DEBUG: DebugOptions = {
  mapName: params.get('map') || '1',
  speed: parseFloat(params.get('speed') || '1'),
  fullScreen: params.get('full') !== null,
  showDistance: params.get('distance') !== null,
  showLos: params.get('los') !== null,
};
