// Saves live in localStorage. The sim owns the format (serialize/deserialize);
// a save that no longer loads is kept aside (SAVE_KEY-bad) and the backup tried (build 40).
import SIM from '../sim/sim.js';
import { SAVE_KEY, LEGACY_SAVE_KEYS } from '../config.js';

export const NEW_GAME_SEED = 7;

// Build 40: a save that fails to load is never lost. Its text is kept under SAVE_KEY-bad (and the
// last good save under SAVE_KEY-prev), and the game says so, instead of quietly starting over on top of it.
export let loadProblem = null;
export function loadGame() {
  for (const key of [SAVE_KEY, ...LEGACY_SAVE_KEYS]) {
    let json = null;
    try { json = localStorage.getItem(key); } catch (e) { /* storage blocked */ }
    if (!json) continue;
    try { return SIM.deserialize(json); } catch (e) {
      try { localStorage.setItem(SAVE_KEY + '-bad', json); } catch (e2) { /* full */ }
      // The backup before it may still load.
      try { const prev = localStorage.getItem(SAVE_KEY + '-prev'); if (prev) { const s = SIM.deserialize(prev); loadProblem = { key, error: String(e && e.message || e), recovered: true }; return s; } } catch (e3) { /* that one too */ }
      loadProblem = { key, error: String(e && e.message || e), recovered: false };
    }
  }
  return SIM.create(NEW_GAME_SEED);
}

let prevAt = 0;
// Returns true when the save was written.
export function saveGame(s) {
  try {
    // Once a minute, the save before this one is kept as a backup.
    const now = Date.now();
    if (now - prevAt > 60000) { const old = localStorage.getItem(SAVE_KEY); if (old) localStorage.setItem(SAVE_KEY + '-prev', old); prevAt = now; }
    localStorage.setItem(SAVE_KEY, SIM.serialize(s)); return true;
  } catch (e) { return false; /* storage full or blocked */ }
}

export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(SAVE_KEY + '-prev'); localStorage.removeItem(MAP_KEY); } catch (e) { /* ignore */ }
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
