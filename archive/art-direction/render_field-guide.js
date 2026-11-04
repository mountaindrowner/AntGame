// FIELD GUIDE — a Victorian natural-history plate.
// Ink line and watercolour wash on cream paper, hatching instead of gradients,
// labels with leader lines. All wobble is baked once; legs swap two poses.
(function () {
  const UF = window.UF;
  const cache = UF.makeCache();
  const noise = UF.noise2(41);
  const fine = UF.noise2(97);

  const C = {
    paper: '#EFE4CC',
    paperShadow: '#E3D6B8',
    ink: '#2B1D12',
    soil: ['#CDB48C', '#BFA37A', '#A98B64'],
    tunnel: '#E9DCC0',
    ant: '#5A4030',
    queen: '#6B4A32',
    spider: '#4A3528',
    food: '#D9B86A',
    water: '#8FB4C9',
  };
  const FONT = '"IM Fell English", "IM FELL English", Georgia, "Times New Roman", serif';
  const SECTION = { x0: 30, x1: 690, y1: 452 };
  const LINE = 1.4, HALF = 0.7;

  const meta = {
    label: 'Field guide',
    status: 'full',
    tagline: 'A Victorian natural-history plate: ink line and watercolour wash on cream paper, labels with leader lines.',
    refs: 'Audubon and Haeckel plates, Strange Horticulture, Carto, Spiritfarer journal, The Witness sketches, Sunless Sea UI; nearest in tone: Strange Horticulture, Dredge journal, Sable',
    matrix: ['Strange Horticulture, Dredge journal', 'Medium', 'High', 'High', 'Highest'],
    palette: [
      ['Paper', C.paper], ['Paper shadow', C.paperShadow], ['Ink', C.ink],
      ['Topsoil wash', C.soil[0]], ['Packed wash', C.soil[1]], ['Clay wash', C.soil[2]],
      ['Tunnel wash', C.tunnel], ['Ant', C.ant], ['Queen', C.queen], ['Spider', C.spider],
      ['Food', C.food], ['Water', C.water],
    ],
    type: 'IM Fell English — 18 px plate title; 11 px labels, italic for Latin names and figure captions.',
    motion: 'Legs swap two baked poses (A/B) at 6 Hz, no tweening. Eggs stay still; a hatched hour dial by the hatchery ticks once a second.',
    risks: 'Does the nest read as a diagram instead of a place? Are 200 small hatched ants legible, or mud?',
    notes: 'Room captions sit inside the top edge because corridors run through every room’s bottom edge. On forms under ~15 px (ants, eggs) hatching tightens from 7 px to 2–3 px apart, otherwise they would get a single stroke.',
  };

  // ------------------------------------------------------------ helpers
  function wobPath(pts, closed, amp, freq, seed) {
    return UF.smoothPath(UF.wobble(pts, noise, amp, freq, seed * 31.3, seed * 17.9), closed);
  }
  function wobRect(x, y, w, h, r, seed) {
    return wobPath(UF.sampleRoundRect(x, y, w, h, r, 5), true, 2.4, 0.02, seed);
  }
  // Small-form ellipse: spec wobble plus a little pen tremor.
  function wobEllipse(cx, cy, rx, ry, rot, seed, k) {
    const n = Math.max(18, Math.round((rx + ry) * 2.2));
    let pts = UF.sampleEllipse(cx, cy, rx, ry, n, rot || 0);
    const a = 0.22 / (k || 1);
    pts = pts.map(([x, y], i) => [
      x + fine(x * 0.9 + seed, y * 0.9) * a,
      y + fine(x * 0.9, y * 0.9 + seed) * a,
    ]);
    return UF.smoothPath(pts, true);
  }
  function hatchW(g, path, W0, bb, angle, spacing, width, alpha, seed) {
    UF.hatch(g, path, { angle, spacing, width, alpha, color: C.ink, world: W0, bbox: bb, jitter: spacing * 0.25, seed });
  }
  function leader(g, x0, y0, x1, y1) {
    const d = Math.hypot(x1 - x0, y1 - y0);
    const k = (d - 3) / d;
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k);
    g.lineWidth = HALF;
    g.strokeStyle = C.ink;
    g.stroke();
  }
  function text(g, s, x, y, italic, align) {
    g.font = (italic ? 'italic ' : '') + '11px ' + FONT;
    g.textAlign = align || 'left';
    g.fillStyle = C.ink;
    g.fillText(s, x, y);
  }
  // A run of roman/italic segments, centred on cx.
  function richCentered(g, segs, cx, y, size) {
    const w = segs.reduce((sum, [s, it]) => {
      g.font = (it ? 'italic ' : '') + size + 'px ' + FONT;
      return sum + g.measureText(s).width;
    }, 0);
    let x = cx - w / 2;
    g.textAlign = 'left';
    g.fillStyle = C.ink;
    segs.forEach(([s, it]) => {
      g.font = (it ? 'italic ' : '') + size + 'px ' + FONT;
      g.fillText(s, x, y);
      x += g.measureText(s).width;
    });
  }
  // Profile leg: femur up to a knee above the body line, tibia down to a
  // short tarsus on the floor.
  function legPath(l) {
    const [hx, hy] = l.hip, [fx, fy] = l.foot;
    const dx = fx - hx, sg = dx < -0.3 ? -1 : 1;
    const kx = hx + dx * 0.45 + sg * 0.8, ky = Math.min(hy, fy) - 2.2 - Math.abs(dx) * 0.12;
    const ax = fx - sg * 0.6, ay = fy - 1.0;
    const p = new Path2D();
    p.moveTo(hx, hy);
    p.quadraticCurveTo(hx + (kx - hx) * 0.25, ky + 0.2, kx, ky);
    p.quadraticCurveTo(kx + (ax - kx) * 0.6, ky + (ay - ky) * 0.25, ax, ay);
    p.lineTo(fx + sg * 1.0, fy);
    return p;
  }
  function downVec(headingDeg) {
    const h = (headingDeg * Math.PI) / 180;
    return Math.cos(h) < -1e-6 ? [Math.sin(h), -Math.cos(h)] : [-Math.sin(h), Math.cos(h)];
  }

  // ------------------------------------------------------------ plate
  function bandBoundary(yBase, seed) {
    const pts = [];
    for (let x = SECTION.x0; x <= SECTION.x1 + 0.1; x += 6) pts.push([x, yBase + noise(x * 0.02, seed) * 3.2]);
    return pts;
  }
  function edgeX(x, y, seed) { return x + noise(seed, y * 0.025) * 3.2; }

  function bandPath(i, scene) {
    const b = scene.soil[i];
    const top = i === 0 ? [[SECTION.x0, b.y0], [SECTION.x1, b.y0]] : bandBoundary(b.y0, i);
    const yBot = Math.min(b.y1, SECTION.y1);
    const bot = i === scene.soil.length - 1 ? bandBoundary(yBot, 9) : bandBoundary(b.y1, i + 1);
    const right = [], left = [];
    for (let y = b.y0; y <= yBot; y += 8) right.push([edgeX(SECTION.x1, y, 5), y]);
    for (let y = yBot; y >= b.y0; y -= 8) left.push([edgeX(SECTION.x0, y, 6), y]);
    return UF.polyPath(top.concat(right, bot.slice().reverse(), left), true);
  }

  function cavityPaths(scene) {
    return UF.cavities(scene).map((c, i) => ({
      c,
      path: wobRect(c.x, c.y, c.w, c.h, c.kind === 'room' ? 14 : 11, i + 3),
    }));
  }

  function env(scene, s) {
    return cache.get('env' + s, () =>
      UF.bakeRegion(s, 0, 0, UF.W, UF.H, (g) => {
        // Paper and its mottled shadow.
        g.fillStyle = C.paper;
        g.fillRect(0, 0, UF.W, UF.H);
        const mott = UF.canvas(120, 80);
        const mg = mott.getContext('2d');
        const md = mg.createImageData(120, 80);
        const sh = UF.hexToRgb(C.paperShadow);
        for (let y = 0; y < 80; y++) for (let x = 0; x < 120; x++) {
          const v = UF.fbm(noise, x * 0.06 + 40, y * 0.06 + 40, 3);
          const i = (y * 120 + x) * 4;
          md.data[i] = sh[0]; md.data[i + 1] = sh[1]; md.data[i + 2] = sh[2];
          md.data[i + 3] = Math.max(0, Math.min(255, (v + 0.15) * 420));
        }
        mg.putImageData(md, 0, 0);
        g.imageSmoothingQuality = 'high';
        g.globalAlpha = 0.8;
        g.drawImage(mott, 0, 0, UF.W, UF.H);
        g.globalAlpha = 1;
        const vg = g.createRadialGradient(360, 240, 200, 360, 240, 470);
        vg.addColorStop(0, 'rgba(227,214,184,0)');
        vg.addColorStop(1, 'rgba(227,214,184,0.9)');
        g.fillStyle = vg;
        g.fillRect(0, 0, UF.W, UF.H);

        // Soil washes, each with a darker pooled edge and a granulated body.
        scene.soil.forEach((b, i) => {
          const p = bandPath(i, scene);
          g.globalAlpha = 0.9;
          g.fillStyle = C.soil[i];
          g.fill(p);
          g.globalAlpha = 1;
          g.save();
          g.clip(p);
          g.globalCompositeOperation = 'multiply';
          g.globalAlpha = 0.35;
          g.drawImage(mott, (i * 37) % 60, (i * 23) % 40, 60, 40, 0, 0, UF.W, UF.H);
          g.restore();
          g.save();
          g.globalAlpha = 0.28;
          g.strokeStyle = UF.lerpColor(C.soil[i], C.ink, 0.25);
          g.lineWidth = 2.2;
          g.stroke(p);
          g.restore();
        });

        // Stipple: two offset 6 px grids.
        const sect = new Path2D();
        scene.soil.forEach((_, i) => sect.addPath(bandPath(i, scene)));
        g.save();
        g.clip(sect);
        const r = UF.rng(5);
        g.fillStyle = C.ink;
        [[0, 0], [3, 3]].forEach(([ox, oy], layer) => {
          for (let y = scene.groundY + 2 + oy; y < SECTION.y1; y += 6) {
            const band = y < scene.soil[1].y0 ? 0 : y < scene.soil[2].y0 ? 1 : 2;
            g.globalAlpha = 0.25 + band * 0.05 - layer * 0.03;
            g.beginPath();
            for (let x = SECTION.x0 + ox; x < SECTION.x1; x += 6) {
              const px = x + (r() - 0.5) * 2.4, py = y + (r() - 0.5) * 2.4;
              const rad = 0.6 + r() * 0.1;
              g.moveTo(px + rad, py);
              g.arc(px, py, rad, 0, Math.PI * 2);
            }
            g.fill();
          }
        });
        g.restore();
        g.globalAlpha = 1;

        const W0 = g.getTransform();
        const cav = cavityPaths(scene);
        const all = new Path2D();
        cav.forEach((c) => all.addPath(c.path));

        // Pebbles in the deeper bands, kept clear of every cavity.
        const pr = UF.rng(77);
        let placed = 0, tries = 0;
        while (placed < 16 && tries++ < 400) {
          const x = SECTION.x0 + 14 + pr() * (SECTION.x1 - SECTION.x0 - 28);
          const y = 232 + pr() * (SECTION.y1 - 246);
          const rx = 2.5 + pr() * 4.5, ry = rx * (0.55 + pr() * 0.3);
          const hit = UF.cavities(scene).some((c) => x + rx + 8 > c.x && x - rx - 8 < c.x + c.w && y + ry + 8 > c.y && y - ry - 8 < c.y + c.h);
          if (hit) continue;
          const p = wobEllipse(x, y, rx, ry, pr() * 0.6 - 0.3, placed * 3.1, 1);
          g.fillStyle = C.paperShadow;
          g.fill(p);
          hatchW(g, p, W0, [x - 10, y - 10, 20, 20], 35, 2.2, 0.6, 0.45, placed);
          g.lineWidth = HALF;
          g.strokeStyle = C.ink;
          g.stroke(p);
          placed++;
        }

        // Cavities: wash, ceiling hatching, union outline.
        g.save();
        g.beginPath();
        g.rect(0, scene.groundY, UF.W, UF.H);
        g.clip();
        g.fillStyle = C.tunnel;
        g.fill(all);

        const ceil = UF.bakeRegion(s, 0, 0, UF.W, UF.H, (h) => {
          const W1 = h.getTransform();
          UF.hatch(h, all, { angle: 35, spacing: 4, width: 0.9, alpha: 1, color: C.ink, world: W1, jitter: 1 });
          h.globalCompositeOperation = 'destination-out';
          h.translate(0, 6.5);
          h.fill(all);
        });
        g.globalAlpha = 0.32;
        UF.drawBaked(g, ceil);
        g.globalAlpha = 1;

        const rooms = cav.filter((c) => c.c.kind === 'room');
        const tunnels = cav.filter((c) => c.c.kind === 'tunnel');
        const clipGround = (h) => { h.beginPath(); h.rect(0, scene.groundY, UF.W, UF.H); h.clip(); };
        UF.drawBaked(g, UF.unionOutline(s, tunnels.map((c) => ({ path: c.path, width: LINE })), [all], C.ink, clipGround));
        UF.drawBaked(g, UF.unionOutline(s, rooms.map((c) => ({ path: c.path, width: 1.6 })), [all], C.ink, clipGround));

        // Rooms' inner rule, 4 px inset, broken where corridors run through.
        const inner = UF.bakeRegion(s, 0, 0, UF.W, UF.H, (h) => {
          h.strokeStyle = C.ink;
          h.lineWidth = 0.6;
          rooms.forEach((c, i) => {
            const r0 = c.c;
            h.stroke(wobRect(r0.x + 4, r0.y + 4, r0.w - 8, r0.h - 8, 10, scene.tunnels.length + i + 3));
          });
          h.globalCompositeOperation = 'destination-out';
          tunnels.forEach((c) => h.fill(c.path));
        });
        UF.drawBaked(g, inner);
        g.restore();

        // Built look ------------------------------------------------
        // Queen's chamber: a faint hatched floor mound.
        g.save();
        g.clip(all);
        const q = scene.queen;
        const mound = wobPath(
          Array.from({ length: 24 }, (_, i) => {
            const a = Math.PI + (i / 23) * Math.PI;
            return [q.x + Math.cos(a) * 50, 223 + Math.sin(a) * 21];
          }), false, 1.2, 0.05, 4);
        mound.lineTo(q.x + 50, 226);
        mound.lineTo(q.x - 50, 226);
        mound.closePath();
        g.globalAlpha = 0.45;
        g.fillStyle = C.soil[0];
        g.fill(mound);
        g.globalAlpha = 1;
        hatchW(g, mound, W0, [q.x - 60, 195, 120, 35], 35, 5, 0.8, 0.35, 3);
        g.restore();

        // Barracks: an earthen ledge the majors rest on.
        g.save();
        g.clip(all);
        const ledge = wobPath([[428, 339], [470, 338.2], [515, 339.4], [562, 338.6]], false, 0.8, 0.06, 8);
        const ledgeFill = wobPath([[428, 339], [470, 338.2], [515, 339.4], [562, 338.6], [566, 352], [424, 352]], true, 0.8, 0.06, 8);
        g.globalAlpha = 0.4;
        g.fillStyle = C.soil[1];
        g.fill(ledgeFill);
        g.globalAlpha = 1;
        hatchW(g, ledgeFill, W0, [420, 330, 150, 26], 35, 4, 0.8, 0.35, 9);
        g.lineWidth = HALF;
        g.strokeStyle = C.ink;
        g.stroke(ledge);
        g.restore();

        // Food store: four hatched mounds with seeds.
        scene.foodPiles.forEach((p, i) => {
          const pts = [];
          for (let k = 0; k <= 20; k++) {
            const a = Math.PI + (k / 20) * Math.PI;
            pts.push([p.x + Math.cos(a) * 13.5, 349 + Math.sin(a) * 19 * (0.95 + 0.1 * Math.sin(k + i))]);
          }
          const m = wobPath(pts.concat([[p.x + 13.5, 350], [p.x - 13.5, 350]]), true, 0.8, 0.08, 20 + i);
          g.globalAlpha = 0.95;
          g.fillStyle = C.food;
          g.fill(m);
          g.globalAlpha = 1;
          hatchW(g, m, W0, [p.x - 16, 326, 32, 26], 35, 3, 0.7, 0.5, i);
          g.save();
          g.clip(m);
          hatchW(g, new Path2D('M' + (p.x - 2) + ' 336h20v20h-20z'), W0, [p.x - 2, 336, 20, 20], 125, 3, 0.7, 0.5, i + 4);
          g.restore();
          g.lineWidth = LINE;
          g.strokeStyle = C.ink;
          g.stroke(m);
          const sr = UF.rng(40 + i);
          g.lineWidth = HALF;
          for (let k = 0; k < 5; k++) {
            const sx = p.x - 7 + sr() * 14, sy = 337 + sr() * 9;
            g.stroke(wobEllipse(sx, sy, 1.9, 1.2, sr() * 2, k + i * 5, 1));
          }
        });

        // Hatchery: eggs, hatched on one side (static on a plate).
        scene.eggs.forEach((e, i) => {
          const p = wobEllipse(e.x, e.y, 3.4, 4.6, 0.35, i * 2.3, 1);
          g.fillStyle = C.paper;
          g.fill(p);
          g.save();
          g.clip(p);
          hatchW(g, new Path2D('M' + e.x + ' ' + (e.y - 8) + 'h8v16h-8z'), W0, [e.x - 6, e.y - 8, 14, 16], 35, 1.7, 0.5, 0.6, i);
          g.restore();
          g.lineWidth = 1.0;
          g.strokeStyle = C.ink;
          g.stroke(p);
        });

        // Crumb on the surface.
        const cr = scene.crumb;
        const crumbPts = UF.sampleEllipse(cr.x, cr.y + 2, 6.5, 4.6, 14, 0.2).map(([x, y], i) => [x + Math.sin(i * 2.7) * 0.9, y + Math.cos(i * 1.9) * 0.8]);
        const crumb = UF.smoothPath(crumbPts, true);
        g.fillStyle = C.food;
        g.fill(crumb);
        hatchW(g, crumb, W0, [cr.x - 8, cr.y - 6, 16, 14], 35, 2.2, 0.6, 0.5, 2);
        g.lineWidth = LINE;
        g.strokeStyle = C.ink;
        g.stroke(crumb);

        // Grass line with ticks, broken at the nest entrance.
        const shaft = scene.tunnels.find((t) => t.id === 'shaft');
        const gr = UF.rng(12);
        g.strokeStyle = C.ink;
        g.lineCap = 'round';
        [[SECTION.x0 - 2, shaft.x - 2], [shaft.x + shaft.w + 2, SECTION.x1 + 2]].forEach(([a, b], seg) => {
          const pts = [];
          for (let x = a; x <= b; x += 6) pts.push([x, scene.groundY]);
          pts.push([b, scene.groundY]);
          g.lineWidth = 1.6;
          g.stroke(wobPath(pts, false, 0.9, 0.05, 30 + seg));
          g.lineWidth = 0.8;
          g.beginPath();
          for (let x = a + 3; x < b - 2; x += 9) {
            const len = 5 + gr() * 6, lean = (gr() - 0.5) * 3;
            g.moveTo(x, scene.groundY - 0.5);
            g.quadraticCurveTo(x + lean * 0.3, scene.groundY - len * 0.6, x + lean, scene.groundY - len);
          }
          g.stroke();
        });
        // Spoil heaped either side of the entrance.
        [[shaft.x - 2, -1], [shaft.x + shaft.w + 2, 1]].forEach(([x, dir], i) => {
          const m = wobPath([[x, 70], [x + dir * 4, 65.5], [x + dir * 11, 64.5], [x + dir * 20, 70]], false, 0.4, 0.1, 50 + i);
          g.lineWidth = 1.2;
          g.stroke(m);
        });
        g.lineCap = 'butt';

        // Title, captions, labels ------------------------------------
        g.textBaseline = 'alphabetic';
        richCentered(g, [['Plate IV.  ', false], ['Lasius niger', true], [', the garden ant — nest in section', false]], 330, 40, 18);

        const figs = { queen: 'fig. 1', hatchery: 'fig. 2', store: 'fig. 3', barracks: 'fig. 4' };
        const names = { queen: 'queen’s chamber', hatchery: 'hatchery', store: 'food store', barracks: 'barracks' };
        scene.rooms.forEach((r0) => text(g, figs[r0.id] + '  ' + names[r0.id], r0.x + r0.w / 2, r0.y + 17, true, 'center'));

        // Leader-line labels in the margins.
        const lab = (s, tx, ty, align, lx, ly, ex, ey) => { text(g, s, tx, ty, true, align); leader(g, lx, ly, ex, ey); };
        lab('regina, dealata', 612, 132, 'left', 608, 128, 488, 172);
        lab('operaria', 276, 102, 'left', 318, 104, 355, 137);
        lab('miles, quiescens', 612, 296, 'left', 636, 300, 556, 325);
        lab('operaria onusta', 160, 404, 'left', 208, 394, 246, 351);
        lab('Pardosa sp.', 612, 92, 'left', 630, 83, 630, 72);
        lab('mica panis', 46, 98, 'left', 78, 88, 97, 68);
        text(g, 'fig. 5  hora', 172, 184, true, 'center');

        // Scale bar and imprint.
        g.strokeStyle = C.ink;
        g.lineWidth = HALF;
        g.beginPath();
        g.moveTo(46, 436); g.lineTo(106, 436);
        for (let k = 0; k <= 5; k++) { g.moveTo(46 + k * 12, 436); g.lineTo(46 + k * 12, k % 5 ? 433.5 : 432); }
        g.stroke();
        text(g, '5 mm', 112, 440, true, 'left');
        text(g, 'Underfoot del. et pinx.', 674, 440, true, 'right');

        // Border: double rule at 18 and 22 px.
        g.strokeStyle = C.ink;
        g.lineWidth = 0.8;
        g.strokeRect(18, 18, UF.W - 36, UF.H - 36);
        g.lineWidth = 0.4;
        g.strokeRect(22, 22, UF.W - 44, UF.H - 44);
      })
    );
  }

  // ------------------------------------------------------------ creatures
  function drawPart(g, W0, bb, path, fill, k, sp, darkClip, seed) {
    g.save();
    g.translate(0.5 / k, 0.35 / k);
    g.globalAlpha = 0.93;
    g.fillStyle = fill;
    g.fill(path);
    g.restore();
    hatchW(g, path, W0, bb, 35, sp, 0.55, 0.5, seed);
    if (darkClip) {
      g.save();
      g.clip(path);
      hatchW(g, darkClip, W0, bb, 125, sp, 0.55, 0.5, seed + 1);
      g.restore();
    }
    g.lineWidth = LINE / k;
    g.strokeStyle = C.ink;
    g.stroke(path);
  }

  function lowerThird(e) {
    const p = new Path2D();
    p.rect(e.x - e.rx - 2, e.y + e.ry / 3, e.rx * 2 + 4, e.ry + 2);
    return p;
  }

  function drawAnt(g, a, pose) {
    const W0 = g.getTransform();
    const b = UF.antBody(a.caste);
    const k = b.scale;
    const queen = a.caste === 'queen';
    const fill = queen ? C.queen : C.ant;
    const sp = queen ? 3.4 : 2.3;
    const ext = queen ? 62 : 30;
    const bb = [a.x - ext, a.y - ext, ext * 2, ext * 2];
    const seed = UF.hash(a.key) % 97;
    g.save();
    UF.orient(g, a.x, a.y, a.heading || 0);
    g.scale(k, k);
    g.lineCap = 'round';
    g.lineJoin = 'round';

    // Legs: the only half-weight lines on the body. Far side drawn lighter.
    const legs = UF.antLegs(b, pose ? (3 * Math.PI) / 2 : Math.PI / 2, { tucked: a.resting });
    legs.sort((l1, l2) => l2.side - l1.side).forEach((l) => {
      g.globalAlpha = l.side ? 0.55 : 1;
      g.strokeStyle = C.ink;
      g.lineWidth = HALF / k;
      g.stroke(legPath(l));
    });
    g.globalAlpha = 1;

    // Antennae (and mandibles) at a light contour weight.
    g.lineWidth = 1.0 / k;
    g.strokeStyle = C.ink;
    UF.antAntennae(b).forEach((an, i) => {
      g.globalAlpha = i ? 0.6 : 1;
      g.beginPath();
      g.moveTo(an[0][0], an[0][1]);
      g.lineTo(an[1][0], an[1][1]);
      g.quadraticCurveTo(an[1][0] + 1.2, an[1][1] + 0.2, an[2][0], an[2][1]);
      g.stroke();
    });
    g.globalAlpha = 1;

    const ab = b.abdomen, th = b.thorax, hd = b.head, pt = b.petiole;
    const abP = wobEllipse(ab.x, ab.y, ab.rx, ab.ry, -0.12, seed + 1, k);
    drawPart(g, W0, bb, abP, fill, k, sp, lowerThird(ab), seed);
    if (queen) {
      // Tergite bands across the gaster.
      g.lineWidth = HALF / k;
      [-0.45, 0.0, 0.42].forEach((f) => {
        const x = ab.x + f * ab.rx;
        const e = ab.ry * Math.sqrt(1 - f * f) * 0.96;
        g.beginPath();
        g.moveTo(x + 0.6, ab.y - e);
        g.quadraticCurveTo(x - 1.6, ab.y, x + 0.6, ab.y + e);
        g.stroke();
      });
    }
    const ptP = wobEllipse(pt.x, pt.y, pt.r, pt.r * 1.2, 0, seed + 2, k);
    drawPart(g, W0, bb, ptP, fill, k, sp, null, seed + 2);
    const thP = wobEllipse(th.x, th.y, th.rx, th.ry, 0.1, seed + 3, k);
    drawPart(g, W0, bb, thP, fill, k, sp, lowerThird(th), seed + 3);
    const hdP = wobEllipse(hd.x, hd.y, hd.rx, hd.ry, 0, seed + 4, k);
    drawPart(g, W0, bb, hdP, fill, k, sp, lowerThird(hd), seed + 4);

    // Mandibles.
    g.lineWidth = 1.0 / k;
    const mx = hd.x + hd.rx * 0.82, my = hd.y + hd.ry * 0.45;
    const big = a.caste === 'major' ? 1.5 : 1;
    g.beginPath();
    g.moveTo(mx, my);
    g.quadraticCurveTo(mx + 2.4 * big, my + 0.2, mx + 2.0 * big, my + 1.9 * big);
    if (a.caste === 'major') {
      g.moveTo(mx + 1.5, my + 0.5);
      g.lineTo(mx + 1.9, my + 1.4);
    }
    g.stroke();

    if (queen) {
      // Wing scars on the thorax.
      g.lineWidth = 1.0 / k;
      g.beginPath();
      g.moveTo(th.x - 0.4, th.y - th.ry * 0.9);
      g.lineTo(th.x - 2.3, th.y - th.ry - 1.5);
      g.moveTo(th.x + 0.9, th.y - th.ry * 0.95);
      g.lineTo(th.x - 0.7, th.y - th.ry - 1.9);
      g.stroke();
    }

    if (a.carrying) {
      const c = b.carry;
      const p = wobEllipse(c.x, c.y, c.r * 1.05, c.r * 0.85, 0.3, seed + 6, k);
      g.fillStyle = C.food;
      g.fill(p);
      hatchW(g, p, W0, bb, 35, 1.6, 0.5, 0.5, seed + 6);
      g.lineWidth = 1.0 / k;
      g.strokeStyle = C.ink;
      g.stroke(p);
    }
    g.restore();
  }

  function drawSpider(g, sp, twitch) {
    const W0 = g.getTransform();
    const bb = [sp.x - 60, sp.y - 40, 120, 80];
    g.save();
    g.translate(sp.x, sp.y);
    g.scale(-sp.facing, 1);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    const ground = 26;
    // [hip, knee, foot] for near legs; far legs are offset and lighter.
    const near = [
      [[-11, 3], [-27, -11], [-50, ground]],
      [[-8, 4.5], [-18, -14], [-34, ground]],
      [[-3, 5], [10, -13], [21, ground]],
      [[0, 3.5], [25, -9], [45, ground]],
    ];
    if (twitch) {
      near[0] = [[-11, 3], [-29, -15], [-53, ground - 7]];
      near[1] = [[-8, 4.5], [-19, -15.5], [-35.5, ground - 2]];
    }
    // Femur up to the knee, then a slightly bowed tibia and metatarsus.
    const spLeg = ([h, kn, f]) => {
      const sg = f[0] < h[0] ? -1 : 1;
      const an = [kn[0] + (f[0] - kn[0]) * 0.72 + sg * 1.8, kn[1] + (f[1] - kn[1]) * 0.7];
      const p = new Path2D();
      p.moveTo(h[0], h[1]);
      p.quadraticCurveTo(h[0] + (kn[0] - h[0]) * 0.35, kn[1] + 1, kn[0], kn[1]);
      p.quadraticCurveTo(kn[0] + (an[0] - kn[0]) * 0.55 + sg * 1.2, kn[1] + (an[1] - kn[1]) * 0.45, an[0], an[1]);
      p.lineTo(f[0], f[1]);
      return p;
    };
    g.strokeStyle = C.ink;
    g.globalAlpha = 0.55;
    g.lineWidth = 0.9;
    near.forEach(([h, kn, f]) => g.stroke(spLeg([[h[0] + 2, h[1] - 1], [kn[0] + 5, kn[1] + 3], [f[0] + 7, f[1]]])));
    g.globalAlpha = 1;
    g.lineWidth = 1.2;
    near.forEach((l) => g.stroke(spLeg(l)));
    // Knee joints.
    g.fillStyle = C.ink;
    near.forEach(([, kn]) => { g.beginPath(); g.arc(kn[0], kn[1], 0.9, 0, Math.PI * 2); g.fill(); });

    const ab = { x: 13, y: -3, rx: 13, ry: 11 };
    const abP = wobEllipse(ab.x, ab.y, ab.rx, ab.ry, -0.18, 61, 1);
    drawPart(g, W0, bb, abP, C.spider, 1, 3, lowerThird(ab), 61);
    // Median band along the back.
    g.lineWidth = HALF;
    g.beginPath();
    g.moveTo(1.5, -9.5);
    g.quadraticCurveTo(12, -14.5, 23, -8);
    g.moveTo(2.5, -6);
    g.quadraticCurveTo(12, -10, 22, -4.5);
    g.stroke();
    const ce = { x: -6, y: 2, rx: 7.5, ry: 6.5 };
    const ceP = wobEllipse(ce.x, ce.y, ce.rx, ce.ry, 0.1, 62, 1);
    drawPart(g, W0, bb, ceP, C.spider, 1, 3, lowerThird(ce), 62);
    // Pedipalps and spinnerets.
    g.lineWidth = 1.0;
    g.beginPath();
    g.moveTo(-12, 5); g.quadraticCurveTo(-16, 6, -16.5, 9.5);
    g.moveTo(-11, 6.5); g.quadraticCurveTo(-14, 8, -14, 11);
    g.moveTo(25.5, 0); g.lineTo(27.5, 1.5);
    g.stroke();
    g.restore();
  }

  function sprites(scene, s) {
    return cache.get('spr' + s, () => {
      const out = {};
      UF.creatures(scene).forEach((a) => {
        const ext = a.caste === 'queen' ? 64 : 32;
        const poses = a.resting ? [0] : [0, 1];
        out[a.key] = poses.map((pose) => UF.bakeRegion(s, a.x - ext, a.y - ext, ext * 2, ext * 2, (g) => drawAnt(g, a, pose)));
      });
      const sp = scene.spider;
      out.spider = [0, 1].map((tw) => UF.bakeRegion(s, sp.x - 60, sp.y - 34, 120, 70, (g) => drawSpider(g, sp, tw)));
      return out;
    });
  }

  function grain(s) {
    return cache.get('grain', () => UF.fractalCanvas(UF.W, UF.H, 3, 0.35, 1));
  }

  function hourDial(g, t) {
    const cx = 172, cy = 160, r = 8.5;
    g.save();
    g.strokeStyle = C.ink;
    g.lineWidth = HALF;
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.stroke();
    const p = new Path2D();
    p.arc(cx, cy, r, 0, Math.PI * 2);
    UF.hatch(g, p, { angle: 35, spacing: 2.4, width: 0.5, alpha: 0.25, color: C.ink, bbox: [cx - r, cy - r, r * 2, r * 2] });
    g.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.moveTo(cx + Math.cos(a) * (r - 1.8), cy + Math.sin(a) * (r - 1.8));
      g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    const n = Math.floor(t + 1e-6) % 12;
    const a = (n / 12) * Math.PI * 2 - Math.PI / 2;
    g.moveTo(cx, cy);
    g.lineTo(cx + Math.cos(a) * (r - 2.2), cy + Math.sin(a) * (r - 2.2));
    g.stroke();
    g.restore();
  }

  function draw(ctx, scene, t) {
    const s = UF.scaleOf(ctx);
    UF.drawBaked(ctx, env(scene, s));
    const spr = sprites(scene, s);
    const pose = Math.floor(t * scene.motion.legHz * 2 + 1e-6) % 2;
    UF.creatures(scene).forEach((a) => {
      const set = spr[a.key];
      const img = set[a.resting ? 0 : pose];
      let dx = 0, dy = 0;
      if (a.carrying) {
        const bob = UF.carryBob(scene, t);
        const d = downVec(a.heading || 0);
        dx = d[0] * bob;
        dy = d[1] * bob;
      }
      UF.drawBaked(ctx, img, dx, dy);
    });
    UF.drawBaked(ctx, spr.spider[UF.spiderTwitch(scene, t, 0.25)]);
    hourDial(ctx, t);

    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.07;
    ctx.drawImage(grain(s), 0, 0, UF.W, UF.H);
    ctx.restore();
  }

  UF.register('field-guide', { meta, fps: 12, draw });
})();
