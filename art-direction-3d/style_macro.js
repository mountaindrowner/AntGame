// MACRO REALISM — a BBC-style macro shot of a real nest. Physically based
// soil, glossy chitin, a low golden key from the surface, cool fill below,
// giant grass and leaf litter overhead, and a shallow depth of field.
(function () {
  const T = window.THREE, U3 = window.U3;

  const P = {
    haze: '#E8C891', hazeHigh: '#9FB7C9', soil: ['#5A4030', '#9A7752', '#A8643E'], back: '#6A4A32',
    grass: '#6E8F3A', leaf: '#B8692E', pebble: '#8E877C', root: '#7A5E42',
    ant: '#3A1C0E', antLeg: '#4A2814', queen: '#4E2614', egg: '#F1EADB', food: '#D9A65A',
    spider: '#6A4F37', keyLight: '#FFC98A', fill: '#7FA3D6',
  };

  const meta = {
    label: 'Macro realism',
    tagline: 'A nature-documentary macro shot: real soil, glossy chitin, towering grass, and a lens so close the edges fall out of focus.',
    refs: 'Grounded, Empires of the Undergrowth, BBC Ant Mountain, Microcosmos, A Bug’s Life (lighting)',
    matrix: ['Grounded, Empires of the Undergrowth', 'High', 'Low', 'Medium', 'Medium'],
    palette: [
      ['Golden haze', P.haze], ['Sky', P.hazeHigh], ['Topsoil', P.soil[0]], ['Packed', P.soil[1]], ['Clay', P.soil[2]],
      ['Nest dark', P.back], ['Grass', P.grass], ['Leaf litter', P.leaf], ['Root', P.root],
      ['Chitin', P.ant], ['Queen', P.queen], ['Egg', P.egg], ['Seed', P.food], ['Wolf spider', P.spider],
      ['Key light', P.keyLight], ['Cool fill', P.fill],
    ],
    rendering: 'Physically based materials: procedural soil colour and bump, clearcoated chitin, sheen on the spider’s hair, an image-based studio environment for glints. ACES tone mapping, distance haze, a bokeh depth-of-field pass focused on the nest, then a photographic grade with vignette and grain.',
    motion: '60 fps. Tripod gait at 6 Hz, antennae sweep, carriers bob, grass blades sway, the spider lifts a foreleg every two seconds.',
    fit: 'Treats the colony as wildlife, which is exactly what “biology stays real” asks for. At this scale the garden feels enormous and the nest feels like somewhere.',
    risks: 'Heaviest style here: depth of field, shadows and PBR on 200 ants will need LODs and baked lighting on phones. Dark chitin on dark soil can lose caste reads at 0.6× without rim light.',
    production: 'Needs real modelling and texture work (photogrammetry soil, sculpted ants). The bokeh pass costs a second depth render; drop it to a cheap tilt-shift blur on phones.',
  };

  // Image-based lighting: a warm sky dome with a sun and a cool floor bounce.
  function studioEnv(renderer) {
    const s = new T.Scene();
    const dome = new T.Mesh(
      new T.SphereGeometry(100, 32, 16),
      new T.MeshBasicMaterial({
        side: T.BackSide,
        map: U3.canvasTexture(8, 256, (g, w, h) => {
          const gr = g.createLinearGradient(0, 0, 0, h);
          gr.addColorStop(0, '#BFD3E6');
          gr.addColorStop(0.45, '#F2D2A0');
          gr.addColorStop(0.55, '#5A4636');
          gr.addColorStop(1, '#2A2420');
          g.fillStyle = gr;
          g.fillRect(0, 0, w, h);
        }),
      })
    );
    s.add(dome);
    const sun = new T.Mesh(new T.SphereGeometry(10, 16, 8), new T.MeshBasicMaterial({ color: new T.Color(6, 4.6, 3) }));
    sun.position.set(-60, 45, 50);
    s.add(sun);
    const pm = new T.PMREMGenerator(renderer);
    const rt = pm.fromScene(s, 0.04);
    pm.dispose();
    return rt.texture;
  }

  // Grain-and-speckle detail texture shared by every soil surface.
  function soilDetail(seed) {
    const base = U3.noiseCanvas(128, seed, 0.11, 4, 0.75);
    return U3.canvasTexture(512, 512, (g, w, h) => {
      g.imageSmoothingQuality = 'high';
      g.drawImage(base, 0, 0, w, h);
      g.globalCompositeOperation = 'multiply';
      g.fillStyle = 'rgba(255,240,220,1)';
      g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'source-over';
      const r = U3.rng(seed + 9);
      for (let i = 0; i < 14000; i++) {
        const x = r() * w, y = r() * h, s = 0.4 + r() * r() * r() * 5;
        const v = r();
        g.fillStyle = v < 0.4 ? 'rgba(40,24,14,' + (0.12 + r() * 0.3) + ')' : v < 0.88 ? 'rgba(255,236,205,' + (0.1 + r() * 0.25) + ')' : 'rgba(170,160,148,' + (0.4 + r() * 0.4) + ')';
        g.beginPath();
        g.ellipse(x, y, s, s * (0.6 + r() * 0.4), r() * 3, 0, Math.PI * 2);
        g.fill();
      }
    }, { repeat: [1 / 110, 1 / 110] });
  }

  // Final grade: linear → sRGB, warm split-tone, vignette, film grain.
  const GradeShader = {
    uniforms: { tDiffuse: { value: null }, time: { value: 0 }, vignette: { value: 0.55 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: [
      'uniform sampler2D tDiffuse; uniform float time; uniform float vignette; varying vec2 vUv;',
      'float rand(vec2 c){ return fract(sin(dot(c, vec2(12.9898,78.233))) * 43758.5453); }',
      'void main(){',
      '  vec4 c = texture2D(tDiffuse, vUv);',
      '  vec3 col = LinearTosRGB(c).rgb;',
      '  float l = dot(col, vec3(0.299,0.587,0.114));',
      '  col = mix(col, col * vec3(1.04,1.0,0.94), smoothstep(0.35,0.9,l));',
      '  col = mix(col, col * vec3(0.94,0.98,1.06), 1.0 - smoothstep(0.05,0.35,l));',
      '  vec2 d = vUv - 0.5; d.x *= 1.5;',
      '  col *= mix(1.0, smoothstep(1.05, 0.25, length(d)), vignette);',
      '  col += (rand(vUv * 917.0 + time) - 0.5) * 0.035;',
      '  gl_FragColor = vec4(col, 1.0);',
      '}',
    ].join('\n'),
  };

  function create(env) {
    const scene = env.scene;
    const root = new T.Scene();
    root.fog = new T.Fog(P.haze, 1300, 3400);
    root.environment = studioEnv(env.renderer);
    const DEPTH = 80;
    const cavs = U3.cavities(scene, { tunnelR: 11, roomR: 18 });
    const n = U3.noise(77);
    const warp = (x, y) => U3.fbm(n, x * 0.03, y * 0.03, 0, 3) * 4;
    const soil = U3.soilSDF(scene, cavs, { warp, top: (x) => scene.groundY + U3.fbm(n, x * 0.02, 5, 0, 2) * 3 });
    const detail = soilDetail(31);

    const soilMat = (c) => new T.MeshStandardMaterial({ color: c, map: detail, bumpMap: detail, bumpScale: 1.6, roughness: 0.96, metalness: 0, envMapIntensity: 0.35 });

    // Soil bands with organic, slightly wavy boundaries.
    const bands = U3.bandShapes(scene, cavs, {
      step: 2, simplify: 0.5, warp, top: (x) => scene.groundY + U3.fbm(n, x * 0.02, 5, 0, 2) * 3,
      edge: (x, i) => U3.fbm(n, x * 0.015, i * 3.1, 0, 3) * 10,
    });
    bands.forEach((b) => root.add(new T.Mesh(U3.extrude(b.shapes, DEPTH, { bevel: true, bevelSize: 1.2, bevelThickness: 1.2, bevelSegments: 2 }), soilMat(P.soil[b.index]))));
    const back = new T.Mesh(new T.PlaneGeometry(U3.W + 40, U3.H - scene.groundY + 20), soilMat(P.back));
    back.position.set(0, U3.Y((U3.H + scene.groundY) / 2), -DEPTH - 0.5);
    back.geometry.attributes.uv.array.forEach((v, i, a) => { a[i] = v * (i % 2 ? (U3.H - scene.groundY) : U3.W); });
    root.add(back);

    // Background terrain: the garden floor recedes into golden haze.
    const ground = new T.Mesh(new T.PlaneGeometry(6000, 3000), new T.MeshStandardMaterial({ color: '#6B5236', map: detail, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, U3.Y(scene.groundY) - 1, -DEPTH - 1500);
    ground.geometry.attributes.uv.array.forEach((v, i, a) => { a[i] = v * (i % 2 ? 3000 : 6000); });
    root.add(ground);
    const sky = new T.Mesh(new T.PlaneGeometry(9000, 3200), new T.MeshBasicMaterial({
      fog: false,
      map: U3.canvasTexture(8, 256, (g, w, h) => {
        const gr = g.createLinearGradient(0, 0, 0, h);
        gr.addColorStop(0, '#8FAAC0');
        gr.addColorStop(0.55, '#E6C48C');
        gr.addColorStop(0.75, '#E9C98F');
        gr.addColorStop(1, '#C9A36E');
        g.fillStyle = gr;
        g.fillRect(0, 0, w, h);
      }),
    }));
    sky.position.set(0, U3.Y(scene.groundY) + 900, -3200);
    root.add(sky);

    const r = U3.rng(5);
    const shaft = scene.tunnels.find((t) => t.id === 'shaft');
    const nearShaft = (x) => x > shaft.x - 14 && x < shaft.x + shaft.w + 14;
    const groundY = U3.Y(scene.groundY);

    // Roots threading through the topsoil, broken where the nest cuts them.
    const rootMat = new T.MeshStandardMaterial({ color: P.root, roughness: 0.85, envMapIntensity: 0.3 });
    for (let k = 0; k < 9; k++) {
      let x = 30 + r() * 660, y = scene.groundY - 2;
      if (nearShaft(x)) continue;
      let dir = Math.PI / 2 + (r() - 0.5) * 0.8;
      const len = 60 + r() * 140;
      let run = [];
      const flush = () => {
        if (run.length > 3) {
          const curve = new T.CatmullRomCurve3(run.map(([a, b]) => new T.Vector3(U3.X(a), U3.Y(b), 0.4)));
          const rad = 0.9 + r() * 1.4;
          root.add(new T.Mesh(new T.TubeGeometry(curve, run.length * 2, rad, 6, false), rootMat));
        }
        run = [];
      };
      for (let s = 0; s < len; s += 4) {
        dir += (r() - 0.5) * 0.5;
        dir = Math.max(0.5, Math.min(Math.PI - 0.5, dir));
        x += Math.cos(dir) * 4;
        y += Math.sin(dir) * 4;
        if (soil(x, y) < -2.5) run.push([x, y]); else flush();
      }
      flush();
    }

    // Loose grains on every tunnel floor.
    const grainGeo = new T.IcosahedronGeometry(1, 1);
    const grains = new T.InstancedMesh(grainGeo, new T.MeshStandardMaterial({ roughness: 0.9, envMapIntensity: 0.4 }), 700);
    const m4 = new T.Matrix4(), col = new T.Color();
    let gi = 0;
    for (let tries = 0; tries < 20000 && gi < 700; tries++) {
      const x = r() * 720, y = scene.groundY + 4 + r() * 400;
      if (soil(x, y) < 1) continue;
      const fy = U3.floorY(soil, x, y);
      if (fy - y > 40) continue;
      const s = 0.6 + r() * r() * 2.6;
      m4.compose(new T.Vector3(U3.X(x), U3.Y(fy) + s * 0.5, -DEPTH + 2 + r() * (DEPTH - 4)), new T.Quaternion().setFromEuler(new T.Euler(r() * 3, r() * 3, 0)), new T.Vector3(s, s * 0.7, s));
      grains.setMatrixAt(gi, m4);
      grains.setColorAt(gi, col.set(P.soil[Math.floor(r() * 3)]).offsetHSL(0, 0, (r() - 0.4) * 0.2));
      gi++;
    }
    grains.count = gi;
    root.add(grains);

    // Surface: giant grass, pebbles, leaf litter.
    const blades = [];
    const bladeMat = new T.MeshStandardMaterial({ color: '#FFFFFF', side: T.DoubleSide, roughness: 0.55, envMapIntensity: 0.6, vertexColors: false });
    for (let i = 0; i < 90; i++) {
      const x = r() * 760 - 20;
      const back = i < 70;
      const z = back ? -DEPTH - 10 - r() * 520 : -r() * DEPTH;
      if (!back && (nearShaft(x) || Math.abs(x - 628) < 50 || Math.abs(x - 100) < 20 || Math.abs(x - 140) < 22 || Math.abs(x - 300) < 22)) continue;
      const h = back ? 120 + r() * 260 : 40 + r() * 70, w = back ? 7 + r() * 8 : 3 + r() * 3;
      const g = new T.PlaneGeometry(w, h, 1, 10);
      const bend = (r() - 0.5) * h * 0.5;
      const p = g.attributes.position;
      for (let v = 0; v < p.count; v++) {
        const yy = p.getY(v) + h / 2, f = yy / h;
        p.setX(v, p.getX(v) * (1 - f * 0.85) + bend * f * f);
        p.setZ(v, Math.sin(f * 2) * w * 0.4);
        p.setY(v, yy);
      }
      g.computeVertexNormals();
      const mat = bladeMat.clone();
      mat.color.set(P.grass).offsetHSL((r() - 0.5) * 0.05, (r() - 0.5) * 0.15, (r() - 0.5) * 0.12);
      const m = new T.Mesh(g, mat);
      m.position.set(U3.X(x), groundY - 1, z);
      m.rotation.y = r() * Math.PI;
      m.userData.ph = r() * 6;
      root.add(m);
      blades.push(m);
    }
    const pebbleMat = new T.MeshStandardMaterial({ color: P.pebble, roughness: 0.7, map: detail, bumpMap: detail, bumpScale: 0.8 });
    [[470, 26, -0.4], [215, 18, -0.75], [60, 34, -2.5], [560, 40, -3.4], [690, 22, -0.3], [390, 46, -5]].forEach(([x, s, zf], i) => {
      const g = new T.IcosahedronGeometry(1, 3);
      const p = g.attributes.position;
      for (let v = 0; v < p.count; v++) {
        const d = 1 + U3.fbm(n, p.getX(v) * 1.5 + i, p.getY(v) * 1.5, p.getZ(v) * 1.5, 3) * 0.25;
        p.setXYZ(v, p.getX(v) * d, p.getY(v) * d, p.getZ(v) * d);
      }
      g.computeVertexNormals();
      const m = new T.Mesh(g, pebbleMat);
      m.scale.set(s, s * 0.62, s * 0.9);
      m.position.set(U3.X(x), groundY + s * 0.25, zf * DEPTH * 0.5 - (zf < -1 ? DEPTH : 0));
      root.add(m);
    });
    const leafShape = new T.Shape();
    leafShape.moveTo(0, 0);
    leafShape.bezierCurveTo(18, 12, 46, 14, 70, 0);
    leafShape.bezierCurveTo(46, -14, 18, -12, 0, 0);
    [[520, -DEPTH - 60, 1.6, '#B8692E'], [190, -DEPTH - 140, 2.2, '#9C5A2A'], [-10, -DEPTH - 30, 1.4, '#C98A3C'], [640, -DEPTH - 260, 2.6, '#8E6A2E']].forEach(([x, z, s, c], i) => {
      const g = new T.ShapeGeometry(leafShape, 12);
      const p = g.attributes.position;
      for (let v = 0; v < p.count; v++) {
        const lx = p.getX(v), ly = p.getY(v);
        p.setZ(v, Math.abs(ly) * 0.35 + Math.sin(lx * 0.05 + i) * 4);
      }
      g.computeVertexNormals();
      const m = new T.Mesh(g, new T.MeshStandardMaterial({ color: c, roughness: 0.75, side: T.DoubleSide, map: detail }));
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = r() * 6;
      m.scale.setScalar(s);
      m.position.set(U3.X(x), groundY + 0.6, z);
      root.add(m);
    });

    const lay = U3.layout(scene, soil, DEPTH);

    // Crumb of bread, eggs, the seed store.
    const crumbGeo = new T.IcosahedronGeometry(1, 2);
    crumbGeo.attributes.position.array.forEach((v, i, a) => { a[i] = v * (1 + Math.sin(i * 12.9898) * 0.12); });
    crumbGeo.computeVertexNormals();
    const foodMat = new T.MeshStandardMaterial({ color: P.food, roughness: 0.85, map: detail, bumpMap: detail, bumpScale: 2 });
    const crumb = new T.Mesh(crumbGeo, foodMat);
    crumb.scale.set(7, 5.5, 6.5);
    crumb.position.set(U3.X(lay.crumb.x), U3.Y(lay.crumb.y) + 4.5, lay.crumb.z);
    root.add(crumb);
    const eggMat = new T.MeshPhysicalMaterial({ color: P.egg, roughness: 0.25, clearcoat: 0.6, sheen: 1, sheenColor: new T.Color('#FFF6E0'), emissive: '#2A2418' });
    const eggs = lay.eggs.map((e) => {
      const m = new T.Mesh(new T.SphereGeometry(1, 16, 12), eggMat);
      m.position.set(U3.X(e.x), U3.Y(e.y) + 4.4 + e.row * 7, e.z);
      m.rotation.z = r() * 2;
      root.add(m);
      return m;
    });
    const seedMat = new T.MeshPhysicalMaterial({ color: '#C48D46', roughness: 0.45, clearcoat: 0.4 });
    lay.piles.forEach((p) => {
      for (let k = 0; k < 16; k++) {
        const a = r() * Math.PI * 2, rad = r() * 9 * (1 - k / 22);
        const m = new T.Mesh(new T.SphereGeometry(1, 10, 8), seedMat);
        m.scale.set(3.4, 2.2, 2.2);
        m.position.set(U3.X(p.x) + Math.cos(a) * rad, U3.Y(p.y) + 2 + k * 0.75, p.z + Math.sin(a) * rad);
        m.rotation.set(r() * 3, r() * 3, r() * 3);
        root.add(m);
      }
    });

    // Ants: dark glossy chitin.
    const chitin = (c, rough) => new T.MeshPhysicalMaterial({ color: c, roughness: rough, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.18, envMapIntensity: 1.1 });
    const legMat = chitin(P.antLeg, 0.45);
    const antMats = {
      worker: { body: chitin(P.ant, 0.32), leg: legMat, eye: chitin('#0B0807', 0.1), food: foodMat },
      queen: { body: chitin(P.queen, 0.28), leg: legMat, eye: chitin('#0B0807', 0.1), scar: new T.MeshStandardMaterial({ color: '#C9A684', roughness: 0.5 }) },
    };
    antMats.major = antMats.worker;
    const ants = lay.ants.map((a) => {
      const ant = U3.makeAnt(a.caste, antMats[a.caste], { segments: 24, legR: 0.42, carrying: a.carrying, joints: true });
      ant.entry = a;
      U3.placeAnt(ant, a, DEPTH);
      root.add(ant.root);
      return ant;
    });

    // Wolf spider: banded legs, fuzzy sheen, glossy eyes.
    const bands3 = U3.canvasTexture(16, 128, (g, w, h) => {
      for (let y = 0; y < h; y += 16) { g.fillStyle = '#5A4230'; g.fillRect(0, y, w, 10); g.fillStyle = '#22180F'; g.fillRect(0, y + 10, w, 6); }
    });
    bands3.repeat.set(1, 2);
    const fuzz = (c, map) => new T.MeshPhysicalMaterial({ color: c, map: map || null, roughness: 0.9, sheen: 1, sheenRoughness: 0.6, sheenColor: new T.Color('#9C8466') });
    const stripe = U3.canvasTexture(128, 64, (g, w, h) => {
      g.fillStyle = '#4A3624'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#20160E'; g.fillRect(0, h * 0.16, w, h * 0.24);
      g.fillStyle = '#A08260'; g.fillRect(0, h * 0.4, w, h * 0.05);
    });
    const spider = U3.makeSpider({ body: fuzz('#FFFFFF', stripe), leg: fuzz('#FFFFFF', bands3), eye: chitin('#050404', 0.05) }, { segments: 24, legR: 1.25, joints: true });
    spider.root.position.set(U3.X(lay.spider.x), U3.Y(lay.spider.y) + spider.footY, lay.spider.z);
    spider.root.rotation.y = Math.PI;
    root.add(spider.root);

    U3.enableShadows(root);
    sky.castShadow = sky.receiveShadow = false;
    ground.castShadow = false;
    blades.forEach((b) => { b.castShadow = true; });

    // Light: low golden key, cool fill from below and in front.
    root.add(new T.HemisphereLight('#FFE2B8', '#5A6A88', 0.9));
    const key = new T.DirectionalLight(P.keyLight, 2.6);
    key.position.set(-520, 360, 420);
    U3.shadowLight(key, 2048, 520);
    root.add(key);
    const fill = new T.PointLight(P.fill, 1.0, 0, 0);
    fill.position.set(160, -260, 520);
    root.add(fill);
    // Bounce light pooled in each chamber, warm up top, cooler below.
    scene.rooms.forEach((rm) => {
      const deep = rm.y > 240;
      const l = new T.PointLight(deep ? '#C9B8A0' : '#FFC890', deep ? 0.9 : 1.1, 160, 1.6);
      l.position.set(U3.X(rm.x + rm.w / 2), U3.Y(rm.y + rm.h * 0.45), -DEPTH * 0.25);
      root.add(l);
    });

    const rig = U3.makeCamera({ fov: 30, pitch: 0.14, yaw: -0.14, zoom: 1.06, tz: -36, ty: 8 });
    const focusPoint = U3.v3(380, 250, -DEPTH * 0.2);

    const rt = new T.WebGLRenderTarget(16, 16, { type: T.HalfFloatType });
    const composer = new T.EffectComposer(env.renderer, rt);
    composer.addPass(new T.RenderPass(root, rig.camera));
    const bokeh = new T.BokehPass(root, rig.camera, { focus: 900, aperture: 0.00006, maxblur: 0.008, aspect: 1.5 });
    bokeh.needsSwap = true;
    composer.addPass(bokeh);
    const grade = new T.ShaderPass(GradeShader);
    composer.addPass(grade);

    return {
      resize(w, h) {
        composer.setSize(w, h);
      },
      update(t, orbit) {
        U3.animateAnts(ants, scene, t);
        U3.poseSpider(spider, t);
        const es = 1 + 0.04 * (0.5 - 0.5 * Math.cos(t * Math.PI));
        eggs.forEach((m) => m.scale.set(3.4 * es, 4.6 * es, 3.4 * es));
        blades.forEach((b) => { b.rotation.z = Math.sin(t * 0.9 + b.userData.ph) * 0.03; });
        rig.update(orbit);
        bokeh.uniforms.focus.value = rig.camera.position.distanceTo(focusPoint);
        grade.uniforms.time.value = (t * 7.3) % 50;
      },
      render(renderer) {
        U3.prepare(renderer, { toneMapping: T.ACESFilmicToneMapping, exposure: 1.0, clear: 0x1c140e });
        composer.render();
      },
    };
  }

  U3.register('macro', { meta, create });
})();
