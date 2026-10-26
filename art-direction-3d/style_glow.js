// BIOLUMINESCENT NIGHT — the nest after dark. Blue-black soil, glowing fungi
// and glow-worm threads, a luminous scent trail, ants as rim-lit silhouettes
// with bright eyes, and fireflies drifting over the grass. Bloom does the rest.
(function () {
  const T = window.THREE, U3 = window.U3;

  const P = {
    skyTop: '#060A1C', skyLow: '#16244A', soil: ['#131C33', '#0F1529', '#171230'], back: '#060912',
    rim: '#5CC8FF', fungus: '#3CF2D2', fungus2: '#B46BFF', moss: '#7CFF8A', scent: '#C6FF5E',
    ant: '#05060A', antEye: '#8AF6FF', majorEye: '#FFB45A', queenGlow: '#FF8A3D', egg: '#FFF0C2',
    food: '#FFC14D', spiderEye: '#FF3DA8', firefly: '#E8FF7A',
  };

  const meta = {
    label: 'Bioluminescent night',
    tagline: 'The nest after dark: glowing fungi, glow-worm threads and a luminous scent trail light a blue-black underworld.',
    refs: 'Ori and the Blind Forest, Hollow Knight, Spore (cell stage), Abzû, Avatar: Frontiers of Pandora',
    matrix: ['Ori, Hollow Knight', 'Medium', 'Medium', 'High', 'High'],
    palette: [
      ['Night sky', P.skyTop], ['Horizon', P.skyLow], ['Topsoil', P.soil[0]], ['Packed', P.soil[1]], ['Clay', P.soil[2]],
      ['Rim light', P.rim], ['Fungus', P.fungus], ['Spore violet', P.fungus2], ['Moss', P.moss], ['Scent', P.scent],
      ['Ant eyes', P.antEye], ['Major eyes', P.majorEye], ['Queen glow', P.queenGlow], ['Spider eyes', P.spiderEye], ['Firefly', P.firefly],
    ],
    rendering: 'Near-black materials with a fresnel rim term and emissive accents, a handful of coloured point lights from the fungi, and an Unreal-style bloom pass. Scent is an additive glowing tube with particles flowing along it.',
    motion: '60 fps. Ants walk at 6 Hz, scent motes stream from the crumb to the hatchery, fungi breathe, fireflies drift and blink.',
    fit: 'Makes the scent trail, the colony’s real language, the most visible thing on screen. Castes read by eye colour and glow: cyan workers, amber majors, a warm glowing queen.',
    risks: 'A permanently dark palette is hard to look at for 20 hours unless there is a day cycle. Bloom and point lights cost fill rate on phones.',
    production: 'Cheap models, expensive look: it lives on emissive materials and bloom, so assets are simple. Bloom at half resolution keeps it phone-safe.',
  };

  // Fresnel rim added to a standard material's emissive term.
  function rimify(mat, color, power, strength) {
    mat.userData.rim = { rimColor: { value: new T.Color(color) }, rimPower: { value: power }, rimStrength: { value: strength } };
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, mat.userData.rim);
      sh.fragmentShader = 'uniform vec3 rimColor; uniform float rimPower; uniform float rimStrength;\n' + sh.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\n  totalEmissiveRadiance += rimColor * rimStrength * pow(1.0 - saturate(dot(normalize(vViewPosition), normal)), rimPower);'
      );
    };
    mat.customProgramCacheKey = () => 'rim';
    return mat;
  }

  function dotSprite() {
    return U3.canvasTexture(64, 64, (g, w) => {
      const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.25, 'rgba(255,255,255,0.7)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, w);
    });
  }

  const FinalShader = {
    uniforms: { tDiffuse: { value: null } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: [
      'uniform sampler2D tDiffuse; varying vec2 vUv;',
      'void main(){',
      '  vec3 col = LinearTosRGB(texture2D(tDiffuse, vUv)).rgb;',
      '  vec2 d = vUv - 0.5; d.x *= 1.5;',
      '  col *= mix(0.55, 1.0, smoothstep(0.95, 0.3, length(d)));',
      '  gl_FragColor = vec4(col, 1.0);',
      '}',
    ].join('\n'),
  };

  function create(env) {
    const scene = env.scene;
    const root = new T.Scene();
    root.fog = new T.FogExp2('#0A1028', 0.00045);
    const DEPTH = 70;
    const cavs = U3.cavities(scene, { tunnelR: 11, roomR: 20 });
    const n = U3.noise(23);
    const warp = (x, y) => U3.fbm(n, x * 0.035, y * 0.035, 0, 3) * 4;
    const soil = U3.soilSDF(scene, cavs, { warp });
    const r = U3.rng(9);

    // Soil: dark, with faint mineral glints in the emissive map.
    const glints = U3.canvasTexture(256, 256, (g, w, h) => {
      g.fillStyle = '#000';
      g.fillRect(0, 0, w, h);
      const rr = U3.rng(3);
      for (let i = 0; i < 260; i++) {
        g.fillStyle = rr() < 0.7 ? 'rgba(90,170,255,' + (0.2 + rr() * 0.8) + ')' : 'rgba(170,110,255,0.9)';
        g.fillRect(rr() * w, rr() * h, 1 + rr() * 1.5, 1 + rr() * 1.5);
      }
    }, { repeat: [1 / 90, 1 / 90] });
    const bump = U3.canvasTexture(256, 256, (g, w, h) => { g.drawImage(U3.noiseCanvas(96, 41, 0.12, 4, 1.2), 0, 0, w, h); }, { repeat: [1 / 90, 1 / 90], srgb: false });
    const soilMat = (c) => rimify(new T.MeshStandardMaterial({ color: c, roughness: 0.85, bumpMap: bump, bumpScale: 1.2, emissive: '#FFFFFF', emissiveMap: glints, emissiveIntensity: 0.5 }), '#2A4C9C', 3.0, 0.35);
    const bands = U3.bandShapes(scene, cavs, { step: 2, simplify: 0.5, warp, edge: (x, i) => U3.fbm(n, x * 0.02, i * 4, 0, 2) * 8 });
    bands.forEach((b) => root.add(new T.Mesh(U3.extrude(b.shapes, DEPTH, { bevel: true, bevelSize: 1.4, bevelThickness: 1.4 }), soilMat(P.soil[b.index]))));
    const back = new T.Mesh(new T.PlaneGeometry(U3.W + 40, U3.H - scene.groundY + 20), new T.MeshStandardMaterial({ color: P.back, roughness: 1, bumpMap: bump, bumpScale: 1 }));
    back.geometry.attributes.uv.array.forEach((v, i, a) => { a[i] = v * (i % 2 ? 430 : 760); });
    back.position.set(0, U3.Y((U3.H + scene.groundY) / 2), -DEPTH - 0.5);
    root.add(back);

    // Night sky with stars, and a dark garden floor running back.
    const sky = new T.Mesh(new T.PlaneGeometry(9000, 3600), new T.MeshBasicMaterial({
      fog: false,
      map: U3.canvasTexture(512, 512, (g, w, h) => {
        const gr = g.createLinearGradient(0, 0, 0, h);
        gr.addColorStop(0, P.skyTop);
        gr.addColorStop(0.7, P.skyLow);
        gr.addColorStop(1, '#22305A');
        g.fillStyle = gr;
        g.fillRect(0, 0, w, h);
        const rr = U3.rng(8);
        for (let i = 0; i < 500; i++) {
          g.fillStyle = 'rgba(220,235,255,' + (0.2 + rr() * 0.8) + ')';
          const s = rr() < 0.92 ? 0.7 : 1.6;
          g.fillRect(rr() * w, rr() * h * 0.75, s, s);
        }
      }),
    }));
    sky.position.set(0, U3.Y(scene.groundY) + 1200, -3000);
    root.add(sky);
    const floor = new T.Mesh(new T.PlaneGeometry(6000, 3000), new T.MeshStandardMaterial({ color: '#0B1020', roughness: 1 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, U3.Y(scene.groundY) - 1, -DEPTH - 1500);
    root.add(floor);

    // Grass silhouettes with a cold rim.
    const grassMat = rimify(new T.MeshStandardMaterial({ color: '#0A1426', roughness: 0.6, side: T.DoubleSide }), P.rim, 2.0, 0.9);
    const shaft = scene.tunnels.find((t) => t.id === 'shaft');
    const groundY = U3.Y(scene.groundY);
    for (let i = 0; i < 120; i++) {
      const x = r() * 760 - 20;
      const z = i < 90 ? -DEPTH - r() * 400 : -r() * DEPTH;
      if (z > -DEPTH && (Math.abs(x - 360) < 20 || Math.abs(x - 628) < 46 || Math.abs(x - 140) < 18 || Math.abs(x - 300) < 18 || Math.abs(x - 100) < 12)) continue;
      const h = z < -DEPTH ? 50 + r() * 160 : 18 + r() * 40, w = 2.5 + r() * 4;
      const g = new T.PlaneGeometry(w, h, 1, 6);
      const bend = (r() - 0.5) * h * 0.6;
      const p = g.attributes.position;
      for (let v = 0; v < p.count; v++) {
        const yy = p.getY(v) + h / 2, f = yy / h;
        p.setX(v, p.getX(v) * (1 - f * 0.9) + bend * f * f);
        p.setY(v, yy);
      }
      g.computeVertexNormals();
      const m = new T.Mesh(g, grassMat);
      m.position.set(U3.X(x), groundY - 1, z);
      m.rotation.y = r() * Math.PI;
      root.add(m);
    }

    // Glowing fungi on floors, glow-worm threads from ceilings, moss.
    const breathing = [];
    const emissive = (c, k) => new T.MeshStandardMaterial({ color: '#000000', emissive: c, emissiveIntensity: k || 1.6, roughness: 0.5 });
    const stemMat = new T.MeshStandardMaterial({ color: '#1B2A30', emissive: '#1D6E66', emissiveIntensity: 0.6, roughness: 0.6 });
    const capA = emissive(P.fungus, 1.8), capB = emissive(P.fungus2, 1.8), mossMat = emissive(P.moss, 1.2);
    breathing.push(capA, capB, mossMat);
    const capGeo = new T.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const mushroom = (x, y, z, s, mat) => {
      const gr = new T.Group();
      const stem = new T.Mesh(new T.CylinderGeometry(0.35, 0.5, 2.2, 8), stemMat);
      stem.position.y = 1.1;
      const cap = new T.Mesh(capGeo, mat);
      cap.scale.set(1.3, 0.8, 1.3);
      cap.position.y = 2.1;
      gr.add(stem, cap);
      gr.scale.setScalar(s);
      gr.position.set(U3.X(x), U3.Y(y), z);
      gr.rotation.z = (r() - 0.5) * 0.3;
      root.add(gr);
    };
    const ceilY = (x, y) => { for (let yy = y; yy > 0; yy -= 0.5) if (soil(x, yy) < 0) return yy; return y; };
    const clusters = [[205, 222], [330, 222], [520, 222], [585, 222], [160, 352], [300, 352], [525, 352], [580, 352], [372, 400], [140, 222]];
    clusters.forEach(([cx, cy], i) => {
      const k = 3 + Math.floor(r() * 4);
      for (let j = 0; j < k; j++) {
        const x = cx + (r() - 0.5) * 16;
        const fy = U3.floorY(soil, x, cy - 8);
        mushroom(x, fy, -DEPTH + 4 + r() * 18, 2.2 + r() * 2.4, i % 3 === 2 ? capB : capA);
      }
    });
    const lights = [];
    [[205, 214, P.fungus], [520, 214, P.fungus], [300, 344, P.fungus2], [560, 344, P.fungus], [366, 392, P.fungus2]].forEach(([x, y, c]) => {
      const l = new T.PointLight(c, 1.4, 140, 1.8);
      l.position.set(U3.X(x), U3.Y(y), -DEPTH + 18);
      root.add(l);
      lights.push(l);
    });
    const threadMat = new T.MeshBasicMaterial({ color: '#7FD9FF', transparent: true, opacity: 0.35 });
    const beadMat = emissive('#9FF4FF', 2.4);
    breathing.push(beadMat);
    for (let i = 0; i < 70; i++) {
      const x = 130 + r() * 470, y = scene.groundY + 30 + r() * 300;
      if (soil(x, y) < 3) continue;
      const cy = ceilY(x, y);
      if (y - cy > 60 || cy < scene.groundY + 4) continue;
      const len = 6 + r() * 18, z = -DEPTH + 6 + r() * (DEPTH - 14);
      const th = new T.Mesh(new T.CylinderGeometry(0.15, 0.15, len, 3), threadMat);
      th.position.set(U3.X(x), U3.Y(cy) - len / 2, z);
      root.add(th);
      const b = new T.Mesh(new T.SphereGeometry(0.75, 8, 6), beadMat);
      b.position.set(U3.X(x), U3.Y(cy) - len, z);
      root.add(b);
    }
    const moss = new T.InstancedMesh(new T.IcosahedronGeometry(1, 0), mossMat, 500);
    const m4 = new T.Matrix4();
    let mi = 0;
    for (let tries = 0; tries < 15000 && mi < 500; tries++) {
      const x = r() * 720, y = scene.groundY + 6 + r() * 400;
      if (soil(x, y) < 1) continue;
      const fy = U3.floorY(soil, x, y);
      if (fy - y > 30) continue;
      const s = 0.4 + r() * 0.9;
      m4.compose(new T.Vector3(U3.X(x), U3.Y(fy) + s * 0.3, -DEPTH + 1 + r() * (DEPTH - 2)), new T.Quaternion(), new T.Vector3(s, s * 0.5, s));
      moss.setMatrixAt(mi++, m4);
    }
    moss.count = mi;
    root.add(moss);

    const lay = U3.layout(scene, soil, DEPTH);

    // Scent trail: a glowing thread plus motes streaming along it.
    const trailPts = scene.scentTrail.map((p, i) => new T.Vector3(U3.X(p.x), U3.Y(i === 0 || i === 1 ? scene.groundY - 3 : p.y + 6), -DEPTH * 0.42));
    const path = new T.CurvePath();
    for (let i = 0; i < trailPts.length - 1; i++) path.add(new T.LineCurve3(trailPts[i], trailPts[i + 1]));
    const tube = new T.Mesh(new T.TubeGeometry(path, 200, 0.9, 6, false), new T.MeshBasicMaterial({ color: P.scent, transparent: true, opacity: 0.55, blending: T.AdditiveBlending, depthWrite: false }));
    root.add(tube);
    const MOTES = 140;
    const moteGeo = new T.BufferGeometry();
    moteGeo.setAttribute('position', new T.Float32BufferAttribute(new Float32Array(MOTES * 3), 3));
    const motes = new T.Points(moteGeo, new T.PointsMaterial({ color: P.scent, size: 7, map: dotSprite(), transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
    const moteSeed = Array.from({ length: MOTES }, () => [r(), (r() - 0.5) * 3, (r() - 0.5) * 3]);
    root.add(motes);

    // Fireflies over the grass.
    const FLIES = 36;
    const flyGeo = new T.BufferGeometry();
    flyGeo.setAttribute('position', new T.Float32BufferAttribute(new Float32Array(FLIES * 3), 3));
    const flyMat = new T.PointsMaterial({ color: P.firefly, size: 10, map: dotSprite(), transparent: true, depthWrite: false, blending: T.AdditiveBlending });
    const flies = new T.Points(flyGeo, flyMat);
    const flySeed = Array.from({ length: FLIES }, () => [r() * 760 - 20, 8 + r() * 60, -DEPTH - r() * 300 + 40, r() * 6]);
    root.add(flies);

    // Crumb, eggs, food: all faintly luminous.
    const crumb = new T.Mesh(new T.DodecahedronGeometry(5, 1), emissive(P.food, 0.7));
    crumb.position.set(U3.X(lay.crumb.x), U3.Y(lay.crumb.y) + 4, lay.crumb.z);
    root.add(crumb);
    const eggMat = new T.MeshStandardMaterial({ color: '#2A2418', emissive: P.egg, emissiveIntensity: 0.9, roughness: 0.4 });
    const eggs = lay.eggs.map((e) => {
      const m = new T.Mesh(new T.SphereGeometry(1, 14, 10), eggMat);
      m.position.set(U3.X(e.x), U3.Y(e.y) + 4.4 + e.row * 7, e.z);
      root.add(m);
      return m;
    });
    const seedMat = emissive(P.food, 0.9);
    lay.piles.forEach((p) => {
      for (let k = 0; k < 10; k++) {
        const a = r() * 6.28, rad = r() * 8 * (1 - k / 14);
        const m = new T.Mesh(new T.SphereGeometry(1, 8, 6), seedMat);
        m.scale.set(3, 2, 2);
        m.position.set(U3.X(p.x) + Math.cos(a) * rad, U3.Y(p.y) + 2 + k * 1.1, p.z + Math.sin(a) * rad);
        root.add(m);
      }
    });
    const pileLight = new T.PointLight(P.food, 0.9, 120, 2);
    pileLight.position.set(U3.X(220), U3.Y(330), -DEPTH * 0.3);
    root.add(pileLight);

    // Ants: rim-lit silhouettes, eyes by caste, the queen's gaster glowing.
    const antBody = rimify(new T.MeshStandardMaterial({ color: P.ant, roughness: 0.35, metalness: 0.2 }), P.rim, 2.2, 1.1);
    const majorBody = rimify(new T.MeshStandardMaterial({ color: P.ant, roughness: 0.35, metalness: 0.2 }), '#7FA8FF', 2.2, 1.0);
    const antMats = {
      worker: { body: antBody, leg: antBody, eye: emissive(P.antEye, 2.2), food: emissive(P.food, 1.4) },
      major: { body: majorBody, leg: majorBody, eye: emissive(P.majorEye, 2.4), food: emissive(P.food, 1.4) },
      queen: { body: rimify(new T.MeshStandardMaterial({ color: '#120A08', roughness: 0.4 }), '#FFB070', 2.0, 1.2), leg: antBody, eye: emissive('#FFD08A', 2.2), scar: emissive('#FFE2B0', 1.4) },
    };
    const queenGlow = new T.MeshStandardMaterial({ color: '#1A0C06', emissive: P.queenGlow, emissiveIntensity: 1.25, roughness: 0.4 });
    breathing.push(queenGlow);
    const ants = lay.ants.map((a) => {
      const ant = U3.makeAnt(a.caste, antMats[a.caste], { segments: 18, legR: 0.45, carrying: a.carrying });
      if (a.caste === 'queen') ant.parts.abdomen.material = queenGlow;
      ant.entry = a;
      U3.placeAnt(ant, a, DEPTH);
      root.add(ant.root);
      return ant;
    });
    const queenLight = new T.PointLight(P.queenGlow, 1.6, 150, 1.8);
    queenLight.position.set(U3.X(430), U3.Y(196), -DEPTH * 0.3);
    root.add(queenLight);

    // Spider: a black shape with hot pink eyes and a violet edge.
    const spBody = rimify(new T.MeshStandardMaterial({ color: '#05030A', roughness: 0.5 }), '#B46BFF', 2.0, 1.1);
    const spider = U3.makeSpider({ body: spBody, leg: spBody, eye: emissive(P.spiderEye, 3) }, { segments: 20, legR: 1.2, joints: true });
    spider.root.position.set(U3.X(lay.spider.x), U3.Y(lay.spider.y) + spider.footY, lay.spider.z);
    spider.root.rotation.y = Math.PI;
    root.add(spider.root);

    // Moonlight from behind and above: edges only.
    root.add(new T.AmbientLight('#1A2448', 0.6));
    const moon = new T.DirectionalLight('#7FA8FF', 0.7);
    moon.position.set(200, 500, -400);
    root.add(moon);
    const front = new T.DirectionalLight('#2A3C7A', 0.35);
    front.position.set(-100, 120, 600);
    root.add(front);

    const rig = U3.makeCamera({ fov: 30, pitch: 0.12, yaw: 0.1, zoom: 1.04, tz: -30 });

    const composer = new T.EffectComposer(env.renderer);
    composer.addPass(new T.RenderPass(root, rig.camera));
    const bloom = new T.UnrealBloomPass(new T.Vector2(256, 256), 1.25, 0.2, 0.42);
    composer.addPass(bloom);
    composer.addPass(new T.ShaderPass(FinalShader));

    return {
      resize(w, h) { composer.setSize(w, h); },
      update(t, orbit) {
        U3.animateAnts(ants, scene, t);
        U3.poseSpider(spider, t);
        const es = 1 + 0.04 * (0.5 - 0.5 * Math.cos(t * Math.PI));
        eggs.forEach((m) => m.scale.set(3.4 * es, 4.6 * es, 3.4 * es));
        breathing.forEach((m, i) => { m.emissiveIntensity = m.userData.base || (m.userData.base = m.emissiveIntensity); m.emissiveIntensity = m.userData.base * (0.85 + 0.15 * Math.sin(t * 1.3 + i)); });
        lights.forEach((l, i) => { l.intensity = 1.4 * (0.85 + 0.15 * Math.sin(t * 1.3 + i * 2)); });
        const pos = moteGeo.attributes.position;
        const L = path.getLength();
        moteSeed.forEach(([u, ox, oy], i) => {
          const f = (u + t * 40 / L) % 1;
          const p = path.getPointAt(f);
          pos.setXYZ(i, p.x + ox, p.y + oy + Math.sin(t * 3 + i) * 0.8, p.z + ox);
        });
        pos.needsUpdate = true;
        const fp = flyGeo.attributes.position;
        flySeed.forEach(([x, y, z, ph], i) => {
          fp.setXYZ(i, U3.X(x) + Math.sin(t * 0.5 + ph) * 18, groundY + y + Math.sin(t * 0.8 + ph * 2) * 8, z + Math.cos(t * 0.4 + ph) * 14);
        });
        fp.needsUpdate = true;
        flyMat.opacity = 0.75 + 0.25 * Math.sin(t * 2.1);
        rig.update(orbit);
      },
      render(renderer) {
        U3.prepare(renderer, { toneMapping: T.ACESFilmicToneMapping, exposure: 1.05, clear: 0x050814 });
        composer.render();
      },
    };
  }

  U3.register('glow', { meta, create });
})();
