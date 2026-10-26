// UNDERFOOT 3D — shared pipeline for the retro-console family.
//
// One builder, many eras. Each retro style is a config: render size, vertex
// snapping, affine or perspective texturing, texture filter (nearest,
// N64-style three-point, or linear), shading model, palette, lights and a
// post chain. The scene content (nest, ants, spider, props, lights) is the
// same for every era so only the hardware look changes.
(function () {
  const T = window.THREE, U3 = window.U3;
  const R = (U3.retro = {});

  // ------------------------------------------------------------ textures
  // Small speckled texture from a ramp of colours.
  R.tex = function (cfg, seed, colors, o) {
    o = o || {};
    const S = o.size || cfg.texSize || 32;
    const t = U3.canvasTexture(S, S, (g) => {
      const r = U3.rng(seed);
      const n = U3.noise(seed);
      const k = 8 / S;
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const v = n(x * k, y * k) * 0.5 + 0.5 + (r() - 0.5) * (o.speckle == null ? 0.35 : o.speckle);
        g.fillStyle = colors[Math.max(0, Math.min(colors.length - 1, Math.floor(v * colors.length)))];
        g.fillRect(x, y, 1, 1);
      }
      if (o.stones) {
        const s = Math.max(1, Math.round(S / 16));
        for (let i = 0; i < o.stones; i++) {
          const x = Math.floor(r() * (S - 2 * s)), y = Math.floor(r() * (S - 2 * s));
          g.fillStyle = o.stoneDark || '#8A8274';
          g.fillRect(x, y, 2 * s, 2 * s);
          g.fillStyle = o.stoneLight || '#B4AC9C';
          g.fillRect(x, y, s, s);
        }
      }
      if (o.band) {
        g.fillStyle = o.band;
        g.fillRect(0, Math.round(S * 0.32), S, Math.max(1, Math.round(S * 0.09)));
      }
    }, { nearest: cfg.filter !== 'linear', repeat: o.repeat });
    t.userData = { size: S };
    if (cfg.filter === 'linear') { t.magFilter = T.LinearFilter; t.minFilter = T.LinearMipmapLinearFilter; }
    return t;
  };

  // ------------------------------------------------------------ materials
  let toonRamp = null;
  function ramp() {
    if (!toonRamp) {
      toonRamp = new T.DataTexture(new Uint8Array([90, 90, 90, 255, 255, 255, 255, 255]), 2, 1, T.RGBAFormat);
      toonRamp.magFilter = toonRamp.minFilter = T.NearestFilter;
      toonRamp.needsUpdate = true;
    }
    return toonRamp;
  }

  // Lambert (or toon) patched with the era's vertex and texture quirks.
  R.material = function (cfg, params, o) {
    o = o || {};
    params = Object.assign({}, params);
    if (cfg.flat || o.flat) params.flatShading = true;
    const toon = cfg.shading === 'toon' && !o.basic;
    let m;
    if (o.basic) m = new T.MeshBasicMaterial(params);
    else if (toon) m = new T.MeshToonMaterial(Object.assign({ gradientMap: ramp() }, params));
    else m = new T.MeshLambertMaterial(params);
    const snap = o.noSnap ? null : cfg.snap;
    const affine = !!cfg.affine && !!params.map;
    const three = cfg.filter === 'threepoint' && !!params.map;
    const size = params.map && params.map.userData && params.map.userData.size ? params.map.userData.size : 32;
    if (!snap && !affine && !three) return m;
    m.customProgramCacheKey = () => ['retro', snap && snap.join('x'), affine, three, size].join('|');
    m.onBeforeCompile = (sh) => {
      let vs = sh.vertexShader, fs = sh.fragmentShader;
      if (affine) { vs = 'varying vec3 vAffine;\n' + vs; fs = 'varying vec3 vAffine;\n' + fs; }
      let proj = '#include <project_vertex>';
      if (snap) {
        proj += `
        {
          vec4 p = gl_Position;
          p.xyz /= p.w;
          p.xy = floor(p.xy * vec2(${snap[0].toFixed(1)}, ${snap[1].toFixed(1)}) + 0.5) / vec2(${snap[0].toFixed(1)}, ${snap[1].toFixed(1)});
          p.xyz *= p.w;
          gl_Position = p;
        }`;
      }
      if (affine) proj += `
        #ifdef USE_MAP
          vAffine = vec3(vUv * gl_Position.w, gl_Position.w);
        #endif`;
      vs = vs.replace('#include <project_vertex>', proj);
      if (affine || three) {
        const uv = affine ? 'vAffine.xy / vAffine.z' : 'vUv';
        const sample = three ? `threePoint(map, ${uv}, vec2(${size.toFixed(1)}))` : `texture2D(map, ${uv})`;
        if (three) {
          fs = fs.replace('void main() {', `
          vec4 threePoint(sampler2D tex, vec2 uv, vec2 sz) {
            vec2 st = uv * sz - 0.5;
            vec2 i = floor(st);
            vec2 f = st - i;
            vec4 a = texture2D(tex, (i + vec2(0.5, 0.5)) / sz);
            vec4 b = texture2D(tex, (i + vec2(1.5, 0.5)) / sz);
            vec4 c = texture2D(tex, (i + vec2(0.5, 1.5)) / sz);
            vec4 d = texture2D(tex, (i + vec2(1.5, 1.5)) / sz);
            return (f.x + f.y <= 1.0) ? a + f.x * (b - a) + f.y * (c - a) : d + (1.0 - f.x) * (c - d) + (1.0 - f.y) * (b - d);
          }
          void main() {`);
        }
        fs = fs.replace('#include <map_fragment>', `
          #ifdef USE_MAP
            vec4 sampledDiffuseColor = ${sample};
            diffuseColor *= sampledDiffuseColor;
          #endif`);
      }
      sh.vertexShader = vs;
      sh.fragmentShader = fs;
    };
    return m;
  };

  // ------------------------------------------------------------ post passes
  const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
  const BAYER = `
    float bayer2(vec2 a){ a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
    float bayer4(vec2 a){ return bayer2(0.5 * a) * 0.25 + bayer2(a); }
    float bayer8(vec2 a){ return bayer4(0.5 * a) * 0.25 + bayer2(a); }`;

  // Linear → sRGB (every later pass works on display values).
  R.encodePass = () => new T.ShaderPass({
    uniforms: { tDiffuse: { value: null } },
    vertexShader: VS,
    fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb; gl_FragColor = vec4(pow(max(c, 0.0), vec3(1.0/2.2)), 1.0); }',
  });

  // Colour-depth reduction with ordered dither (PS1 15-bit, N64 16-bit…).
  R.ditherPass = (levels, strength) => new T.ShaderPass({
    uniforms: { tDiffuse: { value: null }, levels: { value: levels || 31 }, strength: { value: strength == null ? 1 : strength } },
    vertexShader: VS,
    fragmentShader: `uniform sampler2D tDiffuse; uniform float levels; uniform float strength; varying vec2 vUv; ${BAYER}
      void main(){
        vec3 c = texture2D(tDiffuse, vUv).rgb;
        float b = (bayer4(gl_FragCoord.xy) - 0.5) * strength;
        gl_FragColor = vec4(clamp(floor(c * levels + b + 0.5) / levels, 0.0, 1.0), 1.0);
      }`,
  });

  // Snap every pixel to the nearest colour of a fixed palette (Quake-style).
  R.palettePass = (hexes, o) => {
    o = o || {};
    const cols = hexes.map((h) => { const c = new T.Color(h); return new T.Vector3(c.r, c.g, c.b); });
    // THREE.Color parses hex as sRGB → linear; convert back to display values.
    cols.forEach((v) => { v.set(Math.pow(v.x, 1 / 2.2), Math.pow(v.y, 1 / 2.2), Math.pow(v.z, 1 / 2.2)); });
    return new T.ShaderPass({
      uniforms: { tDiffuse: { value: null }, pal: { value: cols }, steps: { value: o.lightSteps || 0 } },
      vertexShader: VS,
      fragmentShader: `uniform sampler2D tDiffuse; uniform vec3 pal[${cols.length}]; uniform float steps; varying vec2 vUv;
        void main(){
          vec3 c = texture2D(tDiffuse, vUv).rgb;
          if (steps > 0.0) {
            float l = max(max(c.r, c.g), c.b);
            float q = floor(l * steps + 0.5) / steps;
            c = l > 0.0 ? c * (q / l) : c;
          }
          float best = 1e9; vec3 bc = vec3(0.0);
          for (int i = 0; i < ${cols.length}; i++) {
            vec3 d = (c - pal[i]) * vec3(0.30, 0.59, 0.11);
            float e = dot(d, d) + dot(c - pal[i], c - pal[i]) * 0.15;
            if (e < best) { best = e; bc = pal[i]; }
          }
          gl_FragColor = vec4(bc, 1.0);
        }`,
    });
  };

  // 1-bit: luminance against an 8×8 Bayer threshold, two inks.
  R.oneBitPass = (ink, paper, o) => {
    o = o || {};
    const a = new T.Color(ink), b = new T.Color(paper);
    const toD = (c) => new T.Vector3(Math.pow(c.r, 1 / 2.2), Math.pow(c.g, 1 / 2.2), Math.pow(c.b, 1 / 2.2));
    return new T.ShaderPass({
      uniforms: { tDiffuse: { value: null }, ink: { value: toD(a) }, paper: { value: toD(b) }, contrast: { value: o.contrast || 1.35 }, bias: { value: o.bias || 0 } },
      vertexShader: VS,
      fragmentShader: `uniform sampler2D tDiffuse; uniform vec3 ink; uniform vec3 paper; uniform float contrast; uniform float bias; varying vec2 vUv; ${BAYER}
        void main(){
          vec3 c = texture2D(tDiffuse, vUv).rgb;
          float l = dot(c, vec3(0.299, 0.587, 0.114));
          l = clamp((l - 0.5) * contrast + 0.5 + bias, 0.0, 1.0);
          float th = bayer8(gl_FragCoord.xy);
          gl_FragColor = vec4(l > th ? paper : ink, 1.0);
        }`,
    });
  };

  // Composite video: luma kept sharp, chroma smeared sideways, a hint of
  // dot crawl. Used for Saturn and N64-era output.
  R.compositePass = (o) => {
    o = o || {};
    return new T.ShaderPass({
      uniforms: { tDiffuse: { value: null }, res: { value: new T.Vector2(320, 213) }, chroma: { value: o.chroma || 2.5 }, luma: { value: o.luma || 0.6 }, sat: { value: o.sat || 1.0 } },
      vertexShader: VS,
      fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 res; uniform float chroma; uniform float luma; uniform float sat; varying vec2 vUv;
        vec3 toYIQ(vec3 c){ return vec3(dot(c, vec3(0.299,0.587,0.114)), dot(c, vec3(0.596,-0.274,-0.322)), dot(c, vec3(0.211,-0.523,0.312))); }
        vec3 toRGB(vec3 y){ return vec3(y.x + 0.956*y.y + 0.621*y.z, y.x - 0.272*y.y - 0.647*y.z, y.x - 1.106*y.y + 1.703*y.z); }
        void main(){
          vec2 px = vec2(1.0 / res.x, 0.0);
          float Y = 0.0; vec2 IQ = vec2(0.0); float wy = 0.0; float wc = 0.0;
          for (int i = -4; i <= 4; i++) {
            float fi = float(i);
            vec3 s = toYIQ(texture2D(tDiffuse, vUv + px * fi).rgb);
            float a = exp(-fi * fi / (2.0 * luma * luma + 0.001));
            float b = exp(-fi * fi / (2.0 * chroma * chroma));
            Y += s.x * a; wy += a; IQ += s.yz * b; wc += b;
          }
          Y /= wy; IQ /= wc;
          float crawl = sin((vUv.x * res.x + vUv.y * res.y) * 3.14159) * 0.012;
          gl_FragColor = vec4(clamp(toRGB(vec3(Y + crawl, IQ * sat)), 0.0, 1.0), 1.0);
        }`,
    });
  };

  // Film grain, scanline interlace and a vignette (PS2 era).
  R.grainPass = (o) => {
    o = o || {};
    return new T.ShaderPass({
      uniforms: { tDiffuse: { value: null }, time: { value: 0 }, amount: { value: o.amount || 0.08 }, interlace: { value: o.interlace || 0 }, tint: { value: new T.Vector3().fromArray(o.tint || [1, 1, 1]) }, desat: { value: o.desat || 0 }, vignette: { value: o.vignette || 0.35 } },
      vertexShader: VS,
      fragmentShader: `uniform sampler2D tDiffuse; uniform float time; uniform float amount; uniform float interlace; uniform vec3 tint; uniform float desat; uniform float vignette; varying vec2 vUv;
        float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + time * 7.13) * 43758.5453); }
        void main(){
          vec3 c = texture2D(tDiffuse, vUv).rgb;
          float l = dot(c, vec3(0.299, 0.587, 0.114));
          c = mix(c, vec3(l), desat) * tint;
          c += (h(gl_FragCoord.xy) - 0.5) * amount;
          if (interlace > 0.0) c *= 1.0 - interlace * step(0.5, fract(gl_FragCoord.y * 0.5));
          vec2 d = vUv - 0.5;
          c *= 1.0 - dot(d, d) * vignette * 2.0;
          gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
        }`,
    });
  };

  // CRT television, drawn at full output size from the low-res frame.
  function crtMaterial() {
    return new T.ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, src: { value: new T.Vector2(384, 256) }, outRes: { value: new T.Vector2(1152, 768) }, time: { value: 0 } },
      vertexShader: VS,
      fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 src; uniform vec2 outRes; uniform float time; varying vec2 vUv;
        vec2 bend(vec2 uv){ vec2 c = uv * 2.0 - 1.0; c *= 1.0 + dot(c.yx, c.yx) * vec2(0.035, 0.05); return c * 0.5 + 0.5; }
        vec3 tap(vec2 uv){ return texture2D(tDiffuse, uv).rgb; }
        void main(){
          vec2 uv = bend(vUv);
          if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { gl_FragColor = vec4(0.02, 0.02, 0.02, 1.0); return; }
          // Horizontal phosphor bleed and a little red/blue convergence error.
          float dx = 0.6 / src.x;
          vec3 c = tap(uv) * 0.5 + tap(uv + vec2(dx, 0.0)) * 0.25 + tap(uv - vec2(dx, 0.0)) * 0.25;
          c.r = mix(c.r, tap(uv + vec2(0.9 / src.x, 0.0)).r, 0.35);
          c.b = mix(c.b, tap(uv - vec2(0.9 / src.x, 0.0)).b, 0.35);
          // Scanlines follow the source rows.
          float row = fract(uv.y * src.y);
          float scan = 0.55 + 0.45 * pow(sin(row * 3.14159), 1.6);
          c *= scan * 1.4;
          // Aperture grille.
          float m = mod(floor(gl_FragCoord.x), 3.0);
          vec3 mask = m < 1.0 ? vec3(1.0, 0.78, 0.78) : (m < 2.0 ? vec3(0.78, 1.0, 0.78) : vec3(0.78, 0.78, 1.0));
          c *= mask;
          // Glass glow and vignette.
          vec2 d = uv - 0.5;
          c *= 1.0 - dot(d, d) * 0.9;
          c += 0.012 * sin(uv.y * 900.0 + time * 40.0) * 0.5;
          // Rounded tube corners.
          vec2 q = abs(uv - 0.5) * 2.0;
          float corner = smoothstep(1.0, 0.985, pow(pow(q.x, 12.0) + pow(q.y, 12.0), 1.0 / 12.0));
          gl_FragColor = vec4(clamp(c, 0.0, 1.0) * corner, 1.0);
        }`,
    });
  }

  // ------------------------------------------------------------ scene
  // Builds the nest for one era. cfg.P is the palette; see the style files.
  R.build = function (env, cfg) {
    const P = cfg.P;
    const scene = env.scene;
    const mat = (params, o) => R.material(cfg, params, o);
    const tex = (seed, colors, o) => R.tex(cfg, seed, colors, o);
    const root = new T.Scene();
    root.background = U3.canvasTexture(4, 64, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, P.sky[0]);
      gr.addColorStop(0.75, P.sky[1]);
      gr.addColorStop(1, P.sky[2]);
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
    }, { nearest: true });
    if (cfg.fog) root.fog = new T.Fog(cfg.fog[0], cfg.fog[1], cfg.fog[2]);
    const DEPTH = 64;
    const cavs = U3.cavities(scene, { tunnelR: 10, roomR: 12 });
    const soil = U3.soilSDF(scene, cavs);
    const ts = cfg.texSize || 32;
    const rep = [1 / (ts * 1.5), 1 / (ts * 1.5)];

    const so = cfg.soilTex || {};
    const soilTex = P.soil.map((ramp, i) => tex(3 + i, ramp, { stones: so.stones === false ? 0 : [3, 6, 2][i], speckle: so.speckle, repeat: rep, stoneDark: P.stone && P.stone[0], stoneLight: P.stone && P.stone[1] }));
    const bands = U3.bandShapes(scene, cavs, { step: 3, simplify: cfg.simplify || 2.5, edge: (x, i) => Math.sin(x * 0.05 + i * 2) * 4 });
    const bandMeshes = bands.map((b) => {
      const m = new T.Mesh(U3.extrude(b.shapes, DEPTH), mat({ map: soilTex[b.index] }));
      root.add(m);
      return m;
    });
    const back = new T.Mesh(new T.PlaneGeometry(U3.W, U3.H - scene.groundY, 8, 6), mat({ map: tex(7, P.back, { repeat: [10, 6] }) }));
    back.position.set(0, U3.Y((U3.H + scene.groundY) / 2), -DEPTH);
    root.add(back);

    // Grass: crossed textured quads along the top, plus a ground strip.
    const grassTex = U3.canvasTexture(16, 16, (g) => {
      const r = U3.rng(8);
      for (let x = 0; x < 16; x++) {
        const h = 6 + Math.floor(r() * 10);
        g.fillStyle = r() < 0.5 ? P.grass[2] : P.grass[1];
        g.fillRect(x, 16 - h, 1, h);
      }
    }, { nearest: true });
    grassTex.userData = { size: 16 };
    const grassMat = mat({ map: grassTex, transparent: true, alphaTest: 0.5, side: T.DoubleSide });
    const r = U3.rng(31);
    const shaft = scene.tunnels.find((t) => t.id === 'shaft');
    for (let i = 0; i < 70; i++) {
      const x = r() * 720;
      if (x > shaft.x - 8 && x < shaft.x + shaft.w + 8) continue;
      const q = new T.Mesh(new T.PlaneGeometry(14, 12), grassMat);
      q.position.set(U3.X(x), U3.Y(scene.groundY) + 6, -r() * DEPTH);
      q.rotation.y = r() * Math.PI;
      root.add(q);
    }
    const topGrass = new T.Mesh(new T.PlaneGeometry(U3.W, DEPTH), mat({ map: tex(9, P.grass, { repeat: [20, 2] }) }));
    topGrass.rotation.x = -Math.PI / 2;
    topGrass.position.set(0, U3.Y(scene.groundY) + 0.3, -DEPTH / 2);
    root.add(topGrass);

    const lay = U3.layout(scene, soil, DEPTH);
    const creatureOpts = { segments: cfg.creatureSegments || 7, flat: cfg.flatCreatures, detail: 1 };
    const chitin = tex(12, P.chitin, { band: P.chitinBand });
    const queenTex = tex(13, P.queen, { band: P.queenBand });
    const foodM = mat({ map: tex(14, P.food) });
    const antMats = {
      worker: { body: mat({ map: chitin }), leg: mat({ color: P.leg }), food: foodM },
      queen: { body: mat({ map: queenTex }), leg: mat({ color: P.queenLeg || P.leg }), scar: mat({ color: P.scar || '#C8A888' }) },
    };
    if (P.major) antMats.major = { body: mat({ map: tex(17, P.major, { band: P.chitinBand }) }), leg: antMats.worker.leg, food: foodM };
    else antMats.major = antMats.worker;
    const creatures = new T.Group();
    root.add(creatures);
    const ants = lay.ants.map((a) => {
      const ant = U3.makeAnt(a.caste, antMats[a.caste], Object.assign({ legR: 0.6, carrying: a.carrying }, creatureOpts));
      ant.entry = a;
      U3.placeAnt(ant, a, DEPTH);
      creatures.add(ant.root);
      return ant;
    });
    const spider = U3.makeSpider({
      body: mat({ map: tex(15, P.spider, { band: P.spiderBand }) }),
      leg: mat({ color: P.spider[1] }),
      eye: mat({ color: P.eye }, { basic: true }),
    }, Object.assign({ legR: 1.2 }, creatureOpts));
    spider.root.position.set(U3.X(lay.spider.x), U3.Y(lay.spider.y) + spider.footY, lay.spider.z);
    spider.root.rotation.y = Math.PI;
    creatures.add(spider.root);
    let eyeGlow = null;
    if (cfg.eyeGlow) {
      eyeGlow = new T.PointLight(cfg.eyeGlow, 1.2, 60, 2);
      eyeGlow.position.set(U3.X(lay.spider.x) - 16, U3.Y(lay.spider.y) + spider.footY + 4, lay.spider.z + 10);
      root.add(eyeGlow);
    }
    if (cfg.outline) {
      const om = U3.outlineMaterial(cfg.outline[0], cfg.outline[1]);
      U3.addOutlines(creatures, om);
      if (cfg.outlineSoil) bandMeshes.forEach((m) => U3.addOutlines(m, U3.outlineMaterial(cfg.outline[0], cfg.outlineSoil)));
    }

    const crumb = new T.Mesh(new T.IcosahedronGeometry(5.5, 0), foodM);
    crumb.position.set(U3.X(lay.crumb.x), U3.Y(lay.crumb.y) + 4, lay.crumb.z);
    root.add(crumb);
    const eggM = mat({ map: tex(16, P.egg) });
    const eggs = lay.eggs.map((e) => {
      const m = new T.Mesh(new T.SphereGeometry(1, 6, 5), eggM);
      m.scale.set(3.4, 4.6, 3.4);
      m.position.set(U3.X(e.x), U3.Y(e.y) + 4.4 + e.row * 7, e.z);
      root.add(m);
      return m;
    });
    lay.piles.forEach((p) => {
      const m = new T.Mesh(new T.ConeGeometry(12, 16, 6), foodM);
      m.position.set(U3.X(p.x), U3.Y(p.y) + 8, p.z);
      root.add(m);
    });

    // Room lights: candle, torch or lamp, each with a flickering point light.
    const lamps = [];
    if (cfg.lamps) {
      const L = cfg.lamps;
      const body = mat({ color: L.body || '#D8C8A0' });
      const flameM = mat({ color: L.flame }, { basic: true });
      scene.rooms.forEach((rm, i) => {
        const lx = rm.x + (i % 2 ? 18 : rm.w - 18);
        const x = U3.X(lx), fy = U3.Y(U3.floorY(soil, lx, rm.y + 40));
        const tall = L.kind === 'torch' ? 16 : 9;
        const c = new T.Mesh(new T.CylinderGeometry(L.kind === 'torch' ? 1.3 : 2, 2.4, tall, 5), body);
        c.position.set(x, fy + tall / 2, -DEPTH * 0.82);
        root.add(c);
        const f = new T.Mesh(new T.OctahedronGeometry(L.kind === 'torch' ? 3 : 2.2, 0), flameM);
        f.scale.y = 1.8;
        f.position.set(x, fy + tall + 3, -DEPTH * 0.82);
        root.add(f);
        const l = new T.PointLight(L.color, L.intensity, L.range || 230, L.decay == null ? 1.3 : L.decay);
        l.position.set(x, fy + tall + 7, -DEPTH * 0.55);
        root.add(l);
        lamps.push({ f, l, i, base: L.intensity });
      });
    }

    const Lt = cfg.lights;
    root.add(new T.AmbientLight(Lt.ambient[0], Lt.ambient[1]));
    let lantern = null;
    if (Lt.lantern) { lantern = new T.PointLight(Lt.lantern[0], Lt.lantern[1], 1400, 1); root.add(lantern); }
    if (Lt.sun) {
      const sun = new T.DirectionalLight(Lt.sun[0], Lt.sun[1]);
      sun.position.set(...(Lt.sun[2] || [-200, 400, 500]));
      root.add(sun);
    }
    let flash = null;
    if (Lt.flashlight) {
      flash = new T.SpotLight(Lt.flashlight[0], Lt.flashlight[1], 1600, 0.36, 0.6, 1);
      root.add(flash);
      root.add(flash.target);
    }

    const ctx = { root, scene, soil, lay, DEPTH, mat, tex, ants, spider, creatures, P };
    if (cfg.extra) cfg.extra(ctx);

    const rig = U3.makeCamera(Object.assign({ fov: 40, pitch: 0.1, yaw: -0.14, zoom: 1.08, tz: -24 }, cfg.camera || {}));
    ctx.rig = rig;

    // ---------------------------------------------------------- post
    let composer = null, crt = null, crtQuad = null, timed = [];
    function setup(renderer, w, h) {
      const low = cfg.crt ? [cfg.crt, Math.round(cfg.crt / 1.5)] : [w, h];
      if (!composer) {
        const rtOpts = { type: T.HalfFloatType };
        if (cfg.crt) rtOpts.minFilter = rtOpts.magFilter = T.NearestFilter;
        composer = new T.EffectComposer(renderer, new T.WebGLRenderTarget(low[0], low[1], rtOpts));
        composer.addPass(new T.RenderPass(root, rig.camera));
        (cfg.prePost || []).forEach((p) => composer.addPass(p(low)));
        composer.addPass(R.encodePass());
        (cfg.post || []).forEach((f) => {
          const p = f(low);
          if (p.uniforms && p.uniforms.res) p.uniforms.res.value.set(low[0], low[1]);
          if (p.uniforms && p.uniforms.time) timed.push(p);
          composer.addPass(p);
        });
        if (cfg.crt) {
          composer.renderToScreen = false;
          crt = crtMaterial();
          crtQuad = new T.FullScreenQuad(crt);
          timed.push({ uniforms: crt.uniforms });
        }
      }
      composer.setPixelRatio(1);
      composer.setSize(low[0], low[1]);
      composer.passes.forEach((p) => { if (p.uniforms && p.uniforms.res) p.uniforms.res.value.set(low[0], low[1]); });
      if (crt) { crt.uniforms.src.value.set(low[0], low[1]); crt.uniforms.outRes.value.set(w, h); }
    }

    return {
      renderWidth: cfg.renderWidth,
      pixelated: !!cfg.pixelated,
      fps: cfg.fps || 20,
      update(t, orbit) {
        U3.animateAnts(ants, scene, t, { swing: 0.42, bob: 1.2 });
        U3.poseSpider(spider, t, { stepped: true });
        const es = 1 + 0.04 * (0.5 - 0.5 * Math.cos(t * Math.PI));
        eggs.forEach((m) => m.scale.set(3.4 * es, 4.6 * es, 3.4 * es));
        lamps.forEach((c) => {
          const fl = 0.85 + 0.15 * Math.sin(t * 11 + c.i * 3) + 0.08 * Math.sin(t * 29 + c.i);
          c.l.intensity = c.base * fl;
          c.f.scale.set(1, 1.8 * fl, 1);
        });
        if (eyeGlow) eyeGlow.intensity = 0.9 + 0.4 * Math.max(0, Math.sin(t * 1.3));
        rig.update(orbit);
        if (lantern) lantern.position.copy(rig.camera.position).multiplyScalar(0.35);
        if (flash) {
          flash.position.copy(rig.camera.position);
          flash.target.position.set(U3.X(300 + Math.sin(t * 0.7) * 60), U3.Y(230 + Math.sin(t * 0.43) * 50), -DEPTH);
        }
        timed.forEach((p) => (p.uniforms.time.value = t));
        if (cfg.onUpdate) cfg.onUpdate(ctx, t);
      },
      render(renderer, size) {
        U3.prepare(renderer, { clear: cfg.fog ? cfg.fog[0] : '#000000' });
        if (!composer || composer._w !== size.w || composer._h !== size.h) {
          setup(renderer, size.w, size.h);
          composer._w = size.w;
          composer._h = size.h;
        }
        composer.render();
        if (crtQuad) {
          crt.uniforms.tDiffuse.value = composer.readBuffer.texture;
          renderer.setRenderTarget(null);
          crtQuad.render(renderer);
        }
      },
    };
  };
})();
