// Tap a thing on the surface to see what it is: a small card over it with
// its name and one line on what it's for. It follows the thing on screen
// and fades after a couple of seconds. The tap still walks your ant there.
import * as THREE from 'three';
import SIM from '../sim/sim.js';
import { RANKS, rankOf } from '../sim/growth.js';

const { T, FOODS, CASTES } = SIM;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const v = new THREE.Vector3();

// What an item on the ground is: [icon, name, line].
function itemCard(f) {
  if (f.kind === 'water') return f.type === 'puddle' ? ['💧', 'Puddle', 'Water. It never dries up.'] : ['💧', 'Dew', 'Water, for a minute. Eggs need it.'];
  if (f.kind === 'grit') return ['🪨', 'Pebble', 'Stone, for rooms and upgrades.'];
  if (f.kind === 'protein') {
    if (f.type === 'spider' || f.type === 'cat') return ['🥩', 'Meat', `${Math.round(f.amt)} protein. Haul it home.`];
    if (SIM.BUGS[f.type]) return ['🥩', 'Dead ' + SIM.BUGS[f.type].name, `${Math.round(f.amt)} protein. Haul it home.`];
    const F = FOODS[f.type];
    return ['🥩', cap(F ? F.name : 'Meat'), `Protein for soldiers. ${Math.round(f.amt)} left.`];
  }
  if (f.type === 'aphids') return ['🌿', 'Aphids', 'Honeydew food. It keeps coming back.'];
  const F = FOODS[f.type];
  if (F && F.crew) return ['🍬', cap(F.name), `A treat: ${Math.round(f.amt)} food. Needs a crew of ${F.crew}.`];
  return ['🌾', cap(F ? F.name : 'Food'), `Food: ${Math.round(f.amt)}. Pick it up and bring it home.`];
}

// An ant's card (build 15): its name if it has one, its rank, kind and what
// it's doing. Mark's brother tried hovering over ants to find "Thorn".
const JOB = { explore: 'foraging', return: 'heading home', patrol: 'on guard', fight: 'fighting', follow: 'following you', spoil: 'hauling dirt out', raid: 'raiding', player: 'you' };
const WHAT = { forager: 'Gathers food and water.', builder: 'Digs, builds and hauls dirt out.', nurse: 'Tends eggs so they hatch faster.', soldier: 'Guards the door and fights. Eats protein.', venom: 'Kills big things.' };
function antCard(s, a) {
  if (a.team) return ['🐜', 'Pavement ant', 'A rival. Their nest is in the Patio.'];
  const C = CASTES[a.caste], R = RANKS[rankOf(a)], job = a.carry && a.state === 'return' ? 'carrying ' + (a.kind === 'food' ? 'food' : a.kind === 'water' ? 'water' : a.kind === 'grit' ? 'a pebble' : a.kind === 'protein' ? 'meat' : 'a load') + ' home' : JOB[a.state] || a.state;
  const next = RANKS[rankOf(a) + 1], xp = Math.floor(a.xp || 0);
  const icon = a.isPlayer ? '⭐' : rankOf(a) >= 4 ? '🏆' : rankOf(a) >= 3 ? '🎖' : '🐜';
  const name = a.name ? `${a.name}${a.title ? ' ' + a.title : ''}` : a.isPlayer ? 'You' : C.name;
  return [icon, name, `${R.name} ${C.name}${a.isPlayer && a.name ? ' (you)' : ''}, ${job}. ${xp} xp${next && !a.legend ? ` (${next.name} at ${next.xp})` : ''}. ${WHAT[a.caste] || ''}`];
}

// The small creatures (build 16).
function bugCard(b) {
  const hurt = b.hp < b.maxHp ? ` ${Math.ceil(b.hp)} of ${b.maxHp} health.` : '';
  if (b.kind === 'ladybug') return ['🐞', 'Ladybug', (b.state === 'eat' ? 'Eating your aphids! ' : 'Eats aphids. ') + 'Bite it and it flies off.' + hurt];
  if (b.kind === 'earwig') return ['🪲', 'Earwig', 'Pinches ants that come close; foragers keep clear. Bring fighters. 15 protein.' + hurt];
  if (b.kind === 'cricket') return ['🦗', 'Cricket', (b.state === 'tired' ? 'Worn out: catch it now! ' : 'Hops away from ants. Chase it till it tires. ') + '25 protein.' + hurt];
  return ['🐛', 'Millipede', (b.state === 'curl' ? 'Curled into an armoured ball. Keep biting. ' : 'Harmless and slow, but armoured. ') + '20 protein.' + hurt];
}

