// CLAYMATION — stop-motion plasticine on a foam-board set.
// Every solid casts a drop shadow, every clay edge carries a baked fingerprint
// wobble, and motion runs at 12 fps on twos (6 unique poses per second).
(function () {
  const UF = window.UF;
  const cache = UF.makeCache();
  const noise = UF.noise2(203);

  const C = {
    sky: '#A9D3EF',
    felt: '#6FAE3D',
    soil: '#8F5A2F',
    blob: '#7E4E27',
    tunnel: '#3B2213',
    floor: '#4A2C18',
    antHi: '#5A3E2C', antLo: '#1E120B',
    queenHi: '#8A6246', queenLo: '#3A2416',
    eggHi: '#FFFAF0', eggLo: '#D9C9A8',
    foodHi: '#FFE08A', foodLo: '#C7901E',
    spider: '#3A2A2A',
    tag: '#FFF6DD', tagInk: '#5A3A1A',
  };
  const FONT = 'Fredoka, "Baloo 2", "Trebuchet MS", system-ui, sans-serif';
  const HOLD = 6; // unique poses per second (12 fps on twos)

  const meta = {
    label: 'Claymation',
    status: 'full',
    tagline: 'Aardman-style stop-motion: plasticine ants with fingerprints and googly eyes on a foam-board set.',
    refs: 'Wallace & Gromit, The Neverhood, Armikrog, Skullmonkeys, Clay Fighter, Harold Halibut, Yoshi’s Woolly World, Hylics',
    matrix: ['Neverhood, Armikrog, Aardman', 'Medium (if pre-rendered)', 'Medium', 'High', 'Medium'],
    palette: [
      ['Sky foam', C.sky], ['Grass felt', C.felt], ['Soil clay', C.soil], ['Pressed blob', C.blob],
      ['Tunnel', C.tunnel], ['Room floor', C.floor], ['Ant light', C.antHi], ['Ant dark', C.antLo],
      ['Queen light', C.queenHi], ['Queen dark', C.queenLo], ['Egg', C.eggHi], ['Egg shade', C.eggLo],
      ['Food', C.foodHi], ['Food shade', C.foodLo], ['Spider', C.spider], ['Tag paper', C.tag], ['Tag ink', C.tagInk],
    ],
    type: 'Fredoka 600 — 12 px on paper tags (rotated −2°, drop shadow); 20 px title on a tilted card.',
    motion: '12 fps on twos: 6 unique poses a second, three baked walk poses, positions snapped to a 2 px grid. Eyes blink every 3–5 s for one frame; the queen blinks slower. Carry bob 2 px. Spider legs settle one frame every 2 s.',
    risks: 'Cute can fight the colony-as-hero tone. Are 50 googly-eyed ants charming or noisy?',
    notes: 'The brief gives one soil colour; the three bands are cut as separate clay slabs (slightly different mixes) so the layered set reads. Resting majors keep their legs tucked and their eyes half-lidded. The real pipeline would be Blender or Three.js sprite sheets; this is a 2D stand-in.',
  };

  // ------------------------------------------------------------ helpers
  function thumb(pts, amp, freq, seed) {
    return pts.map(([x, y]) => [
      x + UF.fbm(noise, x * freq + seed, y * freq, 3) * amp,
      y + UF.fbm(noise, x * freq, y * freq + seed + 11, 3) * amp,
    ]);
  }
  function clayRect(x, y, w, h, r, seed, amp) {
    return UF.smoothPath(thumb(UF.sampleRoundRect(x, y, w, h, r, 3), amp || 2, 0.08, seed), true);
  }
  function clayEllipse(cx, cy, rx, ry, rot, seed, amp, freq) {
    const n = Math.max(20, Math.round((rx + ry) * 2));
    return UF.smoothPath(thumb(UF.sampleEllipse(cx, cy, rx, ry, n, rot || 0), amp, freq, seed), true);
  }
  // World light (top-left) expressed in the current local frame.
  function lightDir(g) {
    const m = g.getTransform();
    const wx = -0.55, wy = -0.83;
    const det = m.a * m.d - m.b * m.c;
    let lx = (m.d * wx - m.c * wy) / det, ly = (-m.b * wx + m.a * wy) / det;
    const n = Math.hypot(lx, ly) || 1;
    return [lx / n, ly / n];
  }
  function clayFill(g, path, cx, cy, r, hi, lo) {
    const [lx, ly] = lightDir(g);
    const gr = g.createRadialGradient(cx + lx * r * 0.45, cy + ly * r * 0.45, r * 0.08, cx, cy, r * 1.25);
    gr.addColorStop(0, hi);
    gr.addColorStop(1, lo);
    g.fillStyle = gr;
    g.fill(path);
  }
  function specular(g, cx, cy, rx, ry, alpha, tint) {
    const [lx, ly] = lightDir(g);
    const sx = cx + lx * rx * 0.45, sy = cy + ly * ry * 0.5;
    const gr = g.createRadialGradient(sx, sy, 0, sx, sy, Math.max(rx, ry) * 0.42);
    gr.addColorStop(0, tint || 'rgba(255,255,255,' + alpha + ')');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.ellipse(sx, sy, rx * 0.42, ry * 0.26, Math.atan2(ly, lx) + Math.PI / 2, 0, Math.PI * 2);
    g.fill();
  }
  // Bake a region, then re-draw it with the set's drop shadow.
  function shadowed(s, x, y, w, h, fn, dy, blur, alpha) {
    const raw = UF.bakeRegion(s, x, y, w, h, fn);
    return UF.bakeRegion(s, x, y, w, h, (g) => {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.shadowColor = 'rgba(0,0,0,' + (alpha == null ? 0.35 : alpha) + ')';
      g.shadowOffsetY = (dy == null ? 3 : dy) * s;
      g.shadowBlur = (blur == null ? 2 : blur) * s;
      g.drawImage(raw.canvas, 0, 0);
    });
  }
  // Studio rim light: a pale crescent on the lit side, so dark clay still
  // separates from the dark tunnels.
  function rim(g, path, d, w, alpha) {
    const [lx, ly] = lightDir(g);
    g.save();
    g.clip(path);
    g.translate(-lx * d, -ly * d);
    g.strokeStyle = 'rgba(255,214,170,' + alpha + ')';
    g.lineWidth = w;
    g.stroke(path);
    g.restore();
  }
  function sphere(g, x, y, r, hi, lo, seed) {
    const p = clayEllipse(x, y, r, r * 0.94, 0, seed, r * 0.08, 0.6);
    clayFill(g, p, x, y, r, hi, lo);
    specular(g, x, y, r, r, 0.55);
  }
  function downVec(headingDeg) {
    const h = (headingDeg * Math.PI) / 180;
    return Math.cos(h) < -1e-6 ? [Math.sin(h), -Math.cos(h)] : [-Math.sin(h), Math.cos(h)];
  }

  // ------------------------------------------------------------ set
  // Each band is its own slab, from its top edge down to a hand-cut bottom
  // edge that overlaps (and shadows) the slab below.
  function slabPath(scene, i) {
    const b = scene.soil[i];
    const last = i === scene.soil.length - 1;
    const pts = [];
    for (let x = -10; x <= UF.W + 10; x += 5) pts.push([x, b.y0 - (i ? 6 : 0)]);
    for (let x = UF.W + 10; x >= -10; x -= 5) pts.push([x, last ? UF.H + 10 : b.y1 + UF.fbm(noise, x * 0.03, i * 5 + 2, 3) * 6]);
    return UF.polyPath(pts, true);
  }

  function env(scene, s) {
    return cache.get('env' + s, () => {
      const cav = UF.cavities(scene).map((c, i) => ({
        c,
        path: clayRect(c.x, c.y, c.w, c.h, c.kind === 'room' ? 30 : 14, i * 7 + 3, 1.6),
      }));
      const holes = new Path2D();
      cav.forEach((c) => holes.addPath(c.path));

      return UF.bakeRegion(s, 0, 0, UF.W, UF.H, (g) => {
        // Foam-board sky.
        const sky = g.createLinearGradient(0, 0, 0, scene.groundY);
        sky.addColorStop(0, UF.lerpColor(C.sky, '#ffffff', 0.12));
        sky.addColorStop(1, C.sky);
        g.fillStyle = sky;
        g.fillRect(0, 0, UF.W, scene.groundY + 10);

        // The cut-away behind the slabs: tunnel clay, then room floors.
        g.fillStyle = C.tunnel;
        g.fillRect(0, scene.groundY, UF.W, UF.H - scene.groundY);
        cav.filter((c) => c.c.kind === 'room').forEach((c) => {
          g.fillStyle = C.floor;
          g.fill(c.path);
        });

        // Room props that sit inside the cut-away, under the slab shadows.
        roomProps(g, scene, s);

        // Three clay slabs, bottom first, each casting onto what is below.
        for (let i = scene.soil.length - 1; i >= 0; i--) {
          const mix = [C.soil, UF.lerpColor(C.soil, '#5E3518', 0.3), UF.lerpColor(C.soil, '#7A3420', 0.5)][i];
          const slab = UF.bakeRegion(s, 0, 0, UF.W, UF.H, (h) => {
            const p = slabPath(scene, i);
            h.save();
            h.clip(p);
            h.fillStyle = mix;
            h.fillRect(0, 0, UF.W, UF.H);
            // Light falloff across the slab.
            const lg = h.createLinearGradient(0, scene.soil[i].y0, 0, scene.soil[i].y1);
            lg.addColorStop(0, 'rgba(255,230,200,0.10)');
            lg.addColorStop(1, 'rgba(0,0,0,0.10)');
            h.fillStyle = lg;
            h.fillRect(0, 0, UF.W, UF.H);
            // Pressed blobs.
            const r = UF.rng(31 + i);
            const count = [26, 24, 22][i];
            for (let k = 0; k < count; k++) {
              const x = r() * UF.W, y = scene.soil[i].y0 + 6 + r() * (scene.soil[i].y1 - scene.soil[i].y0 - 6);
              const rad = 6 + r() * 12;
              const bp = clayEllipse(x, y, rad, rad * (0.6 + r() * 0.35), r() * 3, k * 13 + i, 1.8, 0.09);
              h.globalAlpha = 0.5;
              h.fillStyle = C.blob;
              h.fill(bp);
              h.globalAlpha = 0.18;
              h.strokeStyle = '#E8B98C';
              h.lineWidth = 1;
              h.save();
              h.clip(bp);
              h.translate(0.8, 1.2);
              h.stroke(bp);
              h.restore();
              h.globalAlpha = 1;
            }
            // Fingerprint whorls.
            h.strokeStyle = 'rgba(40,20,8,0.10)';
            h.lineWidth = 0.7;
            for (let k = 0; k < 2; k++) {
              const x = 60 + r() * (UF.W - 120), y = scene.soil[i].y0 + 20 + r() * (scene.soil[i].y1 - scene.soil[i].y0 - 40);
              const rot = r() * Math.PI;
              for (let ring = 2; ring < 11; ring++) {
                h.beginPath();
                h.ellipse(x, y, ring * 2.1, ring * 1.4, rot, 0.4, Math.PI * 2 - 0.3);
                h.stroke();
              }
            }
            h.restore();
            // A soft lip of light just inside the cut edge.
            h.save();
            h.clip(p);
            h.strokeStyle = 'rgba(255,225,190,0.22)';
            h.lineWidth = 2;
            h.translate(0, -1.6);
            h.stroke(p);
            h.restore();
            // Cut the nest out of the slab.
            h.globalCompositeOperation = 'destination-out';
            h.fill(holes);
          });
          g.save();
          g.shadowColor = 'rgba(0,0,0,0.45)';
          g.shadowOffsetY = 3 * s;
          g.shadowBlur = 4 * s;
          UF.drawBaked(g, slab);
          g.restore();
        }

        // Felt grass strip, broken at the entrance.
        const shaft = scene.tunnels.find((t) => t.id === 'shaft');
        const felt = UF.bakeRegion(s, 0, 40, UF.W, 50, (h) => {
          const fr = UF.rng(8);
          [[-10, shaft.x - 1], [shaft.x + shaft.w + 1, UF.W + 10]].forEach(([a, b]) => {
            const pts = [];
            for (let x = a; x <= b; x += 2.5) pts.push([x, 64 + UF.fbm(noise, x * 0.25, 3, 2) * 1.6 + (fr() - 0.5) * 0.8]);
            pts.push([b, 66], [b, 76], [a, 76], [a, 66]);
            const p = UF.smoothPath(pts, true);
            h.fillStyle = C.felt;
            h.fill(p);
            h.save();
            h.clip(p);
            for (let k = 0; k < (b - a) * 3; k++) {
              h.fillStyle = fr() < 0.5 ? 'rgba(255,255,220,0.16)' : 'rgba(20,50,10,0.16)';
              h.fillRect(a + fr() * (b - a), 62 + fr() * 14, 0.6 + fr() * 1.6, 0.5);
            }
            h.restore();
          });
        });
        g.save();
        g.shadowColor = 'rgba(0,0,0,0.35)';
        g.shadowOffsetY = 3 * s;
        g.shadowBlur = 2 * s;
        UF.drawBaked(g, felt);
        g.restore();

        // Pebble and crumb on the felt.
        UF.drawBaked(g, shadowed(s, 452, 50, 40, 30, (h) => {
          const p = clayEllipse(470, 64, 9, 6, -0.1, 4, 0.6, 0.4);
          clayFill(h, p, 470, 64, 9, '#B3A99F', '#5E554E');
          specular(h, 470, 64, 9, 6, 0.4);
        }));
        const cr = scene.crumb;
        UF.drawBaked(g, shadowed(s, cr.x - 16, cr.y - 16, 32, 32, (h) => {
          const p = clayEllipse(cr.x, cr.y + 1, 6.5, 5, 0.3, 9, 0.9, 0.5);
          clayFill(h, p, cr.x, cr.y + 1, 6.5, C.foodHi, C.foodLo);
          specular(h, cr.x, cr.y + 1, 6.5, 5, 0.6);
        }));

        // Paper tags and the title card.
        const tagFor = { queen: "Queen's chamber", hatchery: 'Hatchery', store: 'Food store', barracks: 'Barracks' };
        scene.rooms.forEach((r0, i) => tag(g, s, tagFor[r0.id], r0.x + 14, r0.y - 22, -2 + (i % 2) * 0.8, 12));
        tag(g, s, 'Underfoot · the nest, take 12', 16, 17, -3, 20, true);
      });
    });
  }

  function tag(g, s, label, x, y, deg, size, title) {
    g.save();
    g.font = '600 ' + size + 'px ' + FONT;
    const w = g.measureText(label).width + (title ? 26 : 22);
    const h = size + (title ? 14 : 9);
    const card = shadowed(s, x - 10, y - 12, w + 30, h + 30, (k) => {
      k.translate(x, y);
      k.rotate((deg * Math.PI) / 180);
      const p = new Path2D();
      if (title) {
        UF.roundRectPath(p, 0, 0, w, h, 3);
      } else {
        // A luggage tag: clipped corners on the string end.
        p.moveTo(6, 0); p.lineTo(w, 0); p.lineTo(w, h); p.lineTo(6, h); p.lineTo(0, h - 6); p.lineTo(0, 6); p.closePath();
      }
      k.fillStyle = C.tag;
      k.fill(p);
      k.strokeStyle = 'rgba(90,58,26,0.25)';
      k.lineWidth = 0.6;
      k.stroke(p);
      if (!title) {
        k.fillStyle = C.floor;
        k.beginPath();
        k.arc(6.5, h / 2, 1.8, 0, Math.PI * 2);
        k.fill();
      }
      k.fillStyle = C.tagInk;
      k.font = '600 ' + size + 'px ' + FONT;
      k.textBaseline = 'middle';
      k.fillText(label, title ? 13 : 13, h / 2 + 0.5);
    }, 3, 2);
    UF.drawBaked(g, card);
    g.restore();
  }

  function roomProps(g, scene, s) {
    // Hatchery: eggs sit in a bottle cap.
    UF.drawBaked(g, shadowed(s, 190, 180, 120, 40, (h) => {
      const x0 = 203, x1 = 287, y0 = 199, y1 = 208;
      const side = new Path2D();
      side.moveTo(x0, y0);
      for (let x = x0; x <= x1; x += 4) { side.lineTo(x, y1 + ((x - x0) % 8 === 0 ? 0 : 1.2)); }
      side.lineTo(x1, y0);
      side.closePath();
      const sg = h.createLinearGradient(x0, 0, x1, 0);
      sg.addColorStop(0, '#7C776E'); sg.addColorStop(0.35, '#D9D4CA'); sg.addColorStop(1, '#6E6960');
      h.fillStyle = sg;
      h.fill(side);
      h.fillStyle = '#B9B4AA';
      h.beginPath();
      h.ellipse((x0 + x1) / 2, y0, (x1 - x0) / 2, 3, 0, 0, Math.PI * 2);
      h.fill();
      h.fillStyle = 'rgba(255,255,255,0.35)';
      h.fillRect(x0 + 10, y0 + 2, 18, 1.2);
    }));

    // Food store: glossy fruit-drops, stacked.
    scene.foodPiles.forEach((p, i) => {
      UF.drawBaked(g, shadowed(s, p.x - 20, p.y - 20, 40, 40, (h) => {
        [[-7, 9], [0, 9.5], [7, 9], [-3.5, 2.5], [3.5, 2.5], [0, -4]].forEach(([dx, dy], k) =>
          sphere(h, p.x + dx, p.y + dy, 4.4, C.foodHi, C.foodLo, i * 10 + k));
      }));
    });

    // Barracks: a felt mat for the majors.
    UF.drawBaked(g, shadowed(s, 410, 326, 170, 30, (h) => {
      const p = clayRect(426, 338, 138, 8, 4, 77, 0.6);
      h.fillStyle = UF.lerpColor(C.felt, '#2E5A18', 0.25);
      h.fill(p);
      h.fillStyle = 'rgba(255,255,220,0.15)';
      const r = UF.rng(3);
      for (let k = 0; k < 220; k++) h.fillRect(426 + r() * 138, 338 + r() * 8, 1.2, 0.5);
    }, 2, 1.5));

    // Queen's chamber: a soft clay bed.
    const q = scene.queen;
    UF.drawBaked(g, shadowed(s, q.x - 64, 190, 128, 40, (h) => {
      const pts = [];
      for (let k = 0; k <= 24; k++) {
        const a = Math.PI + (k / 24) * Math.PI;
        pts.push([q.x - 4 + Math.cos(a) * 52, 223 + Math.sin(a) * 20]);
      }
      const p = UF.smoothPath(thumb(pts, 1.2, 0.1, 5), false);
      p.lineTo(q.x + 48, 226);
      p.lineTo(q.x - 56, 226);
      p.closePath();
      clayFill(h, p, q.x - 4, 210, 50, '#6B4426', '#3E2414');
    }, 2, 2));
  }

  // ------------------------------------------------------------ creatures
  function drawAntBody(g, a, pose) {
    const b = UF.antBody(a.caste);
    const k = b.scale;
    const queen = a.caste === 'queen';
    const hi = queen ? C.queenHi : C.antHi, lo = queen ? C.queenLo : C.antLo;
    const seed = (UF.hash(a.key) % 50) + 3;
    g.save();
    UF.orient(g, a.x, a.y, a.heading || 0);
    g.scale(k, k);
    g.lineCap = 'round';
    g.lineJoin = 'round';

    // Thick clay legs.
    const phase = Math.PI / 2 + (pose * 2 * Math.PI) / 3;
    const legs = UF.antLegs(b, phase, { tucked: a.resting, strideMul: 1.1 });
    legs.sort((l1, l2) => l2.side - l1.side).forEach((l) => {
      const [hx, hy] = l.hip, [fx, fy] = l.foot;
      const kx = (hx + fx) / 2 + (fx - hx) * 0.1, ky = Math.min(hy, fy) - (a.resting ? 1.2 : 2.4);
      g.strokeStyle = l.side ? '#22150c' : '#3A2617';
      g.lineWidth = (queen ? 1.7 : 2) / k * (queen ? 1.6 : 1);
      g.beginPath();
      g.moveTo(hx, hy);
      g.quadraticCurveTo(kx, ky, fx, fy);
      g.stroke();
      if (!l.side) {
        g.strokeStyle = 'rgba(255,214,170,0.4)';
        g.lineWidth = 0.7 / k;
        g.beginPath();
        g.moveTo(hx, hy - 0.4);
        g.quadraticCurveTo(kx, ky - 0.5, fx, fy - 0.5);
        g.stroke();
      }
    });

    // Antennae with ball tips.
    UF.antAntennae(b).forEach((an, i) => {
      g.strokeStyle = i ? '#140b06' : '#2A1A10';
      g.lineWidth = 1.3 / k * (queen ? 1.5 : 1);
      g.beginPath();
      g.moveTo(an[0][0], an[0][1]);
      g.quadraticCurveTo(an[1][0], an[1][1], an[2][0], an[2][1]);
      g.stroke();
      g.fillStyle = g.strokeStyle;
      g.beginPath();
      g.arc(an[2][0], an[2][1], (queen ? 1.6 : 1.0) / k * (queen ? 1.4 : 1), 0, Math.PI * 2);
      g.fill();
    });

    const fa = 0.32 / k * (queen ? 2 : 1);
    const ab = b.abdomen, th = b.thorax, hd = b.head, pt = b.petiole;
    const abR = Math.max(ab.rx, ab.ry);
    const abP = clayEllipse(ab.x, ab.y, ab.rx * 1.02, ab.ry * 1.08, -0.1, seed, fa, 1.2);
    clayFill(g, abP, ab.x, ab.y, abR, hi, lo);
    rim(g, abP, 0.9 / k * (queen ? 2 : 1), 1.4 / k * (queen ? 2 : 1), 0.45);
    specular(g, ab.x, ab.y, ab.rx, ab.ry, 0.45);
    if (queen) {
      // Pearly sheen: a cool and a warm lustre sliding across the gaster.
      const pg = g.createLinearGradient(ab.x - ab.rx, ab.y - ab.ry, ab.x + ab.rx, ab.y + ab.ry);
      pg.addColorStop(0.15, 'rgba(255,255,255,0)');
      pg.addColorStop(0.35, 'rgba(210,230,255,0.22)');
      pg.addColorStop(0.5, 'rgba(255,215,235,0.20)');
      pg.addColorStop(0.7, 'rgba(255,255,255,0)');
      g.fillStyle = pg;
      g.fill(abP);
      // Segment creases pressed into the clay.
      g.strokeStyle = 'rgba(30,15,6,0.35)';
      g.lineWidth = 0.5 / k * 2;
      [-0.4, 0.05, 0.45].forEach((f) => {
        const x = ab.x + f * ab.rx, e = ab.ry * Math.sqrt(1 - f * f) * 0.9;
        g.beginPath();
        g.moveTo(x + 0.4, ab.y - e);
        g.quadraticCurveTo(x - 1.4, ab.y, x + 0.4, ab.y + e);
        g.stroke();
      });
    }
    const ptP = clayEllipse(pt.x, pt.y, pt.r * 1.1, pt.r * 1.25, 0, seed + 1, fa * 0.5, 2);
    clayFill(g, ptP, pt.x, pt.y, pt.r * 1.2, hi, lo);
    const thP = clayEllipse(th.x, th.y, th.rx * 1.05, th.ry * 1.15, 0.1, seed + 2, fa, 1.4);
    clayFill(g, thP, th.x, th.y, th.rx, hi, lo);
    rim(g, thP, 0.7 / k, 1.1 / k, 0.4);
    specular(g, th.x, th.y, th.rx, th.ry, 0.4);
    if (queen) {
      // Wing scars: two small pale nubs on the thorax.
      [[-0.9, -1.0], [0.6, -1.15]].forEach(([dx, dy]) => {
        g.fillStyle = '#B08A6A';
        g.beginPath();
        g.ellipse(th.x + dx, th.y + th.ry * dy, 0.55, 0.38, -0.5, 0, Math.PI * 2);
        g.fill();
      });
    }
    const hdP = clayEllipse(hd.x, hd.y, hd.rx * 1.04, hd.ry * 1.04, 0, seed + 3, fa, 1.4);
    clayFill(g, hdP, hd.x, hd.y, Math.max(hd.rx, hd.ry), hi, lo);
    rim(g, hdP, 0.7 / k, 1.1 / k, 0.45);
    specular(g, hd.x, hd.y, hd.rx, hd.ry, 0.4);
    // Mandibles: two little clay hooks.
    g.strokeStyle = '#2A1A10';
    g.lineWidth = (a.caste === 'major' ? 1.4 : 1.1) / k * (queen ? 1.6 : 1);
    const mx = hd.x + hd.rx * 0.8, my = hd.y + hd.ry * 0.5, big = a.caste === 'major' ? 1.5 : 1;
    g.beginPath();
    g.moveTo(mx, my);
    g.quadraticCurveTo(mx + 2.2 * big, my, mx + 1.8 * big, my + 1.6 * big);
    g.stroke();

    if (a.carrying) {
      const c = b.carry;
      const p = clayEllipse(c.x + 0.4, c.y, c.r * 1.1, c.r, 0.2, seed + 5, 0.15, 1.5);
      clayFill(g, p, c.x + 0.4, c.y, c.r * 1.1, C.foodHi, C.foodLo);
      specular(g, c.x + 0.4, c.y, c.r, c.r, 0.6);
    }
    g.restore();
  }

  // Googly eyes are drawn live so blinks don't need extra sprites.
  function eyes(g, a, blink, dx, dy) {
    const b = UF.antBody(a.caste);
    const k = b.scale;
    const queen = a.caste === 'queen';
    const hd = b.head;
    const r = queen ? 1.6 * 2.2 / k : 1.6 / k;
    g.save();
    UF.orient(g, a.x + dx, a.y + dy, a.heading || 0);
    g.scale(k, k);
    const spots = [[hd.x - hd.rx * 0.15, hd.y - hd.ry * 0.78, 0.85], [hd.x + hd.rx * 0.35, hd.y - hd.ry * 0.55, 1]];
    const lid = queen ? (blink ? 1 : 0.35) : a.resting ? (blink ? 1 : 0.5) : blink ? 1 : 0;
    spots.forEach(([x, y, f]) => {
      const rr = r * f;
      g.fillStyle = '#FFFFFF';
      g.strokeStyle = 'rgba(0,0,0,0.35)';
      g.lineWidth = 0.25 / k;
      g.beginPath();
      g.arc(x, y, rr, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.fillStyle = '#111';
      g.beginPath();
      g.arc(x + rr * 0.42, y + rr * 0.12, rr * 0.5, 0, Math.PI * 2);
      g.fill();
      if (lid > 0) {
        g.save();
        g.beginPath();
        g.arc(x, y, rr + 0.05, 0, Math.PI * 2);
        g.clip();
        g.fillStyle = queen ? C.queenHi : C.antHi;
        g.fillRect(x - rr - 1, y - rr - 1, rr * 2 + 2, (rr * 2 + 1) * lid);
        g.restore();
      }
    });
    g.restore();
  }

  function drawSpider(g, sp, settle) {
    g.save();
    g.translate(sp.x, sp.y + (settle ? 2 : 0));
    g.scale(-sp.facing, 1);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    const ground = 26 - (settle ? 2 : 0);
    const legs = [
      [[-11, 3], [-26, -12], [-48, ground]],
      [[-8, 4.5], [-17, -15], [-32, ground]],
      [[-3, 5], [10, -14], [20, ground]],
      [[0, 3.5], [24, -10], [42, ground]],
    ];
    if (settle) legs.forEach((l) => { l[1][1] += 2.5; l[2][0] += l[2][0] < 0 ? -1.5 : 1.5; });
    const drawLeg = (l, off, col, w) => {
      const [h, kn, f] = l;
      g.strokeStyle = col;
      g.lineWidth = w;
      g.beginPath();
      g.moveTo(h[0] + off, h[1] - off * 0.4);
      g.quadraticCurveTo(h[0] + off + (kn[0] - h[0]) * 0.3, kn[1] + 1, kn[0] + off, kn[1]);
      g.quadraticCurveTo(kn[0] + off + (f[0] - kn[0]) * 0.6, kn[1] + (f[1] - kn[1]) * 0.25, f[0] + off * 1.2, f[1]);
      g.stroke();
    };
    legs.forEach((l) => drawLeg(l, 5, '#1e1414', 2.8));
    legs.forEach((l) => drawLeg(l, 0, '#2E2121', 3.2));
    legs.forEach(([, kn]) => {
      g.fillStyle = '#4A3838';
      g.beginPath();
      g.arc(kn[0], kn[1], 2, 0, Math.PI * 2);
      g.fill();
    });
    const abP = clayEllipse(13, -3, 13.5, 11.5, -0.18, 91, 0.7, 0.35);
    clayFill(g, abP, 13, -3, 14, '#5E4848', '#1A1212');
    specular(g, 13, -3, 13, 11, 0.4);
    const ceP = clayEllipse(-6, 2, 8, 7, 0.1, 92, 0.5, 0.5);
    clayFill(g, ceP, -6, 2, 8, '#5E4848', '#1A1212');
    specular(g, -6, 2, 8, 7, 0.35);
    // Four googly eyes: two big, two small.
    [[-9, -2.5, 2.6], [-4.5, -3.8, 2.3], [-12, 0.8, 1.3], [-10, -5.2, 1.1]].forEach(([x, y, r]) => {
      g.fillStyle = '#FFFFFF';
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.4)';
      g.lineWidth = 0.4;
      g.stroke();
      g.fillStyle = '#111';
      g.beginPath();
      g.arc(x - r * 0.4, y + r * 0.3, r * 0.5, 0, Math.PI * 2);
      g.fill();
    });
    g.restore();
  }

  function sprites(scene, s) {
    return cache.get('spr' + s, () => {
      const out = {};
      UF.creatures(scene).forEach((a) => {
        const ext = a.caste === 'queen' ? 66 : 30;
        const poses = a.resting ? [0] : [0, 1, 2];
        out[a.key] = poses.map((pose) => shadowed(s, a.x - ext, a.y - ext, ext * 2, ext * 2, (g) => drawAntBody(g, a, pose)));
      });
      const sp = scene.spider;
      out.spider = [0, 1].map((st) => shadowed(s, sp.x - 64, sp.y - 34, 128, 72, (g) => drawSpider(g, sp, st)));
      return out;
    });
  }

  function grain(s) {
    return cache.get('grain' + s, () => UF.grainCanvas(UF.W * Math.min(s, 2), UF.H * Math.min(s, 2), 19, 150, 255));
  }

  function draw(ctx, scene, t) {
    const s = UF.scaleOf(ctx);
    const f = Math.floor(t * HOLD + 1e-6); // the held frame number
    const tq = f / HOLD;
    UF.drawBaked(ctx, env(scene, s));
    const spr = sprites(scene, s);

    // Eggs in the bottle cap, pulsing on twos.
    const es = UF.eggScale(scene, tq);
    scene.eggs.forEach((e, i) => {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowOffsetY = 2 * s;
      ctx.shadowBlur = 2 * s;
      ctx.translate(e.x, e.y);
      ctx.scale(es, es);
      const p = clayEllipse(0, 0, 3.6, 4.8, 0.35, i * 3, 0.15, 1.2);
      clayFill(ctx, p, 0, 0, 5, C.eggHi, C.eggLo);
      ctx.shadowColor = 'transparent';
      specular(ctx, 0, 0, 3.6, 4.8, 0.7);
      ctx.restore();
    });

    UF.creatures(scene).forEach((a, i) => {
      const pose = a.resting ? 0 : f % 3;
      let dx = 0, dy = 0;
      if (a.carrying) {
        const bob = (f % 2) * 2;
        const d = downVec(a.heading || 0);
        dx = Math.round(d[0] * bob / 2) * 2;
        dy = Math.round(d[1] * bob / 2) * 2;
      }
      UF.drawBaked(ctx, spr[a.key][pose], dx, dy);
      // Blink once every 3–5 s (one frame); the queen blinks slower and longer.
      const period = a.caste === 'queen' ? 40 : 18 + (UF.hash(a.key) % 13);
      const off = UF.hash(a.key + 'b') % period;
      const blinkLen = a.caste === 'queen' ? 3 : 1;
      const blink = (f + off) % period < blinkLen;
      eyes(ctx, a, blink, dx, dy);
    });
    UF.drawBaked(ctx, spr.spider[f % 12 === 0 ? 1 : 0]);

    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.12;
    ctx.drawImage(grain(s), 0, 0, UF.W, UF.H);
    ctx.restore();
  }

  UF.register('claymation', { meta, fps: 12, draw });
})();
