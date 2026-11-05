// Saves live in localStorage. The sim owns the format (serialize/deserialize);
// a save that no longer loads is kept aside (SAVE_KEY-bad) and the backup tried (build 40).
import SIM from '../sim/sim.js';
import { SAVE_KEY, LEGACY_SAVE_KEYS } from '../config.js';

export const NEW_GAME_SEED = 7;

// Build 40: a save that fails to load is never lost. Its text is kept under SAVE_KEY-bad (and the
// last good save under SAVE_KEY-prev), and the game says so, instead of quietly starting over on top of it.
export let loadProblem = null;
export function loadGame() {
  pruneOldSaves();
  // Build 41: a save this build couldn't read once (a newer build's, say) waits under -bad. Once a build can
  // read it, it comes back, unless the save it was replaced by has played on further.
  let bad = null;
  try { const j = localStorage.getItem(SAVE_KEY + '-bad'); if (j) bad = SIM.deserialize(j); } catch (e) { bad = null; }
  if (bad) {
    let cur = null; try { const j = localStorage.getItem(SAVE_KEY); if (j) cur = SIM.deserialize(j); } catch (e) { cur = null; }
    if (!cur || (bad.t || 0) > (cur.t || 0)) { try { localStorage.removeItem(SAVE_KEY + '-bad'); } catch (e) { /* blocked */ } return bad; }
  }
  for (const key of [SAVE_KEY, ...LEGACY_SAVE_KEYS]) {
    let json = null;
    try { json = localStorage.getItem(key); } catch (e) { /* storage blocked */ }
    if (!json) continue;
    try { return SIM.deserialize(json); } catch (e) {
      try { if (!localStorage.getItem(SAVE_KEY + '-bad')) localStorage.setItem(SAVE_KEY + '-bad', json); } catch (e2) { /* full */ } // the first unreadable save is kept, not a later one
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

// Saves from builds before SAVE_KEY's version can never load again (LEGACY_SAVE_KEYS lists any that can):
// clear them and their backups and map photos, so they don't fill the browser's storage.
function pruneOldSaves() {
  const cur = +(SAVE_KEY.match(/-v(\d+)$/) || [])[1], keep = new Set(LEGACY_SAVE_KEYS);
  try {
    const old = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i), m = k && k.match(/^(underfoot-(?:poc-)?v(\d+))(?:-prev|-map|-bad)?$/);
      if (m && !keep.has(m[1]) && (k.startsWith('underfoot-poc-') || +m[2] < cur)) old.push(k);
    }
    for (const k of old) localStorage.removeItem(k);
  } catch (e) { /* storage blocked */ }
}

export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(SAVE_KEY + '-prev'); localStorage.removeItem(MAP_KEY); } catch (e) { /* ignore */ }
}

// The yard map's photos, kept beside the save so explored regions still show
// after a reload.
const MAP_KEY = SAVE_KEY + '-map';
// Build 65: one small JPEG per region ({ v: 2, regions: { index: data URL } }), each made once when the region
// is photographed. Encoding the whole 1600×1120 map at every autosave stalled the game.
export function saveMap(regions) {
  try { localStorage.setItem(MAP_KEY, JSON.stringify({ v: 2, regions })); } catch (e) { /* storage full or blocked */ }
}
export function loadMap() {
  try { const m = JSON.parse(localStorage.getItem(MAP_KEY)); return m && (m.regions || m.img) ? m : null; } catch (e) { return null; } // (older saves: { img, done })
}
