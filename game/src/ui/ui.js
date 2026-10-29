// HUD, bottom bars, sheets (queen, build catalog, help, explainer cards) and
// the intro. Ported from build 6's app.js; the behaviour is the same, only
// the state now lives on the shared `app` object.
import SIM from '../sim/sim.js';
import { EXPL, HELP, INTRO } from './copy.js';
import { sfx } from '../audio/sfx.js';
import { YARD_MAP } from '../sim/yard.js';
import { ICONS } from './icons.js';
import { MapView } from './mapView.js';
import { RES as GRES, UPGRADES, BRANCHES, EVO, EVO_BY, evoCost, laterIn, LATER, RANKS, rankOf, PROMOS, FAMILY, QUEEN_TRAITS } from '../sim/growth.js';

const { NW, NH, T, SHAFT, CASTES, ROOMS, ROOM_KEYS } = SIM;
const $ = (id) => document.getElementById(id);

export function createUI(app) {
  const P = () => app.s.player;
  const el = {
    stats: $('stats'), msg: $('msg'), hungerBar: $('hungerbar'), act: $('act'), release: $('release'), mark: $('mark'),
    recruit: $('recruit'), enter: $('enter'), barS: $('bar'), barN: $('barn'), sheet: $('sheet'), buildNest: $('buildnest'),
    exitNest: $('exitnest'), queen: $('queenbtn'), level: $('levelbtn'), view: $('viewbtn'), map: $('mapbtn'), evolve: $('evolvebtn'), zoom: $('zoom'), help: $('help'), tip: $('tip'),
  };

  // ---------------------------------------------------------- icon buttons
  // Every HUD button is a small icon; its name shows as a tip on hover or a
  // long press (see tips below), and doubles as its aria-label. A badge
  // carries a number when there is one (Lift 3/6, Release 4, Recruit 7).
  // Bottom-bar buttons also wear a short name curved over their tops.
  const ARC = { pick: 'Pick up', drop: 'Drop', trail: 'Trail', recruit: 'Recruit', release: 'Release', enter: 'Enter', exit: 'Exit', dig: 'Dig in', queen: 'Queen', build: 'Build', cancel: 'Cancel' };
  const arc = (b, text) => `<svg class="arc" viewBox="0 0 70 70" aria-hidden="true"><path id="arc-${b.id}" d="M7,35 A28,28 0 0 1 63,35" fill="none"/><text><textPath href="#arc-${b.id}" startOffset="50%" text-anchor="middle">${text}</textPath></text></svg>`;
  function setIcon(b, icon, tip, badge) {
    const name = b.closest('.dock') ? (/^Lift/.test(tip) ? 'Lift' : /^Set down/.test(tip) ? 'Set down' : ARC[icon]) : '';
    const key = icon + '|' + (badge ?? '') + '|' + name;
    if (b.dataset.key !== key) { b.dataset.key = key; b.innerHTML = ICONS[icon] + (badge != null && badge !== '' ? `<b class="badge">${badge}</b>` : '') + (name ? arc(b, name) : ''); }
    if (b.dataset.tip !== tip) { b.dataset.tip = tip; b.setAttribute('aria-label', tip); }
  }
  setIcon(el.mark, 'trail', 'Mark trail'); setIcon(el.recruit, 'recruit', 'Recruit (hold for more)'); setIcon(el.release, 'release', 'Release');
  setIcon(el.enter, 'enter', 'Enter nest'); setIcon(el.buildNest, 'dig', 'Build nest'); setIcon(el.queen, 'queen', 'Queen: lay eggs');
  setIcon(el.exitNest, 'exit', 'Exit nest'); setIcon(el.map, 'map', 'Yard map'); setIcon(el.evolve, 'evolve', 'Evolve: ants, evolution, ranks'); setIcon(el.zoom, 'zoom', 'Zoom'); setIcon(el.help, 'help', 'Help');
  setIcon(el.act, 'pick', 'Pick up');

  // ---------------------------------------------------------- tips
  // Hover (mouse) or press and hold (touch) anything with data-tip to see
  // what it is. A held button shows its tip instead of acting when let go.
  let tipFor = null, tipTimer = null, tipHide = null, longPressed = false;
  function showTip(t) {
    const text = t.dataset.tip; if (!text) return;
    tipFor = t; el.tip.textContent = text; el.tip.classList.remove('hidden');
    sfx.play('tick');
    const r = t.getBoundingClientRect(), w = el.tip.offsetWidth, h = el.tip.offsetHeight;
    const below = r.top < 90, left = Math.max(6, Math.min(window.innerWidth - w - 6, r.left + r.width / 2 - w / 2));
    el.tip.style.left = left + 'px';
    el.tip.style.top = (below ? r.bottom + 12 : r.top - h - 12) + 'px';
    el.tip.classList.toggle('below', below);
    el.tip.style.setProperty('--arrow', Math.max(12, Math.min(w - 12, r.left + r.width / 2 - left)) + 'px');
    clearTimeout(tipHide); tipHide = setTimeout(hideTip, 2600);
  }
  function hideTip() { tipFor = null; el.tip.classList.add('hidden'); clearTimeout(tipTimer); }
  document.addEventListener('pointerover', (e) => { const t = e.target.closest && e.target.closest('[data-tip]'); if (!t || e.pointerType !== 'mouse') return; clearTimeout(tipTimer); tipTimer = setTimeout(() => showTip(t), 350); });
  document.addEventListener('pointerout', (e) => { if (e.pointerType === 'mouse' && e.target.closest && e.target.closest('[data-tip]')) hideTip(); });
  document.addEventListener('pointerdown', (e) => {
    longPressed = false;
    const t = e.target.closest && e.target.closest('[data-tip]'); if (!t || e.pointerType === 'mouse') return;
    // Stat chips have no action: a tap shows the tip straight away.
    if (t.classList.contains('chip')) { showTip(t); return; }
    if (t === el.recruit) return; // holding Recruit recruits more
    clearTimeout(tipTimer); tipTimer = setTimeout(() => { longPressed = true; showTip(t); }, 450);
  });
  document.addEventListener('pointerup', () => clearTimeout(tipTimer));
  // A long press was a question, not a tap.
  document.addEventListener('click', (e) => { if (longPressed) { longPressed = false; e.stopPropagation(); e.preventDefault(); } }, true);

  // The buttons a hint is talking about pulse, so the icons are easy to learn.
  const NAMED = [['Build nest', 'buildnest'], ['Enter nest', 'enter'], ['Exit nest', 'exitnest'], ['Pick up', 'act'], ['Mark trail', 'mark'], ['Recruit', 'recruit'], ['Release', 'release'], ['Lift', 'act'], ['Queen', 'queenbtn'], ['the queen', 'queenbtn'], ['Build', 'levelbtn'], ['Nest', 'viewbtn'], ['Map', 'mapbtn']];
  function pulseFor(text) {
    const on = new Set();
    let t = ' ' + (text || '') + ' ';
    for (const [name, id] of NAMED) { const re = new RegExp('(press|tap|hold|Press|Tap|Hold)[^.]*?\\b' + name + '\\b'); if (re.test(t)) { on.add(id); t = t.split(name).join(''); } }
    for (const b of document.querySelectorAll('.ico')) b.classList.toggle('pulse', on.has(b.id));
  }

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
    sfx.play('explainer');
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
      // The spider warning can't wait for the intro to finish.
      const a0 = P().ant;
      if (a0 && !P().inNest && s.spider && Math.hypot(a0.x - s.spider.x, a0.y - s.spider.y) < 9 * T) showExplainer('spider');
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

  // A cost as resource icons (the top bar's), not words: "🌾10 🪨5".
  const RES = GRES;
  const costIcons = (cost) => Object.entries(cost).map(([k, v]) => `<span class="cost">${RES[k] || k}${v}</span>`).join(' ') || 'free';
  const sicon = (name) => (ICONS[name] ? `<span class="si">${ICONS[name]}</span>` : '');

  // ---------------------------------------------------------- Evolve (build 12)
  // Three tabs: each kind of ant's upgrades and its veterans' doctrine; the
  // evolution tree, paid in 🧬; and the ranks, named ants and the fallen.
  const CASTE_ORDER = ['forager', 'builder', 'nurse', 'soldier', 'venom'];
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
  function renderGrow() {
    const s = app.s, c = s.colony, tab = app.growTab || 'ants';
    let h = `<div class="row head"><strong>Evolve · <span class="genes">🧬 ${c.genes}</span></strong><button class="x" data-close="1">Close</button></div>`;
    h += `<div class="tabs">${[['ants', 'Ants'], ['evo', 'Evolution'], ['ranks', 'Ranks']].map(([k, n]) => `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${n}</button>`).join('')}</div>`;
    if (tab === 'ants') h += growAnts(s, c);
    else if (tab === 'evo') h += growEvo(s, c);
    else h += growRanks(s, c);
    return h;
  }
  function growAnts(s, c) {
    let h = `<div class="note">Each level is bought once for every ant of that kind. Levels with two choices are for good: pick one.</div>`;
    for (const k of CASTE_ORDER) {
      const L = UPGRADES[k], n = SIM.casteLevel(s, k), lock = SIM.upgradeLock(s, k), C = CASTES[k];
      h += `<div class="up"><div class="up-h">${sicon(k)}<b>${C.name}</b><span>level ${n} of ${L.length}${lock ? ' · ' + lock : ''}</span></div><div class="lv">`;
      L.forEach((U, i) => {
        const pk = (c.picks[k] || {})[i + 1], pn = pk && U.picks.find((p) => p[0] === pk);
        h += `<span class="${i < n ? 'done' : i === n ? 'next' : ''}">${i + 1}. ${U.boost === 'Mastery' ? '★ Mastery' : U.boost}${pn ? ': ' + pn[1] : ''}</span>`;
      });
      h += `</div>`;
      const U = L[n];
      if (U && !lock) {
        const later = laterIn(U.cost), pay = SIM.canPay(c, U.cost);
        const why = later ? `needs ${LATER[later]}: coming in a later build` : pay ? '' : 'short on materials';
        if (U.picks) h += `<div class="btns">` + U.picks.map(([pk, pn, pd]) => `<button data-upc="${k}:${pk}" ${pay ? '' : 'disabled'}><b>${n + 1}. ${U.boost === 'Mastery' ? '' : U.boost + ' + '}${pn}</b><i>${pd}</i><i>${costIcons(U.cost)}${why ? ' · ' + why : ''}</i></button>`).join('') + `</div>`;
        else h += `<div class="btns one"><button data-upc="${k}:" ${pay ? '' : 'disabled'}><b>${n + 1}. ${U.boost}</b><i>${costIcons(U.cost)}${why ? ' · ' + why : ''}</i></button></div>`;
      } else if (!U) h += `<div class="note">All levels bought.</div>`;
      const P = PROMOS[FAMILY[k]], d = SIM.doctrineOf(s, k);
      for (const [slot, label] of [[0, 'Veterans learn'], [1, 'Elites add']]) {
        h += `<div class="doc">${label}:` + P.map(([pk, pn, pd]) => `<button data-doc="${k}:${slot}:${pk}" class="${d[slot] === pk ? 'on' : ''}" data-tip="${pd}">${pn}</button>`).join('') + `</div>`;
      }
      h += `</div>`;
    }
    return h;
  }
  function growEvo(s, c) {
    let h = `<div class="note">Spend 🧬 Genes and materials. Genes come from scouting new regions, the first of each find brought home, every 10 eggs hatched, and big kills. Doing a node's deed halves its 🧬. Faded nodes come in later builds.</div>`;
    const kids = (key, b) => EVO.filter((n) => n.branch === b && (n.after || null) === key);
    for (const B of BRANCHES) {
      h += `<div class="branch"><b>${B.name}</b><div class="note">${B.note}</div>`;
      const walk = (key, depth) => {
        for (const n of kids(key, B.key)) {
          const lock = SIM.evoLock(s, n.key), cost = evoCost(s, n), pay = SIM.canPay(c, cost);
          const cls = lock === 'owned' ? 'owned' : n.soon ? 'soon' : !lock && pay ? 'ready' : '';
          const deed = n.deed ? (n.deed[1](s) ? ' · deed done: half 🧬' : ` · deed: ${n.deed[0]} for half 🧬`) : '';
          const state = lock === 'owned' ? '✓ evolved' : lock ? lock : pay ? 'tap to evolve' : 'short on materials';
          h += `<button class="node ${cls}${n.big ? ' big' : ''}" data-evo="${n.key}" style="margin-left:${depth * 14}px;width:calc(100% - ${depth * 14}px)" ${lock || !pay ? 'aria-disabled="true"' : ''}><b>${n.name}</b><i>${n.fx}</i><i>${costIcons(cost)}${deed}</i><i>${state}</i></button>`;
          walk(n.key, depth + 1);
        }
      };
      walk(null, 0);
      h += `</div>`;
    }
    return h;
  }
  function growRanks(s, c) {
    const mine = s.ants.filter((a) => !a.team && a.state !== 'dead');
    let h = `<div class="note">Ants get better at their jobs as they work. They hatch pale and darken; Veterans learn a promotion and Elites a second, and get a name. A big kill makes a Legend.</div>`;
    h += `<table class="ranks"><tr><th></th>${RANKS.map((r) => `<th>${r.name}</th>`).join('')}</tr>`;
    for (const k of CASTE_ORDER) {
      const row = RANKS.map(() => 0); for (const a of mine) if (a.caste === k) row[rankOf(a)]++;
      if (row.some((x) => x)) h += `<tr><td>${CASTES[k].name}</td>${row.map((x) => `<td>${x || '·'}</td>`).join('')}</tr>`;
    }
    h += `</table>`;
    const named = mine.filter((a) => a.name).sort((a, b) => (b.xp || 0) - (a.xp || 0));
    h += `<div class="t" style="margin-top:10px">Named ants</div>`;
    h += named.length ? named.map((a) => `<div class="named"><b>${a.name}${a.title ? ' ' + a.title : ''}</b>${a.isPlayer ? ' (you)' : ''} · ${RANKS[rankOf(a)].name} ${CASTES[a.caste].name} · ${Math.floor(a.xp || 0)} xp</div>`).join('') : `<div class="note">None yet. Elites get names.</div>`;
    h += `<div class="t" style="margin-top:10px">The fallen</div>`;
    h += c.fallen.length ? c.fallen.map((f) => `<div class="named">${f.name}${f.title ? ' ' + f.title : ''}${f.you ? ' (you)' : ''} · ${RANKS[f.rank].name} ${CASTES[f.caste].name} · ${({ spider: 'the spider', rival: 'a rival', war: 'in battle', antlion: 'an antlion', mower: 'the mower', foot: 'a foot', bird: 'a robin', toad: 'the toad', acorn: 'an acorn', spray: 'bug spray', fireants: 'fire ants', starved: 'starved', hunger: 'starved' }[f.cause] || f.cause)}</div>`).join('') : `<div class="note">No named ant has died.</div>`;
    return h;
  }
  // Your ant died: come back as one of your named ants, or wait for an egg.
  function rebornChoices() { return app.s.ants.filter((a) => !a.team && a.state !== 'dead' && !a.isPlayer && rankOf(a) >= 3).sort((a, b) => (b.xp || 0) - (a.xp || 0)).slice(0, 4); }
  function renderReborn() {
    const list = rebornChoices();
    return `<div class="row head"><strong>Your ant is gone</strong></div><div class="note">Come back as one of your named ants, or wait for the next hatchling.</div><div class="btns">`
      + list.map((a) => `<button data-possess="${a.id}">${sicon(a.caste)}<b>${a.name}${a.title ? ' ' + a.title : ''}</b><i>${RANKS[rankOf(a)].name} ${CASTES[a.caste].name}</i></button>`).join('')
      + `<button data-wait="1"><b>Wait</b><i>for the next hatchling</i></button></div>`;
  }

  function renderSheet() {
    const s = app.s, c = s.colony;
    if (app.menu === 'help' || app.menu === 'info' || app.menu === 'map' || app.menu === 'colony') return;
    let h = '';
    if (app.menu === 'egg') {
      h += `<div class="row head"><strong>Queen · next egg</strong><button class="x" data-close="1">Close</button></div><div class="note">${EXPL.queen[1]}</div><div class="btns">`;
      for (const k of Object.keys(CASTES)) {
        const C = CASTES[k];
        const lock = SIM.eggLock(s, k);
        const ec = SIM.eggCost(s, k), dis = lock || !SIM.canPay(c, ec) || c.eggQueue.length >= 10;
        h += `<button data-egg="${k}" ${dis ? 'disabled' : ''}>${sicon(k)}<b>${C.name}</b><i>${lock || costIcons(ec) + ' · ⏱' + Math.round(C.hatch * c.hatchMul) + 's'}</i></button>`;
      }
      h += `</div>`;
      const cap = SIM.queenCap(s.queen.level), up = SIM.QUEEN_UP[s.queen.level];
      h += `<div class="note">Queen level ${s.queen.level + 1} · holds ${cap} ants (${SIM.antCount(s)} now)${SIM.antCount(s) >= cap ? ' · at the cap, eggs paused' : ''}</div>`;
      const later = up && laterIn(up);
      if (up) h += `<div class="btns one"><button data-up="1" ${SIM.canPay(c, up) ? '' : 'disabled'}>${sicon('queen')}<b>Upgrade queen to level ${s.queen.level + 2}</b><i>${costIcons(up)} · +20 ants${s.queen.level === 0 ? ' · unlocks clay digging' : ''}</i>${later ? `<i>needs ${LATER[later]}: coming in a later build</i>` : ''}</button></div>`;
      // Her traits: one pick, for good, at levels IV, VI and VIII.
      for (const Q of QUEEN_TRAITS) if (s.queen.level >= Q.level && !c.qtraits[Q.level]) {
        h += `<div class="note">Level ${Q.level + 1}: pick a trait, for good.</div><div class="btns">` + Q.picks.map(([k, n, d]) => `<button data-qt="${Q.level}:${k}"><b>${n}</b><i>${d}</i></button>`).join('') + `</div>`;
      }
      const traits = Object.values(c.qtraits).map((k) => QUEEN_TRAITS.flatMap((q) => q.picks).find((p) => p[0] === k)).filter(Boolean);
      if (traits.length) h += `<div class="note">Her traits: ${traits.map((p) => `<b>${p[1]}</b> (${p[2].toLowerCase()})`).join(' · ')}</div>`;
      // Training and the tech tree live under Evolve.
      h += `<div class="note">Foragers range ${SIM.FORAGE[Math.min(4, c.forage || 0)].range} tiles from the nest on their own. Your trails lead them farther.</div>`;
      h += `<div class="btns one"><button data-grow="ants">${sicon('evolve')}<b>Train ants · evolve</b><i>🧬 ${c.genes} · upgrades for each kind of ant, and the evolution tree</i></button></div>`;
      if (c.eggs.length || c.eggQueue.length) {
        h += `<div class="eggs">`;
        for (const e of c.eggs) h += `<span class="egg"><em style="width:${Math.min(100, (e.t / e.need) * 100)}%"></em>${CASTES[e.caste].name}</span>`;
        for (const q of c.eggQueue) h += `<span class="egg q">${CASTES[q].name}</span>`;
        h += `</div><div class="note">${c.eggs.length}/${c.hatchCap} hatching · ${c.eggQueue.length} queued</div>`;
      } else h += `<div class="note">No eggs. The queen waits.</div>`;
    } else if (app.menu === 'grow') {
      h = renderGrow();
    } else if (app.menu === 'reborn') {
      h = renderReborn();
    } else if (app.menu === 'catalog') {
      const builders = s.ants.filter((a) => a.caste === 'builder').length;
      h += `<div class="row head"><strong>Build</strong><button class="x" data-close="1">Close</button></div>`;
      h += `<div class="note">Pick a room, then tap a green spot in the nest to place it. ${builders} builder${builders === 1 ? '' : 's'}. Dug cells: ${SIM.dugCount(s)}. Dig orders: ${s.nest.digOrders.length}, fill orders: ${s.nest.fillOrders.length}.</div><div class="btns">`;
      for (const k of ROOM_KEYS) {
        const R = ROOMS[k];
        const have = SIM.roomOf(s, k), queued = c.buildQueue.some((j) => j.room === k);
        const rc = SIM.roomCost(s, k), fits = app.anyFit(R.w, R.h), pay = SIM.canPay(c, rc);
        // A cost above the food cap can never be paid: say what unlocks it.
        const overCap = (rc.food || 0) > c.cap;
        const status = have ? 'built' : queued ? 'being built' : overCap ? `needs a Food store first (food cap ${c.cap})` : !fits ? 'no ' + R.w + '×' + R.h + ' pocket dug yet' : !pay ? 'short on: ' + SIM.costText(rc) : 'ready to place';
        h += `<button data-place="${k}" ${have || queued || !fits || !pay ? 'disabled' : ''}>${sicon(k)}<b>${R.name} · ${R.w}×${R.h}</b><i>${costIcons(rc)} · ${R.desc}</i><i>${status}</i></button>`;
      }
      h += `</div><div class="t" style="margin-top:10px">Tools</div><div class="btns">`;
      h += `<button data-tool="fill"><b>Fill tunnel</b><i>Tap dug cells to have builders pack them back with dirt</i></button>`;
      h += `<button data-tool="remove"><b>Remove room</b><i>Tap a room to tear it out, half the cost back</i></button>`;
      h += `<button data-cleardigs="1" ${s.nest.digOrders.length || s.nest.fillOrders.length ? '' : 'disabled'}><b>Clear orders</b><i>Cancel pending digs and fills</i></button>`;
      h += `</div>`;
    }
    if (el.sheet.innerHTML !== h) el.sheet.innerHTML = h;
  }
  // ---------------------------------------------------------- yard map
  // The whole backyard as a plan: all 70 regions, greyed until you've been
  // there. Tap a region for its card: what's there, what it costs you.
  const GROUND = { slab: '#8e8a84', mulch: '#7a4a2e', bark: '#8e764a', mud: '#5a4836', home: '#7a6446', compost: '#40301e', sand: '#c8b48a', lawn: '#46802a', picnic: '#b8323a', soil: '#4a3220', grass: '#55803a', long: '#3e6e2a', gravel: '#8a8272', deck: '#86806f', hedge: '#2e4a22', oak: '#3a5a24', wild: '#5a6230', wet: '#3a3226', leaf: '#a85a2a', mound: '#8a4a2e' };
  function regionHere() {
    const s = app.s, a = P().ant;
    return a && !P().inNest ? SIM.areaOf(s, a.tx, a.ty) : SIM.areaOf(s, s.world.ex, s.world.ey);
  }
  function renderMap() {
    const s = app.s, here = regionHere(), pickI = app.mapPick ?? here;
    const count = new Array(SIM.AREAS.length).fill(0);
    for (const a of s.ants) if (!a.team && (a.state !== 'in' && a.state !== 'build' && a.state !== 'nest' && a.state !== 'dead')) count[SIM.areaOf(s, a.tx, a.ty)]++;
    let h = `<div class="row head"><strong>The yard</strong><button class="x" data-close="1">Close</button></div><div class="yard">`;
    for (const z of YARD_MAP.zones) {
      const [c, r, w, hh] = z.at, pos = `grid-column:${c + 1}/span ${w};grid-row:${r + 1}/span ${hh}`;
      h += `<div class="z${z.house ? ' house' : ''}" style="${pos}" title="${z.name}">${z.name}</div>`;
    }
    // Built regions sit on top of the planned zones they belong to.
    for (let i = 0; i < SIM.AREAS.length; i++) {
      const A = SIM.AREAS[i], [c, r] = A.at, pos = `grid-column:${c + 1};grid-row:${r + 1}`, seen = s.seen['area' + i] || i === SIM.REGION.rock;
      const tag = i === SIM.REGION.patio && s.rival.queenAlive ? '⚔' : count[i] ? '🐜' + count[i] : '';
      h += `<button class="z${seen ? '' : ' unseen'}${i === here ? ' here' : ''}${i === pickI ? ' pick' : ''}" style="${pos};background:${GROUND[A.ground]}" data-region="${i}" aria-label="${A.name}">${A.short}${tag ? `<em>${tag}</em>` : ''}</button>`;
    }
    h += `</div>`;
    const A = SIM.AREAS[pickI], seen = s.seen['area' + pickI] || pickI === SIM.REGION.rock;
    h += `<div class="card"><strong>${A.name}</strong>${pickI === here ? ' · you are here' : ''}${seen ? '' : ' · not explored yet'}<div>${A.blurb}</div><dl><dt>Danger</dt><dd>${A.challenge}</dd><dt>Find</dt><dd>${A.resource}</dd><dt>Prize</dt><dd>${A.reward}</dd>${count[pickI] ? `<dt>Your ants</dt><dd>${count[pickI]} out here now</dd>` : ''}</dl></div>`;
    h += `<div class="note">${SIM.AREAS.length} regions. Grey ones you haven't explored yet.</div>`;
    el.sheet.innerHTML = h;
  }
  function openMap() { app.menu = 'map'; app.mapPick = null; el.sheet.classList.remove('hidden'); renderMap(); app.paused = true; }
  // The plan of the whole backyard (all its regions, built or not), from the map's "Whole yard".

  function openMenu(m, cell) { app.menu = m; app.menuCell = cell || null; el.sheet.classList.remove('hidden'); renderSheet(); }
  function closeMenu() { app.menu = null; app.menuCell = null; el.sheet.classList.add('hidden'); app.paused = false; }
  function openHelp() { app.menu = 'help'; el.sheet.classList.remove('hidden'); el.sheet.innerHTML = HELP; app.paused = true; }
  // The full numbers behind the stat chips.
  function renderColony() {
    const s = app.s, c = s.colony, st = SIM.stats(s);
    const h = `<div class="row head"><strong>Colony</strong><button class="x" data-close="1">Close</button></div>`
      + `<div class="h">Food ${Math.floor(c.store)} of ${c.cap} · water ${Math.floor(c.water)} of ${c.waterCap} · protein ${Math.floor(c.protein)} · stone ${Math.floor(c.grit)}</div>`
      + `<div class="h">${app.statsLine || ''}</div>`
      + `<div class="h">Ants by kind: ${Object.entries(st.byCaste).map(([k, n]) => `${CASTES[k].name} ${n}`).join(' · ') || 'none yet'}</div>`;
    if (el.sheet.innerHTML !== h) el.sheet.innerHTML = h;
  }
  function openColony() { app.menu = 'colony'; el.sheet.classList.remove('hidden'); renderColony(); }

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
      if (app.placing.kind === 'fill') return 'Fill: tap tunnel cells to pack them back. Cancel to stop.';
      return 'Remove: tap a room to tear it out. Cancel to stop.';
    }
    if (s.lost) return 'The queen is dead. The colony is lost. Press Reset to found a new one.';
    if (s.won) return 'The rival queen is dead. Keep growing, or Reset for a fresh yard.';
    if (app.areaBanner && app.areaBanner.until > performance.now()) return app.areaBanner.text;
    if (s.phase === 'dig') return q.energy > 0 ? `You are the queen. Tap the dirt next to her to dig (${q.energy} digs left). Two down, then Build nest.` : 'Out of energy. Tap Build nest.';
    if (!a) return 'Waiting for the next hatchling.';
    if (P().inNest) return app.view === 'nest' ? 'Tap the top cell to go outside. Tap the queen for eggs; Build adds rooms.' : 'Your ant is inside. Tap Nest view.';
    if (a.carry) return 'Carry it to the dark hole. Your trail lays itself.';
    if (s.t < 180 && c.store < 8) return 'Tap a crumb or seed to walk there, then Pick up. Hold to keep walking.';
    if (c.water < 3) return 'Water is low. Fetch dew or puddle water.';
    if (!c.eggQueue.length && !c.eggs.length && c.store >= 4) return 'Food in store. Tap Nest, tap the queen, lay an egg.';
    if (P().hunger < 35) return 'You are hungry. Go home, or stand by a forager carrying food.';
    if (s.ants.filter((x) => x.caste === 'builder').length === 0 && c.store >= 10) return 'Lay a Builder egg. Builders dig rooms.';
    if (SIM.eggLock(s, 'soldier') && c.protein < 5 && s.cat) return 'Soldiers need protein. Hunt the caterpillar with a crew.';
    if (SIM.eggLock(s, 'soldier') && c.protein >= 5) return 'You have protein. Dig a 6×3 pocket and build a Barracks.';
    return '';
  }
  function update() {
    const s = app.s, c = s.colony;
    const st = SIM.stats(s);
    const cap = SIM.queenCap(s.queen.level), nAnts = SIM.antCount(s);
    // One compact row of chips; each says what it is when touched or hovered.
    const chip = (icon, val, tip, warn) => `<span class="chip${warn ? ' warn' : ''}" data-tip="${tip}">${icon}${val}</span>`;
    const statsHtml = chip('🌾', `${Math.floor(c.store)}<i>/${c.cap}</i>`, `Food ${Math.floor(c.store)} of ${c.cap}`, c.store < 3)
      + chip('💧', `${Math.floor(c.water)}<i>/${c.waterCap}</i>`, `Water ${Math.floor(c.water)} of ${c.waterCap}. Each egg costs 1`, c.water < 2)
      + chip('🥩', Math.floor(c.protein), 'Protein: for soldiers and the queen')
      + chip('🪨', Math.floor(c.grit), 'Stone: for rooms and the queen')
      + chip('🐜', `${nAnts}<i>/${cap}</i>`, `Ants ${nAnts} (${st.out} out). The queen holds ${cap}`)
      + (c.genesTotal ? chip('🧬', c.genes, 'Genes: spend them under Evolve') : '')
      + (s.queen.placed && s.queen.hp < 99.5 ? chip('👑', Math.ceil(s.queen.hp), 'Your queen’s health', true) : '')
      + (s.rival.queenAlive && s.rival.qhp < 999 ? chip('⚔', Math.ceil(s.rival.qhp / 10) + '%', 'The rival queen’s health') : '')
      + (s.rain.on ? chip('🌧', '', 'Raining: trails wash out') : '')
      + (s.repairs.length ? chip('⚠', s.repairs.length, 'Cave-ins to repair', true) : '')
      + `<button class="more" data-tip="Colony details" aria-label="Colony details">⋯</button>`;
    if (el.stats.dataset.html !== statsHtml) { el.stats.dataset.html = statsHtml; el.stats.innerHTML = statsHtml; }
    app.statsLine = `🐜 ${nAnts}/${cap} (${st.out} out) · rival ${st.rival} · +${st.income.toFixed(0)} −${st.upkeep.toFixed(0)} food/min · ${app.fps} fps`;
    const a0 = P().ant;
    const it = introText();
    const istep = introStep() >= 0 ? INTRO[introStep()] : null;
    if (it) { const want = istep.btn ? `${it} <button class="next" id="intronext">${istep.btn}</button>` : it; if (el.msg.innerHTML !== want) el.msg.innerHTML = want; }
    else el.msg.textContent = hint();
    pulseFor(el.msg.textContent);
    // Crossing into another part of the yard: name it (and describe it the first time).
    if (a0 && !P().inNest) { const ai = SIM.areaOf(s, a0.tx, a0.ty); if (ai !== app.lastArea) { if (app.lastArea != null) { const A = SIM.AREAS[ai]; const first = !s.seen['area' + ai]; s.seen['area' + ai] = true; app.areaBanner = { text: first ? `${A.name}. ${A.blurb}` : A.name, until: performance.now() + (first ? 6000 : 2500) }; } app.lastArea = ai; } }
    el.hungerBar.style.width = Math.max(0, P().hunger) + '%';
    el.hungerBar.style.background = P().hunger < 35 ? '#e4524a' : '#8fd36b';
    const lbl = SIM.actionLabel(s) || 'Pick up';
    const lift = /^Lift (\d+\/\d+)/.exec(lbl);
    setIcon(el.act, /^(Drop|Set down)/.test(lbl) ? 'drop' : 'pick', lbl, lift ? lift[1] : '');
    el.act.disabled = !SIM.actionLabel(s);
    setIcon(el.release, 'release', st.followers ? `Release ${st.followers}` : 'Release', st.followers || '');
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
    setIcon(el.level, app.placing ? 'cancel' : 'build', app.placing ? 'Cancel' : 'Build rooms');
    el.level.classList.toggle('on', !!app.placing);
    if (nAnts >= cap && s.queen.placed) showExplainer('cap');
    if (s.seen.nest && !s.seen.soil && SIM.dugCount(s) > 12) showExplainer('soil');
    setIcon(el.view, app.view === 'nest' ? 'surface' : 'nest', app.view === 'nest' ? 'Surface' : 'Nest');
    // A chime for each Gene earned and each new Elite.
    if (app.lastGenes != null && c.genesTotal > app.lastGenes) sfx.play('genes');
    app.lastGenes = c.genesTotal;
    const named = c.named; if (app.lastNamed != null && named > app.lastNamed) sfx.play('rankUp'); app.lastNamed = named;
    // Your ant died and you have named ants: offer them as your next body.
    if (P().ant) app.rebirthAsked = false;
    else if (P().pending && !app.rebirthAsked && !app.menu && s.queen.placed && rebornChoices().length) { app.rebirthAsked = true; openMenu('reborn'); app.paused = true; }
    if (app.menu === 'colony') renderColony();
    if (app.menu) renderSheet();
  }

  // ---------------------------------------------------------- wiring
  $('help').addEventListener('click', openHelp);
  // The map button opens the photo map; its "Whole yard" button opens the plan.
  const mapView = new MapView(app, () => openMap());
  el.map.addEventListener('click', () => { if (mapView.isOpen) mapView.close(); else { closeMenu(); mapView.open(); } });
  el.stats.addEventListener('click', (e) => { if (e.target.closest('.more')) { if (app.menu === 'colony') closeMenu(); else openColony(); } });
  el.msg.addEventListener('click', (e) => { if (e.target && e.target.id === 'intronext') introAdvance(); });
  el.sheet.addEventListener('click', (e) => {
    const s = app.s;
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.close) { closeMenu(); return; }
    if (b.dataset.film) { closeMenu(); app.playFilm(); return; }
    if (b.dataset.title) { closeMenu(); app.openTitle(); return; }
    if (b.dataset.stress) { closeMenu(); SIM.stress(s, 200); flash('+200 foragers spawned for a frame-rate test.', /^\+200/, 4000); return; }
    if (b.dataset.reset) { confirmSheet('Start over? This clears the saved colony.', 'Start over', () => app.reset()); return; }
    if (b.dataset.region) { app.mapPick = +b.dataset.region; renderMap(); return; }
    if (b.dataset.egg) { SIM.queueEgg(s, b.dataset.egg); renderSheet(); return; }
    if (b.dataset.up) { SIM.upgradeQueen(s); renderSheet(); return; }
    if (b.dataset.forage) { SIM.upgradeForage(s); renderSheet(); return; }
    if (b.dataset.grow) { app.growTab = b.dataset.grow; openMenu('grow'); return; }
    if (b.dataset.tab) { app.growTab = b.dataset.tab; renderSheet(); return; }
    if (b.dataset.upc) { const [k, pk] = b.dataset.upc.split(':'); if (SIM.upgradeCaste(s, k, pk || undefined)) sfx.play('evolve'); renderSheet(); return; }
    if (b.dataset.evo) { if (SIM.buyEvo(s, b.dataset.evo)) sfx.play('evolve'); renderSheet(); return; }
    if (b.dataset.doc) { const [k, slot, pk] = b.dataset.doc.split(':'); SIM.setDoctrine(s, k, +slot, pk); renderSheet(); return; }
    if (b.dataset.qt) { const [lv, k] = b.dataset.qt.split(':'); SIM.pickQueenTrait(s, +lv, k); renderSheet(); return; }
    if (b.dataset.possess) { SIM.possess(s, +b.dataset.possess); closeMenu(); return; }
    if (b.dataset.wait) { app.rebirthAsked = true; closeMenu(); return; }
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
  el.evolve.addEventListener('click', () => { if (app.menu === 'grow') closeMenu(); else { mapView.isOpen && mapView.close(); openMenu('grow'); app.paused = true; } });
  el.level.addEventListener('click', () => { if (app.placing) app.placing = null; else openMenu('catalog'); });
  el.exitNest.addEventListener('click', () => { P().ntx = SHAFT; P().nty = 0; P().exiting = true; });

  let recN = 0, recTimer = null;
  el.recruit.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (!P().ant || P().inNest) return;
    recN = 1;
    setIcon(el.recruit, 'recruit', 'Recruit 1', 1);
    recTimer = setInterval(() => { if (recN < SIM.crewCap(app.s)) { recN++; setIcon(el.recruit, 'recruit', 'Recruit ' + recN, recN); } }, 140);
  });
  const recEnd = () => {
    if (!recTimer) return;
    clearInterval(recTimer);
    recTimer = null;
    const got = SIM.recruit(app.s, recN);
    setIcon(el.recruit, 'recruit', 'Recruit (hold for more)');
    if (got < recN) flash(got ? `${got} ants answered. Recruit near the nest or near other ants.` : 'No ants in range. Walk back toward the nest and try again.', /answered|in range/, 3000);
  };
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => el.recruit.addEventListener(t, recEnd));
  $('zoom').addEventListener('click', () => { app.zoomMul = app.zoomMul >= 1.5 ? 0.6 : app.zoomMul >= 0.9 ? 1.6 : 1; });

  // In-page confirmation (browser confirm() is blocked in some hosts).
  function confirmSheet(text, yes, fn) {
    app.confirmAction = fn;
    app.menu = 'info';
    el.sheet.classList.remove('hidden');
    el.sheet.innerHTML = `<div class="row head"><strong>${text}</strong></div><div class="btns"><button data-confirm="no">Keep playing</button><button data-confirm="yes" class="primary">${yes}</button></div>`;
    app.paused = true;
  }

  return { update, checkExplainers, closeMenu, openMenu, openHelp, flash, confirmSheet, introStep, introText };
}

export const GRID = { NW, NH };
