// HD-2D — Octopath Traveler / Triangle Strategy. Pixel-art sprites stand in
// a lit 3D diorama with pixel textures, glowing mushrooms and lanterns, then
// bloom, tilt-shift blur and a vignette make it read like a miniature set.
(function () {
  const T = window.THREE, U3 = window.U3;

  const P = {
    skyTop: '#6F9BEA', skyMid: '#FFAA66', skyLow: '#FFD488', grass: ['#2F5A2A', '#457A32', '#62A040', '#8CC458'],
    top: ['#5A3A22', '#704A2C', '#8A5E38', '#A8784A'], packed: ['#46302A', '#584036', '#6C5244', '#806454'],
    clay: ['#6A2E22', '#84402C', '#9E5236', '#B86A44'], back: ['#3A2618', '#46301F', '#523A26'],
    ant: ['#22140C', '#3E2618', '#62402A', '#9A6A44'], queen: ['#4A1E14', '#7A3420', '#A44E2E', '#E09060'],
    food: ['#A86A10', '#E0A030', '#F8D060', '#FFF4B0'], egg: ['#C8B898', '#E8DCC0', '#FFF8EA', '#FFFFFF'],
    spider: ['#1E1826', '#2E2638', '#463A52', '#6A5A78'], outline: '#100A06', mushroom: '#7FE8D0', lantern: '#FFB050',
  };
  const PIX = 1.0; // world px per sprite pixel

  const meta = {
    label: 'HD-2D',
    tagline: 'Pixel-art ants in a lit miniature set: the warmth of a 16-bit sprite with the depth, light and blur of a tilt-shift photograph.',
    refs: 'Octopath Traveler, Triangle Strategy, Live A Live (2022), Dragon Quest III HD-2D, Eastward (lighting)',
    matrix: ['Octopath Traveler, Triangle Strategy', 'Medium–High', 'Medium', 'High', 'High'],
    palette: [
      ['Golden sky', P.skyMid], ['Grass', P.grass[2]], ['Topsoil', P.top[2]], ['Packed', P.packed[2]], ['Clay', P.clay[2]],
      ['Nest wall', P.back[1]], ['Ant', P.ant[2]], ['Queen', P.queen[2]], ['Food', P.food[2]], ['Spider', P.spider[2]],
      ['Mushroom glow', P.mushroom], ['Lantern', P.lantern],
    ],
    rendering: 'Creatures are lit pixel-art billboards (1 sprite px = 1 world px, nearest-filtered, four-frame walk) that cast real shadows. The set is extruded geometry with 32 px pixel textures. Post: bloom on emissive mushrooms and lanterns, horizontal and vertical tilt-shift blur, filmic tone curve, warm grade and vignette.',
    motion: 'Sprites flip through four walk frames at 24 fps; carriers bob a pixel; fireflies twinkle over the grass; lantern and mushroom light breathes. The camera can glide freely while sprites stay facing it.',
    fit: 'Gives the colony a storybook scale: tiny pixel characters in a big, glowing, physical world. Sprites keep castes crisp and readable at any zoom.',
    risks: 'Post-processing (bloom plus tilt-shift) is the heaviest GPU cost here on phones. Sprite art for 8 directions × castes × actions is real pixel-artist work.',
    production: 'Medium–high: sprite sheets per caste and action, plus a modest 3D set. Engine work for lighting and post is a one-off.',
  };

  // ---------------------------------------------------------------- pixels
  function Pix(w, h) {
    this.w = w; this.h = h; this.c = new Array(w * h).fill(null);
  }
  Pix.prototype.set = function (x, y, col) {
    x = Math.floor(x); y = Math.floor(y);
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.c[y * this.w + x] = col;
  };
  Pix.prototype.get = function (x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.c[y * this.w + x] : null; };
  // Shaded ellipse: tones dark → light, lit from the upper left.
  Pix.prototype.ellipse = function (cx, cy, rx, ry, tones) {
    const L = [-0.45, 0.6, 0.66];
    for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) {
      for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
        const nx = (x + 0.5 - cx) / rx, ny = -(y + 0.5 - cy) / ry;
        const d2 = nx * nx + ny * ny;
        if (d2 > 1) continue;
        const nz = Math.sqrt(1 - d2);
        const l = nx * L[0] + ny * L[1] + nz * L[2];
        const ti = l > 0.93 ? 3 : l > 0.62 ? 2 : l > 0.3 ? 1 : 0;
        this.set(x, y, tones[ti]);
      }
    }
  };
  Pix.prototype.line = function (x0, y0, x1, y1, col, th) {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.5));
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n, y = y0 + ((y1 - y0) * i) / n;
      this.set(x, y, col);
      if (th > 1) { this.set(x + 1, y, col); this.set(x, y + 1, col); }
    }
  };
  Pix.prototype.outline = function (col) {
    const add = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.get(x, y)) continue;
      if (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1)) add.push([x, y]);
    }
    add.forEach(([x, y]) => this.set(x, y, col));
  };
  Pix.prototype.texture = function () {
    const tex = U3.canvasTexture(this.w, this.h, (g) => {
      for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
        const c = this.c[y * this.w + x];
        if (c) { g.fillStyle = c; g.fillRect(x, y, 1, 1); }
      }
    }, { nearest: true });
    tex.wrapS = tex.wrapT = T.ClampToEdgeWrapping;
    return tex;
  };

  // Ant sprite for a caste and walk frame. Returns { pix, ox, oy } where
  // (ox, oy) is the body centre in sprite pixels.
  function antPixels(caste, frame, carrying, resting) {
    const sp = U3.antSpec(caste);
    const u = sp.scale / PIX;
    const tones = caste === 'queen' ? P.queen : P.ant;
    const minX = sp.abdomen.x - sp.abdomen.rx - 1.5, maxX = Math.max(sp.head.x + 8, sp.carry.x + sp.carry.r) + 1.5;
    const maxY = Math.max(sp.head.y + sp.head.ry * 0.7 + 5, sp.abdomen.y + sp.abdomen.ry) + 1.5, minY = -sp.footY - 1;
    const W = Math.ceil((maxX - minX) * u) + 4, H = Math.ceil((maxY - minY) * u) + 4;
    const ox = -minX * u + 2, oy = maxY * u + 2;
    const pix = new Pix(W, H);
    const X = (x) => ox + x * u, Y = (y) => oy - y * u;
    const legTh = caste === 'worker' ? 1 : 2;
    const legs = [];
    [-1, 1].forEach((side) => {
      for (let i = 0; i < 3; i++) {
        const group = (i + (side > 0 ? 1 : 0)) % 2;
        const ph = (frame * Math.PI) / 2 + (group ? Math.PI : 0);
        const hx = sp.hips[i] + (side < 0 ? -0.5 : 0);
        let fx = sp.hips[i] + sp.reach[i] + Math.sin(ph) * 2.4;
        let fy = -sp.footY + Math.max(0, Math.cos(ph)) * 1.3;
        let ky = sp.hipY + 2.4;
        if (resting) { fx = sp.hips[i] + sp.reach[i] * 0.6; fy = -sp.footY; ky = sp.hipY + 0.6; }
        const kx = hx + (fx - hx) * 0.45 + (i === 2 ? -0.8 : 0.8);
        legs.push({ side, pts: [[hx, sp.hipY], [kx, ky], [fx, fy], [fx + (i === 2 ? -1.2 : 1.2), -sp.footY]] });
      }
    });
    const drawLeg = (l, col) => {
      for (let k = 0; k < l.pts.length - 1; k++) pix.line(X(l.pts[k][0]), Y(l.pts[k][1]), X(l.pts[k + 1][0]), Y(l.pts[k + 1][1]), col, legTh);
    };
    legs.filter((l) => l.side < 0).forEach((l) => drawLeg(l, tones[0]));
    const hd = sp.head;
    // Antennae behind the head.
    const ab = [hd.x + hd.rx * 0.45, hd.y + hd.ry * 0.7];
    pix.line(X(ab[0]), Y(ab[1]), X(ab[0] + 1.2), Y(ab[1] + 4.2), tones[1], 1);
    pix.line(X(ab[0] + 1.2), Y(ab[1] + 4.2), X(ab[0] + 6), Y(ab[1] + 2.4), tones[1], 1);
    // Body: gaster, waist, thorax, head.
    pix.ellipse(X(sp.abdomen.x), Y(sp.abdomen.y), sp.abdomen.rx * u, sp.abdomen.ry * u, tones);
    if (caste === 'queen') {
      for (let k = -1; k <= 1; k++) {
        const x = sp.abdomen.x + k * sp.abdomen.rx * 0.38;
        pix.line(X(x), Y(sp.abdomen.y + sp.abdomen.ry * 0.8), X(x - 0.6), Y(sp.abdomen.y - sp.abdomen.ry * 0.8), tones[0], 1);
      }
    }
    pix.ellipse(X(sp.petiole.x), Y(sp.petiole.y), Math.max(1, sp.petiole.r * u), Math.max(1.2, sp.petiole.r * 1.3 * u), tones);
    pix.ellipse(X(sp.thorax.x), Y(sp.thorax.y), sp.thorax.rx * u, sp.thorax.ry * u, tones);
    pix.ellipse(X(hd.x), Y(hd.y), hd.rx * u, hd.ry * u, tones);
    // Compound eye with a glint.
    pix.set(X(hd.x + hd.rx * 0.3), Y(hd.y + hd.ry * 0.25), '#0A0604');
    pix.set(X(hd.x + hd.rx * 0.3) + 1, Y(hd.y + hd.ry * 0.25), '#0A0604');
    pix.set(X(hd.x + hd.rx * 0.3), Y(hd.y + hd.ry * 0.25) - 1, '#FFF4E0');
    // Mandibles.
    const m = caste === 'major' ? 1.8 : 1;
    pix.line(X(hd.x + hd.rx * 0.8), Y(hd.y - hd.ry * 0.4), X(hd.x + hd.rx + 2 * m), Y(hd.y - hd.ry * 0.75), tones[1], caste === 'major' ? 2 : 1);
    if (caste === 'queen') {
      // Wing scars: two pale ticks on the thorax.
      pix.line(X(sp.thorax.x - 1), Y(sp.thorax.y + sp.thorax.ry), X(sp.thorax.x - 2.2), Y(sp.thorax.y + sp.thorax.ry + 1.4), '#F0D8B0', 1);
      pix.line(X(sp.thorax.x + 0.4), Y(sp.thorax.y + sp.thorax.ry), X(sp.thorax.x - 0.8), Y(sp.thorax.y + sp.thorax.ry + 1.6), '#F0D8B0', 1);
    }
    legs.filter((l) => l.side > 0).forEach((l) => drawLeg(l, tones[1]));
    if (carrying) pix.ellipse(X(sp.carry.x + 0.6), Y(sp.carry.y), sp.carry.r * u, sp.carry.r * 0.85 * u, P.food);
    pix.outline(P.outline);
    return { pix, ox, oy };
  }

  function spiderPixels(twitch) {
    const W = 110, H = 56, ox = 62, oy = 26; // body centre; feet at oy + 26
    const pix = new Pix(W, H);
    const X = (x) => ox + x, Y = (y) => oy - y;
    const legs = [
      [[2, -1], [-12, 14], [-26, 2], [-44, -26]],
      [[0, -1], [-6, 17], [-14, 4], [-30, -26]],
      [[-2, -1], [6, 16], [14, 4], [22, -26]],
      [[-4, -1], [16, 12], [28, 0], [40, -26]],
    ];
    if (twitch) legs[0] = [[2, -1], [-14, 18], [-30, 10], [-48, -16]];
    const tones = P.spider;
    const draw = (l, dx, col) => { for (let k = 0; k < l.length - 1; k++) pix.line(X(l[k][0] + dx), Y(l[k][1]), X(l[k + 1][0] + dx), Y(l[k + 1][1]), col, 2); };
    legs.forEach((l) => draw(l, 6, tones[0]));
    pix.ellipse(X(16), Y(4), 13, 10.5, tones);
    // Markings on the abdomen.
    for (let k = 0; k < 3; k++) pix.line(X(10 + k * 5), Y(10), X(12 + k * 5), Y(6), tones[3], 1);
    pix.ellipse(X(-2), Y(0), 8, 6.5, tones);
    legs.forEach((l) => draw(l, 0, tones[1]));
    [[-8, 2], [-6, 3], [-9, 0], [-5, 1]].forEach(([x, y], i) => pix.set(X(x), Y(y), i < 2 ? '#FF3030' : '#B01818'));
    pix.line(X(-9), Y(-3), X(-12), Y(-7), tones[1], 1);
    pix.outline(P.outline);
    return { pix, ox, oy };
  }

  function blobPixels(w, h, tones, count, seed) {
    const pix = new Pix(w, h);
    const r = U3.rng(seed);
    for (let i = 0; i < count; i++) {
      const x = 3 + r() * (w - 6), y = h - 3 - r() * (h - 6) * (1 - Math.abs(x - w / 2) / (w / 2));
      pix.ellipse(x, y, 2.2, 1.7, tones);
    }
    pix.outline(P.outline);
    return pix;
  }

  // A billboard whose sprite pixel (ox, oy) sits at the mesh origin.
  function spriteMesh(sprite, tex) {
    const { pix, ox, oy } = sprite;
    const g = new T.PlaneGeometry(pix.w * PIX, pix.h * PIX);
    g.translate((pix.w / 2 - ox) * PIX, -(pix.h / 2 - oy) * PIX, 0);
    const m = new T.Mesh(g, new T.MeshLambertMaterial({ map: tex || pix.texture(), alphaTest: 0.5, side: T.DoubleSide }));
    m.castShadow = true;
    return m;
  }

  // Pixel texture for the set: tone clusters, pebbles, roots or strata.
  function setTexture(tones, seed, o) {
    o = o || {};
    const S = 96;
    return U3.canvasTexture(S, S, (g) => {
      const r = U3.rng(seed);
      const n = U3.noise(seed);
      // Blend four offset samples so the tile wraps without seams.
      const tn = (x, y) => {
        const u = x / S, v = y / S, f = 0.11;
        return n(x * f, y * f) * (1 - u) * (1 - v) + n((x - S) * f, y * f) * u * (1 - v) + n(x * f, (y - S) * f) * (1 - u) * v + n((x - S) * f, (y - S) * f) * u * v;
      };
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const v = tn(x, y) * 0.9 + 0.5 + (r() - 0.5) * 0.22 + (o.strata ? Math.sin(y * 0.5 + tn(x, 0) * 3) * 0.1 : 0);
        g.fillStyle = tones[Math.max(0, Math.min(tones.length - 2, Math.floor(v * (tones.length - 1))))];
        g.fillRect(x, y, 1, 1);
      }
      for (let k = 0; k < (o.pebbles || 0) * 9; k++) {
        const x = Math.floor(r() * (S - 3)), y = Math.floor(r() * (S - 3));
        g.fillStyle = tones[tones.length - 1];
        g.fillRect(x, y, 3, 2);
        g.fillStyle = '#E8D8C0';
        g.fillRect(x, y, 1, 1);
        g.fillStyle = tones[0];
        g.fillRect(x, y + 2, 3, 1);
      }
      if (o.roots) {
        g.fillStyle = '#9A7448';
        for (let k = 0; k < 2; k++) {
          let x = Math.floor(r() * S);
          const y0 = Math.floor(r() * S * 0.5), len = 12 + Math.floor(r() * 20);
          for (let y = y0; y < y0 + len; y++) { g.fillRect(x, y, 1, 1); if (r() < 0.35) x += r() < 0.5 ? -1 : 1; }
        }
      }
    }, { nearest: true, repeat: [1 / S, 1 / S] });
  }

  const FinalShader = {
    uniforms: { tDiffuse: { value: null }, exposure: { value: 1.15 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform float exposure; varying vec2 vUv;
      vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
      void main(){
        vec3 c = texture2D(tDiffuse, vUv).rgb * exposure;
        c = aces(c);
        c = pow(c, vec3(1.0 / 2.2));
        c = mix(c, c * vec3(1.06, 0.98, 0.88), 0.6);
        vec2 d = vUv - 0.5;
        c *= 1.0 - smoothstep(0.32, 0.85, length(d * vec2(1.25, 1.0))) * 0.55;
        gl_FragColor = vec4(c, 1.0);
      }`,
  };

  function create(env) {
    const scene = env.scene;
    const root = new T.Scene();
    root.background = U3.canvasTexture(4, 256, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, P.skyTop);
      gr.addColorStop(0.45, P.skyMid);
      gr.addColorStop(1, P.skyLow);
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
    });
    const DEPTH = 72;
    const cavs = U3.cavities(scene, { tunnelR: 10, roomR: 16 });
    const soil = U3.soilSDF(scene, cavs);
    const r = U3.rng(41);

    // ---- The set.
    const bandTex = [
      setTexture(P.top, 3, { pebbles: 2, roots: true }),
      setTexture(P.packed, 4, { pebbles: 4 }),
      setTexture(P.clay, 5, { pebbles: 1, strata: true }),
    ];
    const bands = U3.bandShapes(scene, cavs, { step: 2, simplify: 0.8, edge: (x, i) => Math.round(Math.sin(x * 0.04 + i) * 4) });
    bands.forEach((b) => {
      const m = new T.Mesh(U3.extrude(b.shapes, DEPTH, { bevel: true, bevelSize: 1.2, bevelThickness: 1.5, bevelSegments: 1 }), new T.MeshLambertMaterial({ map: bandTex[b.index] }));
      m.receiveShadow = m.castShadow = true;
      root.add(m);
    });
    const backTex = setTexture(P.back.concat(['#664A30']), 6, { pebbles: 1 });
    const back = new T.Mesh(new T.PlaneGeometry(U3.W, U3.H - scene.groundY), new T.MeshLambertMaterial({ map: backTex }));
    back.geometry.attributes.uv.array.forEach((v, i, a) => { a[i] = v * (i % 2 ? (U3.H - scene.groundY) : U3.W); });
    back.position.set(0, U3.Y((U3.H + scene.groundY) / 2), -DEPTH);
    back.receiveShadow = true;
    root.add(back);
    const topTex = setTexture(P.grass, 8, {});
    const top = new T.Mesh(new T.PlaneGeometry(U3.W, DEPTH + 4), new T.MeshLambertMaterial({ map: topTex }));
    top.geometry.attributes.uv.array.forEach((v, i, a) => { a[i] = v * (i % 2 ? DEPTH : U3.W); });
    top.rotation.x = -Math.PI / 2;
    top.position.set(0, U3.Y(scene.groundY) + 0.6, -DEPTH / 2);
    top.receiveShadow = true;
    root.add(top);

    // Painted clouds far behind.
    const clouds = new T.Mesh(new T.PlaneGeometry(2400, 300), new T.MeshBasicMaterial({
      transparent: true, depthWrite: false,
      map: U3.canvasTexture(256, 32, (g) => {
        const cr = U3.rng(2);
        for (let i = 0; i < 18; i++) {
          const x = cr() * 256, y = 10 + cr() * 14, rr = 4 + cr() * 9;
          g.fillStyle = 'rgba(255,214,190,' + (0.5 + cr() * 0.4) + ')';
          g.beginPath(); g.ellipse(x, y, rr * 2.2, rr, 0, 0, Math.PI * 2); g.fill();
        }
      }),
    }));
    clouds.position.set(0, U3.Y(-40), -900);
    root.add(clouds);

    // Grass tufts and flowers as sprites along the surface.
    const tuftTex = [0, 1, 2].map((v) => {
      const pix = new Pix(14, 12);
      const tr = U3.rng(70 + v);
      for (let i = 0; i < 9; i++) {
        const x = 2 + tr() * 10, h = 4 + tr() * 7;
        pix.line(x, 11, x + (tr() - 0.5) * 4, 11 - h, P.grass[1 + Math.floor(tr() * 3)], 1);
      }
      if (v === 2) { pix.set(7, 3, '#F06A80'); pix.set(8, 3, '#F06A80'); pix.set(7, 2, '#FFE0A0'); }
      return pix.texture();
    });
    const tufts = [];
    const shaft = scene.tunnels.find((t) => t.id === 'shaft');
    for (let i = 0; i < 110; i++) {
      const x = r() * 716;
      if (x > shaft.x - 8 && x < shaft.x + shaft.w + 8) continue;
      const m = new T.Mesh(new T.PlaneGeometry(14 * PIX, 12 * PIX), new T.MeshLambertMaterial({ map: tuftTex[Math.floor(r() * 3)], alphaTest: 0.5, side: T.DoubleSide }));
      m.geometry.translate(0, 6 * PIX, 0);
      m.position.set(U3.X(x), U3.Y(scene.groundY) + 0.5, -2 - r() * (DEPTH - 4));
      tufts.push(m);
      root.add(m);
    }

    // ---- Creatures.
    const lay = U3.layout(scene, soil, DEPTH);
    const setCache = new Map();
    function frames(caste, carrying, resting) {
      const key = caste + carrying + resting;
      if (!setCache.has(key)) {
        const n = resting ? 1 : 4;
        const sprites = Array.from({ length: n }, (_, f) => antPixels(caste, f, carrying, resting));
        setCache.set(key, { sprite: sprites[0], tex: sprites.map((s) => s.pix.texture()) });
      }
      return setCache.get(key);
    }
    const billboards = [];
    const ants = lay.ants.map((a) => {
      const set = frames(a.caste, a.carrying, a.resting);
      const mesh = spriteMesh(set.sprite, set.tex[0]);
      const sp = U3.antSpec(a.caste);
      const lift = sp.footY * sp.scale;
      if (a.wall) {
        mesh.position.set(U3.X(a.x), U3.Y(a.y), -DEPTH + 0.6);
        mesh.rotation.z = a.heading === 270 ? Math.PI / 2 : -Math.PI / 2;
        if (a.heading === 90) mesh.scale.y = -1;
      } else {
        const z = a.caste === 'worker' ? -DEPTH * 0.42 : -DEPTH * 0.58;
        mesh.position.set(U3.X(a.x), U3.Y(a.floor) + lift, z);
        if (a.heading === 180) mesh.scale.x = -1;
        billboards.push(mesh);
      }
      root.add(mesh);
      return { mesh, set, a, home: mesh.position.clone() };
    });

    const spiderSprites = [spiderPixels(false), spiderPixels(true)];
    const spiderTex = spiderSprites.map((s) => s.pix.texture());
    const spider = spriteMesh(spiderSprites[0], spiderTex[0]);
    spider.position.set(U3.X(lay.spider.x), U3.Y(lay.spider.y) + 26, lay.spider.z);
    root.add(spider);
    billboards.push(spider);

    const crumbPix = new Pix(14, 12);
    crumbPix.ellipse(7, 7, 5.5, 4.2, P.food);
    crumbPix.outline(P.outline);
    const crumb = spriteMesh({ pix: crumbPix, ox: 7, oy: 11 });
    crumb.position.set(U3.X(lay.crumb.x), U3.Y(lay.crumb.y), lay.crumb.z);
    root.add(crumb);
    billboards.push(crumb);

    const eggPix = new Pix(10, 12);
    eggPix.ellipse(5, 6, 3.6, 4.8, P.egg);
    eggPix.outline('#5A4A3A');
    const eggTex = eggPix.texture();
    const eggs = lay.eggs.map((e) => {
      const m = spriteMesh({ pix: eggPix, ox: 5, oy: 11 }, eggTex);
      m.position.set(U3.X(e.x), U3.Y(e.y) + e.row * 6, e.z);
      root.add(m);
      billboards.push(m);
      return m;
    });
    lay.piles.forEach((p, i) => {
      const m = spriteMesh({ pix: blobPixels(28, 20, P.food, 22, 50 + i), ox: 14, oy: 19 });
      m.position.set(U3.X(p.x), U3.Y(p.y), p.z);
      root.add(m);
      billboards.push(m);
    });

    // ---- Glowing mushrooms and lanterns: the lights bloom picks up.
    const glows = [];
    const capMat = new T.MeshStandardMaterial({ color: '#2E6A60', emissive: P.mushroom, emissiveIntensity: 2.2, roughness: 0.6 });
    const stemMat = new T.MeshLambertMaterial({ color: '#D8D0C0' });
    const mush = (x, y, z, s) => {
      const g = new T.Group();
      const stem = new T.Mesh(new T.CylinderGeometry(0.8 * s, 1.1 * s, 5 * s, 6), stemMat);
      stem.position.y = 2.5 * s;
      const cap = new T.Mesh(new T.SphereGeometry(3 * s, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), capMat);
      cap.position.y = 4.6 * s;
      g.add(stem, cap);
      g.position.set(x, y, z);
      root.add(g);
    };
    scene.rooms.forEach((rm, i) => {
      const fx = rm.x + (i % 2 ? 14 : rm.w - 14);
      const fy = U3.Y(U3.floorY(soil, fx, rm.y + 30));
      mush(U3.X(fx), fy, -DEPTH * 0.86, 1.3);
      mush(U3.X(fx) + (i % 2 ? 7 : -7), fy, -DEPTH * 0.78, 0.9);
      const l = new T.PointLight(P.mushroom, 1.8, 150, 1.3);
      l.position.set(U3.X(fx), fy + 10, -DEPTH * 0.6);
      root.add(l);
      glows.push({ l, base: 1.8, i });
    });
    const lanternMat = new T.MeshStandardMaterial({ color: '#7A4A20', emissive: P.lantern, emissiveIntensity: 3, roughness: 0.5 });
    [['queen', 0.5], ['store', 0.5]].forEach(([id, fxr], i) => {
      const rm = scene.rooms.find((q) => q.id === id);
      const x = U3.X(rm.x + rm.w * fxr), y = U3.Y(rm.y + 14);
      const cord = new T.Mesh(new T.CylinderGeometry(0.3, 0.3, 8, 4), new T.MeshLambertMaterial({ color: '#2A1A10' }));
      cord.position.set(x, y + 4, -DEPTH * 0.6);
      const lamp = new T.Mesh(new T.BoxGeometry(5, 7, 5), lanternMat);
      lamp.position.set(x, y - 3, -DEPTH * 0.6);
      root.add(cord, lamp);
      const l = new T.PointLight(P.lantern, 3.2, 220, 1.2);
      l.position.set(x, y - 6, -DEPTH * 0.45);
      root.add(l);
      glows.push({ l, base: 3.2, i: i + 4 });
    });

    // Fireflies over the grass.
    const flyTex = U3.canvasTexture(4, 4, (g) => { g.fillStyle = '#FFF6B0'; g.fillRect(1, 1, 2, 2); g.fillStyle = 'rgba(255,246,176,0.4)'; g.fillRect(0, 1, 4, 2); g.fillRect(1, 0, 2, 4); }, { nearest: true });
    const flyGroups = [0, 1, 2].map((k) => {
      const pos = [];
      for (let i = 0; i < 9; i++) pos.push(U3.X(r() * 720), U3.Y(scene.groundY - 8 - r() * 45), -r() * DEPTH);
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      const m = new T.PointsMaterial({ size: 4, map: flyTex, color: '#FFF0A0', transparent: true, blending: T.AdditiveBlending, depthWrite: false });
      const pts = new T.Points(g, m);
      root.add(pts);
      return pts;
    });

    // ---- Light.
    root.add(new T.HemisphereLight('#9EC6FF', '#4A2E20', 0.55));
    root.add(new T.AmbientLight('#6A4A3A', 0.55));
    const sun = new T.DirectionalLight('#FFC890', 1.35);
    sun.position.set(-420, 300, 420);
    U3.shadowLight(sun, 2048, 420);
    sun.shadow.bias = -0.0006;
    root.add(sun);

    const rig = U3.makeCamera({ fov: 24, pitch: 0.2, yaw: 0, zoom: 1.02, tz: -36 });

    let composer = null, tiltH = null, tiltV = null, bloom = null;
    function build(renderer, w, h) {
      composer = new T.EffectComposer(renderer);
      composer.addPass(new T.RenderPass(root, rig.camera));
      bloom = new T.UnrealBloomPass(new T.Vector2(w, h), 0.75, 0.55, 0.85);
      composer.addPass(bloom);
      tiltH = new T.ShaderPass(T.HorizontalTiltShiftShader);
      tiltV = new T.ShaderPass(T.VerticalTiltShiftShader);
      tiltH.uniforms.r.value = tiltV.uniforms.r.value = 0.52;
      composer.addPass(tiltH);
      composer.addPass(tiltV);
      composer.addPass(new T.ShaderPass(FinalShader));
    }

    return {
      renderScale: 1,
      fps: 24,
      update(t, orbit) {
        rig.update(orbit);
        const cam = rig.camera;
        const yaw = Math.atan2(cam.position.x - rig.target.x, cam.position.z - rig.target.z);
        billboards.forEach((b) => (b.rotation.y = yaw));
        tufts.forEach((b) => (b.rotation.y = yaw));
        const f = Math.floor(t * scene.motion.legHz * 4 + 1e-6);
        ants.forEach((o) => {
          const n = o.set.tex.length;
          o.mesh.material.map = o.set.tex[(f + (U3.hash(o.a.key) % 4)) % n];
          const bob = o.a.carrying ? (Math.sin(t * scene.motion.carryBobHz * Math.PI * 2) > 0 ? 1 : 0) * PIX : 0;
          o.mesh.position.copy(o.home);
          if (o.a.wall) o.mesh.position.z += bob * 0.5; else o.mesh.position.y += bob;
        });
        spider.material.map = spiderTex[t % scene.motion.spiderTwitchEvery < 0.25 ? 1 : 0];
        const es = 1 + 0.04 * (0.5 - 0.5 * Math.cos(t * Math.PI));
        eggs.forEach((m) => m.scale.set(m.scale.x < 0 ? -es : es, es, 1));
        glows.forEach((g) => (g.l.intensity = g.base * (0.9 + 0.1 * Math.sin(t * 2.3 + g.i))));
        flyGroups.forEach((p, k) => (p.material.opacity = 0.35 + 0.65 * Math.max(0, Math.sin(t * 1.7 + k * 2.1))));
      },
      render(renderer, size) {
        U3.prepare(renderer, { clear: '#000000' });
        if (!composer) build(renderer, size.w, size.h);
        if (composer._w !== size.w || composer._h !== size.h) {
          composer.setPixelRatio(1);
          composer.setSize(size.w, size.h);
          composer._w = size.w;
          composer._h = size.h;
          tiltH.uniforms.h.value = 2.2 / size.w;
          tiltV.uniforms.v.value = 2.2 / size.h;
        }
        composer.render();
      },
    };
  }

  U3.register('hd2d', { meta, create });
})();
