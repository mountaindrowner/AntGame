// HUD, bottom bars, sheets (queen, build catalog, help, explainer cards) and
// the intro. Ported from build 6's app.js; the behaviour is the same, only
// the state now lives on the shared `app` object.
import SIM from '../sim/sim.js';
import { EXPL, HELP_PAGES, INTRO } from './copy.js';
import { sfx } from '../audio/sfx.js';
import { YARD_MAP } from '../sim/yard.js';
import { ICONS } from './icons.js';
import { MapView } from './mapView.js';
import { EvolveView } from './evolveView.js';
import { RES as GRES, UPGRADES, BRANCHES, EVO, EVO_BY, evoCost, laterIn, LATER, RANKS, rankOf, PROMOS, FAMILY, QUEEN_TRAITS, GOALS, goalBoard, SETS, TIERS, prizeOf, GUARDIANS } from '../sim/growth.js';

const { NW, NH, T, SHAFT, CASTES, ROOMS, ROOM_KEYS } = SIM;
const $ = (id) => document.getElementById(id);

export function createUI(app) {
  const P = () => app.s.player;
  const el = {
    stats: $('stats'), msg: $('msg'), hungerBar: $('hungerbar'), act: $('act'), release: $('release'), mark: $('mark'),
    recruit: $('recruit'), enter: $('enter'), barS: $('bar'), barN: $('barn'), sheet: $('sheet'), buildNest: $('buildnest'),
    exitNest: $('exitnest'), queen: $('queenbtn'), level: $('levelbtn'), view: $('viewbtn'), menu: $('menubtn'), map: $('mapbtn'), evolve: $('evolvebtn'), outpost: $('outpostbtn'), zoom: $('zoom'), help: $('help'), tip: $('tip'),
  };

  // ---------------------------------------------------------- icon buttons
  // Every HUD button is a small icon; its name shows as a tip on hover or a
  // long press (see tips below), and doubles as its aria-label. A badge
  // carries a number when there is one (Lift 3/6, Release 4, Recruit 7).
  // Bottom-bar buttons also wear a short name curved over their tops.
  const ARC = { menu: 'Menu', map: 'Map', evolve: 'Evolve', zoom: 'Zoom', help: 'Help', nest: 'Nest', surface: 'Yard', outpost: 'Outpost', pick: 'Pick up', drop: 'Drop', trail: 'Trail', recruit: 'Recruit', release: 'Release', enter: 'Enter', exit: 'Exit', dig: 'Dig in', queen: 'Queen', build: 'Build', cancel: 'Cancel' };
  const arc = (b, text) => `<svg class="arc" viewBox="0 0 70 70" aria-hidden="true"><path id="arc-${b.id}" d="M7,35 A28,28 0 0 1 63,35" fill="none"/><text><textPath href="#arc-${b.id}" startOffset="50%" text-anchor="middle">${text}</textPath></text></svg>`;
  function setIcon(b, icon, tip, badge) {
    const name = b.closest('.dock') || b.closest('#bar2') ? (/^Lift/.test(tip) ? 'Lift' : /^Set down/.test(tip) ? 'Set down' : ARC[icon]) : '';
    const key = icon + '|' + (badge ?? '') + '|' + name;
    if (b.dataset.key !== key) { b.dataset.key = key; b.innerHTML = ICONS[icon] + (badge != null && badge !== '' ? `<b class="badge">${badge}</b>` : '') + (name ? arc(b, name) : ''); }
    if (b.dataset.tip !== tip) { b.dataset.tip = tip; b.setAttribute('aria-label', tip); }
  }
  setIcon(el.mark, 'trail', 'Mark trail'); setIcon(el.recruit, 'recruit', 'Recruit (hold for more)'); setIcon(el.release, 'release', 'Release');
  setIcon(el.enter, 'enter', 'Enter nest'); setIcon(el.buildNest, 'dig', 'Build nest'); setIcon(el.queen, 'queen', 'Queen: lay eggs');
  setIcon(el.exitNest, 'exit', 'Exit nest'); setIcon(el.map, 'map', 'Yard map'); setIcon(el.menu, 'menu', 'Main menu: options, sound, new colony (Esc)'); setIcon(el.evolve, 'evolve', 'Goals and evolution'); setIcon(el.zoom, 'zoom', 'Zoom'); setIcon(el.help, 'help', 'Help');
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
  const NAMED = [['Build nest', 'buildnest'], ['Enter nest', 'enter'], ['Exit nest', 'exitnest'], ['Pick up', 'act'], ['Mark trail', 'mark'], ['Recruit', 'recruit'], ['Release', 'release'], ['Lift', 'act'], ['Queen', 'queenbtn'], ['the queen', 'queenbtn'], ['Build', 'levelbtn'], ['Nest', 'viewbtn'], ['Map', 'mapbtn'], ['Trail', 'mark'], ['Evolve', 'evolvebtn'], ['Outpost', 'outpostbtn']];
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
  // Tips (build 14): a small card under the hint that doesn't stop the game
  // and fades by itself. Each shows once, ever: a tip seen in one colony
  // isn't shown again in the next (Help → Menu → Show tips again).
  const TIPS_KEY = 'underfoot-tips';
  let tipsSeen = {}; try { tipsSeen = JSON.parse(localStorage.getItem(TIPS_KEY)) || {}; } catch (e) { /* none */ }
  const tipCard = document.createElement('div'); tipCard.id = 'tipcard'; tipCard.className = 'hidden'; $('top').appendChild(tipCard);
  tipCard.addEventListener('click', () => { tipCard.classList.add('hidden'); app.tipUntil = 0; });
  const tipBusy = () => (app.tipUntil || 0) > performance.now();
  function showExplainer(key) {
    const s = app.s;
    if (s.seen[key]) return;
    if (tipsSeen[key]) { s.seen[key] = true; return; }
    if (tipBusy()) return; // one at a time; it shows the next time it comes up
    s.seen[key] = tipsSeen[key] = true;
    try { localStorage.setItem(TIPS_KEY, JSON.stringify(tipsSeen)); } catch (e) { /* blocked */ }
    const [t, b] = EXPL[key];
    sfx.play('explainer');
    tipCard.innerHTML = `${t ? `<b>${t}</b>` : ''}<span>${b}</span><em>✕</em>`;
    tipCard.classList.remove('hidden');
    const until = (app.tipUntil = performance.now() + 9000);
    setTimeout(() => { if (app.tipUntil === until) tipCard.classList.add('hidden'); }, 9000);
  }
  function checkExplainers() {
    const s = app.s;
    tickIntro();
    if (introStep() >= 0) { if (s.events.length && !EXPL[s.events[0]]) s.events.shift(); }
    if (introStep() >= 0) {
      while (s.events.length) {
        const e = s.events.shift();
        if (EXPL[e] && !['dig', 'nest', 'surface'].includes(e)) { showExplainer(e); if (tipBusy()) return; }
      }
      // The spider warning can't wait for the intro to finish.
      const a0 = P().ant;
      if (a0 && !P().inNest && s.spider && Math.hypot(a0.x - s.spider.x, a0.y - s.spider.y) < 9 * T) showExplainer('spider');
      return;
    }
    if (s.phase === 'dig') showExplainer('dig');
    else if (P().ant && P().inNest) showExplainer('nest');
    else if (P().ant && !P().inNest) showExplainer('surface');
    if (tipBusy()) return;
    while (s.events.length) { const e = s.events.shift(); if (EXPL[e]) { showExplainer(e); if (tipBusy()) return; } }
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
    const s = app.s, c = s.colony, tab = app.growTab || 'goals';
    let h = `<div class="row head"><strong>Evolve · <span class="genes">🧬 ${c.genes}</span></strong><button class="x" data-close="1">Close</button></div>`;
    h += `<div class="tabs">${[['goals', 'Goals'], ['ants', 'Ants'], ['evo', 'Evolution'], ['ranks', 'Ranks']].map(([k, n]) => `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${n}</button>`).join('')}</div>`;
    if (tab === 'goals') h += growGoals(s, c);
    else if (tab === 'ants') h += growAnts(s, c);
    else if (tab === 'evo') h += growEvo(s, c);
    else h += growRanks(s, c);
    return h;
  }
  const there = (A) => A.name.replace(/^The /, 'the ');
  function growGoals(s, c) {
    let h = `<div class="note">Three goals at a time. Each pays 🧬; finish a whole set for a reward for good.</div>`;
    for (const g of goalBoard(s)) {
      if (!g) continue;
      const n = Math.min(g.of, Math.floor(g.n(s)));
      h += `<div class="goal"><div class="tier">${TIERS[g.tier].name} · ${SETS[g.set].name} · 🧬${TIERS[g.tier].genes}</div><b>${g.text}</b>${g.of > 1 ? ` <span class="note">${n} of ${g.of}</span>` : ''}<div class="bar"><i style="width:${(n / g.of) * 100}%"></i></div></div>`;
    }
    h += `<div class="t" style="margin-top:10px">Sets</div><div class="sets">`;
    for (const k in SETS) {
      const all = GOALS.filter((g) => g.set === k), d = all.filter((g) => c.goals.done[g.key]).length;
      h += `<div class="${c.goals.sets[k] ? 'done' : ''}"><b>${SETS[k].name}</b> ${d}/${all.length}<br>${SETS[k].reward}</div>`;
    }
    h += `</div><div class="t" style="margin-top:10px">Outposts · ${s.outposts.length} of ${SIM.outpostCap(s)}</div>`;
    if (!SIM.has(s, 'waypoints')) h += `<div class="note">Evolve Waypoints (Senses) to raise outposts: cairns far from home your foragers range round. Put one in a region, beat its guardian, and its prize is yours.</div>`;
    else if (!s.outposts.length) h += `<div class="note">Walk out into the yard and press Outpost. You and your crew pile the pebbles.</div>`;
    for (const o of s.outposts) {
      const A = SIM.AREAS[o.region], G = GUARDIANS[A.key], held = c.held[o.region];
      const st = !o.done ? `being raised (${Math.floor((o.work / 30) * 100)}%)` : held ? `held · ${prizeOf(A.key).text}` : G ? `beat ${G[0]} to hold it` : A.key === 'rock' ? 'home ground' : 'holding…';
      h += `<div class="named"><b>${A.name}</b> · ${st}</div>`;
    }
    return h;
  }
  function growAnts(s, c, kinds = CASTE_ORDER) {
    let h = kinds.includes('you') ? `<div class="note">The ant you play: quicker, tougher, a better leader. Bought once; it carries over every time you're reborn.</div>` : `<div class="note">Each level is bought once for every ant of that kind. Levels with two choices are for good: pick one.</div>`;
    for (const k of kinds) {
      const L = UPGRADES[k], n = SIM.casteLevel(s, k), lock = SIM.upgradeLock(s, k), C = k === 'you' ? { name: 'You' } : CASTES[k];
      h += `<div class="up"><div class="up-h">${sicon(k === 'you' ? 'forager' : k)}<b>${C.name}</b><span>level ${n} of ${L.length}${lock ? ' · ' + lock : ''}</span></div><div class="lv">`;
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
      const P = PROMOS[FAMILY[k]] || [], d = P.length ? SIM.doctrineOf(s, k) : [];
      if (P.length) for (const [slot, label] of [[0, 'At Veteran (50 xp) it learns'], [1, 'At Elite (150 xp) it also learns']]) {
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
  // Or hatch again as any kind of ant you've unlocked.
  const REBORN_AS = { forager: 'Fast, carries food', builder: 'Digs; slow outside', nurse: 'Stays home', soldier: 'Bites hard; a fighter', venom: 'Kills big things' };
  function renderReborn() {
    const s = app.s, list = rebornChoices();
    const why = { spider: 'The spider got you.', rival: 'A rival soldier got you.', war: 'Killed in a fight.', antlion: 'An antlion dragged you under.', mower: 'The mower got you.', foot: 'A foot came down on you.', bird: 'A robin snapped you up.', toad: 'The toad’s tongue got you.', acorn: 'An acorn fell on you.', spray: 'The bug spray got you.', fireants: 'Fire ants stung you to death.', hunger: 'You starved: eat at the nest.' }[P().deathCause] || 'Your ant is gone.';
    let h = `<div class="row head"><strong class="died">You died</strong></div><div class="note">${why}</div>`;
    if (list.length) h += `<div class="note">Come back as one of your named ants, where it stands…</div><div class="btns">` + list.map((a) => `<button data-possess="${a.id}">${sicon(a.caste)}<b>${a.name}${a.title ? ' ' + a.title : ''}</b><i>${RANKS[rankOf(a)].name} ${CASTES[a.caste].name}</i></button>`).join('') + `</div>`;
    h += `<div class="note">${list.length ? '…or hatch' : 'Hatch'} again, as:</div><div class="btns">`;
    for (const k of Object.keys(REBORN_AS)) { const lock = SIM.eggLock(s, k); h += `<button data-rebirth="${k}" ${lock ? 'disabled' : ''}>${sicon(k)}<b>${CASTES[k].name}</b><i>${lock || REBORN_AS[k]}</i></button>`; }
    return h + `</div>`;
  }

  // What each kind of ant is for, under its egg (build 15: "what is a nurse for?").
  const EGG_WHAT = { forager: 'Gathers food and water on its own', builder: 'Digs, builds rooms, hauls dirt out, stops cave-ins', nurse: 'Tends the eggs: they hatch faster', soldier: 'Guards the door, fights raiders; eats protein', venom: 'An 8× sting: kills the spider' };
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
        h += `<button data-egg="${k}" ${dis ? 'disabled' : ''}>${sicon(k)}<b>${C.name}</b><i>${EGG_WHAT[k] || ''}</i><i>${lock || costIcons(ec) + ' · ⏱' + Math.round(C.hatch * c.hatchMul) + 's'}</i></button>`;
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
    if (el.sheet.dataset.h !== h) { el.sheet.dataset.h = h; el.sheet.innerHTML = h; }
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
      const tag = i === SIM.REGION.patio && s.rival.queenAlive ? '⚔' : s.colony.held[i] ? '★' : s.outposts.some((o) => o.region === i) ? '⛳' : count[i] ? '🐜' + count[i] : '';
      h += `<button class="z${seen ? '' : ' unseen'}${i === here ? ' here' : ''}${i === pickI ? ' pick' : ''}" style="${pos};background:${GROUND[A.ground]}" data-region="${i}" aria-label="${A.name}">${A.short}${tag ? `<em>${tag}</em>` : ''}</button>`;
    }
    h += `</div>`;
    const A = SIM.AREAS[pickI], seen = s.seen['area' + pickI] || pickI === SIM.REGION.rock;
    const G = GUARDIANS[A.key], P2 = prizeOf(A.key), out = s.outposts.find((o) => o.region === pickI);
    const hold = s.colony.held[pickI] ? 'Held: yours while your outpost stands' : out ? (out.done ? (G ? `Outpost up; beat ${G[0]} to hold it` : 'Outpost up') : 'Outpost being raised') : P2 ? `Raise an outpost here${G ? ` and beat ${G[0]}` : ''} to hold it` : 'Home';
    h += `<div class="card"><strong>${A.name}</strong>${pickI === here ? ' · you are here' : ''}${seen ? '' : ' · not explored yet'}<div>${A.blurb}</div><dl><dt>Danger</dt><dd>${A.challenge}</dd><dt>Find</dt><dd>${A.resource}</dd><dt>Prize</dt><dd>${A.reward}${P2 ? ` · held: ${P2.text.replace(/^./, (ch) => ch.toLowerCase())}` : ''}</dd><dt>Hold</dt><dd>${hold}</dd>${count[pickI] ? `<dt>Your ants</dt><dd>${count[pickI]} out here now</dd>` : ''}</dl></div>`;
    h += `<div class="note">${SIM.AREAS.length} regions. Grey ones you haven't explored yet.</div>`;
    el.sheet.dataset.h = ''; el.sheet.innerHTML = h;
  }
  function openMap() { app.menu = 'map'; app.mapPick = null; el.sheet.classList.remove('hidden'); renderMap(); app.paused = true; }
  // The plan of the whole backyard (all its regions, built or not), from the map's "Whole yard".

  // Sheets redraw only when their content changes (build 14): the browser rewrites HTML
  // (disabled="", entities), so comparing innerHTML redrew them every tick and could eat a tap.
  function openMenu(m, cell) { app.menu = m; app.menuCell = cell || null; el.sheet.dataset.h = ''; el.sheet.classList.remove('hidden'); renderSheet(); }
  function closeMenu() { app.menu = null; app.menuCell = null; el.sheet.classList.add('hidden'); app.paused = false; }
  function openHelp(tab) {
    app.menu = 'help'; app.helpTab = tab ?? app.helpTab ?? 0; el.sheet.classList.remove('hidden'); app.paused = true;
    el.sheet.dataset.h = '';
    el.sheet.innerHTML = `<div class="row head"><strong>Help</strong><button class="x" data-close="1">Close</button></div><div class="tabs">${HELP_PAGES.map(([n], i) => `<button data-helptab="${i}" class="${i === app.helpTab ? 'on' : ''}">${n}</button>`).join('')}</div>${HELP_PAGES[app.helpTab][1]}`;
  }
  // The full numbers behind the stat chips.
  function renderColony() {
    const s = app.s, c = s.colony, st = SIM.stats(s);
    const h = `<div class="row head"><strong>Colony</strong><button class="x" data-close="1">Close</button></div>`
      + `<div class="h">Food ${Math.floor(c.store)} of ${c.cap} · water ${Math.floor(c.water)} of ${c.waterCap} · protein ${Math.floor(c.protein)} · stone ${Math.floor(c.grit)}</div>`
      + `<div class="h">${app.statsLine || ''}</div>`
      + `<div class="h">Ants by kind: ${Object.entries(st.byCaste).map(([k, n]) => `${CASTES[k].name} ${n}`).join(' · ') || 'none yet'}</div>`;
    if (el.sheet.dataset.h !== h) { el.sheet.dataset.h = h; el.sheet.innerHTML = h; }
  }
  function openColony() { el.sheet.dataset.h = ''; app.menu = 'colony'; el.sheet.classList.remove('hidden'); renderColony(); }

  // ---------------------------------------------------------- HUD
  function flash(text, test, ms) {
    P().msg = text;
    setTimeout(() => { if (test.test(P().msg)) P().msg = ''; }, ms);
  }
  const DANGER = /raid|spider|starv|killed|died|attack|cave|rain|thunder|mower|robin|toad|acorn|spray|fire ants|shadow|lost|idle|hungry|too heavy|knocked/i;
  const GOOD = /^\+|down!|finished|raised|you hold|goal|genes|elite|legend|lifted|hauls in|raid over|unlocked|all done/i;
  const NEWS = /^(the |an? )?[A-Z][a-z]+( [A-Za-z]+)?\. |landed|is back/;
  function noticeKind(t) { if (!t) return ''; if (GOOD.test(t) && !/lost your hold|knocked/i.test(t)) return /raid over/i.test(t) ? 'report' : 'good'; if (DANGER.test(t)) return 'danger'; if (NEWS.test(t)) return 'news'; return ''; }
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
      + (c.genesTotal ? chip('🧬', c.genes, 'Genes: tap to evolve').replace('<span class="chip', '<span data-genes="1" class="chip') : '')
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
    if (it) { const want = istep.btn ? `${it} <button class="next" id="intronext">${istep.btn}</button>` : istep.skip ? `${it} <button class="next skip" id="introskip">Skip tips</button>` : it; if (el.msg.innerHTML !== want) el.msg.innerHTML = want; }
    else el.msg.textContent = hint();
    // Colour by kind (build 15): red for danger, green for good news, gold for something new.
    el.msg.dataset.kind = it ? 'tip' : noticeKind(el.msg.textContent);
    pulseFor(el.msg.textContent);
    // Crossing into another part of the yard: name it (and describe it the first time).
    if (a0 && !P().inNest) { const ai = SIM.areaOf(s, a0.tx, a0.ty); if (ai !== app.lastArea) { if (app.lastArea != null) { const A = SIM.AREAS[ai]; const first = !s.seen['area' + ai]; s.seen['area' + ai] = true; app.areaBanner = { text: first ? `${A.name}. ${A.blurb}` : A.name, until: performance.now() + (first ? 6000 : 2500) }; } app.lastArea = ai; } }
    el.hungerBar.style.width = Math.max(0, P().hunger) + '%';
    // Health (build 14): a red bar, a red rim when you're hit, a slow pulse when low,
    // and a dark one when you die.
    const pa = P().ant, hpMax = pa ? Math.max(SIM.youHp(s), SIM.maxHp(s, pa)) : 1, hp = pa ? Math.max(0, pa.hp) / hpMax : 0;
    $('hpbar').style.width = hp * 100 + '%';
    const low = pa && hp < 0.4, hurt = $('hurt');
    $('hpbar').closest('.vital').classList.toggle('low', !!low);
    el.hungerBar.closest('.vital').classList.toggle('low', !!pa && P().hunger < 30);
    if (P().hit && P().hit !== app.lastHit) { app.lastHit = P().hit; hurt.classList.add('on'); setTimeout(() => hurt.classList.remove('on'), 160); sfx.play('bonk'); }
    if (P().died && P().died !== app.lastDied) { app.lastDied = P().died; hurt.classList.add('dead'); setTimeout(() => hurt.classList.remove('dead'), 1600); }
    hurt.classList.toggle('low', !!low);
    el.hungerBar.style.background = P().hunger < 35 ? '#e4524a' : '#8fd36b';
    const lbl = SIM.actionLabel(s) || 'Pick up';
    const lift = /^Lift (\d+\/\d+)/.exec(lbl);
    setIcon(el.act, /^(Drop|Set down)/.test(lbl) ? 'drop' : 'pick', lbl, lift ? lift[1] : '');
    el.act.disabled = !SIM.actionLabel(s);
    setIcon(el.release, 'release', st.followers ? `Release ${st.followers}` : 'Release', st.followers || '');
    // Recruit shows your crew against the cap (build 15), when it isn't being held.
    if (!app.recruiting) { const capN = SIM.crewCap(s); setIcon(el.recruit, 'recruit', `Recruit (hold for more): crew ${st.followers} of ${capN}. They follow you up to 16 tiles away.`, st.followers ? `${st.followers}/${capN}` : ''); }
    el.release.disabled = !st.followers;
    el.mark.classList.toggle('on', !!P().mark);
    // Outpost: once Waypoints is evolved, while you're out in the yard.
    const showOut = SIM.has(s, 'waypoints') && P().ant && !P().inNest;
    el.outpost.classList.toggle('hidden', !showOut);
    if (showOut) { const why = SIM.outpostLock(s); setIcon(el.outpost, 'outpost', why ? 'Outpost: ' + why : 'Raise an outpost here (10 stone)'); el.outpost.classList.toggle('dim', !!why); }
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
    else if (P().pending && P().died && !app.rebirthAsked && !app.menu && s.queen.placed) { app.rebirthAsked = true; openMenu('reborn'); app.paused = true; }
    evo.update();
    if (app.menu === 'colony') renderColony();
    if (app.menu) renderSheet();
  }

  // ---------------------------------------------------------- wiring
  $('help').addEventListener('click', () => openHelp());
  // The map button opens the photo map; its "Whole yard" button opens the plan.
  const mapView = new MapView(app, () => openMap());
  el.map.addEventListener('click', () => { if (mapView.isOpen) mapView.close(); else { closeMenu(); mapView.open(); } });
  el.stats.addEventListener('click', (e) => { if (e.target.closest('.more')) { if (app.menu === 'colony') closeMenu(); else openColony(); } if (e.target.closest('[data-genes]')) openEvo('bodies'); });
  el.msg.addEventListener('click', (e) => { if (e.target && e.target.id === 'intronext') introAdvance(); if (e.target && e.target.id === 'introskip') { const s = app.s; s.seen.intro = 'done'; s.seen.dig = s.seen.nest = s.seen.surface = true; } });
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
    if (b.dataset.grow) { openEvo(b.dataset.grow); return; }
    if (b.dataset.tab) { app.growTab = b.dataset.tab; renderSheet(); return; }
    if (b.dataset.helptab) { openHelp(+b.dataset.helptab); return; }
    if (b.dataset.retips) { tipsSeen = {}; try { localStorage.removeItem(TIPS_KEY); } catch (e) { /* blocked */ } for (const k in EXPL) delete s.seen[k]; flash('Tips will show again.', /^Tips will/, 2500); return; }
    if (b.dataset.upc) { const [k, pk] = b.dataset.upc.split(':'); if (SIM.upgradeCaste(s, k, pk || undefined)) sfx.play('evolve'); renderSheet(); return; }
    if (b.dataset.evo) { if (SIM.buyEvo(s, b.dataset.evo)) sfx.play('evolve'); renderSheet(); return; }
    if (b.dataset.doc) { const [k, slot, pk] = b.dataset.doc.split(':'); SIM.setDoctrine(s, k, +slot, pk); renderSheet(); return; }
    if (b.dataset.qt) { const [lv, k] = b.dataset.qt.split(':'); SIM.pickQueenTrait(s, +lv, k); renderSheet(); return; }
    if (b.dataset.possess) { SIM.possess(s, +b.dataset.possess); closeMenu(); return; }
    if (b.dataset.wait) { app.rebirthAsked = true; closeMenu(); return; }
    if (b.dataset.rebirth) { P().rebirth = b.dataset.rebirth; const q = s.colony.eggQueue, i = q.indexOf('forager'); if (i >= 0 && !s.colony.eggs.length) q[i] = b.dataset.rebirth; app.rebirthAsked = true; closeMenu(); return; }
    if (b.dataset.cleardigs) { s.nest.digOrders.length = 0; s.nest.fillOrders.length = 0; renderSheet(); return; }
    if (b.dataset.place) { app.placing = { kind: 'room', key: b.dataset.place }; closeMenu(); app.view = 'nest'; return; }
    if (b.dataset.tool) { app.placing = { kind: b.dataset.tool }; closeMenu(); app.view = 'nest'; return; }
    if (b.dataset.confirm) { const fn = app.confirmAction; app.confirmAction = null; closeMenu(); if (b.dataset.confirm === 'yes' && fn) fn(); }
  });
  el.view.addEventListener('click', () => { app.view = app.view === 'nest' ? 'surface' : 'nest'; closeMenu(); });
  el.act.addEventListener('click', () => SIM.doAction(app.s));
  el.release.addEventListener('click', () => SIM.release(app.s));
  el.outpost.addEventListener('click', () => { const why = SIM.outpostLock(app.s); if (why) flash('Outpost: ' + why + '.', /^Outpost:/, 2600); else if (SIM.placeOutpost(app.s)) sfx.play('roomPlaced'); });
  el.mark.addEventListener('click', () => { P().mark = !P().mark; if (P().mark) app.s.seen.marked = true; });
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
  // The Evolution window (build 14), opened by Evolve and the 🧬 chip.
  const evo = new EvolveView(app, {
    goals: () => growGoals(app.s, app.s.colony),
    you: () => growAnts(app.s, app.s.colony, ['you']),
    ants: () => growAnts(app.s, app.s.colony),
    ranks: () => growRanks(app.s, app.s.colony),
  });
  const openEvo = (page) => { closeMenu(); if (mapView.isOpen) mapView.close(); evo.open(page); };
  el.evolve.addEventListener('click', () => (evo.isOpen ? evo.close() : openEvo()));
  el.level.addEventListener('click', () => { if (app.placing) app.placing = null; else openMenu('catalog'); });
  el.exitNest.addEventListener('click', () => { P().ntx = SHAFT; P().nty = 0; P().exiting = true; });

  let recN = 0, recTimer = null;
  el.recruit.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (!P().ant || P().inNest) return;
    recN = 1; app.recruiting = true;
    setIcon(el.recruit, 'recruit', 'Recruit 1', 1);
    recTimer = setInterval(() => { if (recN < SIM.crewCap(app.s)) { recN++; setIcon(el.recruit, 'recruit', 'Recruit ' + recN, recN); } }, 140);
  });
  const recEnd = () => {
    if (!recTimer) return;
    clearInterval(recTimer);
    recTimer = null;
    const got = SIM.recruit(app.s, recN); app.recruiting = false;
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
    el.sheet.dataset.h = '';
    el.sheet.innerHTML = `<div class="row head"><strong>${text}</strong></div><div class="btns"><button data-confirm="no">Keep playing</button><button data-confirm="yes" class="primary">${yes}</button></div>`;
    app.paused = true;
  }

  // The main menu (build 15): a button, and Escape. Escape also closes whatever is open.
  el.menu.addEventListener('click', () => { closeMenu(); if (evo.isOpen) evo.close(); app.openTitle(); });
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || document.body.classList.contains('cine-on')) return;
    if (evo.isOpen) evo.close(); else if (mapView.isOpen) mapView.close(); else if (app.menu) closeMenu(); else if (!app.titleOpen) app.openTitle();
  });
  // A small "Saved ✓" when the game autosaves.
  function saved() { const e = $('saved'); e.classList.add('on'); clearTimeout(saved.t); saved.t = setTimeout(() => e.classList.remove('on'), 1400); }
  return { saved, update, checkExplainers, closeMenu, openMenu, openHelp, flash, confirmSheet, introStep, introText, evo };
}

export const GRID = { NW, NH };
