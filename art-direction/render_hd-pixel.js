// HD PIXEL-PAINTERLY — Eastward / Sea of Stars. Painted with gradients at
// 1440×960 art px (2 art px per world px), lit by a multiplied light layer,
// then snapped to a ~50-colour palette with hard alpha. Scent is additive
// twinkling particles.
(function () {
  const UF = window.UF;
  const cache = UF.makeCache();
  const A = 2; // art px per world px
  const AW = UF.W * A, AH = UF.H * A;
  const FPS = 24; // 4-frame walk cycling at 6 Hz

  const R = {
    sky: ['#5E8EC4', '#7FAEDB', '#A9CDEB', '#D4E8F2'],
    cloud: ['#F4F2EE', '#DCDDE6'],
    grass: ['#2F5A2E', '#477E38', '#6AA448', '#9CC860'],
    top: ['#B08A58', '#9A7448', '#84613A', '#6E4F30'],
    packed: ['#8E6A40', '#7A5A36', '#66492C', '#533A24'],
    clay: ['#A0684A', '#8A5638', '#74452C', '#5C3522'],
    dark: ['#1A1420', '#2A1E1C', '#3A2A24', '#4A3830'],
    cool: ['#3E3A50', '#55506A', '#6E6E8C', '#8890AC'],
    warm: ['#FFF0D0', '#FFD9A0', '#F2C080', '#E8A868'],
    ant: ['#2E1E1A', '#4A2E22', '#6A4430', '#8E6044', '#B88A64'],
    queen: ['#7A4A30', '#A06A44', '#C89470'],
    food: ['#C88A28', '#E8B440', '#F8D870', '#FFF0A8'],
    egg: ['#F0E8D4', '#D8CCB0', '#B8AC90'],
    spider: ['#2E2430', '#463848', '#64506A', '#C03A3A'],
    stone: ['#8A8478', '#ABA496'],
  };
  const PALETTE = Object.values(R).flat();
  const PAL = PALETTE.map(UF.hexToRgb);
  const SCENT = ['#B8F070', '#F0FFC0'];

  const meta = {
    label: 'HD pixel',
    status: 'brief',
    pixel: true,
    tagline: 'Painterly high-detail pixel art: painted shading, a warm-to-cool light layer, additive scent sparks.',
    refs: 'Eastward, Sea of Stars, Owlboy, Chained Echoes, Octopath Traveler (light), Moonlighter',
    matrix: ['Eastward, Sea of Stars', 'High', 'Medium', 'Medium', 'Medium'],
    palette: [
      ['Topsoil', R.top[1]], ['Packed', R.packed[1]], ['Clay', R.clay[1]], ['Tunnel', R.dark[1]],
      ['Darkest (no black)', R.dark[0]], ['Ant', R.ant[2]], ['Ant light', R.ant[4]], ['Queen', R.queen[1]],
      ['Food', R.food[1]], ['Egg', R.egg[0]], ['Grass', R.grass[2]], ['Sky', R.sky[1]],
      ['Warm light', R.warm[1]], ['Cool light', '#7FA0C9'], ['Spider', R.spider[1]], ['Scent', SCENT[1]],
    ],
    type: 'No text in the mockup. For UI, a crisp bitmap font at 2× the art grid.',
    motion: '4-frame walk at 24 fps (legs cycle at 6 Hz). Scent sparks twinkle in place; nothing drifts.',
    risks: 'Keeping hundreds of painted tiles consistent; two artists’ worth of painting.',
    notes: 'Art grid 1440×960 (2 art px per world px), so the worker sprite is 48 px, major ~64 px and queen ~128 px long. ' +
      PALETTE.length + ' palette colours, darkest is #1A1420. Soil is 32 px tiles, 3 painted variants per band. The light layer is baked into every surface before the palette snap, so lighting is posterised with the art. Scent is drawn (the brief asks for additive particles).',
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
      const key = ((d[i] >> 1) << 14) | ((d[i + 1] >> 1) << 7) | (d[i + 2] >> 1);
      let c = memo.get(key);
      if (c === undefined) { c = nearest(d[i], d[i + 1], d[i + 2]); memo.set(key, c); }
      d[i] = PAL[c][0]; d[i + 1] = PAL[c][1]; d[i + 2] = PAL[c][2]; d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }

  // ---------------------------------------------------------------- light
  // Multiply map in art px: warm near the surface, cool at depth, a warm
  // pool at the nest mouth and a faint glow in the queen's chamber.
  function lightMap(scene) {
    return cache.get('light', () => {
      const c = UF.canvas(AW, AH);
      const g = c.getContext('2d');
      g.setTransform(A, 0, 0, A, 0, 0);
      const lin = g.createLinearGradient(0, 0, 0, UF.H);
      lin.addColorStop(0, '#FFF4E0');
      lin.addColorStop(scene.groundY / UF.H, '#FFE2B8');
      lin.addColorStop(220 / UF.H, '#E6DCD4');
      lin.addColorStop(1, '#7FA0C9');
      g.fillStyle = lin;
      g.fillRect(0, 0, UF.W, UF.H);
      const pool = (x, y, r, col) => {
        const rg = g.createRadialGradient(x, y, 0, x, y, r);
        rg.addColorStop(0, col);
        rg.addColorStop(1, 'rgba(255,217,160,0)');
        g.fillStyle = rg;
        g.fillRect(x - r, y - r, r * 2, r * 2);
      };
      const sh = scene.tunnels.find((t) => t.id === 'shaft');
      pool(sh.x + sh.w / 2, scene.groundY, 170, 'rgba(255,217,160,0.85)');
      const q = scene.rooms.find((r) => r.id === 'queen');
      pool(q.x + q.w / 2, q.y + q.h / 2, 80, 'rgba(255,217,160,0.45)');
      return c;
    });
  }
  // Multiply the light map into a canvas whose top-left sits at art (ax, ay),
  // keeping its alpha.
  function applyLight(canvas, ax, ay, light) {
    const keep = UF.canvas(canvas.width, canvas.height);
    keep.getContext('2d').drawImage(canvas, 0, 0);
    const g = canvas.getContext('2d');
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'multiply';
    g.drawImage(light, ax, ay, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(keep, 0, 0);
    g.restore();
  }

  // ---------------------------------------------------------------- tiles
  function makeTile(ramp, variant, seed) {
    const T = 32;
    const c = UF.canvas(T, T);
    const g = c.getContext('2d');
    const r = UF.rng(seed);
    g.fillStyle = ramp[1];
    g.fillRect(0, 0, T, T);
    // Dabs, wrapped so tiles join.
    for (let i = 0; i < 40; i++) {
      const x = r() * T, y = r() * T, rad = 1 + r() * 3;
      const k = r();
      g.fillStyle = k < 0.2 ? ramp[0] : k < 0.85 ? ramp[2] : ramp[3];
      g.globalAlpha = 0.35 + r() * 0.4;
      for (const ox of [-T, 0, T]) for (const oy of [-T, 0, T]) {
        g.beginPath();
        g.ellipse(x + ox, y + oy, rad * 1.3, rad, 0, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.globalAlpha = 1;
    if (variant === 1) {
      // Hairline root or crack.
      g.strokeStyle = ramp[3];
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(2, 8 + r() * 16);
      g.quadraticCurveTo(16, r() * 32, 30, 8 + r() * 16);
      g.stroke();
    }
    if (variant === 2) {
      // Pale grit.
      g.fillStyle = ramp[0];
      for (let i = 0; i < 6; i++) g.fillRect(Math.floor(8 + r() * 16), Math.floor(8 + r() * 16), 2, 2);
    }
    return c;
  }

  // ---------------------------------------------------------------- env
  function cavityPaths(scene) {
    return UF.cavities(scene).map((s) => ({ s, p: UF.roundRectPath(new Path2D(), s.x, s.y, s.w, s.h, s.kind === 'room' ? 18 : 11) }));
  }

  function env(scene) {
    return cache.get('env', () => {
      const c = UF.canvas(AW, AH);
      const g = c.getContext('2d');
      const gy = scene.groundY;
      g.setTransform(A, 0, 0, A, 0, 0);

      // Sky and clouds.
      // Sky: four palette bands joined by a checker dither (art px).
      g.setTransform(1, 0, 0, 1, 0, 0);
      const edges = [0, 30, 62, 98, gy * A];
      R.sky.forEach((col, i) => { g.fillStyle = col; g.fillRect(0, edges[i], AW, edges[i + 1] - edges[i]); });
      for (let i = 1; i < 4; i++) {
        g.fillStyle = R.sky[i - 1];
        for (let y = edges[i]; y < edges[i] + 6; y += 2) {
          for (let x = (y / 2) % 2 ? 2 : 0; x < AW; x += 4) g.fillRect(x, y, 2, 2);
        }
      }
      g.setTransform(A, 0, 0, A, 0, 0);
      [[200, 16, 1], [478, 24, 1.2], [690, 12, 0.8]].forEach(([x, y, k]) => {
        [[0, 0, 18, 8], [-15, 4, 12, 6], [16, 4, 13, 6], [4, -5, 10, 6]].forEach(([dx, dy, rx, ry]) => {
          const rg = g.createLinearGradient(0, y - 12 * k, 0, y + 8 * k);
          rg.addColorStop(0, R.cloud[0]);
          rg.addColorStop(1, R.cloud[1]);
          g.fillStyle = rg;
          g.beginPath();
          g.ellipse(x + dx * k, y + dy * k, rx * k, ry * k, 0, 0, Math.PI * 2);
          g.fill();
        });
      });
      // Far grass silhouette.
      g.fillStyle = R.grass[1];
      g.beginPath();
      g.moveTo(0, gy);
      for (let x = 0; x <= UF.W; x += 6) g.lineTo(x, gy - 6 - Math.sin(x * 0.05) * 3 - Math.sin(x * 0.013) * 4);
      g.lineTo(UF.W, gy);
      g.fill();

      // Soil tiles, three painted variants per band, 16 world = 32 art px.
      const ramps = [R.top, R.packed, R.clay];
      scene.soil.forEach((band, bi) => {
        const tiles = [0, 1, 2].map((v) => makeTile(ramps[bi], v, bi * 31 + v * 7 + 3));
        g.save();
        g.beginPath();
        g.rect(0, band.y0, UF.W, band.y1 - band.y0);
        g.clip();
        g.setTransform(1, 0, 0, 1, 0, 0);
        for (let ty = band.y0 * A; ty < band.y1 * A; ty += 32) {
          for (let tx = 0; tx < AW; tx += 32) {
            const h = UF.hash(bi + '/' + tx + '/' + ty);
            g.drawImage(tiles[h % 3], tx, ty);
          }
        }
        g.restore();
        // Soft seam where bands meet.
        if (bi > 0) {
          const sg = g.createLinearGradient(0, band.y0 - 6, 0, band.y0 + 6);
          sg.addColorStop(0, 'rgba(0,0,0,0)');
          sg.addColorStop(0.5, ramps[bi][3]);
          sg.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = sg;
          g.fillRect(0, band.y0 - 6, UF.W, 12);
        }
      });

      // Scattered painted pebbles of varied size.
      const pr = UF.rng(909);
      for (let i = 0; i < 18; i++) {
        const x = 12 + pr() * (UF.W - 24), y = gy + 14 + pr() * (UF.H - gy - 22), rad = 2 + pr() * 3.5;
        g.fillStyle = R.dark[2];
        g.beginPath();
        g.ellipse(x + 0.6, y + 0.9, rad * 1.3, rad, 0, 0, Math.PI * 2);
        g.fill();
        const rg = g.createRadialGradient(x - rad * 0.5, y - rad * 0.5, 0, x, y, rad * 1.3);
        rg.addColorStop(0, R.stone[1]);
        rg.addColorStop(1, R.stone[0]);
        g.fillStyle = rg;
        g.beginPath();
        g.ellipse(x, y, rad * 1.2, rad * 0.85, pr() - 0.5, 0, Math.PI * 2);
        g.fill();
      }

      // Cavities: compacted rim, deep fill, lit floors.
      const cav = cavityPaths(scene);
      g.save();
      g.beginPath();
      g.rect(0, gy, UF.W, UF.H);
      g.clip();
      g.strokeStyle = R.dark[3];
      g.lineWidth = 6;
      cav.forEach((o) => g.stroke(o.p));
      g.strokeStyle = R.packed[3];
      g.lineWidth = 3;
      cav.forEach((o) => g.stroke(o.p));
      cav.forEach((o) => {
        const lg = g.createLinearGradient(0, o.s.y, 0, o.s.y + o.s.h);
        lg.addColorStop(0, R.dark[1]);
        lg.addColorStop(0.6, R.dark[2]);
        lg.addColorStop(1, R.dark[3]);
        g.fillStyle = lg;
        g.fill(o.p);
      });
      // Floors: a band of trodden earth along the bottom of each corridor
      // and a mounded floor in each room.
      const floorOf = (x, y, w) => {
        const fg = g.createLinearGradient(0, y - 4, 0, y);
        fg.addColorStop(0, R.packed[2]);
        fg.addColorStop(1, R.packed[3]);
        g.fillStyle = fg;
        g.fillRect(x, y - 4, w, 4);
        g.fillStyle = R.top[2];
        g.fillRect(x, y - 4, w, 1);
      };
      cav.forEach((o) => {
        g.save();
        g.clip(o.p);
        if (o.s.id === 'shaft') {
          g.fillStyle = R.dark[3];
          g.fillRect(o.s.x, o.s.y, 3, o.s.h);
        } else if (o.s.kind === 'tunnel') {
          floorOf(o.s.x, o.s.y + o.s.h, o.s.w);
        } else {
          const r = o.s;
          const wall = g.createLinearGradient(0, r.y, 0, r.y + r.h);
          wall.addColorStop(0, R.dark[1]);
          wall.addColorStop(1, R.dark[3]);
          g.fillStyle = wall;
          g.fillRect(r.x, r.y, r.w, r.h);
        }
        g.restore();
      });
      g.restore();

      // Grass blades, with a gap over the shaft and a lip of dug soil.
      const sh = scene.tunnels.find((t) => t.id === 'shaft');
      const rr = UF.rng(808);
      g.lineCap = 'round';
      for (let x = 0; x < UF.W; x += 1.5) {
        if (x > sh.x - 6 && x < sh.x + sh.w + 6) continue;
        const h = 3 + rr() * 7;
        g.strokeStyle = R.grass[Math.floor(rr() * 3) + 1];
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(x, gy + 1);
        g.quadraticCurveTo(x + (rr() - 0.5) * 2, gy - h * 0.6, x + (rr() - 0.5) * 4, gy - h);
        g.stroke();
      }
      g.fillStyle = R.grass[0];
      g.fillRect(0, gy, UF.W, 2);
      [sh.x - 10, sh.x + sh.w + 10].forEach((x) => {
        const mg = g.createRadialGradient(x, gy - 2, 0, x, gy, 10);
        mg.addColorStop(0, R.top[0]);
        mg.addColorStop(1, R.top[2]);
        g.fillStyle = mg;
        g.beginPath();
        g.ellipse(x, gy + 1, 10, 5, 0, Math.PI, 0);
        g.fill();
      });

      // Food piles: painted grains in a mound.
      scene.foodPiles.forEach((p, i) => {
        const r = UF.rng(500 + i);
        const base = p.y + 14;
        g.fillStyle = R.dark[0];
        g.globalAlpha = 0.4;
        g.beginPath();
        g.ellipse(p.x, base, 14, 3, 0, 0, Math.PI * 2);
        g.fill();
        g.globalAlpha = 1;
        for (let k = 0; k < 34; k++) {
          const u = r() * 2 - 1;
          const hmax = 15 * (1 - u * u);
          const x = p.x + u * 13, y = base - r() * hmax;
          const gr = g.createRadialGradient(x - 0.8, y - 0.8, 0, x, y, 2.6);
          gr.addColorStop(0, R.food[3]);
          gr.addColorStop(0.5, R.food[1]);
          gr.addColorStop(1, R.food[0]);
          g.fillStyle = gr;
          g.beginPath();
          g.ellipse(x, y, 2.4, 1.9, r() * 3, 0, Math.PI * 2);
          g.fill();
        }
      });
      // Crumb.
      const cr = scene.crumb;
      const cg = g.createRadialGradient(cr.x - 2, cr.y - 2, 0, cr.x, cr.y + 2, 7);
      cg.addColorStop(0, R.food[3]);
      cg.addColorStop(0.5, R.food[1]);
      cg.addColorStop(1, R.food[0]);
      g.fillStyle = cg;
      g.beginPath();
      g.moveTo(cr.x - 6, cr.y + 8);
      g.quadraticCurveTo(cr.x - 7, cr.y - 3, cr.x, cr.y - 4);
      g.quadraticCurveTo(cr.x + 7, cr.y - 2, cr.x + 6, cr.y + 8);
      g.closePath();
      g.fill();

      // Light the ground and below; the sky keeps its clean palette bands.
      g.setTransform(1, 0, 0, 1, 0, 0);
      const below = UF.canvas(AW, AH - gy * A);
      below.getContext('2d').drawImage(c, 0, gy * A, AW, below.height, 0, 0, AW, below.height);
      applyLight(below, 0, gy * A, lightMap(scene));
      quantize(c);
      quantize(below);
      g.drawImage(below, 0, gy * A);
      return c;
    });
  }

  // ---------------------------------------------------------------- sprites
  function sprite(scene, key, box, fn) {
    return cache.get(key, () => {
      const spr = UF.bakeRegion(A, box[0], box[1], box[2], box[3], fn);
      applyLight(spr.canvas, box[0] * A, box[1] * A, lightMap(scene));
      quantize(spr.canvas);
      return spr;
    });
  }

  function paintEllipse(g, o, ramp) {
    const rx = o.rx || o.r, ry = o.ry || o.r;
    const rg = g.createRadialGradient(o.x - rx * 0.3, o.y - ry * 0.45, 0, o.x, o.y, Math.max(rx, ry) * 1.1);
    rg.addColorStop(0, ramp[2]);
    rg.addColorStop(0.45, ramp[1]);
    rg.addColorStop(1, ramp[0]);
    g.fillStyle = rg;
    g.beginPath();
    g.ellipse(o.x, o.y, rx, ry, 0, 0, Math.PI * 2);
    g.fill();
  }

  function drawAnt(g, a, phase) {
    const b = UF.antBody(a.caste);
    const k = a.caste === 'queen' ? 0.72 : 0.9;
    const s = b.scale * k;
    const ramp = a.caste === 'queen' ? [R.ant[1], R.queen[0], R.queen[2]] : [R.ant[1], R.ant[3], R.ant[4]];
    g.save();
    UF.orient(g, a.x, a.y, a.heading || 0);
    g.scale(s, s);
    // Contact shadow on the floor.
    g.fillStyle = R.dark[0];
    g.globalAlpha = 0.45;
    g.beginPath();
    g.ellipse(b.thorax.x - 2, b.footY + 0.4, 11, 1.2, 0, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;

    const legs = UF.antLegs(b, phase, { tucked: a.resting });
    g.lineCap = 'round';
    g.lineJoin = 'round';
    const leg = (l, col, w) => {
      g.strokeStyle = col;
      g.lineWidth = w / s;
      g.beginPath();
      g.moveTo(l.hip[0], l.hip[1]);
      g.lineTo(l.knee[0], l.knee[1]);
      g.lineTo(l.foot[0], l.foot[1]);
      g.stroke();
    };
    legs.filter((l) => l.side === 1).forEach((l) => leg(l, R.ant[0], 1.1));
    [b.abdomen, b.petiole, b.thorax, b.head].forEach((o) => paintEllipse(g, o, ramp));
    if (a.caste === 'queen') {
      // Gaster tergite bands and wing scars.
      g.strokeStyle = R.ant[1];
      g.lineWidth = 1 / s;
      [-0.35, 0.05, 0.45].forEach((f) => {
        g.beginPath();
        g.ellipse(b.abdomen.x + b.abdomen.rx * f, b.abdomen.y, b.abdomen.rx * 0.25, b.abdomen.ry * 0.96, 0, -Math.PI / 2, Math.PI / 2);
        g.stroke();
      });
      g.strokeStyle = R.egg[0];
      g.lineWidth = 1.1 / s;
      g.beginPath();
      g.moveTo(b.thorax.x - 0.8, b.thorax.y - b.thorax.ry * 0.85);
      g.lineTo(b.thorax.x - 2.4, b.thorax.y - b.thorax.ry - 1.3);
      g.moveTo(b.thorax.x + 0.9, b.thorax.y - b.thorax.ry * 0.85);
      g.lineTo(b.thorax.x - 0.4, b.thorax.y - b.thorax.ry - 1.5);
      g.stroke();
    }
    // Rim light along the back.
    g.strokeStyle = R.warm[1];
    g.lineWidth = 0.8 / s;
    g.globalAlpha = 0.7;
    [b.abdomen, b.thorax, b.head].forEach((o) => {
      g.beginPath();
      g.ellipse(o.x, o.y, (o.rx || o.r) * 0.86, (o.ry || o.r) * 0.86, 0, -Math.PI * 0.85, -Math.PI * 0.35);
      g.stroke();
    });
    g.globalAlpha = 1;
    legs.filter((l) => l.side === 0).forEach((l) => leg(l, R.ant[1], 1.2));
    g.strokeStyle = R.ant[1];
    g.lineWidth = 0.9 / s;
    UF.antAntennae(b).forEach(([p0, p1, p2], i) => {
      g.strokeStyle = i ? R.ant[0] : R.ant[1];
      g.beginPath();
      g.moveTo(p0[0], p0[1]);
      g.lineTo(p1[0], p1[1]);
      g.lineTo(p2[0], p2[1]);
      g.stroke();
    });
    if (a.caste === 'major') {
      g.strokeStyle = R.ant[0];
      g.lineWidth = 1.2 / s;
      g.beginPath();
      g.moveTo(b.head.x + b.head.rx * 0.7, b.head.y + b.head.ry * 0.3);
      g.quadraticCurveTo(b.head.x + b.head.rx + 2.2, b.head.y + 0.6, b.head.x + b.head.rx + 0.6, b.head.y + b.head.ry * 0.9);
      g.stroke();
    }
    // Eye with a glint.
    g.fillStyle = R.dark[0];
    g.beginPath();
    g.arc(b.head.x + b.head.rx * 0.3, b.head.y - b.head.ry * 0.2, Math.min(b.head.rx * 0.28, 1.1 / s), 0, Math.PI * 2);
    g.fill();
    if (a.carrying) {
      const c = b.carry;
      paintEllipse(g, { x: c.x, y: c.y, rx: c.r * 1.1, ry: c.r * 0.95 }, [R.food[0], R.food[1], R.food[3]]);
    }
    g.restore();
  }

  function drawSpider(g, sp, twitch) {
    g.save();
    g.translate(sp.x, sp.y);
    g.scale(-sp.facing, 1); // local +x = behind
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.fillStyle = R.dark[0];
    g.globalAlpha = 0.4;
    g.beginPath();
    g.ellipse(0, 26, 34, 2.5, 0, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
    const legs = [
      [-12, 2, -28, -14, -42, 26], [-10, 3, -20, -18, -28, 26],
      [-6, 4, 4, -18, 14, 26], [-4, 4, 14, -14, 30, 26],
    ];
    const drawLegs = (col, joint, dx, w) => {
      legs.forEach(([hx, hy, kx, ky, fx, fy], i) => {
        const lift = i === 0 && twitch ? 7 : 0;
        g.strokeStyle = col;
        g.lineWidth = w;
        g.beginPath();
        g.moveTo(hx + dx, hy);
        g.quadraticCurveTo(kx + dx - 2, ky - lift - 4, kx + dx, ky - lift);
        g.quadraticCurveTo(kx + dx + (fx - kx) * 0.3, ky - lift, fx + dx - lift * 0.5, fy - lift);
        g.stroke();
        g.fillStyle = joint;
        g.beginPath();
        g.arc(kx + dx, ky - lift, w * 0.7, 0, Math.PI * 2);
        g.fill();
      });
    };
    drawLegs(R.spider[0], R.spider[1], 5, 2);
    paintEllipse(g, { x: 10, y: -4, rx: 14, ry: 11 }, [R.spider[0], R.spider[1], R.spider[2]]);
    // Chevron pattern on the abdomen.
    g.strokeStyle = R.spider[2];
    g.lineWidth = 1.2;
    [4, 10, 16].forEach((x) => {
      g.beginPath();
      g.moveTo(x - 2, -10);
      g.lineTo(x + 1, -6);
      g.lineTo(x - 2, -2);
      g.stroke();
    });
    paintEllipse(g, { x: -9, y: 2, rx: 8, ry: 7 }, [R.spider[0], R.spider[1], R.spider[2]]);
    drawLegs(R.spider[1], R.spider[2], 0, 2.2);
    g.fillStyle = R.spider[3];
    [[-15, -1, 1.6], [-12, -3.5, 1.1], [-16.5, 2, 1]].forEach(([x, y, r]) => {
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    });
    g.restore();
  }

  function eggsSprite(scene, level) {
    return sprite(scene, 'eggs' + level, [200, 168, 92, 44], (g) => {
      const k = 1 + scene.motion.eggPulseScale * (level / 2);
      scene.eggs.forEach((e) => {
        g.fillStyle = R.dark[0];
        g.globalAlpha = 0.35;
        g.beginPath();
        g.ellipse(e.x + 1, e.y + 5, 4, 1.4, 0, 0, Math.PI * 2);
        g.fill();
        g.globalAlpha = 1;
        g.save();
        g.translate(e.x, e.y);
        g.rotate(0.3);
        g.scale(k, k);
        paintEllipse(g, { x: 0, y: 0, rx: 3.6, ry: 4.8 }, [R.egg[2], R.egg[1], R.egg[0]]);
        g.restore();
      });
    });
  }

  // Scent: static sparks along the trail, each with its own twinkle rate.
  function sparks(scene) {
    return cache.get('sparks', () => {
      const pts = scene.scentTrail;
      const r = UF.rng(4242);
      const out = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        const L = Math.hypot(b.x - a.x, b.y - a.y);
        for (let d = 0; d < L; d += 4.5) {
          const u = d / L;
          out.push({
            x: Math.round((a.x + (b.x - a.x) * u + (r() - 0.5) * 4) * A),
            y: Math.round((a.y + (b.y - a.y) * u + (r() - 0.5) * 4) * A),
            size: r() < 0.25 ? 3 : 2,
            hz: 1.5 + r() * 3,
            ph: r() * Math.PI * 2,
            col: r() < 0.4 ? SCENT[1] : SCENT[0],
          });
        }
      }
      return out;
    });
  }

  // ---------------------------------------------------------------- draw
  function draw(ctx, scene, t) {
    const tq = UF.quant(t, FPS);
    const art = cache.get('art', () => UF.canvas(AW, AH));
    const g = art.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    g.drawImage(env(scene), 0, 0);

    const pulse = UF.eggScale(scene, tq) - 1;
    const level = Math.round((pulse / scene.motion.eggPulseScale) * 2);
    const es = eggsSprite(scene, level);
    g.drawImage(es.canvas, es.x * A, es.y * A);

    const frame = Math.floor(tq * FPS + 1e-6) % 4;
    const phase = frame * (Math.PI / 2);
    UF.creatures(scene).forEach((a) => {
      const big = a.caste === 'queen';
      const half = big ? 48 : a.caste === 'major' ? 28 : 22;
      const box = [Math.floor(a.x - half), Math.floor(a.y - (big ? 32 : half)), half * 2, big ? 64 : half * 2];
      const f = a.resting ? 0 : frame;
      const spr = sprite(scene, a.key + '|' + f, box, (sg) => drawAnt(sg, a, a.resting ? 0 : phase));
      const bob = a.carrying ? Math.round(UF.carryBob(scene, tq) * A) : 0;
      g.drawImage(spr.canvas, spr.x * A, spr.y * A + bob);
    });

    const sp = scene.spider;
    const tw = UF.spiderTwitch(scene, tq, 0.2);
    const ss = sprite(scene, 'spider|' + tw, [sp.x - 56, sp.y - 30, 112, 60], (sg) => drawSpider(sg, sp, tw));
    g.drawImage(ss.canvas, ss.x * A, ss.y * A);

    // Additive scent sparks, three brightness steps.
    g.globalCompositeOperation = 'lighter';
    sparks(scene).forEach((p) => {
      const v = 0.5 + 0.5 * Math.sin(tq * p.hz * Math.PI * 2 + p.ph);
      const step = Math.floor(v * 3);
      if (!step) return;
      g.globalAlpha = step === 1 ? 0.35 : 0.8;
      g.fillStyle = p.col;
      g.fillRect(p.x, p.y, p.size, p.size);
    });
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(art, 0, 0, UF.W, UF.H);
    ctx.restore();
  }

  UF.register('hd-pixel', { meta, fps: FPS, draw });
})();
