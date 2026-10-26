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
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
}
