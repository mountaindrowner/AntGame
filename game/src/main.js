// Underfoot: boot, shared app state, fixed-step simulation and the render loop.
import SIM from './sim/sim.js';
import { PS1Pipeline } from './render/ps1/pipeline.js';
import { useSnapUniforms } from './render/ps1/materials.js';
import { SurfaceView } from './render/views/surfaceView.js';
import { NestView } from './render/views/nestView.js';
import { createUI } from './ui/ui.js';
import { LabelLayer } from './ui/labels.js';
import { attachPointer } from './input/pointer.js';
import { loadGame, saveGame, clearSave, NEW_GAME_SEED } from './game/save.js';
import './ui/ui.css';

const { NW, NH } = SIM;
const STEP = 0.05; // the sim's fixed tick (20 Hz)

const canvas = document.getElementById('c');
const pipeline = new PS1Pipeline(canvas);
useSnapUniforms(pipeline.uniforms);

const s0 = loadGame();
// Everything the UI, input and views share.
const app = {
  s: s0,
  view: s0.phase === 'dig' || s0.player.inNest ? 'nest' : 'surface',
  placing: null,
  menu: null,
  menuCell: null,
  paused: false,
  zoomMul: 1,
  panY: 0,
  fps: 0,
  confirmAction: null,
  insets: { top: 0, bottom: 0, h: 1 },
  reset() {
    clearSave();
    this.s = SIM.create(NEW_GAME_SEED);
    this.placing = null;
    this.view = 'nest';
    this.panY = 0;
    ui.closeMenu();
  },
  // Cells where a w×h room fits (green highlight), and whether any do.
  placeCells(w, h) {
    const set = new Set(), s = this.s;
    for (let y = 1; y < NH; y++) for (let x = 1; x < NW - 1; x++) {
      if (s.nest.cells[y * NW + x] !== 1) continue;
      if (SIM.findRoomRect(s, x, y, w, h)) set.add(y * NW + x);
    }
    return set;
  },
  anyFit(w, h) { return this.placeCells(w, h).size > 0; },
};

const views = { surface: new SurfaceView(), nest: new NestView() };
const ui = createUI(app);
attachPointer(canvas, app, ui, views);
const labels = new LabelLayer(document.getElementById('labels'));

let cssW = 0, cssH = 0;
// How much of the screen the HUD covers, so cameras can centre in the rest.
const hudTop = document.getElementById('top');
const bars = [document.getElementById('bar'), document.getElementById('barn')];
function measureHud() {
  const top = hudTop.getBoundingClientRect().bottom;
  const bar = bars.find((b) => !b.classList.contains('hidden'));
  const bottom = bar ? cssH - bar.getBoundingClientRect().top : 0;
  app.insets = { top: Math.min(top, cssH * 0.4), bottom: Math.min(bottom, cssH * 0.3), h: cssH };
}
function resize() {
  cssW = window.innerWidth;
  cssH = window.innerHeight;
  pipeline.resize(cssW, cssH);
}
window.addEventListener('resize', resize);
resize();

let last = performance.now(), acc = 0, hudT = 0, saveT = 0, frames = 0, fpsT = 0, clock = 0;
let wasInNest = app.s.player.inNest;

function frame(now) {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.25) dt = 0.25;
  const s = app.s;
  if (!app.paused) {
    acc += dt;
    while (acc >= STEP) { SIM.tick(s, STEP); acc -= STEP; }
    clock += dt;
  } else acc = 0;
  if (s.player.inNest !== wasInNest) {
    wasInNest = s.player.inNest;
    app.view = wasInNest ? 'nest' : 'surface';
    app.panY = 0;
  }

  const view = app.view === 'nest' ? views.nest : views.surface;
  view.update(app, clock, pipeline.aspect);
  pipeline.render(view.scene, view.camera);
  if (app.view === 'nest') {
    labels.set(views.nest.labels.map((l) => {
      const p = views.nest.project(l.x, l.y, l.z, cssW, cssH);
      return { text: l.text, x: l.kind === 'band' ? Math.max(8, p.x) : p.x, y: p.y, kind: l.kind };
    }));
  } else labels.set([]);

  frames++;
  fpsT += dt;
  if (fpsT >= 1) { app.fps = frames; frames = 0; fpsT = 0; }
  hudT += dt;
  if (hudT > 0.2) { hudT = 0; ui.checkExplainers(); ui.update(); measureHud(); }
  saveT += dt;
  if (saveT > 10) { saveT = 0; saveGame(app.s); }
  requestAnimationFrame(frame);
}

window.addEventListener('pagehide', () => saveGame(app.s));
ui.update();
measureHud();
requestAnimationFrame(frame);

// For automated tests and debugging in the console.
window.UNDERFOOT = { app, SIM, views, pipeline };
