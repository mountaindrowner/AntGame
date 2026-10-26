// HUD, bottom bars, sheets (queen, build catalog, help, explainer cards) and
// the intro. Ported from build 6's app.js; the behaviour is the same, only
// the state now lives on the shared `app` object.
import SIM from '../sim/sim.js';
import { EXPL, HELP, INTRO } from './copy.js';

const { NW, NH, T, SHAFT, CASTES, ROOMS, ROOM_KEYS } = SIM;
const $ = (id) => document.getElementById(id);

export function createUI(app) {
  const P = () => app.s.player;
  const el = {
    stats: $('stats'), msg: $('msg'), hungerBar: $('hungerbar'), act: $('act'), release: $('release'), mark: $('mark'),
    recruit: $('recruit'), enter: $('enter'), barS: $('bar'), barN: $('barn'), sheet: $('sheet'), buildNest: $('buildnest'),
    exitNest: $('exitnest'), queen: $('queenbtn'), level: $('levelbtn'), view: $('viewbtn'),
  };

  // ---------------------------------------------------------- intro
  const introStep = () => { const i = app.s.seen.intro; return typeof i === 'number' ? i : i === 'done' ? -1 : 0; };
  const introText = () => { const i = introStep(); return i < 0 ? null : INTRO[i].text; };
  function introAdvance() {
    const s = app.s;
    let i = introStep();
    if (i < 0) return;
    i++;
    if (i >= INTRO.length) { s.seen.intro = 'done'; s.seen.dig = s.seen.nest = s.seen.surface = true; } else s.seen.intro = i;
  }
  function tickIntro() { const i = introStep(); if (i < 0) return; const st = INTRO[i]; if (st.done && st.done(app.s)) introAdvance(); }

  // ---------------------------------------------------------- sheets
  function showExplainer(key) {
    const s = app.s;
    if (s.seen[key] || app.menu === 'info') return;
    s.seen[key] = true;
    const [t, b] = EXPL[key];
    app.menu = 'info';
    el.sheet.classList.remove('hidden');
    el.sheet.innerHTML = `<div class="row head"><strong>${t}</strong></div><div class="h">${b}</div><div class="btns one"><button data-close="1" class="primary">Got it</button></div>`;
    app.paused = true;
  }
  function checkExplainers() {
    const s = app.s;
    tickIntro();
    if (introStep() >= 0) { if (s.events.length && !EXPL[s.events[0]]) s.events.shift(); }
    if (introStep() >= 0) {
      while (s.events.length) {
        const e = s.events.shift();
        if (EXPL[e] && !['dig', 'nest', 'surface'].includes(e)) { showExplainer(e); if (app.menu === 'info') return; }
      }
      return;
    }
    if (s.phase === 'dig') showExplainer('dig');
    else if (P().ant && P().inNest) showExplainer('nest');
    else if (P().ant && !P().inNest) showExplainer('surface');
    if (app.menu === 'info') return;
    while (s.events.length) { const e = s.events.shift(); if (EXPL[e]) { showExplainer(e); if (app.menu === 'info') return; } }
    const a = P().ant;
    if (a && !P().inNest) {
      if (s.spider && Math.hypot(a.x - s.spider.x, a.y - s.spider.y) < 9 * T) showExplainer('spider');
      if (s.cat && Math.hypot(a.x - s.cat.x, a.y - s.cat.y) < 9 * T) showExplainer('cat');
    }
    if (!s.seen.grit && s.colony.grit > 0) showExplainer('grit');
  }

  function renderSheet() {
    const s = app.s, c = s.colony;
    if (app.menu === 'help' || app.menu === 'info') return;
    let h = '';
    if (app.menu === 'egg') {
      h += `<div class="row head"><strong>Queen · next egg</strong><button class="x" data-close="1">Close</button></div><div class="note">${EXPL.queen[1]}</div><div class="btns">`;
      for (const k of Object.keys(CASTES)) {
        const C = CASTES[k];
        const lock = SIM.eggLock(s, k);
        const dis = lock || !SIM.canPay(c, C.cost) || c.eggQueue.length >= 10;
        h += `<button data-egg="${k}" ${dis ? 'disabled' : ''}><b>${C.name}</b><i>${lock || SIM.costText(C.cost) + ' · ' + Math.round(C.hatch * c.hatchMul) + ' s'}</i></button>`;
      }
      h += `</div>`;
      const cap = SIM.queenCap(s.queen.level), up = SIM.QUEEN_UP[s.queen.level];
      h += `<div class="note">Queen level ${s.queen.level + 1} · holds ${cap} ants (${SIM.antCount(s)} now)${SIM.antCount(s) >= cap ? ' · at the cap, eggs paused' : ''}</div>`;
      if (up) h += `<div class="btns one"><button data-up="1" ${SIM.canPay(c, up) ? '' : 'disabled'}><b>Upgrade queen</b><i>${SIM.costText(up)} · +20 ants${s.queen.level === 0 ? ' · unlocks clay digging' : ''}</i></button></div>`;
      if (c.eggs.length || c.eggQueue.length) {
        h += `<div class="eggs">`;
        for (const e of c.eggs) h += `<span class="egg"><em style="width:${Math.min(100, (e.t / e.need) * 100)}%"></em>${CASTES[e.caste].name}</span>`;
        for (const q of c.eggQueue) h += `<span class="egg q">${CASTES[q].name}</span>`;
        h += `</div><div class="note">${c.eggs.length}/${c.hatchCap} hatching · ${c.eggQueue.length} queued</div>`;
      } else h += `<div class="note">No eggs. The queen waits.</div>`;
    } else if (app.menu === 'catalog') {
      const builders = s.ants.filter((a) => a.caste === 'builder').length;
      h += `<div class="row head"><strong>Build</strong><button class="x" data-close="1">Close</button></div>`;
      h += `<div class="note">Pick a room, then tap a green spot in the nest to place it. ${builders} builder${builders === 1 ? '' : 's'}. Dug cells: ${SIM.dugCount(s)}. Dig orders: ${s.nest.digOrders.length}, fill orders: ${s.nest.fillOrders.length}.</div><div class="btns">`;
      for (const k of ROOM_KEYS) {
        const R = ROOMS[k];
        const have = SIM.roomOf(s, k), queued = c.buildQueue.some((j) => j.room === k);
        const fits = app.anyFit(R.w, R.h), pay = SIM.canPay(c, R.cost);
        const status = have ? 'built' : queued ? 'being built' : !fits ? 'no ' + R.w + '×' + R.h + ' pocket dug yet' : !pay ? 'short on: ' + SIM.costText(R.cost) : 'ready to place';
        h += `<button data-place="${k}" ${have || queued || !fits || !pay ? 'disabled' : ''}><b>${R.name} · ${R.w}×${R.h}</b><i>${SIM.costText(R.cost)} · ${R.desc}</i><i>${status}</i></button>`;
      }
      h += `</div><div class="t" style="margin-top:10px">Tools</div><div class="btns">`;
      h += `<button data-tool="fill"><b>Fill tunnel</b><i>Tap dug cells to have builders pack them back with dirt</i></button>`;
      h += `<button data-tool="remove"><b>Remove room</b><i>Tap a room to tear it out, half the cost back</i></button>`;
      h += `<button data-cleardigs="1" ${s.nest.digOrders.length || s.nest.fillOrders.length ? '' : 'disabled'}><b>Clear orders</b><i>Cancel pending digs and fills</i></button>`;
      h += `</div>`;
    }
    if (el.sheet.innerHTML !== h) el.sheet.innerHTML = h;
  }
  function openMenu(m, cell) { app.menu = m; app.menuCell = cell || null; el.sheet.classList.remove('hidden'); renderSheet(); }
  function closeMenu() { app.menu = null; app.menuCell = null; el.sheet.classList.add('hidden'); app.paused = false; }
  function openHelp() { app.menu = 'help'; el.sheet.classList.remove('hidden'); el.sheet.innerHTML = HELP; app.paused = true; }

  // ---------------------------------------------------------- HUD
  function flash(text, test, ms) {
    P().msg = text;
    setTimeout(() => { if (test.test(P().msg)) P().msg = ''; }, ms);
  }
  function hint() {
    const s = app.s, c = s.colony, a = P().ant, q = s.queen;
    if (P().msg) return P().msg;
    if (app.placing && app.view === 'nest') {
      if (app.placing.kind === 'room') { const R = ROOMS[app.placing.key]; return `Placing ${R.name} (${R.w}×${R.h}). Tap a green cell. Cancel to stop.`; }
      if (app.placing.kind === 'fill') return 'Fill: tap dug tunnel cells to queue them for packing. Tap again to undo. Cancel to stop.';
      return 'Remove: tap a room to tear it out. Cancel to stop.';
    }
    if (s.won) return 'The rival queen is dead. Keep growing, or Reset for a fresh yard.';
    if (s.phase === 'dig') return q.energy > 0 ? `You are the queen. Tap the dirt next to her to dig (${q.energy} digs left). Two down, then Build nest.` : 'Out of energy. Tap Build nest.';
    if (!a) return 'Waiting for the next hatchling.';
    if (P().inNest) return app.view === 'nest' ? 'Walk up the shaft and tap the top cell to go outside. Tap the queen to lay eggs; press Build to add rooms.' : 'Your ant is inside. Tap Nest view.';
    if (a.carry) return 'Carry it to the dark hole. Your trail lays itself.';
    if (s.t < 180 && c.store < 8) return 'Tap a crumb or seed to walk there, then Pick up. Hold to keep walking.';
    if (c.water < 3) return 'Water is low. Blue dew appears every two minutes; the big puddle is always out there. Eggs need water.';
    if (!c.eggQueue.length && !c.eggs.length && c.store >= 4) return 'Food in store. Tap Nest, tap the queen, lay an egg.';
    if (P().hunger < 35) return 'You are hungry. Go home, or stand by a forager carrying food.';
    if (s.ants.filter((x) => x.caste === 'builder').length === 0 && c.store >= 10) return 'Lay a Builder egg. Builders dig rooms.';
    if (SIM.eggLock(s, 'soldier') && c.protein < 5 && s.cat) return 'Soldiers need protein. Recruit 8 ants, walk them onto the green caterpillar, and haul the meat home.';
    if (SIM.eggLock(s, 'soldier') && c.protein >= 5) return 'You have protein. Dig a 6×3 pocket and build a Barracks.';
    return '';
  }
  function update() {
    const s = app.s, c = s.colony;
    const st = SIM.stats(s);
    const cap = SIM.queenCap(s.queen.level), nAnts = SIM.antCount(s);
    el.stats.innerHTML = `🌾 ${Math.floor(c.store)}/${c.cap} · 💧 ${Math.floor(c.water)}/${c.waterCap} · 🥩 ${Math.floor(c.protein)} · 🪨 ${Math.floor(c.grit)}<br>🐜 ${nAnts}/${cap} (${st.out} out) · rival ${st.rival} · +${st.income.toFixed(0)} −${st.upkeep.toFixed(0)} /min · ${app.fps} fps${s.rain.on ? ' · rain' : ''}${s.repairs.length ? ' · ' + s.repairs.length + ' cave-in' : ''}`;
    const it = introText();
    const istep = introStep() >= 0 ? INTRO[introStep()] : null;
    if (it) { const want = istep.btn ? `${it} <button class="next" id="intronext">${istep.btn}</button>` : it; if (el.msg.innerHTML !== want) el.msg.innerHTML = want; }
    else el.msg.textContent = hint();
    el.hungerBar.style.width = Math.max(0, P().hunger) + '%';
    el.hungerBar.style.background = P().hunger < 35 ? '#e4524a' : '#8fd36b';
    const lbl = SIM.actionLabel(s);
    el.act.textContent = lbl || 'Pick up';
    el.act.disabled = !lbl;
    el.release.textContent = st.followers ? `Release ${st.followers}` : 'Release';
    el.release.disabled = !st.followers;
    el.mark.classList.toggle('on', !!P().mark);
    const a = P().ant;
    const nearHome = a && !P().inNest && Math.hypot(a.tx - s.world.ex, a.ty - s.world.ey) < 4;
    el.enter.classList.toggle('hidden', !nearHome);
    el.barS.classList.toggle('hidden', app.view !== 'surface');
    el.barN.classList.toggle('hidden', app.view !== 'nest');
    el.buildNest.classList.toggle('hidden', s.phase !== 'dig');
    el.buildNest.disabled = s.queen.y < 2;
    el.queen.classList.toggle('hidden', s.phase === 'dig');
    el.level.classList.toggle('hidden', s.phase === 'dig');
    el.exitNest.classList.toggle('hidden', !(a && P().inNest));
    el.level.textContent = app.placing ? 'Cancel' : 'Build';
    el.level.classList.toggle('on', !!app.placing);
    if (nAnts >= cap && s.queen.placed) showExplainer('cap');
    if (s.seen.nest && !s.seen.soil && SIM.dugCount(s) > 12) showExplainer('soil');
    el.view.textContent = app.view === 'nest' ? 'Surface' : 'Nest';
    if (app.menu) renderSheet();
  }

  // ---------------------------------------------------------- wiring
  $('help').addEventListener('click', openHelp);
  el.stats.addEventListener('click', openHelp);
  el.msg.addEventListener('click', (e) => { if (e.target && e.target.id === 'intronext') introAdvance(); });
  el.sheet.addEventListener('click', (e) => {
    const s = app.s;
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.close) { closeMenu(); return; }
    if (b.dataset.egg) { SIM.queueEgg(s, b.dataset.egg); renderSheet(); return; }
    if (b.dataset.up) { SIM.upgradeQueen(s); renderSheet(); return; }
    if (b.dataset.cleardigs) { s.nest.digOrders.length = 0; s.nest.fillOrders.length = 0; renderSheet(); return; }
    if (b.dataset.place) { app.placing = { kind: 'room', key: b.dataset.place }; closeMenu(); app.view = 'nest'; return; }
    if (b.dataset.tool) { app.placing = { kind: b.dataset.tool }; closeMenu(); app.view = 'nest'; return; }
    if (b.dataset.confirm) { const fn = app.confirmAction; app.confirmAction = null; closeMenu(); if (b.dataset.confirm === 'yes' && fn) fn(); }
  });
  el.view.addEventListener('click', () => { app.view = app.view === 'nest' ? 'surface' : 'nest'; closeMenu(); });
  el.act.addEventListener('click', () => SIM.doAction(app.s));
  el.release.addEventListener('click', () => SIM.release(app.s));
  el.mark.addEventListener('click', () => { P().mark = !P().mark; });
  el.enter.addEventListener('click', () => {
    const s = app.s, a = P().ant;
    if (!a) return;
    P().enterReq = true;
    P().tx = (s.world.ex + 0.5) * T;
    P().ty = (s.world.ey + 0.5) * T;
    P().holding = false;
  });
  el.buildNest.addEventListener('click', () => { if (SIM.buildNest(app.s)) closeMenu(); });
  el.queen.addEventListener('click', () => openMenu('egg'));
  el.level.addEventListener('click', () => { if (app.placing) app.placing = null; else openMenu('catalog'); });
  el.exitNest.addEventListener('click', () => { P().ntx = SHAFT; P().nty = 0; P().exiting = true; });

  let recN = 0, recTimer = null;
  el.recruit.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (!P().ant || P().inNest) return;
    recN = 1;
    el.recruit.textContent = 'Recruit 1';
    recTimer = setInterval(() => { if (recN < 20) { recN++; el.recruit.textContent = 'Recruit ' + recN; } }, 140);
  });
  const recEnd = () => {
    if (!recTimer) return;
    clearInterval(recTimer);
    recTimer = null;
    const got = SIM.recruit(app.s, recN);
    el.recruit.textContent = 'Recruit';
    if (got < recN) flash(got ? `${got} ants answered. Recruit near the nest or near other ants.` : 'No ants in range. Walk back toward the nest and try again.', /answered|in range/, 3000);
  };
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => el.recruit.addEventListener(t, recEnd));
  $('stress').addEventListener('click', () => { SIM.stress(app.s, 200); flash('+200 foragers spawned for a frame-rate test.', /^\+200/, 4000); });
  $('reset').addEventListener('click', () => confirmSheet('Start over? This clears the saved colony.', 'Start over', () => app.reset()));
  $('zoom').addEventListener('click', () => { app.zoomMul = app.zoomMul >= 1.5 ? 0.6 : app.zoomMul >= 0.9 ? 1.6 : 1; });

  // In-page confirmation (browser confirm() is blocked in some hosts).
  function confirmSheet(text, yes, fn) {
    app.confirmAction = fn;
    app.menu = 'info';
    el.sheet.classList.remove('hidden');
    el.sheet.innerHTML = `<div class="row head"><strong>${text}</strong></div><div class="btns"><button data-confirm="no">Keep playing</button><button data-confirm="yes" class="primary">${yes}</button></div>`;
    app.paused = true;
  }

  return { update, checkExplainers, closeMenu, openMenu, flash, confirmSheet, introStep, introText };
}

export const GRID = { NW, NH };
