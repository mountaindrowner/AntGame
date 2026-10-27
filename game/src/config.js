// Tunables for the app layer. Simulation constants live in sim/sim.js.

export const SAVE_KEY = 'underfoot-v10';
// Earlier saves the sim can still read (same save format).
export const LEGACY_SAVE_KEYS = []; // v9 and earlier predate the deeper topsoil (a 48-row nest) and can't load

export const RENDER = {
  pixelSize: 1, // CSS px per rendered pixel (was 1.75, then 2.25; whole device pixels)
  maxPixels: 2.4e6, // above this many pixels (a big desktop window) pixels grow instead
  msaa: 4, // multisampled edges in the framebuffer (0 to turn off)
  snapDivisor: 1, // vertex snap grid = framebuffer / this (1 = per pixel; 2 wobbled too much)
  colorLevels: 96, // levels per channel (31 was true 15-bit; 48, then 96, to smooth banding)
  dither: 0.2, // ordered-dither strength (1 = full PS1 grain; was 0.5)
  animFps: 14, // walk-cycle frames per second (was 10)
};

export const CAMERA = {
  surfaceTilesAcross: 13, // default surface zoom (phone portrait)
  // The views are framed for a phone held upright. A wider screen (a PC, a
  // tablet on its side) shows more to the sides at the same size, instead
  // of zooming in: see fitWide.
  phoneAspect: 390 / 844,
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

// How much wider than a phone the screen is (1 on a phone in portrait).
export const fitWide = (aspect) => Math.max(1, aspect / CAMERA.phoneAspect);
// HUD scale for big screens: 1 on a phone, up to 1.3 on a desktop.
export const uiScale = (cssW, cssH) => Math.max(1, Math.min(1.3, cssH / 820, cssW / 420));
