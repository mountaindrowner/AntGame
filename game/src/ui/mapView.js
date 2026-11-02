// The yard map: a photo of the yard from straight above (app.snapshotMap,
// pieced together region by region as each is first built near you),
// under a fog of war that lifts where you have been (sim seenMap). Pinch,
// scroll or double-tap to zoom, drag to pan, tap a spot for its region.
import SIM from '../sim/sim.js';
import { sfx } from '../audio/sfx.js';

const { T, AREAS, SEE } = SIM;

// Build 39: a region's zone, and who rules it.
function zoneLine(s, key) {
  const Z = SIM.ZONE_OF[key]; if (!Z) return '<dt>Zone</dt><dd>Free ground: no guardian</dd>';
  const done = (s.colony.zones || {})[Z.key] != null;
  return `<dt>Zone</dt><dd>${Z.name}: ${done ? '★ taken' : 'ruled by ' + Z.guardian}</dd>`;
}
export class MapView {
  constructor(app, onPlan) {
    this.app = app;
    this.onPlan = onPlan;
    const el = (this.el = document.createElement('div'));
    el.id = 'mapview';
    el.className = 'hidden';
    el.innerHTML = `<div class="mv-head"><strong>The yard</strong><span class="mv-sp"></span>
      <button data-plan="1" class="mv-btn">Whole yard</button><button data-close="1" class="mv-btn">Close</button></div>
      <canvas class="mv-canvas" aria-label="Map of the yard. Drag to pan, pinch or scroll to zoom, tap a place for its details."></canvas>
      <div class="mv-card hidden"></div>
      <div class="mv-zoom"><button data-z="1.5" aria-label="Zoom in">+</button><button data-z="0.667" aria-label="Zoom out">−</button></div>`;
    document.body.appendChild(el);
    this.canvas = el.querySelector('canvas');
    this.card = el.querySelector('.mv-card');
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.close) this.close();
      else if (b.dataset.plan) { this.close(); this.onPlan(); }
      else if (b.dataset.z) { const r = this.canvas.getBoundingClientRect(); this.zoomAt(r.width / 2, r.height / 2, +b.dataset.z); }
    });
    this._input();
    window.addEventListener('resize', () => { if (this.open_) this._fit(false); });
  }

  get isOpen() { return !!this.open_; }

  open() {
    const s = this.app.s, w = s.world;
    this.open_ = true;
    this.app.paused = true;
    this.el.classList.remove('hidden');
    this.card.classList.add('hidden');
    this.photo = this.app.snapshotMap();
    this.scaleK = this.photo.width / (w.W * T); // photo px per world px
    this.fog = this._fogCanvas(s);
    this._fit(true);
    this.draw();
  }

  close() { this.open_ = false; this.el.classList.add('hidden'); this.app.paused = false; }

  // The fog: dark where you haven't been, soft at the edges.
  _fogCanvas(s) {
    const w = s.world, cw = w.W / SEE.cell, ch = w.H / SEE.cell;
    const small = document.createElement('canvas'); small.width = cw; small.height = ch;
    const g = small.getContext('2d'), img = g.createImageData(cw, ch);
    for (let i = 0; i < cw * ch; i++) { img.data[i * 4] = 27; img.data[i * 4 + 1] = 21; img.data[i * 4 + 2] = 14; img.data[i * 4 + 3] = s.seenMap[i] ? 0 : 255; }
    g.putImageData(img, 0, 0);
    const big = document.createElement('canvas'); big.width = this.photo.width; big.height = this.photo.height;
    const b = big.getContext('2d');
    b.filter = `blur(${Math.round(this.photo.width / cw * 0.9)}px)`;
    b.imageSmoothingEnabled = true;
    b.drawImage(small, 0, 0, big.width, big.height);
    // Mist: drifting lighter patches over the dark, only where it is fogged.
    b.filter = 'none';
    b.globalCompositeOperation = 'source-atop';
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 260; i++) {
      const x = rnd() * big.width, y = rnd() * big.height, r = (0.02 + rnd() * 0.06) * big.width;
      const gr = b.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(74,64,48,${0.12 + rnd() * 0.18})`); gr.addColorStop(1, 'rgba(74,64,48,0)');
      b.fillStyle = gr; b.fillRect(x - r, y - r, r * 2, r * 2);
    }
    b.globalCompositeOperation = 'source-over';
    return big;
  }

  // Fit the canvas to the panel; on open, centre on your ant at a useful zoom.
  _fit(centre) {
    const r = this.canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(r.width * dpr); this.canvas.height = Math.round(r.height * dpr);
    this.dpr = dpr; this.vw = r.width; this.vh = r.height;
    this.minZ = Math.min(r.width / this.photo.width, r.height / this.photo.height);
    if (centre || !this.z) {
      const s = this.app.s, a = s.player.ant && !s.player.inNest ? s.player.ant : null;
      const fx = (a ? a.x : (s.world.ex + 0.5) * T) * this.scaleK, fy = (a ? a.y : (s.world.ey + 0.5) * T) * this.scaleK;
      this.z = this.minZ * 2.2;
      this.ox = r.width / 2 - fx * this.z; this.oy = r.height / 2 - fy * this.z;
    }
    this._clamp();
  }

  _clamp() {
    this.z = Math.max(this.minZ, Math.min(this.minZ * 9, this.z));
    const pw = this.photo.width * this.z, ph = this.photo.height * this.z;
    this.ox = pw <= this.vw ? (this.vw - pw) / 2 : Math.min(0, Math.max(this.vw - pw, this.ox));
    this.oy = ph <= this.vh ? (this.vh - ph) / 2 : Math.min(0, Math.max(this.vh - ph, this.oy));
  }

  zoomAt(x, y, k) {
    sfx.play('whoosh', null, k > 1);
    const z0 = this.z;
    this.z = Math.max(this.minZ, Math.min(this.minZ * 9, this.z * k));
    const f = this.z / z0;
    this.ox = x - (x - this.ox) * f; this.oy = y - (y - this.oy) * f;
    this._clamp(); this.draw();
  }

  draw() {
    const c = this.canvas, g = c.getContext('2d'), s = this.app.s, w = s.world, K = this.scaleK;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.fillStyle = '#1b150e'; g.fillRect(0, 0, this.vw, this.vh);
    g.save();
    g.translate(this.ox, this.oy); g.scale(this.z, this.z);
    g.imageSmoothingEnabled = this.z < 1.5;
    g.drawImage(this.photo, 0, 0);
    g.imageSmoothingEnabled = true;
    g.drawImage(this.fog, 0, 0);
    g.restore();
    // Markers stay the same size at any zoom.
    const at = (x, y) => [this.ox + x * K * this.z, this.oy + y * K * this.z];
    const seen = (tx, ty) => s.seenMap[Math.floor(ty / SEE.cell) * (w.W / SEE.cell) + Math.floor(tx / SEE.cell)];
    // Build 39: the 13 zones. Each outlined, red while its guardian rules it, gold once taken (faint
    // where you haven't been), with a crest at its middle.
    const taken = (s.colony.zones || {}), REG = SIM.REGION, crests = [];
    for (const Z of SIM.ZONES) {
      const done = taken[Z.key] != null, idxs = Z.regions.map((k) => REG[k]).filter((i) => i != null);
      if (!idxs.length) continue;
      const inZ = new Set(idxs), boxes = idxs.map((i) => SIM.areaBounds(i));
      let seenAny = false, cx = 0, cy = 0;
      for (const b of boxes) { cx += (b.x0 + b.x1 + 1) / 2; cy += (b.y0 + b.y1 + 1) / 2; for (let y = b.y0; y <= b.y1 && !seenAny; y += SEE.cell) for (let x = b.x0; x <= b.x1; x += SEE.cell) if (seen(x, y)) { seenAny = true; break; } }
      g.lineWidth = done ? 3 : 2.5; g.strokeStyle = done ? 'rgba(255,211,77,0.95)' : seenAny ? 'rgba(228,82,74,0.9)' : 'rgba(228,82,74,0.35)';
      // Each region's edges that don't border another region of the same zone.
      const neighbour = (b, dx, dy) => { const ai = SIM.areaOf(s, Math.max(0, Math.min(w.W - 1, Math.floor((b.x0 + b.x1) / 2) + dx * (SIM.AREA))), Math.max(0, Math.min(w.H - 1, Math.floor((b.y0 + b.y1) / 2) + dy * (SIM.AREA)))); return inZ.has(ai) && ai !== SIM.areaOf(s, Math.floor((b.x0 + b.x1) / 2), Math.floor((b.y0 + b.y1) / 2)); };
      g.beginPath();
      for (const b of boxes) {
        const [x0, y0] = at(b.x0 * T, b.y0 * T), [x1, y1] = at((b.x1 + 1) * T, (b.y1 + 1) * T);
        if (!neighbour(b, 0, -1)) { g.moveTo(x0, y0); g.lineTo(x1, y0); }
        if (!neighbour(b, 0, 1)) { g.moveTo(x0, y1); g.lineTo(x1, y1); }
        if (!neighbour(b, -1, 0)) { g.moveTo(x0, y0); g.lineTo(x0, y1); }
        if (!neighbour(b, 1, 0)) { g.moveTo(x1, y0); g.lineTo(x1, y1); }
      }
      g.stroke();
      // The crest sits on the guardian's own region (a zone's middle can fall outside it).
      const hb = REG[Z.home] != null ? SIM.areaBounds(REG[Z.home]) : null;
      crests.push({ Z, done, seenAny, at: hb ? at(((hb.x0 + hb.x1 + 1) / 2) * T, ((hb.y0 + hb.y1 + 1) / 2) * T) : at((cx / boxes.length) * T, (cy / boxes.length) * T) });
    }
    // Region names, where you've seen any of the region.
    g.font = '600 11px ui-rounded, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    // Names only once a region is big enough on screen to hold one.
    if (SIM.AREA * T * K * this.z > 95) AREAS.forEach((A, i) => {
      const b = SIM.areaBounds(i);
      let any = false;
      for (let y = b.y0; y <= b.y1 && !any; y += SEE.cell) for (let x = b.x0; x <= b.x1; x += SEE.cell) if (seen(x, y)) { any = true; break; }
      if (!any) return;
      const [x, y] = at(((b.x0 + b.x1 + 1) / 2) * T, (b.y0 + 6) * T);
      g.lineWidth = 3; g.strokeStyle = 'rgba(20,12,4,0.75)'; g.strokeText(A.name, x, y);
      g.fillStyle = '#f6eedc'; g.fillText(A.name, x, y);
    });
    // A pin with its label above (or below, so two close pins don't collide).
    const pin = (x, y, color, label, below) => {
      const [px, py] = at(x, y), ly = below ? py + 14 : py - 13;
      g.beginPath(); g.arc(px, py, 6, 0, Math.PI * 2); g.fillStyle = color; g.fill(); g.lineWidth = 2; g.strokeStyle = '#1b150e'; g.stroke();
      if (label) { g.font = '700 11px ui-rounded, system-ui, sans-serif'; g.lineWidth = 3; g.strokeStyle = 'rgba(20,12,4,0.8)'; g.strokeText(label, px, ly); g.fillStyle = '#fff'; g.fillText(label, px, ly); }
    };
    // The crests: a gold star once taken, the guardian's sign while it rules, a ? where unexplored.
    const showNames = SIM.AREA * T * K * this.z <= 95;
    for (const c of crests) {
      const [x, y] = c.at;
      g.beginPath(); g.arc(x, y, 13, 0, Math.PI * 2); g.fillStyle = c.done ? '#ffd34d' : c.seenAny ? '#8a2a1e' : 'rgba(60,40,30,0.8)'; g.fill();
      g.lineWidth = 2.5; g.strokeStyle = c.done ? '#7a5a10' : '#1b150e'; g.stroke();
      g.font = '15px system-ui, sans-serif'; g.fillStyle = '#fff'; g.fillText(c.done ? '★' : c.seenAny ? c.Z.icon : '?', x, y + 1);
      if (showNames) { g.font = '700 10px ui-rounded, system-ui, sans-serif'; g.lineWidth = 3; g.strokeStyle = 'rgba(20,12,4,0.85)'; g.strokeText(c.Z.name, x, y + 22); g.fillStyle = c.done ? '#ffd34d' : '#f6eedc'; g.fillText(c.Z.name, x, y + 22); }
    }
    const sp = this.el.querySelector('.mv-sp'), txt = `Zones taken: ${SIM.zonesTaken(s)} of ${SIM.ZONES.length}`; if (sp.textContent !== txt) sp.textContent = txt;
    if (s.queen.placed) pin((w.ex + 0.5) * T, (w.ey + 0.5) * T, '#8fd36b', 'Nest');
    for (const r of s.rivals) if (!r.asleep && r.queenAlive && seen(r.ex, r.ey)) pin((r.ex + 0.5) * T, (r.ey + 0.5) * T, '#e4524a', r.team === 1 ? 'Rival nest' : SIM.RIVALS[r.team - 1].name);
    for (const o of s.outposts || []) if (seen(o.x, o.y)) pin((o.x + 0.5) * T, (o.y + 0.5) * T, o.done ? '#c9b27a' : '#8a8272', s.colony.held[o.region] ? 'Held' : o.done ? 'Outpost' : 'Building');
    const a = s.player.ant;
    if (a && !s.player.inNest) pin(a.x, a.y, '#ffd34d', 'You', true);
  }

  // Region card for a tapped spot.
  _tap(x, y) {
    const s = this.app.s, w = s.world, K = this.scaleK;
    const wx = (x - this.ox) / this.z / K / T, wy = (y - this.oy) / this.z / K / T;
    if (wx < 0 || wy < 0 || wx >= w.W || wy >= w.H) { this.card.classList.add('hidden'); return; }
    const seen = s.seenMap[Math.floor(wy / SEE.cell) * (w.W / SEE.cell) + Math.floor(wx / SEE.cell)];
    const A = AREAS[SIM.areaOf(s, Math.floor(wx), Math.floor(wy))];
    this.card.innerHTML = seen
      ? `<strong>${A.name}</strong><div>${A.blurb}</div><dl><dt>Danger</dt><dd>${A.challenge}</dd><dt>Find</dt><dd>${A.resource}</dd><dt>Prize</dt><dd>${A.reward}</dd>${zoneLine(s, A.key)}</dl>`
      : `<strong>Unexplored</strong><div>Walk your ant out here to see what's in this part of the yard.</div>`;
    this.card.classList.remove('hidden');
  }

  _input() {
    const c = this.canvas, ptrs = new Map();
    let drag = null, pinch = null, lastTap = 0;
    const pos = (e) => { const r = c.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    c.addEventListener('pointerdown', (e) => {
      c.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, pos(e));
      if (ptrs.size === 2) { const [p, q] = [...ptrs.values()]; pinch = { d: Math.hypot(p.x - q.x, p.y - q.y), z: this.z }; drag = null; }
      else { const p = pos(e); drag = { x: p.x, y: p.y, ox: this.ox, oy: this.oy, moved: false }; }
    });
    c.addEventListener('pointermove', (e) => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.set(e.pointerId, pos(e));
      if (pinch && ptrs.size === 2) {
        const [p, q] = [...ptrs.values()], d = Math.hypot(p.x - q.x, p.y - q.y);
        this.zoomAt((p.x + q.x) / 2, (p.y + q.y) / 2, (pinch.z * d) / Math.max(1, pinch.d) / this.z);
      } else if (drag) {
        const p = pos(e);
        if (Math.hypot(p.x - drag.x, p.y - drag.y) > 6) drag.moved = true;
        this.ox = drag.ox + p.x - drag.x; this.oy = drag.oy + p.y - drag.y; this._clamp(); this.draw();
      }
    });
    const up = (e) => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.delete(e.pointerId);
      if (ptrs.size < 2) pinch = null;
      if (drag && !drag.moved && ptrs.size === 0) {
        const p = pos(e), now = performance.now();
        if (now - lastTap < 300) this.zoomAt(p.x, p.y, 2); else this._tap(p.x, p.y);
        lastTap = now;
      }
      if (ptrs.size === 0) drag = null;
    };
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
    c.addEventListener('wheel', (e) => { e.preventDefault(); const p = pos(e); this.zoomAt(p.x, p.y, e.deltaY > 0 ? 0.87 : 1.15); }, { passive: false });
  }
}