export class Callout {
  constructor(app, views) {
    this.app = app;
    this.views = views;
    const el = (this.el = document.createElement('div'));
    el.id = 'callout';
    el.className = 'card-tip hidden';
    document.body.appendChild(el);
    this.target = null;
  }

  // Find what's under a tap (surface px) and show its card, if anything.
  tap(wx, wy) {
    const s = this.app.s, w = s.world, best = { d: Infinity, card: null, at: null };
    // bias: >1 makes a thing lose to others under the same tap (ants lose to
    // the food they stand on).
    const take = (x, y, r, card, h = 4, bias = 1) => { const d0 = Math.hypot(x - wx, y - wy) / r, d = d0 * bias; if (d0 < 1 && d < best.d) Object.assign(best, { d, card, at: { x, y, h } }); };
    for (const f of s.items) if (f.amt > 0) take(f.carried && f.px != null ? f.px : (f.x + 0.5) * T, f.carried && f.py != null ? f.py : (f.y + 0.5) * T, 1.6 * T, () => itemCard(f));
    if (s.spider) take(s.spider.x, s.spider.y, 3.5 * T, () => ['🕷', 'Wolf spider', 'Run! Thirty ants or five Venom ants can kill it.'], 30);
    if (s.cat) take(s.cat.x, s.cat.y, 3 * T, () => ['🐛', 'Caterpillar', 'Harmless. 40 protein if a crew brings it down.'], 14);
    for (const b of s.critters || []) take(b.x, b.y, 2 * T, () => bugCard(b), 10);
    for (const a of s.ants) {
      if (a.state === 'dead' || a.state === 'in' || a.state === 'nest' || a.state === 'build') continue;
      take(a.x, a.y, 1.1 * T, () => antCard(s, a), 6, a.isPlayer ? 3 : 1.8);
    }
    for (const st of s.strikes || []) if (st.kind === 'bird' || st.kind === 'toad') take(st.x * T, st.y * T, 3 * T, () => (st.kind === 'bird' ? ['🐦', 'Robin', 'Hunting ants. Five fighters chase it off.'] : ['🐸', 'Toad', 'Its tongue reaches five tiles. Keep away.']), 20);
    if (s.queen.placed) take((w.ex + 0.5) * T, (w.ey + 0.5) * T, 2 * T, () => ['🏠', 'Your nest', 'Bring food here.']);
    take((w.rx + 0.5) * T, (w.ry + 0.5) * T, 2 * T, () => ['⚔', 'Rival nest', 'Hold it with eight fighters to win.']);
    if (!best.card) return false;
    const [icon, name, line] = best.card();
    this.el.innerHTML = `<span class="ct-icon">${icon}</span><span class="ct-text"><b>${name}</b><span>${line}</span></span>`;
    this.el.classList.remove('hidden', 'fade');
    this.target = best.at;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.el.classList.add('fade'), 3200);
    this.hideAt = performance.now() + 3700;
    if (!this.raf) this._follow();
    return true;
  }

  hide() { this.target = null; this.el.classList.add('hidden'); }

  // Keep the card over its thing while the camera moves.
  _follow() {
    this.raf = requestAnimationFrame(() => {
      this.raf = null;
      if (!this.target || performance.now() > this.hideAt || this.app.view !== 'surface' || this.app.titleOpen) { this.hide(); return; }
      const cam = this.views.surface.camera;
      v.set(this.target.x, this.target.h, this.target.y).project(cam);
      const x = (v.x * 0.5 + 0.5) * window.innerWidth, y = (-v.y * 0.5 + 0.5) * window.innerHeight;
      const w = this.el.offsetWidth, h = this.el.offsetHeight;
      this.el.style.left = Math.max(6, Math.min(window.innerWidth - w - 6, x - w / 2)) + 'px';
      this.el.style.top = Math.max(6, y - h - 18) + 'px';
      this.el.style.setProperty('--arrow', Math.max(12, Math.min(w - 12, x - parseFloat(this.el.style.left))) + 'px');
      this._follow();
    });
  }
}
