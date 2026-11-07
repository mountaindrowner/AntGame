// Build 76 (Mark: "it'd be good to have save files… so you can have different nests"): three colonies.
//
// The colony you're playing stays where it always was (localStorage: SAVE_KEY, its minute-old backup and its map
// photos), so the autosave doesn't change. The others wait in IndexedDB, which holds far more, so three colonies
// and their maps fit. Switching saves the one you're in, swaps the two over and reloads. A small index in
// localStorage keeps each slot's name and its card (day, ants, queen, time played, last played).
import SIM from '../sim/sim.js';
import { SAVE_KEY } from '../config.js';

export const SLOT_COUNT = 3;
const META_KEY = 'underfoot-slots', NEW_KEY = 'underfoot-newcolony';
const KEYS = { save: SAVE_KEY, prev: SAVE_KEY + '-prev', map: SAVE_KEY + '-map' };

const get = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const set = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); return true; } catch (e) { return false; } };

// The index. Slot 1 is whatever was saved before slots existed.
export function slotMeta() {
  let m = null; try { m = JSON.parse(get(META_KEY)); } catch (e) { m = null; }
  if (!m || !Array.isArray(m.list)) m = { active: 1, list: [] };
  for (let i = 1; i <= SLOT_COUNT; i++) if (!m.list.some((x) => x.id === i)) m.list.push({ id: i, name: 'Colony ' + i, empty: i !== m.active || !get(KEYS.save) });
  m.list.sort((a, b) => a.id - b.id);
  return m;
}
const writeMeta = (m) => set(META_KEY, JSON.stringify(m));
export const slotOf = (m, id) => m.list.find((x) => x.id === id);

// What a slot's card shows, from a colony.
export function summary(s) {
  const ants = s.ants.filter((a) => !a.team && !a.dh && a.state !== 'dead').length;
  return { day: (s.nights || 0) + 1, ants, queen: (s.queen.level || 0) + 1, t: Math.round(s.t), lost: !!s.lost };
}
// Called with each autosave: the playing colony's card stays current.
export function touchActive(s) {
  if (!s.queen.placed && s.t < 30) return; // nothing worth a card yet
  const m = slotMeta(), sl = slotOf(m, m.active); sl.empty = false; sl.sum = summary(s); sl.at = Date.now(); writeMeta(m);
}
export function renameSlot(id, name) { const m = slotMeta(), sl = slotOf(m, id); if (!sl) return; sl.name = String(name).trim().slice(0, 28) || 'Colony ' + id; writeMeta(m); }

// ---------- IndexedDB, for the colonies not being played ----------
let dbp = null;
function db() {
  if (!dbp) dbp = new Promise((res, rej) => { const r = indexedDB.open('underfoot-slots', 1); r.onupgradeneeded = () => r.result.createObjectStore('slots'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  return dbp;
}
async function idb(mode, fn) { const d = await db(); return new Promise((res, rej) => { const tx = d.transaction('slots', mode), q = fn(tx.objectStore('slots')); tx.oncomplete = () => res(q && q.result); tx.onerror = () => rej(tx.error); }); }
const idbGet = (id) => idb('readonly', (st) => st.get(id));
const idbPut = (id, v) => idb('readwrite', (st) => st.put(v, id));
const idbDel = (id) => idb('readwrite', (st) => st.delete(id));

// The playing colony's stored keys, and putting a colony's keys back.
const takeActive = () => ({ save: get(KEYS.save), prev: get(KEYS.prev), map: get(KEYS.map) });
const putActive = (o) => { for (const k in KEYS) set(KEYS[k], (o && o[k]) || null); };

// Play another slot: the one you're in is put away (already saved by the caller), the other brought in. An empty
// slot starts a new colony (without the intro film, which plays once per player).
export async function switchTo(id) {
  const m = slotMeta(); if (id === m.active) return false;
  const cur = slotOf(m, m.active), next = slotOf(m, id); if (!next) return false;
  if (!cur.empty) await idbPut(m.active, takeActive());
  const o = next.empty ? null : await idbGet(id);
  putActive(o); if (!o) { set(NEW_KEY, '1'); next.empty = false; next.at = Date.now(); next.sum = null; }
  m.active = id; writeMeta(m);
  return true;
}
// A new colony in a slot: the one there (if any) is gone for good.
export async function newColonyIn(id) {
  const m = slotMeta(), sl = slotOf(m, id); if (!sl) return false;
  if (id === m.active) putActive(null);
  else { const cur = slotOf(m, m.active); if (!cur.empty) await idbPut(m.active, takeActive()); await idbDel(id); putActive(null); }
  set(NEW_KEY, '1'); Object.assign(sl, { name: 'Colony ' + id, empty: false, sum: null, at: Date.now() }); m.active = id; writeMeta(m);
  return true;
}
export async function deleteSlot(id) {
  const m = slotMeta(), sl = slotOf(m, id); if (!sl || id === m.active) return false; // the one you're playing: start a new colony over it instead
  await idbDel(id); Object.assign(sl, { name: 'Colony ' + id, empty: true, sum: null, at: null }); writeMeta(m);
  return true;
}
// A brand-new colony made by a switch or New colony: skip the film (it's had its showing).
export function takeNewColonyFlag() { const f = get(NEW_KEY); if (f) set(NEW_KEY, null); return !!f; }

// ---------- save files ----------
// Export: the playing colony as a file (its map photos left out: they come back as you explore).
export function exportFile(s, name) {
  const blob = new Blob([JSON.stringify({ underfoot: 1, name, save: SIM.serialize(s) })], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = (name || 'colony').replace(/[^\w -]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() + '.underfoot.json';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
// Import into a slot. The file must load (it's tried first), or nothing changes.
export async function importFile(file, id) {
  const text = await file.text(); let d = null;
  try { d = JSON.parse(text); } catch (e) { throw new Error('That isn’t an Underfoot save file.'); }
  const save = d && d.underfoot ? d.save : text; // (a raw save works too)
  const s = SIM.deserialize(save); // throws if it can't be read
  const m = slotMeta(), sl = slotOf(m, id); if (!sl) throw new Error('No such slot.');
  if (id === m.active) putActive({ save });
  else await idbPut(id, { save });
  Object.assign(sl, { name: (d && d.name) || sl.name, empty: false, sum: summary(s), at: Date.now() }); writeMeta(m);
  return true;
}
