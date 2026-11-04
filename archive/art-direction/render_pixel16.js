// 16-BIT PIXEL — SNES SimAnt / Harvest Moon. The scene is drawn at 360×240
// art px (one art px = 2 world px), snapped to a 32-colour palette with no
// anti-aliasing, then scaled up nearest-neighbour. Creatures get 1 px black
// outlines; nothing else does.
(function () {
  const UF = window.UF;
  const cache = UF.makeCache();
  const A = 0.5; // art px per world px
  const AW = UF.W * A, AH = UF.H * A;
  const FPS = 8;

  const C = {
    outline: '#0E0A08',
    sky: ['#5C94D8', '#8CC0F0', '#C8E4F8'],
    cloud: '#F8F8F8',
    grass: ['#2C6420', '#48A030', '#80C850'],
    soil: ['#8B6A3C', '#6E5230', '#4E3A22'],
    soilHi: '#A88450',
    soilDk: '#3A2A18',
    tunnel: '#2A1C10',
    floor: '#3E2C18',
    rim: '#1C1208',
    stone: ['#8C8880', '#B8B4A8'],
    ant: ['#2A1A12', '#6A4228', '#9A6440', '#C8905C'],
    queen: ['#8C5A34', '#B88050'],
    food: ['#C08020', '#F0C040', '#F8E890'],
    egg: ['#F8F0E0', '#D0C0A0'],
    spider: ['#3A2E48', '#6A5880', '#D02828'],
    ui: '#F8E8B0',
  };
  const PALETTE = [].concat(
    C.outline, C.sky, C.cloud, C.grass, C.soil, C.soilHi, C.soilDk, C.tunnel, C.floor, C.rim,
    C.stone, C.ant, C.queen, C.food, C.egg, C.spider, C.ui
  );
  const PAL = PALETTE.map(UF.hexToRgb);

  const meta = {
    label: '16-bit pixel',
    status: 'brief',
    pixel: true,
    tagline: 'SNES-era cutaway: 16 px tiles, a 32-colour palette, black outlines on creatures, no anti-aliasing.',
    refs: 'SimAnt (SNES), Harvest Moon (SNES), Terraria (cutaway), Stardew Valley, Kingdom: New Lands (silhouettes)',
    matrix: ['SNES SimAnt, Stardew', 'Low', 'Medium', 'Low', 'Low'],
    palette: [
      ['Soil', C.soil[0]], ['Packed', C.soil[1]], ['Clay', C.soil[2]], ['Tunnel', C.tunnel],
      ['Room floor', C.floor], ['Outline', C.outline], ['Ant', C.ant[1]], ['Queen', C.queen[0]],
      ['Food', C.food[1]], ['Egg', C.egg[0]], ['Grass', C.grass[1]], ['Sky', C.sky[1]],
      ['Spider', C.spider[0]], ['Spider eye', C.spider[2]],
    ],
    type: 'Hand-set 5×7 bitmap capitals for the title; no anti-aliased text anywhere.',
    motion: '2-frame walk at 8 fps. Carry bob and spider twitch snap to whole art pixels.',
    risks: 'Reads as generic retro. 16×12 workers in 11 px corridors fill the tunnel.',
    notes: 'Art grid 360×240 (2 world px per art px), so on a phone the fit-width view lands near 3× device px per art px. 32 colours total. The 4% egg pulse is under one art pixel, so eggs swell by one pixel at the peak instead. Workers 16×12, majors 20×14, queen 40×24 art px.',
  };

  // ---------------------------------------------------------------- pixels
  function nearest(r, g, b) {
    let best = 0, bd = Infinity;
    for (let i = 0; i < PAL.length; i++) {
      const p = PAL[i];
      const d = 2 * (r - p[0]) ** 2 + 4 * (g - p[1]) ** 2 + 3 * (b - p[2]) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }
  const memo = new Map();
  function quantize(canvas) {
    const g = canvas.getContext('2d');
    const img = g.getImageData(0, 0, canvas.width, canvas.height);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 128) { d[i + 3] = 0; continue; }
      const key = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
      let c = memo.get(key);
      if (c === undefined) { c = nearest(d[i], d[i + 1], d[i + 2]); memo.set(key, c); }
      d[i] = PAL[c][0]; d[i + 1] = PAL[c][1]; d[i + 2] = PAL[c][2]; d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }
  function outline(canvas) {
    const g = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const img = g.getImageData(0, 0, w, h);
    const d = img.data;
    const a = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) a[i] = d[i * 4 + 3] > 0 ? 1 : 0;
    const o = UF.hexToRgb(C.outline);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (a[i]) continue;
        if ((x > 0 && a[i - 1]) || (x < w - 1 && a[i + 1]) || (y > 0 && a[i - w]) || (y < h - 1 && a[i + w])) {
          d[i * 4] = o[0]; d[i * 4 + 1] = o[1]; d[i * 4 + 2] = o[2]; d[i * 4 + 3] = 255;
        }
      }
    }
    g.putImageData(img, 0, 0);
  }

  // 5×7 capitals for the title.
  const GLYPHS = {
    U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
    N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
    D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
    E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
    R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
    F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
    O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
    T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  };
  function pixelText(g, text, x, y, color) {
    g.fillStyle = color;
    [...text].forEach((ch, k) => {
      const gl = GLYPHS[ch];
      if (!gl) return;
      gl.forEach((row, ry) => [...row].forEach((bit, rx) => {
        if (bit === '1') g.fillRect(x + k * 6 + rx, y + ry, 1, 1);
      }));
    });
  }

  // ---------------------------------------------------------------- tiles
  function makeTile(band, variant) {
    const T = 16;
    const c = UF.canvas(T, T);
    const g = c.getContext('2d');
    const r = UF.rng(band * 97 + variant * 13 + 5);
    const base = C.soil[band];
    const lighter = band === 0 ? C.soilHi : C.soil[band - 1];
    const darker = band === 2 ? C.soilDk : C.soil[band + 1];
    g.fillStyle = base;
    g.fillRect(0, 0, T, T);
    // Clumps and specks.
    for (let i = 0; i < 14; i++) {
      g.fillStyle = r() < 0.5 ? darker : lighter;
      const x = Math.floor(r() * T), y = Math.floor(r() * T);
      g.fillRect(x, y, r() < 0.3 ? 2 : 1, 1);
    }
    // A darker block seam on two edges: gives the tile grid a faint read.
    g.fillStyle = darker;
    for (let i = 0; i < T; i++) {
      if (r() < 0.35) g.fillRect(i, T - 1, 1, 1);
      if (r() < 0.25) g.fillRect(T - 1, i, 1, 1);
    }
    if (variant === 2 && band === 0) {
      // Root fleck.
      g.fillStyle = C.soilHi;
      const y0 = 3 + Math.floor(r() * 9);
      for (let x = 2; x < 13; x++) if (r() < 0.8) g.fillRect(x, y0 + (x % 4 === 0 ? 1 : 0), 1, 1);
    }
    return c;
  }

  // ---------------------------------------------------------------- env
  function env(scene) {
    return cache.get('env', () => {
      const c = UF.canvas(AW, AH);
      const g = c.getContext('2d');
      const gy = scene.groundY * A;

      // Sky in three flat bands with a checker dither between them.
      const bands = [[0, 13, C.sky[0]], [13, 26, C.sky[1]], [26, gy, C.sky[2]]];
      bands.forEach(([y0, y1, col]) => { g.fillStyle = col; g.fillRect(0, y0, AW, y1 - y0); });
      [[13, C.sky[0]], [26, C.sky[1]]].forEach(([y, col]) => {
        g.fillStyle = col;
        for (let x = 0; x < AW; x += 2) g.fillRect(x + ((y / 13) % 2), y, 1, 1);
      });
      // Two clouds.
      g.setTransform(A, 0, 0, A, 0, 0);
      g.fillStyle = C.cloud;
      [[470, 22], [205, 14]].forEach(([x, y]) => {
        [[0, 0, 16, 7], [-14, 4, 11, 6], [15, 4, 12, 6]].forEach(([dx, dy, rx, ry]) => {
          g.beginPath();
          g.ellipse(x + dx, y + dy, rx, ry, 0, 0, Math.PI * 2);
          g.fill();
        });
      });
      g.setTransform(1, 0, 0, 1, 0, 0);

      // Soil tiles, anchored to the ground line, one band at a time.
      const tiles = [0, 1, 2].map((b) => [0, 1, 2, 3].map((v) => makeTile(b, v)));
      scene.soil.forEach((band, bi) => {
        g.save();
        g.beginPath();
        g.rect(0, band.y0 * A, AW, (band.y1 - band.y0) * A);
        g.clip();
        for (let ty = gy; ty < band.y1 * A; ty += 16) {
          for (let tx = 0; tx < AW; tx += 16) {
            const h = UF.hash(bi + ':' + tx + ':' + ty);
            const v = h % 4;
            g.drawImage(tiles[bi][v], tx, ty);
          }
        }
        g.restore();
        // Band seam: a broken row of the darker tone.
        if (bi > 0) {
          const r = UF.rng(bi * 11);
          g.fillStyle = C.soil[bi] === C.soil[2] ? C.soilDk : C.soil[2];
          for (let x = 0; x < AW; x++) if (r() < 0.6) g.fillRect(x, band.y0 * A + (r() < 0.3 ? 1 : 0), 1, 1);
        }
      });

      // Scattered pebbles of varied size.
      const pr = UF.rng(303);
      for (let i = 0; i < 22; i++) {
        const px = Math.floor(pr() * (AW - 8)) + 2, py = Math.floor(gy + 6 + pr() * (AH - gy - 10));
        const w = 2 + Math.floor(pr() * 3), h = 2 + Math.floor(pr() * 2);
        g.fillStyle = C.rim;
        g.fillRect(px - 1, py, w + 2, h);
        g.fillRect(px, py - 1, w, h + 2);
        g.fillStyle = C.stone[0];
        g.fillRect(px, py, w, h);
        g.fillStyle = C.stone[1];
        g.fillRect(px, py, w - 1, 1);
      }

      // Cavities: 1 art px rim outside, then the fill.
      g.setTransform(A, 0, 0, A, 0, 0);
      g.save();
      g.beginPath();
      g.rect(0, scene.groundY, UF.W, UF.H);
      g.clip();
      const cav = UF.cavities(scene).map((s) => ({ s, p: UF.roundRectPath(new Path2D(), s.x, s.y, s.w, s.h, s.kind === 'room' ? 14 : 10) }));
      g.strokeStyle = C.rim;
      g.lineWidth = 4;
      cav.forEach((o) => g.stroke(o.p));
      cav.forEach((o) => { g.fillStyle = C.tunnel; g.fill(o.p); });
      // Room floors: a lighter packed floor across the room's lower half.
      scene.rooms.forEach((r) => {
        g.save();
        g.clip(UF.roundRectPath(new Path2D(), r.x, r.y, r.w, r.h, 14));
        g.fillStyle = C.floor;
        g.fillRect(r.x, r.y + 6, r.w, r.h - 6);
        g.restore();
      });
      // Tunnel floors: one art px of floor colour along the bottom.
      scene.tunnels.forEach((t) => {
        if (t.id === 'shaft') return;
        g.fillStyle = C.floor;
        g.fillRect(t.x + 8, t.y + t.h - 4, t.w - 16, 2);
      });
      g.restore();

      // Grass along the ground line, gap over the shaft.
      g.setTransform(1, 0, 0, 1, 0, 0);
      const sh = scene.tunnels.find((t) => t.id === 'shaft');
      const r = UF.rng(77);
      for (let x = 0; x < AW; x++) {
        if (x >= sh.x * A - 1 && x < (sh.x + sh.w) * A + 1) continue;
        g.fillStyle = C.grass[0];
        g.fillRect(x, gy, 1, 1);
        const h = 1 + Math.floor(r() * 3);
        g.fillStyle = C.grass[1];
        g.fillRect(x, gy - h, 1, h);
        if (h === 3 || r() < 0.2) { g.fillStyle = C.grass[2]; g.fillRect(x, gy - h, 1, 1); }
      }
      // Entrance lip of dug soil.
      g.fillStyle = C.soilHi;
      [[sh.x * A - 4, gy - 1, 3, 1], [(sh.x + sh.w) * A + 1, gy - 1, 3, 1]].forEach((q) => g.fillRect(...q));

      // Food piles.
      g.setTransform(A, 0, 0, A, 0, 0);
      scene.foodPiles.forEach((p, i) => {
        g.fillStyle = C.food[0];
        g.beginPath();
        g.ellipse(p.x, p.y + 12, 13, 14, 0, Math.PI, 0);
        g.fill();
        g.fillStyle = C.food[1];
        g.beginPath();
        g.ellipse(p.x - 2, p.y + 8, 7, 7, 0, Math.PI, 0);
        g.fill();
        const rr = UF.rng(i + 40);
        g.fillStyle = C.food[2];
        for (let k = 0; k < 4; k++) g.fillRect(Math.round((p.x - 10 + rr() * 18) / 2) * 2, Math.round((p.y + rr() * 10) / 2) * 2, 2, 2);
      });
      // Crumb.
      g.fillStyle = C.food[0];
      g.fillRect(scene.crumb.x - 6, scene.crumb.y - 2, 12, 10);
      g.fillStyle = C.food[1];
      g.fillRect(scene.crumb.x - 4, scene.crumb.y - 4, 8, 8);
      g.fillStyle = C.food[2];
      g.fillRect(scene.crumb.x - 4, scene.crumb.y - 4, 4, 2);

      g.setTransform(1, 0, 0, 1, 0, 0);
      quantize(c);

      // Title box after quantising (already palette colours).
      const text = 'UNDERFOOT';
      const tw = text.length * 6 - 1;
      g.fillStyle = C.outline;
      g.fillRect(4, 4, tw + 8, 13);
      g.fillStyle = C.ui;
      g.fillRect(5, 5, tw + 6, 1);
      g.fillRect(5, 15, tw + 6, 1);
      g.fillRect(5, 5, 1, 11);
      g.fillRect(tw + 10, 5, 1, 11);
      pixelText(g, text, 8, 7, C.ui);
      return c;
    });
  }

  // ---------------------------------------------------------------- sprites
  // Creature sprites are baked in world space at A, quantised, outlined.
  function sprite(key, box, fn) {
    return cache.get(key, () => {
      const spr = UF.bakeRegion(A, box[0], box[1], box[2], box[3], fn);
      quantize(spr.canvas);
      outline(spr.canvas);
      return spr;
    });
  }
  const even = (v) => Math.floor(v / 2) * 2;

  function drawAnt(g, a, phase) {
    const b = UF.antBody(a.caste);
    const k = a.caste === 'queen' ? 0.9 : 1;
    const s = b.scale * k;
    const cols = a.caste === 'queen' ? [C.ant[1], C.queen[0], C.queen[1]] : [C.ant[1], C.ant[2], C.ant[3]];
    g.save();
    UF.orient(g, a.x, a.y, a.heading || 0);
    g.scale(s, s);
    const legs = UF.antLegs(b, phase, { tucked: a.resting, strideMul: 1.3, liftMul: 1.4 });
    g.lineCap = 'square';
    g.lineJoin = 'miter';
    g.lineWidth = 2.2 / s;
    const leg = (l, col) => {
      g.strokeStyle = col;
      g.beginPath();
      g.moveTo(l.hip[0], l.hip[1]);
      g.lineTo(l.knee[0], l.knee[1]);
      g.lineTo(l.foot[0], l.foot[1]);
      g.stroke();
    };
    legs.filter((l) => l.side === 1).forEach((l) => leg(l, C.ant[0]));
    const ell = (o, col) => {
      g.fillStyle = col;
      g.beginPath();
      g.ellipse(o.x, o.y, o.rx || o.r, o.ry || o.r, 0, 0, Math.PI * 2);
      g.fill();
    };
    // Body: base tone, then a highlight lobe up-forward.
    [b.abdomen, b.petiole, b.thorax, b.head].forEach((o) => ell(o, cols[1]));
    const hi = (o) => ({ x: o.x + (o.rx || o.r) * 0.15, y: o.y - (o.ry || o.r) * 0.35, rx: (o.rx || o.r) * 0.55, ry: (o.ry || o.r) * 0.4 });
    [b.abdomen, b.thorax, b.head].forEach((o) => ell(hi(o), cols[2]));
    // Gaster bands.
    if (a.caste === 'queen') {
      g.strokeStyle = C.ant[0];
      g.lineWidth = 2 / s;
      [-0.25, 0.25].forEach((f) => {
        g.beginPath();
        g.moveTo(b.abdomen.x + b.abdomen.rx * f, b.abdomen.y - b.abdomen.ry * 0.95);
        g.lineTo(b.abdomen.x + b.abdomen.rx * f - 0.6, b.abdomen.y + b.abdomen.ry * 0.9);
        g.stroke();
      });
      // Wing scars: two pale ticks on the thorax.
      g.strokeStyle = C.egg[1];
      g.lineWidth = 2 / s;
      g.beginPath();
      g.moveTo(b.thorax.x - 0.6, b.thorax.y - b.thorax.ry * 0.8);
      g.lineTo(b.thorax.x - 2.2, b.thorax.y - b.thorax.ry - 1.6);
      g.moveTo(b.thorax.x + 1.2, b.thorax.y - b.thorax.ry * 0.8);
      g.lineTo(b.thorax.x + 0.2, b.thorax.y - b.thorax.ry - 1.8);
      g.stroke();
    }
    legs.filter((l) => l.side === 0).forEach((l) => leg(l, C.ant[1]));
    // Antennae.
    g.strokeStyle = C.ant[1];
    g.lineWidth = 2 / s;
    UF.antAntennae(b).slice(0, 1).forEach(([p0, p1, p2]) => {
      g.beginPath();
      g.moveTo(p0[0], p0[1]);
      g.lineTo(p1[0], p1[1]);
      g.lineTo(p2[0], p2[1]);
      g.stroke();
    });
    // Mandibles on majors.
    if (a.caste === 'major') {
      g.fillStyle = C.ant[0];
      g.fillRect(b.head.x + b.head.rx - 0.6, b.head.y + 0.4, 2.4, 1.6);
    }
    // Eye.
    g.fillStyle = C.outline;
    g.fillRect(b.head.x + b.head.rx * 0.2, b.head.y - b.head.ry * 0.3, 1.6 / s * 2, 1.6 / s * 2);
    g.restore();
  }

  function drawCarry(g, a) {
    const b = UF.antBody(a.caste);
    g.save();
    UF.orient(g, a.x, a.y, a.heading || 0);
    const cx = b.carry.x * b.scale, cy = b.carry.y * b.scale;
    g.fillStyle = C.food[0];
    g.fillRect(cx - 3, cy - 3, 7, 7);
    g.fillStyle = C.food[1];
    g.fillRect(cx - 3, cy - 3, 5, 5);
    g.restore();
  }

  function drawSpider(g, sp, twitch) {
    g.save();
    g.translate(sp.x, sp.y);
    g.scale(-sp.facing, 1); // local +x = behind
    g.lineCap = 'square';
    const legs = [
      [-12, 2, -28, -14, -42, 26], [-10, 3, -20, -18, -28, 26],
      [-6, 4, 4, -18, 14, 26], [-4, 4, 14, -14, 30, 26],
    ];
    const drawLegs = (col, dx) => {
      g.strokeStyle = col;
      g.lineWidth = 2.2;
      legs.forEach(([hx, hy, kx, ky, fx, fy], i) => {
        const lift = i === 0 && twitch ? 8 : 0;
        g.beginPath();
        g.moveTo(hx + dx, hy);
        g.lineTo(kx + dx, ky - lift);
        g.lineTo(fx + dx - lift * 0.5, fy - lift);
        g.stroke();
      });
    };
    drawLegs(C.spider[0], 5);
    g.fillStyle = C.spider[0];
    g.beginPath();
    g.ellipse(10, -4, 14, 11, -0.2, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = C.spider[1];
    g.beginPath();
    g.ellipse(12, -9, 9, 4.5, -0.2, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = C.spider[0];
    g.beginPath();
    g.ellipse(-9, 2, 8, 7, 0, 0, Math.PI * 2);
    g.fill();
    drawLegs(C.spider[1], 0);
    g.fillStyle = C.spider[2];
    g.fillRect(-16, -2, 4, 4);
    g.fillRect(-12, -4, 2, 2);
    g.restore();
  }

  function eggsSprite(scene, swell) {
    const box = [200, 170, 92, 40];
    return cache.get('eggs' + swell, () => {
      const spr = UF.bakeRegion(A, box[0], box[1], box[2], box[3], (g) => {
        scene.eggs.forEach((e) => {
          g.fillStyle = C.egg[1];
          g.beginPath();
          g.ellipse(e.x, e.y, 4.5 + swell, 5.5 + swell, 0.3, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = C.egg[0];
          g.beginPath();
          g.ellipse(e.x - 1, e.y - 1, 3 + swell * 0.5, 4 + swell * 0.5, 0.3, 0, Math.PI * 2);
          g.fill();
        });
      });
      quantize(spr.canvas);
      return spr;
    });
  }

  // ---------------------------------------------------------------- draw
  function draw(ctx, scene, t) {
    const tq = UF.quant(t, FPS);
    const art = cache.get('art', () => UF.canvas(AW, AH));
    const g = art.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(env(scene), 0, 0);

    // Eggs swell one art pixel at the top of each pulse.
    const swell = UF.eggScale(scene, tq) > 1.03 ? 2 : 0;
    const es = eggsSprite(scene, swell);
    g.drawImage(es.canvas, es.x * A, es.y * A);

    const frame = Math.floor(tq * FPS + 1e-6) % 2;
    const phase = Math.PI / 2 + frame * Math.PI;
    UF.creatures(scene).forEach((a) => {
      const half = a.caste === 'queen' ? 56 : a.caste === 'major' ? 28 : 24;
      const box = [even(a.x - half), even(a.y - (a.caste === 'queen' ? 36 : half)), half * 2, a.caste === 'queen' ? 72 : half * 2];
      const f = a.resting ? 0 : frame;
      const spr = sprite(a.key + '|' + f, box, (sg) => {
        drawAnt(sg, a, a.resting ? 0 : phase);
        if (a.carrying) drawCarry(sg, a);
      });
      const bob = a.carrying ? (Math.sin(tq * scene.motion.carryBobHz * Math.PI * 2 + 0.6) > 0 ? -1 : 0) : 0;
      g.drawImage(spr.canvas, spr.x * A, spr.y * A + bob);
    });

    const sp = scene.spider;
    const tw = UF.spiderTwitch(scene, tq, 0.25);
    const sbox = [even(sp.x - 56), even(sp.y - 30), 112, 60];
    const ss = sprite('spider|' + tw, sbox, (sg) => drawSpider(sg, sp, tw));
    g.drawImage(ss.canvas, ss.x * A, ss.y * A);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(art, 0, 0, UF.W, UF.H);
    ctx.restore();
  }

  UF.register('pixel16', { meta, fps: FPS, draw });
})();
