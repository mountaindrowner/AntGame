// Tunables for the app layer. Simulation constants live in sim/sim.js.

export const SAVE_KEY = 'underfoot-v8';
// Earlier saves the sim can still read (same save format).
export const LEGACY_SAVE_KEYS = []; // v7 and earlier predate the 2× yard and can't load

export const RENDER = {
  pixelSize: 1.75, // CSS px per PS1 pixel (was 2.25; rounded so pixels land on whole device pixels)
  snapDivisor: 1, // vertex snap grid = framebuffer / this (1 = per pixel; 2 wobbled too much)
  colorLevels: 48, // levels per channel (31 was true 15-bit; 48 softens banding)
  dither: 0.5, // ordered-dither strength (1 = full PS1 grain)
  animFps: 10, // walk cycles step like a busy PS1 frame
};

export const CAMERA = {
  surfaceTilesAcross: 13, // default surface zoom (phone portrait)
  surfacePitch: 0.95, // radians from horizontal
  nestCellsAcross: 13,
  zoomMin: 0.45,
  zoomMax: 2.6,
};

// Palette shared by both views. Hex is sRGB.
// Creatures draw larger than their sim radius so castes read on a phone.
export const ANT_SCALE = { surface: 1.5, nest: 1.5, queen: 2.4, queenPerLevel: 0.3 };

export const COLORS = {
  ourAnt: '#2a1a14',
  builder: '#5a4430',
  nurse: '#7a6040',
  soldier: '#140c08',
  venom: '#5a2d6b',
  rivalAnt: '#a8463a',
  rivalSoldier: '#7a1f15',
  player: '#ffd34d',
  queen: '#5e2c1e',
  food: '#f2c440',
  seed: '#c9a24a',
  water: '#6cb8ea',
  grit: '#9a948c',
  protein: '#c0483a',
  trail: '#8ce66e',
  alarm: '#e6463a',
};
