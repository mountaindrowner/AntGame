// Curios (build 20): lost human things hidden round the yard.
import { AREA, AREAS, areaBounds } from './yard.js';
import { FOODS, T, idx, mulberry32 } from './core.js';
import { itemAt, walk } from './world.js';
import { gainGenes } from './progress.js';
import { clearOf } from './spider.js';

// One lost thing in every region: a marble, a button, a coin… Huge to an
// ant, and it glints from afar. Walk your ant up to it and the stash round
// it spills out (what the ground there gives), with a 🧬 Gene, and every
// fifth curio pays three more. Found curios show on the yard map.
export const CURIOS = {
  marble: { name: 'a glass marble' }, button: { name: 'a red button' }, coin: { name: 'a copper coin' }, cap: { name: 'a bottle cap' },
  brick: { name: 'a toy brick' }, clip: { name: 'a paper clip' }, bead: { name: 'a glass bead' }, die: { name: 'a lost die' },
};
const CURIO_KINDS = Object.keys(CURIOS);
// What spills out, by the ground it lies on: [kind, type, amount] × n.
function curioStash(ground){
  if (/soil|picnic/.test(ground)) return [['food', 'aphids', 0], ['food', 'tomato', 20], ['food', 'jellybean', 0]];
  if (/bark|compost|leaf|hedge|mulch/.test(ground)) return [['chitin', 'shell', 8], ['chitin', 'shell', 8], ['protein', 'bug', 15]];
  if (/gravel|home/.test(ground)) return [['grit', 'pebble', 10], ['grit', 'pebble', 10], ['grit', 'pebble', 10]];
  if (/slab|deck/.test(ground)) return [['food', 'crumb', 10], ['food', 'popcorn', 14], ['food', 'cookie', 0]];
  if (/sand/.test(ground)) return [['food', 'gummy', 0], ['food', 'popcorn', 14]];
  if (/mud|wet/.test(ground)) return [['water', 'dew', 8], ['water', 'dew', 8], ['food', 'seed', 20]];
  return [['food', 'seed', 20], ['food', 'seed', 20], ['food', 'berry', 12]];
}
export function placeCurios(s){
  const w = s.world, out = [], cl = clearOf(s);
  for (let i = 0; i < AREAS.length; i++){
    const rnd = mulberry32((s.seed || 7)*7919 + i*104729), b = areaBounds(i);
    for (let tries = 0; tries < 80; tries++){
      const x = b.x0 + 8 + Math.floor(rnd()*(AREA - 16)), y = b.y0 + 8 + Math.floor(rnd()*(AREA - 16));
      if (w.blocked[idx(x,y)] || w.pit[idx(x,y)] || (tries < 60 && cl[idx(x,y)] < 3) || Math.hypot(x - w.ex, y - w.ey) < 18 || Math.hypot(x - w.rx, y - w.ry) < 10) continue;
      out.push({ i, x, y, kind: CURIO_KINDS[Math.floor(rnd()*CURIO_KINDS.length)], yaw: rnd()*Math.PI*2 }); break;
    }
  }
  return out;
}
export function tickCurios(s, pa){
  const c = s.colony, found = c.curios || (c.curios = {});
  for (const q of s.curios){
    if (found[q.i] || Math.hypot(pa.x/T - (q.x + 0.5), pa.y/T - (q.y + 0.5)) > 2.6) continue;
    found[q.i] = q.kind; const n = Object.keys(found).length, C = CURIOS[q.kind];
    // The stash round it.
    const st = curioStash(AREAS[q.i].ground || ''); let k = 0;
    for (const [kind, type, amt] of st){
      for (let tries = 0; tries < 12; tries++){ const a = k*2.1 + tries*0.7, r = 2 + (tries % 3), x = Math.round(q.x + Math.cos(a)*r), y = Math.round(q.y + Math.sin(a)*r);
        if (!walk(s, x, y) || s.world.pit[idx(x,y)] || itemAt(s, x, y)) continue;
        const F = FOODS[type]; s.items.push({ x, y, kind, type, amt: amt || (F ? F.amt[0] : 10) }); break; }
      k++;
    }
    gainGenes(s, 1, 'finding ' + C.name);
    if (n % 5 === 0) gainGenes(s, 3, n + ' curios found');
    s.curioFound = { i: q.i, kind: q.kind, t: s.t, n }; s.events.push('curio');
    s.player.msg = `You found ${C.name}! Something was stashed round it. (${n} of ${s.curios.length} curios${n % 5 === 0 ? ': +3 🧬 for every fifth' : ''})`;
  }
}
