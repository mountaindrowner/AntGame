// UNDERFOOT — helpers shared by every renderer: the registry, seeded noise,
// bake caches, path builders and the common ant skeleton.
//
// Renderers are classic scripts (not ES modules) so styles.html also works
// when opened straight from disk. Each one calls
//   UF.register(id, { meta, fps, draw(ctx, scene, t) })
// draw() receives a context whose transform already maps world px (720×480)
// onto the canvas, so renderers only think in world units.
(function () {
  const UF = (window.UF = window.UF || {});
  UF.W = 720;
  UF.H = 480;
  UF.renderers = {};
  UF.order = [];
  UF.register = function (id, r) {
    r.id = id;
    UF.renderers[id] = r;
    UF.order.push(id);
  };

  // Bumped by the page when web fonts finish loading so text gets re-baked.
  UF.bakeEpoch = 0;

  // ---------------------------------------------------------------- random
  UF.rng = function (seed) {
    let a = seed >>> 0 || 1;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  UF.hash = function (s) {
    let h = 2166136261;
    s = String(s);
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return h >>> 0;
  };

  // Smooth 2D value noise in [-1, 1], plus fractal sum.
  UF.noise2 = function (seed) {
    const perm = new Uint8Array(512);
    const r = UF.rng(seed);
    const p = Array.from({ length: 256 }, (_, i) => i);
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
    const val = new Float32Array(256).map(() => r() * 2 - 1);
    const fade = (t) => t * t * (3 - 2 * t);
    return function (x, y) {
      const xi = Math.floor(x), yi = Math.floor(y);
      const xf = x - xi, yf = y - yi;
      const X = xi & 255, Y = yi & 255;
      const v00 = val[perm[X + perm[Y]]], v10 = val[perm[X + 1 + perm[Y]]];
      const v01 = val[perm[X + perm[Y + 1]]], v11 = val[perm[X + 1 + perm[Y + 1]]];
      const u = fade(xf), v = fade(yf);
      return (v00 * (1 - u) + v10 * u) * (1 - v) + (v01 * (1 - u) + v11 * u) * v;
    };
  };
  UF.fbm = function (noise, x, y, oct) {
    let s = 0, a = 0.5, f = 1, n = 0;
    for (let i = 0; i < (oct || 4); i++) {
      s += a * noise(x * f, y * f);
      n += a;
      a *= 0.5;
      f *= 2;
    }
    return s / n;
  };

  // ---------------------------------------------------------------- canvas
  UF.canvas = function (w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    return c;
  };

  // Device px per world px for the context the page handed us.
  UF.scaleOf = function (ctx) {
    const m = ctx.getTransform();
    return Math.hypot(m.a, m.b);
  };

  // A per-renderer cache that empties itself whenever fonts re-bake.
  UF.makeCache = function () {
    const map = new Map();
    let epoch = -1;
    return {
      get(key, build) {
        if (epoch !== UF.bakeEpoch) { map.clear(); epoch = UF.bakeEpoch; }
        if (!map.has(key)) map.set(key, build());
        return map.get(key);
      },
    };
  };

  // Bake a world-space region (x, y, w, h) into an offscreen canvas at `scale`
  // device px per world px. fn(ctx) draws in world coordinates.
  UF.bakeRegion = function (scale, x, y, w, h, fn) {
    const c = UF.canvas(w * scale, h * scale);
    const g = c.getContext('2d');
    g.setTransform(scale, 0, 0, scale, -x * scale, -y * scale);
    fn(g, scale);
    return { canvas: c, x, y, w, h };
  };
  UF.drawBaked = function (ctx, b, dx, dy) {
    ctx.drawImage(b.canvas, b.x + (dx || 0), b.y + (dy || 0), b.w, b.h);
  };

  // Tileable-enough grain: a canvas of random greys at device resolution.
  UF.grainCanvas = function (w, h, seed, lo, hi) {
    const c = UF.canvas(w, h);
    const g = c.getContext('2d');
    const img = g.createImageData(c.width, c.height);
    const r = UF.rng(seed);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = lo + (hi - lo) * r();
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  };

  // Fractal-noise grain (softer than white noise), values 0..255 around mid.
  UF.fractalCanvas = function (w, h, seed, freq, contrast) {
    const c = UF.canvas(w, h);
    const g = c.getContext('2d');
    const img = g.createImageData(c.width, c.height);
    const n = UF.noise2(seed);
    const r = UF.rng(seed + 1);
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x++) {
        const v = UF.fbm(n, x * freq, y * freq, 4) * contrast + (r() - 0.5) * contrast * 0.6;
        const k = Math.max(0, Math.min(255, 200 + v * 55));
        const i = (y * c.width + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = k;
        img.data[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    return c;
  };

  // Does this browser support ctx.filter? (Safari historically does not.)
  UF.hasCanvasFilter = (function () {
    try {
      const g = document.createElement('canvas').getContext('2d');
      if (typeof g.filter !== 'string') return false;
      g.filter = 'blur(1px)';
      return g.filter === 'blur(1px)';
    } catch (e) { return false; }
  })();

  // Gaussian-ish blur of a canvas, with a downscale fallback for Safari.
  UF.blurCanvas = function (src, px) {
    const out = UF.canvas(src.width, src.height);
    const g = out.getContext('2d');
    if (UF.hasCanvasFilter) {
      g.filter = 'blur(' + px + 'px)';
      g.drawImage(src, 0, 0);
      g.filter = 'none';
      return out;
    }
    const k = Math.max(1, px * 1.6);
    const small = UF.canvas(src.width / k, src.height / k);
    const sg = small.getContext('2d');
    sg.imageSmoothingQuality = 'high';
    sg.drawImage(src, 0, 0, small.width, small.height);
    g.imageSmoothingQuality = 'high';
    g.drawImage(small, 0, 0, out.width, out.height);
    return out;
  };

  // ---------------------------------------------------------------- shapes
  UF.roundRectPath = function (p, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    p.moveTo(x + r, y);
    p.arcTo(x + w, y, x + w, y + h, r);
    p.arcTo(x + w, y + h, x, y + h, r);
    p.arcTo(x, y + h, x, y, r);
    p.arcTo(x, y, x + w, y, r);
    p.closePath();
    return p;
  };

  // Sample points around a rounded rect, roughly every `step` px.
  UF.sampleRoundRect = function (x, y, w, h, r, step) {
    r = Math.min(r, w / 2, h / 2);
    const pts = [];
    const seg = (x0, y0, x1, y1) => {
      const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / step));
      for (let i = 0; i < n; i++) pts.push([x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n]);
    };
    const arc = (cx, cy, a0) => {
      const n = Math.max(2, Math.round((Math.PI * r) / 2 / step));
      for (let i = 0; i < n; i++) {
        const a = a0 + ((Math.PI / 2) * i) / n;
        pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
    };
    seg(x + r, y, x + w - r, y);
    arc(x + w - r, y + r, -Math.PI / 2);
    seg(x + w, y + r, x + w, y + h - r);
    arc(x + w - r, y + h - r, 0);
    seg(x + w - r, y + h, x + r, y + h);
    arc(x + r, y + h - r, Math.PI / 2);
    seg(x, y + h - r, x, y + r);
    arc(x + r, y + r, Math.PI);
    return pts;
  };

  UF.sampleEllipse = function (cx, cy, rx, ry, n, rot) {
    const pts = [];
    const c = Math.cos(rot || 0), s = Math.sin(rot || 0);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const x = Math.cos(a) * rx, y = Math.sin(a) * ry;
      pts.push([cx + x * c - y * s, cy + x * s + y * c]);
    }
    return pts;
  };

  // Displace points by 2D noise: amplitude in px, frequency in cycles per px.
  UF.wobble = function (pts, noise, amp, freq, ox, oy) {
    ox = ox || 0;
    oy = oy || 0;
    return pts.map(([x, y]) => [
      x + noise((x + ox) * freq, (y + oy) * freq) * amp,
      y + noise((x + ox) * freq + 37.1, (y + oy) * freq + 91.7) * amp,
    ]);
  };

  // Smooth closed (or open) path through points using midpoint quadratics.
  UF.smoothPath = function (pts, closed, p) {
    p = p || new Path2D();
    const n = pts.length;
    if (n < 2) return p;
    if (closed) {
      const m0 = mid(pts[n - 1], pts[0]);
      p.moveTo(m0[0], m0[1]);
      for (let i = 0; i < n; i++) {
        const a = pts[i], b = pts[(i + 1) % n];
        const m = mid(a, b);
        p.quadraticCurveTo(a[0], a[1], m[0], m[1]);
      }
      p.closePath();
    } else {
      p.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < n - 1; i++) {
        const m = mid(pts[i], pts[i + 1]);
        p.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]);
      }
      p.lineTo(pts[n - 1][0], pts[n - 1][1]);
    }
    return p;
  };
  function mid(a, b) { return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; }

  UF.polyPath = function (pts, closed, p) {
    p = p || new Path2D();
    pts.forEach((q, i) => (i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])));
    if (closed) p.closePath();
    return p;
  };

  // Every excavated shape (tunnels then rooms) as {x,y,w,h,kind,id}.
  // The shaft is extended 14 px above ground so its top opens cleanly once
  // the caller clips to y >= groundY.
  UF.cavities = function (scene) {
    const out = [];
    scene.tunnels.forEach((t) => {
      const c = Object.assign({ kind: 'tunnel' }, t);
      if (t.id === 'shaft') { c.y -= 14; c.h += 14; }
      out.push(c);
    });
    scene.rooms.forEach((r) => out.push(Object.assign({ kind: 'room' }, r)));
    return out;
  };

  // Union-outline trick: stroke every shape at 2× width, then erase every
  // interior. Only the outer half of the outline survives, so corridors open
  // into rooms without lines crossing the doorway.
  // shapes: [{path, width}] ; erase: [Path2D]
  UF.unionOutline = function (scale, shapes, erase, color, clipFn) {
    return UF.bakeRegion(scale, 0, 0, UF.W, UF.H, (g) => {
      if (clipFn) clipFn(g);
      g.strokeStyle = color;
      g.lineJoin = 'round';
      shapes.forEach((s) => { g.lineWidth = s.width * 2; g.stroke(s.path); });
      g.globalCompositeOperation = 'destination-out';
      g.fillStyle = '#000';
      erase.forEach((p) => g.fill(p));
    });
  };

  // Parallel hatching clipped to `path` (in the current transform), with the
  // stroke angle measured in world space.
  UF.hatch = function (g, path, o) {
    const ang = ((o.angle || 35) * Math.PI) / 180;
    const sp = o.spacing || 7;
    const bb = o.bbox || [0, 0, UF.W, UF.H];
    g.save();
    g.clip(path, o.rule || 'nonzero');
    if (o.world) g.setTransform(o.world);
    g.strokeStyle = o.color || '#000';
    g.globalAlpha = o.alpha == null ? 0.5 : o.alpha;
    g.lineWidth = o.width || 0.9;
    g.lineCap = 'butt';
    const cx = bb[0] + bb[2] / 2, cy = bb[1] + bb[3] / 2;
    const R = Math.hypot(bb[2], bb[3]) / 2 + sp;
    const dx = Math.cos(ang), dy = Math.sin(ang);
    const nx = -dy, ny = dx;
    const jit = o.jitter || 0;
    const r = UF.rng(o.seed || 7);
    g.beginPath();
    for (let d = -R; d <= R; d += sp) {
      const j = jit ? (r() - 0.5) * jit : 0;
      const px = cx + nx * (d + j), py = cy + ny * (d + j);
      g.moveTo(px - dx * R, py - dy * R);
      g.lineTo(px + dx * R, py + dy * R);
    }
    g.stroke();
    g.restore();
  };

  // ---------------------------------------------------------------- ants
  // Orient a profile drawing (local +x forward, +y toward the floor) to a
  // heading in degrees, never turning the ant upside down.
  UF.orient = function (g, x, y, headingDeg) {
    const h = (headingDeg * Math.PI) / 180;
    g.translate(x, y);
    if (Math.cos(h) < -1e-6) {
      g.scale(-1, 1);
      g.rotate(Math.PI - h);
    } else {
      g.rotate(h);
    }
  };

  // Common worker skeleton in profile, worker scale = 1 (length ≈ 28 px).
  // Each style may reshape it, but castes keep these ratios:
  // major 1.4× with a head 1.3× wider; queen 3× with a dominant gaster.
  UF.antBody = function (caste) {
    const b = {
      head: { x: 7.6, y: -0.8, rx: 3.4, ry: 3.1 },
      thorax: { x: 0.6, y: -0.4, rx: 3.2, ry: 2.2 },
      petiole: { x: -3.6, y: -0.2, r: 1.2 },
      abdomen: { x: -10.2, y: -1.0, rx: 6.0, ry: 4.2 },
      hips: [2.4, 0.8, -0.8],
      hipY: 1.2,
      footY: 7.2,
      reach: [6.5, 0.5, -7.5],
      stride: 2.6,
      lift: 1.6,
      carry: { x: 13.6, y: 0.4, r: 2.6 },
      scale: 1,
    };
    if (caste === 'major') {
      b.scale = 1.4;
      b.head = { x: 8.4, y: -1.0, rx: 3.9, ry: 4.0 };
      b.thorax.x = 1.0;
      b.carry.x = 15;
    } else if (caste === 'queen') {
      b.scale = 2.8;
      b.head = { x: 9.4, y: -1.6, rx: 2.5, ry: 2.4 };
      b.thorax = { x: 2.4, y: -1.4, rx: 3.3, ry: 2.6 };
      b.petiole = { x: -2.0, y: -0.6, r: 0.9 };
      b.abdomen = { x: -10.6, y: -1.4, rx: 9.3, ry: 5.0 };
      b.hips = [3.8, 2.4, 1.0];
      b.hipY = 0.8;
      b.footY = 7.4;
      b.reach = [5.6, 0.6, -6.4];
      b.stride = 1.4;
    }
    // Centre the body on the scene position.
    const cx = (b.head.x + b.head.rx + b.abdomen.x - b.abdomen.rx) / 2;
    [b.head, b.thorax, b.petiole, b.abdomen, b.carry].forEach((o) => (o.x -= cx));
    b.hips = b.hips.map((h) => h - cx);
    return b;
  };

  // Six legs for a gait phase (radians). Tripod gait: near-front, far-mid,
  // near-hind move together. Returns points in body-local units.
  UF.antLegs = function (b, phase, opts) {
    opts = opts || {};
    const legs = [];
    for (let side = 0; side < 2; side++) {
      for (let i = 0; i < 3; i++) {
        const group = (i + side) % 2;
        const ph = phase + (group ? Math.PI : 0);
        const hx = b.hips[i] + (side ? -0.5 : 0);
        const hip = [hx, b.hipY];
        let fx = b.hips[i] + b.reach[i] + Math.sin(ph) * b.stride * (opts.strideMul || 1);
        let fy = b.footY - Math.max(0, Math.cos(ph)) * b.lift * (opts.liftMul || 1);
        if (opts.tucked) {
          fx = b.hips[i] + b.reach[i] * 0.45;
          fy = b.footY * 0.7;
        }
        if (side) fx -= 0.8;
        const kx = (hx + fx) / 2 + (i === 2 ? -1.4 : i === 0 ? 1.0 : 0);
        const ky = Math.min(b.hipY, fy) - (opts.tucked ? 1.4 : 2.6);
        legs.push({ side, index: i, hip, knee: [kx, ky], foot: [fx, fy] });
      }
    }
    return legs;
  };

  // Antenna as [base, elbow, tip] in body-local units.
  UF.antAntennae = function (b) {
    const h = b.head;
    const base = [h.x + h.rx * 0.35, h.y - h.ry * 0.85];
    return [
      [base, [base[0] + 1.6, base[1] - 4.4], [base[0] + 5.4, base[1] - 2.6]],
      [[base[0] - 0.6, base[1] + 0.2], [base[0] + 0.4, base[1] - 4.8], [base[0] + 4.2, base[1] - 4.0]],
    ];
  };

  // Every creature in the scene as a flat list with caste tags, so renderers
  // can iterate one array.
  UF.creatures = function (scene) {
    const list = [];
    scene.surfaceWorkers.forEach((a, i) => list.push(Object.assign({ caste: 'worker', key: 's' + i }, a)));
    scene.workers.forEach((a, i) => list.push(Object.assign({ caste: 'worker', key: 'w' + i }, a)));
    scene.majors.forEach((a, i) => list.push(Object.assign({ caste: 'major', key: 'm' + i }, a)));
    list.push(Object.assign({ caste: 'queen', key: 'q' }, scene.queen));
    return list;
  };

  // ---------------------------------------------------------------- motion
  UF.quant = (t, fps) => Math.floor(t * fps + 1e-6) / fps;
  UF.legPhase = (scene, t) => t * scene.motion.legHz * Math.PI * 2;
  UF.carryBob = (scene, t) => Math.sin(t * scene.motion.carryBobHz * Math.PI * 2) * scene.motion.carryBobPx;
  UF.eggScale = (scene, t) =>
    1 + scene.motion.eggPulseScale * (0.5 - 0.5 * Math.cos(t * scene.motion.eggPulseHz * Math.PI * 2));
  // 1 during the short twitch window that opens every `every` seconds.
  UF.spiderTwitch = (scene, t, dur) => ((t % scene.motion.spiderTwitchEvery) < (dur || 0.15) ? 1 : 0);

  // The scent trail as a Path2D.
  UF.trailPath = function (scene) {
    return UF.polyPath(scene.scentTrail.map((p) => [p.x, p.y]), false);
  };

  UF.lerpColor = function (a, b, t) {
    const pa = hex(a), pb = hex(b);
    const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
    return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
  };
  function hex(h) {
    h = h.replace('#', '');
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  }
  UF.hexToRgb = hex;
})();
