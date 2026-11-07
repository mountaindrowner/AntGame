// Touch and mouse on the game canvas: tap, hold to walk, two-finger pinch
// to zoom, drag to scroll the nest. Screen points become world positions by
// raycasting into whichever 3D view is showing.
import SIM from '../sim/sim.js';
import { CAMERA } from '../config.js';

const { NW, NH, SHAFT, ROOMS } = SIM;

export function attachPointer(canvas, app, ui, views) {
  const P = () => app.s.player;
  const ptrs = new Map();
  let pinch = null, drag = null, paint = null;

  const ndc = (e) => {
    const r = canvas.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1];
  };
  const surfacePoint = (e) => { const [x, y] = ndc(e); return views.surface.pick(x, y); };
  const nestCell = (e) => { const [x, y] = ndc(e); return views.nest.pick(x, y); };
  const say = (text, test, ms) => ui.flash(text, test, ms);

  // Build 26: attack on purpose. With a crew, rest the mouse on an enemy for a moment (or click it)
  // and the crew charges it. The cursor turns to a crosshair over anything they can attack.
  const HOVER_MS = 180;
  let hover = null; // { key, timer }
  const canAttack = () => app.view === 'surface' && P().ant && !P().inNest && SIM.crewSize(app.s) > 0;
  const enemyUnder = (e) => { if (!canAttack()) return null; const w = surfacePoint(e); return w ? { w, en: SIM.enemyAt(app.s, w.x, w.y) } : null; };
  function hoverAt(e) {
    const h = enemyUnder(e), en = h && h.en, key = en ? en.kind + ':' + en.ref : null;
    canvas.style.cursor = en ? 'crosshair' : '';
    if (hover && hover.key === key) return;
    if (hover) clearTimeout(hover.timer);
    hover = null;
    if (!en) return;
    const { x, y } = h.w;
    hover = { key, timer: setTimeout(() => { if (canAttack()) SIM.crewAttack(app.s, x, y); }, HOVER_MS) };
  }

  // Why a dig order can't go here, said once a stroke.
  const DIG_WHY = { 'not adjacent': 'Dig next to an existing tunnel (the faint dots).', 'too many': `${SIM.DIG_ORDERS} dig orders queued. Let the builders catch up.`, edge: 'Not at the edge.', planned: 'That\u2019s part of a planned room: cancel the room to change it.', wall: 'That\u2019s a room\u2019s wall: a room has one or two ways in.' };
  const digWhy = (res) => DIG_WHY[res] || 'That soil ' + res + '.';
  // A builder you play walks to the dig and does it (build 74).
  function builderGo(cx, cy) {
    const p = P(); if (!p.ant || !p.inNest || p.nestKey || p.ant.caste !== 'builder') return;
    const spot = SIM.digSpot(app.s, cx, cy); if (spot) { p.ntx = spot[0]; p.nty = spot[1]; p.exiting = false; }
  }
  function nestTap(cx, cy, mouse) {
    const s = app.s;
    if (P().inNest && P().nestKey) { if (cy < 0) P().exiting = true; else ui.openMenu('daughters'); return; } // build 50: her nest: look, build her rooms, step out
    if (s.phase === 'dig') { SIM.queenDig(s, cx, cy); return; }
    // Build 74: a room goes where you put it. With the mouse its ghost is under the cursor and a click places it;
    // on touch the first tap puts the ghost there and a tap inside it places it.
    if (app.placing && app.placing.kind === 'room') {
      const key = app.placing.key, g = app.ghostPlan();
      const inGhost = g && cx >= g.x0 && cx < g.x0 + g.w && cy >= g.y0 && cy < g.y0 + g.h;
      if (!mouse && !(app.ghostCell && inGhost)) { app.ghostCell = [cx, cy]; return; }
      const p = mouse ? SIM.snapPlan(s, key, cx, cy) : g;
      if (!p || !p.ok) { say('Can\u2019t put it here: ' + ((p && p.why) || 'no room') + '.', /^Can\u2019t put it/, 2500); return; }
      if (SIM.queueRoom(s, key, null, [p.x0, p.y0])) { app.placing = null; app.ghostCell = null; say(p.dig.length ? `${ROOMS[key].name} planned: builders dig it out, then build it.` : `${ROOMS[key].name} placed: builders are on their way.`, /planned:|placed:/, 2500); }
      else say('Short on: ' + SIM.costText(SIM.roomCost(s, key)) + '.', /^Short on/, 2500);
      return;
    }
    const q = s.queen;
    if (Math.abs(cx - q.x) <= 1 && Math.abs(cy - q.y) <= 1) { ui.openMenu('egg'); return; }
    if (SIM.playerDig(s, cx, cy)) return;
    const a = P().ant, inside = a && P().inNest;
    if (cx < 0 || cy < 0 || cx >= NW || cy >= NH) {
      if (cy < 0 && inside) { P().ntx = SHAFT; P().nty = 0; P().exiting = true; }
      return;
    }
    const v = s.nest.cells[cy * NW + cx];
    const placing = app.placing;
    if (!v && placing && placing.kind !== 'room') return;
    // Build 42: shut ground: what it takes to break in.
    if (!v && SIM.cellLocked(s, cx, cy)) { const S = SIM.sectionAt(cx, cy); if (S) ui.openMenu('ground', S.key); return; }
    if (!v) {
      const res = SIM.toggleDigOrder(s, cx, cy);
      if (res === 'added') builderGo(cx, cy);
      else if (res !== 'removed') say(digWhy(res), /^(Dig next|\d+ dig orders|That soil|Not at|That\u2019s)/, 3000);
      return;
    }
    if (placing) {
      if (placing.kind === 'fill') {
        const res = SIM.toggleFillOrder(s, cx, cy);
        if (res !== 'added' && res !== 'removed') P().msg = res === 'room' ? 'Remove the room first.' : res === 'entrance' ? 'Not the entrance.' : res === 'too many' ? 'Too many fill orders.' : '';
        return;
      }
      if (placing.kind === 'remove') {
        const r = SIM.roomAt(s, cx, cy);
        if (r && r.key !== 'queen') {
          ui.confirmSheet('Remove ' + ROOMS[r.key].name + '? Half the cost comes back.', 'Remove', () => { SIM.removeRoom(app.s, cx, cy); app.placing = null; });
        }
        return;
      }
    }
    if (!inside) { ui.openMenu('catalog'); return; }
    P().ntx = cx;
    P().nty = cy;
    P().exiting = cx === SHAFT && cy === 0;
  }

  // Build 74: drag to dig. A stroke from soil paints dig orders along its path (joined up cell by cell); one from
  // a dig order erases them. With the mouse it starts at once; on touch, after a short hold (a quick drag pans).
  const paintable = (c) => {
    const s = app.s; if (!c || app.placing || s.phase !== 'play' || P().nestKey) return null;
    const [x, y] = c; if (x < 1 || y < 1 || x >= NW - 1 || y >= NH) return null;
    if (s.nest.digOrders.some((o) => o.x === x && o.y === y && !o.plan)) return 'erase';
    if (s.nest.cells[y * NW + x] || SIM.cellLocked(s, x, y)) return null;
    const q = s.queen; if (Math.abs(x - q.x) <= 1 && Math.abs(y - q.y) <= 1) return null;
    return 'dig';
  };
  function paintCell(x, y) {
    const s = app.s, o = s.nest.digOrders.find((d) => d.x === x && d.y === y);
    if (paint.mode === 'erase') { if (o && !o.plan) { SIM.toggleDigOrder(s, x, y); paint.n++; } return; }
    if (o || s.nest.cells[y * NW + x]) return;
    const res = SIM.toggleDigOrder(s, x, y);
    if (res === 'added') { paint.n++; if (!paint.first) paint.first = [x, y]; } else if (!paint.said) { paint.said = true; say(digWhy(res), /^(Dig next|\d+ dig orders|That soil|Not at|That\u2019s)/, 3000); }
  }
  function paintTo(c) {
    if (!c) return; let [x, y] = paint.last; const [tx, ty] = c;
    for (let k = 0; k < 200 && (x !== tx || y !== ty); k++) { // a 4-connected line, so each cell touches the last
      if (Math.abs(tx - x) >= Math.abs(ty - y)) x += Math.sign(tx - x); else y += Math.sign(ty - y);
      paintCell(x, y);
    }
    paint.last = [tx, ty];
  }
  function startPaint(c, mode) { paint = { mode, last: c, n: 0, first: null, said: false }; paintCell(c[0], c[1]); drag = null; }

  canvas.addEventListener('pointerdown', (e) => {
    if (e.button === 2 && app.view !== 'nest') return; // right-click is a crew order (contextmenu)
    canvas.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 2) {
      const [p1, p2] = [...ptrs.values()];
      pinch = { d0: Math.hypot(p1.x - p2.x, p1.y - p2.y), z0: app.zoomMul };
      P().holding = false;
      drag = null;
      return;
    }
    if (app.menu) { ui.closeMenu(); ptrs.delete(e.pointerId); return; }
    if (app.view === 'surface') {
      const a = P().ant;
      if (!a || P().inNest) return;
      const w = surfacePoint(e);
      if (!w) return;
      if (app.callout) app.callout.tap(w.x, w.y);
      // A click on an enemy with a crew at your side is an attack order: you stay where you are.
      if (canAttack() && SIM.crewAttack(app.s, w.x, w.y)) return;
      P().tx = w.x;
      P().ty = w.y;
      P().holding = true;
      return;
    }
    drag = { y0: e.clientY, x0: e.clientX, pan0: app.panY, panX0: app.panX || 0, moved: false, right: e.button === 2 };
    if (e.button === 2) { if (app.placing) { app.placing = null; app.ghostCell = null; } return; } // build 74: right-drag pans; right-click stops placing
    const c = nestCell(e), mode = paintable(c);
    if (mode && e.pointerType === 'mouse') startPaint(c, mode);
    else if (mode) drag.hold = setTimeout(() => { if (drag && !drag.moved && ptrs.size === 1) { navigator.vibrate?.(15); startPaint(c, mode); } }, 260);
  });

  canvas.addEventListener('pointermove', (e) => {
    const p = ptrs.get(e.pointerId);
    if (e.pointerType === 'mouse' && app.view === 'surface') { const w = surfacePoint(e); if (w) app.mouseWorld = w; app.mouseOn = true; } // build 32: where abilities aim (73: and what's hovered)
    if (e.pointerType === 'mouse' && app.view === 'nest') { app.nestHover = nestCell(e); app.ghostCell = null; } // build 74: the room ghost follows the cursor
    if (!p) { if (e.pointerType === 'mouse') hoverAt(e); return; }
    p.x = e.clientX;
    p.y = e.clientY;
    if (pinch && ptrs.size === 2) {
      const [p1, p2] = [...ptrs.values()];
      const d = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      app.zoomTarget = null; app.zoomTouchedAt = performance.now(); app.zoomMul = Math.max(CAMERA.zoomMin, Math.min(CAMERA.zoomMax, (pinch.z0 * d) / Math.max(1, pinch.d0)));
      return;
    }
    if (app.view === 'surface') {
      if (P().holding) { const w = surfacePoint(e); if (w) { P().tx = w.x; P().ty = w.y; } }
      return;
    }
    if (paint) { paintTo(nestCell(e)); return; }
    if (drag) {
      const dy = e.clientY - drag.y0, dx = e.clientX - drag.x0;
      if (Math.abs(dy) > 12 || Math.abs(dx) > 12) drag.moved = true;
      // Roughly one cell per 16 CSS px at 1×, scaled by zoom. Build 42: sideways too (the nest is twice as wide).
      if (drag.moved) { app.panY = drag.pan0 - (dy / Math.max(0.3, app.zoomMul)) * 0.9; app.panX = drag.panX0 - (dx / Math.max(0.3, app.zoomMul)) * 0.9; }
    }
  });

  const up = (e) => {
    const p = ptrs.get(e.pointerId);
    ptrs.delete(e.pointerId);
    P().holding = false;
    if (pinch) { if (ptrs.size < 2) pinch = null; drag = null; return; }
    if (!p) return;
    if (paint) { const f = paint.first; paint = null; if (f) builderGo(f[0], f[1]); return; }
    if (app.view === 'nest' && drag) {
      const moved = drag.moved, right = drag.right;
      clearTimeout(drag.hold);
      drag = null;
      if (!moved && !right && e.type === 'pointerup') {
        const c = nestCell(e);
        if (c) nestTap(c[0], c[1], e.pointerType === 'mouse');
      }
    }
  };
  // Build 29: right-click on the yard: at an enemy, your crew attacks it; on the ground, your crew goes
  // there and holds (a crew already holding moves there if nobody is following you).
  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (app.view !== 'surface' || !P().ant || P().inNest) return;
    const w = surfacePoint(e); if (!w) return;
    if (SIM.crewSize(app.s) && SIM.crewAttack(app.s, w.x, w.y)) return;
    if (SIM.crewSize(app.s) || SIM.heldCount(app.s)) SIM.crewHold(app.s, w.x, w.y);
  });
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointerleave', () => { if (hover) clearTimeout(hover.timer); hover = null; canvas.style.cursor = ''; app.mouseOn = false; });
  canvas.addEventListener('pointercancel', up);
  // Desktop: wheel zooms.
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    app.zoomTouchedAt = performance.now(); app.zoomTarget = Math.max(CAMERA.zoomMin, Math.min(CAMERA.zoomMax, (app.zoomTarget ?? app.zoomMul) * (e.deltaY > 0 ? 0.9 : 1.1))); // build 69: eased in the frame loop
  }, { passive: false });

  return { nestTap };
}
