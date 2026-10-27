// Saves live in localStorage. The sim owns the format (serialize/deserialize);
// a save that no longer loads falls back to a fresh colony.
import SIM from '../sim/sim.js';
import { SAVE_KEY, LEGACY_SAVE_KEYS } from '../config.js';

export const NEW_GAME_SEED = 7;

export function loadGame() {
  for (const key of [SAVE_KEY, ...LEGACY_SAVE_KEYS]) {
    try {
      const json = localStorage.getItem(key);
      if (json) return SIM.deserialize(json);
    } catch (e) { /* unreadable or old: try the next one */ }
  }
  return SIM.create(NEW_GAME_SEED);
}

export function saveGame(s) {
  try { localStorage.setItem(SAVE_KEY, SIM.serialize(s)); } catch (e) { /* storage full or blocked */ }
}

export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(MAP_KEY); } catch (e) { /* ignore */ }
}

// The yard map's photo, kept beside the save so explored regions still show
// after a reload: a JPEG of the map canvas and which regions it holds.
const MAP_KEY = SAVE_KEY + '-map';
export function saveMap(canvas, done) {
  try { localStorage.setItem(MAP_KEY, JSON.stringify({ img: canvas.toDataURL('image/jpeg', 0.72), done: [...done] })); } catch (e) { /* storage full or blocked */ }
}
export function loadMap() {
  try { const m = JSON.parse(localStorage.getItem(MAP_KEY)); return m && m.img ? m : null; } catch (e) { return null; }
}
