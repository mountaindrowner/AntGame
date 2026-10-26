// VOXEL — the nest as a block world, Minecraft / Teardown / Cube World style.
// Terrain is a culled block mesh on a 6 px grid; creatures are voxelised at
// a finer grain so the castes stay readable.
(function () {
  const T = window.THREE, U3 = window.U3;

  const P = {
    sky: '#8EC9F2', skyLow: '#CFE9F7', grass: '#6BAA3A', grassDark: '#4E8A2A',
    soil: ['#8A5A34', '#74492B', '#94512F'], back: '#5E3D27', stone: '#8E8B86', amber: '#E0A030', root: '#B48A5C',
    ant: '#3E2416', antHead: '#2E1A10', queen: '#7A3E22', scar: '#E9D8B8', food: '#F2C230', egg: '#FFF3DC',
    spider: '#3B3346', spiderLeg: '#2A2433', eye: '#FF3B30', cloud: '#FFFFFF', flowerA: '#E8443A', flowerB: '#F4D03F',
  };

  const meta = {
    label: 'Voxel',
    tagline: 'The nest as a block world: every grain of soil is a cube you could dig out, every ant a little blocky figurine.',
    refs: 'Minecraft, Teardown, Cube World, Dragon Quest Builders, Astroneer (digging), Trove',
    matrix: ['Minecraft, Teardown, Cube World', 'Low–Medium', 'Medium–High', 'High', 'Medium'],
    palette: [
      ['Sky', P.sky], ['Grass', P.grass], ['Topsoil', P.soil[0]], ['Packed', P.soil[1]], ['Clay', P.soil[2]],
      ['Nest wall', P.back], ['Stone', P.stone], ['Amber', P.amber], ['Ant', P.ant], ['Queen', P.queen],
      ['Food', P.food], ['Spider', P.spider],
    ],
    rendering: 'Terrain is one culled block mesh (only exposed faces) on a 6 px grid with a 16×16 nearest-filtered block texture tinted per voxel. Ants and the spider are voxelised from their body parts at 1.2 px. Hemisphere fill, one soft shadow-casting sun, and a torch with a warm point light in every room.',
    motion: '60 fps. Boxy legs swing on pivots at 6 Hz like a block-game mob, carriers bob, the spider lifts a foreleg every two seconds.',
    fit: 'Digging is the core verb of an ant game, and voxels make every tunnel feel carved by hand. Players already read block worlds as editable.',
    risks: 'Strongly associated with Minecraft. At 0.6× zoom fine creature voxels shimmer; may need a coarser creature grid on phones.',
    production: 'Cheap to author (no texture painting, palette plus noise). Chunked culled meshes keep a dug-out nest fast; 200 ants want instanced voxel sprites.',
  };

  const FACES = [
    { n: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1] },
    { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
    { n: [0, 1, 0], u: [0, 0, 1], v: [1, 0, 0] },
    { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
    { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
    { n: [0, 0, -1], u: [0, 1, 0], v: [1, 0, 0] },
  ];

  // Cubes -> one geometry with per-cube colour; faces between solid cubes
  // are dropped. cells: Map "i,j,k" -> { i, j, k, c: THREE.Color }.
  // skipFace(cell, faceIndex) can hide faces the camera never sees.
  function voxelGeometry(cells, vs, origin, skipFace) {
    const pos = [], nor = [], col = [], uv = [], idx = [];
    const h = vs / 2;
    let n = 0;
    cells.forEach((cell) => {
      FACES.forEach((f, fi) => {
        const key = (cell.i + f.n[0]) + ',' + (cell.j + f.n[1]) + ',' + (cell.k + f.n[2]);
        if (cells.has(key)) return;
        if (skipFace && skipFace(cell, fi)) return;
        const cx = origin[0] + cell.i * vs, cy = origin[1] + cell.j * vs, cz = origin[2] + cell.k * vs;
        const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
        corners.forEach(([a, b], ci) => {
          pos.push(
            cx + (f.n[0] + f.u[0] * a + f.v[0] * b) * h,
            cy + (f.n[1] + f.u[1] * a + f.v[1] * b) * h,
            cz + (f.n[2] + f.u[2] * a + f.v[2] * b) * h
          );
          nor.push(f.n[0], f.n[1], f.n[2]);
          // Faces facing away from the light get a baked shade, like block games.
          const shade = fi === 2 ? 1 : fi === 3 ? 0.55 : fi === 4 ? 0.9 : 0.78;
          col.push(cell.c.r * shade, cell.c.g * shade, cell.c.b * shade);
          uv.push(ci === 1 || ci === 2 ? 1 : 0, ci >= 2 ? 1 : 0);
        });
        idx.push(n, n + 1, n + 2, n, n + 2, n + 3);
        n += 4;
      });
    });
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    return g;
  }

  function create(env) {
    const scene = env.scene;
    const root = new T.Scene();
    root.background = U3.canvasTexture(4, 256, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, P.sky);
      gr.addColorStop(0.6, P.skyLow);
      gr.addColorStop(1, P.skyLow);
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
    });
    const r = U3.rng(23);
    const noise = U3.noise(5);

    // 16×16 block texture: soft noise with a darker rim.
    const tile = U3.canvasTexture(16, 16, (g) => {
      const tr = U3.rng(9);
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        let v = 205 + tr() * 50;
        if (x === 0 || y === 0 || x === 15 || y === 15) v -= 40;
        if ((x + y * 3) % 7 === 0) v -= 25;
        g.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')';
        g.fillRect(x, y, 1, 1);
      }
    }, { nearest: true });
    const blockMat = new T.MeshStandardMaterial({ map: tile, vertexColors: true, roughness: 0.95, metalness: 0 });

    // ---- Terrain blocks.
    const V = 6, NX = 120, NY = 69, NZ = 12; // k = NZ is the back wall
    const DEPTH = NZ * V;
    const cavs = U3.cavities(scene, { tunnelR: 10, roomR: 14 });
    const soil = U3.soilSDF(scene, cavs);
    const solid = new Uint8Array(NX * NY * (NZ + 1));
    const at = (i, j, k) => (k * NY + j) * NX + i;
    for (let j = 0; j < NY; j++) {
      for (let i = 0; i < NX; i++) {
        const s = soil(i * V + V / 2, scene.groundY + j * V + V / 2) < 0 ? 1 : 0;
        for (let k = 0; k < NZ; k++) solid[at(i, j, k)] = s;
        solid[at(i, j, NZ)] = 1;
      }
    }
    // Hand-placed root strands for the topsoil front.
    const roots = new Set();
    for (let s = 0; s < 9; s++) {
      let i = Math.floor(r() * NX), j = 1;
      const len = 6 + Math.floor(r() * 12);
      for (let n = 0; n < len; n++) {
        roots.add(i + ',' + j);
        j += 1;
        if (r() < 0.4) i += r() < 0.5 ? -1 : 1;
      }
    }
    const cells = new Map();
    const C = (hex) => new T.Color(hex);
    const base = P.soil.map(C), backC = C(P.back), grassC = C(P.grass), grassD = C(P.grassDark);
    const stoneC = C(P.stone), amberC = C(P.amber), rootC = C(P.root);
    for (let k = 0; k <= NZ; k++) {
      for (let j = 0; j < NY; j++) {
        for (let i = 0; i < NX; i++) {
          if (!solid[at(i, j, k)]) continue;
          // Hidden if all six neighbours are solid (front k-1 counts as open).
          const open =
            k === 0 || !solid[at(i, j, k - 1)] || (k < NZ && !solid[at(i, j, k + 1)]) ||
            j === 0 || !solid[at(i, j - 1, k)] || (j < NY - 1 && !solid[at(i, j + 1, k)]) ||
            i === 0 || i === NX - 1 || !solid[at(i - 1, j, k)] || !solid[at(i + 1, j, k)];
          if (!open) continue;
          const y = scene.groundY + j * V + V / 2;
          const band = y < scene.soil[1].y0 ? 0 : y < scene.soil[2].y0 ? 1 : 2;
          let c;
          if (k === NZ) c = backC.clone();
          else if (j === 0) c = (r() < 0.5 ? grassC : grassD).clone();
          else {
            c = base[band].clone();
            const ore = noise(i * 0.35, j * 0.35, k * 0.35 + band * 7);
            if (band > 0 && ore > 0.68) c = stoneC.clone();
            else if (band === 2 && ore < -0.8) c = amberC.clone();
            else if (band === 0 && k === 0 && roots.has(i + ',' + j)) c = rootC.clone();
            if (j === 1 && r() < 0.35) c = grassD.clone().lerp(base[0], 0.5);
          }
          c.multiplyScalar(0.88 + r() * 0.2);
          if (k > 0 && k < NZ) c.multiplyScalar(1 - k * 0.025);
          // Flip j so +j is up in world space.
          cells.set(i + ',' + -j + ',' + -k, { i, j: -j, k: -k, c });
        }
      }
    }
    const terrain = new T.Mesh(
      voxelGeometry(cells, V, [U3.X(V / 2), U3.Y(scene.groundY + V / 2), -V / 2], (cell, fi) => fi === 5 || (fi === 3 && cell.j === -(NY - 1))),
      blockMat
    );
    terrain.castShadow = terrain.receiveShadow = true;
    root.add(terrain);

    // ---- Surface: tufts, flowers, a pebble, clouds and a square sun.
    const small = new Map();
    const sv = 2;
    const shaft = scene.tunnels.find((t) => t.id === 'shaft');
    const put = (m, x, y, z, hex) => {
      const key = x + ',' + y + ',' + z;
      m.set(key, { i: x, j: y, k: z, c: C(hex).multiplyScalar(0.9 + r() * 0.15) });
    };
    for (let n = 0; n < 150; n++) {
      const x = r() * 716;
      if (x > shaft.x - 6 && x < shaft.x + shaft.w + 6) continue;
      const ix = Math.round(U3.X(x) / sv), iz = -Math.round((r() * (DEPTH - 6)) / sv);
      const hgt = 1 + Math.floor(r() * 3);
      const flower = r() < 0.12;
      for (let y = 0; y < hgt + (flower ? 1 : 0); y++) put(small, ix, y, iz, y === hgt && flower ? (r() < 0.5 ? P.flowerA : P.flowerB) : r() < 0.5 ? P.grass : P.grassDark);
    }
    for (let x = -4; x <= 4; x++) for (let y = 0; y <= 3; y++) for (let z = -3; z <= 3; z++) {
      if ((x * x) / 20 + (y * y) / 10 + (z * z) / 10 <= 1) put(small, Math.round(U3.X(470) / sv) + x, y, -12 + z, P.stone);
    }
    const tufts = new T.Mesh(voxelGeometry(small, sv, [0, U3.Y(scene.groundY) + sv / 2, -2]), blockMat);
    tufts.castShadow = tufts.receiveShadow = true;
    root.add(tufts);

    const cloudCells = new Map();
    [[-40, 0, 7, 2], [-10, 2, 5, 2], [24, -1, 6, 2], [55, 1, 4, 1]].forEach(([cx, cy, w, h]) => {
      for (let x = -w; x <= w; x++) for (let y = 0; y <= h; y++) for (let z = -2; z <= 2; z++) {
        if (Math.abs(x) + y * 2 <= w + 1) cloudCells.set((cx + x) + ',' + (cy + y) + ',' + z, { i: cx + x, j: cy + y, k: z, c: C(P.cloud) });
      }
    });
    const clouds = new T.Mesh(voxelGeometry(cloudCells, 10, [0, 0, 0]), new T.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.92 }));
    clouds.position.set(-60, U3.Y(28), -420);
    root.add(clouds);

    // ---- Creature voxeliser: replaces core's ellipsoids and leg segments.
    const VS = 1.2;
    const matCache = new Map();
    function vmat(m) {
      if (!matCache.has(m)) {
        matCache.set(m, new T.MeshStandardMaterial({
          vertexColors: true, roughness: m.roughness == null ? 0.7 : m.roughness, metalness: 0,
          emissive: m.emissive ? m.emissive.clone() : new T.Color(0), map: tile,
        }));
      }
      return matCache.get(m);
    }
    function jitter(m, seed) {
      const c = m.color.clone();
      return c.multiplyScalar(0.85 + seed() * 0.3);
    }
    function voxelFactories(scale) {
      const vs = VS / scale;
      const vr = U3.rng(Math.floor(scale * 100));
      return {
        ellipsoid(m, rx, ry, rz) {
          const map = new Map();
          const ni = Math.ceil(rx / vs), nj = Math.ceil(ry / vs), nk = Math.ceil(rz / vs);
          for (let i = -ni; i <= ni; i++) for (let j = -nj; j <= nj; j++) for (let k = -nk; k <= nk; k++) {
            const d = (i * vs / rx) ** 2 + (j * vs / ry) ** 2 + (k * vs / rz) ** 2;
            if (d <= 1.05) map.set(i + ',' + j + ',' + k, { i, j, k, c: jitter(m, vr) });
          }
          if (!map.size) map.set('0,0,0', { i: 0, j: 0, k: 0, c: jitter(m, vr) });
          const mesh = new T.Mesh(voxelGeometry(map, vs, [0, 0, 0]), vmat(m));
          return mesh;
        },
        segment(m, a, b, rad) {
          const map = new Map();
          const len = a.distanceTo(b);
          const steps = Math.max(1, Math.ceil(len / (vs * 0.5)));
          const thick = rad * 2 > vs * 1.6;
          for (let s = 0; s <= steps; s++) {
            const p = a.clone().lerp(b, s / steps);
            const i = Math.round(p.x / vs), j = Math.round(p.y / vs), k = Math.round(p.z / vs);
            map.set(i + ',' + j + ',' + k, { i, j, k, c: jitter(m, vr) });
            if (thick) map.set(i + ',' + (j + 1) + ',' + k, { i, j: j + 1, k, c: jitter(m, vr) });
          }
          return new T.Mesh(voxelGeometry(map, vs, [0, 0, 0]), vmat(m));
        },
      };
    }
    const facs = { worker: voxelFactories(1), major: voxelFactories(1.4), queen: voxelFactories(2.4), spider: voxelFactories(1) };

    const mat = (hex, o) => Object.assign(new T.MeshStandardMaterial({ color: hex }), o || {});
    const foodM = mat(P.food);
    const antMats = {
      worker: { body: mat(P.ant, { roughness: 0.5 }), leg: mat(P.antHead), eye: mat('#111111', { roughness: 0.2 }), food: foodM },
      queen: { body: mat(P.queen, { roughness: 0.5 }), leg: mat(P.antHead), eye: mat('#111111'), scar: mat(P.scar) },
    };
    antMats.major = antMats.worker;

    const lay = U3.layout(scene, soil, DEPTH);
    const ants = lay.ants.map((a) => {
      const ant = U3.makeAnt(a.caste, antMats[a.caste], Object.assign({ legR: 0.45, carrying: a.carrying }, facs[a.caste]));
      ant.entry = a;
      U3.placeAnt(ant, a, DEPTH, { wallGap: 1.5 });
      root.add(ant.root);
      return ant;
    });

    const spider = U3.makeSpider({ body: mat(P.spider), leg: mat(P.spiderLeg), eye: mat(P.eye, { emissive: new T.Color('#801010') }) }, Object.assign({ legR: 1.0 }, facs.spider));
    spider.root.position.set(U3.X(lay.spider.x), U3.Y(lay.spider.y) + spider.footY, lay.spider.z);
    spider.root.rotation.y = Math.PI;
    root.add(spider.root);

    // Crumb, eggs, food store.
    const fv = facs.worker;
    const crumb = fv.ellipsoid(foodM, 5.5, 4.2, 5);
    crumb.position.set(U3.X(lay.crumb.x), U3.Y(lay.crumb.y) + 4, lay.crumb.z);
    root.add(crumb);
    const eggM = mat(P.egg, { roughness: 0.4 });
    const eggs = lay.eggs.map((e) => {
      const m = fv.ellipsoid(eggM, 3.4, 4.6, 3.4);
      m.position.set(U3.X(e.x), U3.Y(e.y) + 4.6 + e.row * 7, e.z);
      root.add(m);
      return m;
    });
    lay.piles.forEach((p) => {
      const map = new Map();
      for (let i = -5; i <= 5; i++) for (let j = 0; j <= 8; j++) for (let k = -4; k <= 4; k++) {
        if (Math.abs(i) / 5.5 + j / 8.5 + Math.abs(k) / 4.5 <= 1.15 && r() < 0.92) map.set(i + ',' + j + ',' + k, { i, j, k, c: C(r() < 0.25 ? '#D99A1E' : P.food).multiplyScalar(0.85 + r() * 0.25) });
      }
      const m = new T.Mesh(voxelGeometry(map, 1.6, [0, 0.8, 0]), blockMat);
      m.position.set(U3.X(p.x), U3.Y(p.y), p.z);
      root.add(m);
    });
    // Queen's bedding: a mat of straw blocks.
    const bed = new Map();
    for (let i = -22; i <= 22; i++) for (let k = -10; k <= 10; k++) {
      if ((i * i) / 500 + (k * k) / 110 <= 1) bed.set(i + ',0,' + k, { i, j: 0, k, c: C(r() < 0.5 ? '#C9A45A' : '#B08A44').multiplyScalar(0.85 + r() * 0.2) });
    }
    const bedM = new T.Mesh(voxelGeometry(bed, 2, [0, 1, 0]), blockMat);
    bedM.position.set(U3.X(scene.queen.x), U3.Y(lay.ants.find((a) => a.caste === 'queen').floor), -DEPTH * 0.58);
    root.add(bedM);

    // Torches on the back wall of every room, Minecraft-style.
    const torchCells = new Map();
    for (let j = 0; j < 4; j++) torchCells.set('0,' + j + ',0', { i: 0, j, k: 0, c: C('#6B4A2A') });
    const flameMat = new T.MeshBasicMaterial({ color: '#FFD27A' });
    const flames = [];
    scene.rooms.forEach((rm, n) => {
      const tx = U3.X(rm.x + (n % 2 ? rm.w - 16 : 16)), ty = U3.Y(rm.y + 34), tz = -DEPTH + 2;
      const stick = new T.Mesh(voxelGeometry(torchCells, 1.6, [0, 0, 0]), blockMat);
      stick.position.set(tx, ty, tz);
      root.add(stick);
      const flame = new T.Mesh(new T.BoxGeometry(3.4, 3.4, 3.4), flameMat);
      flame.position.set(tx, ty + 7, tz);
      root.add(flame);
      flames.push(flame);
      const light = new T.PointLight('#FFB45A', 1.6, 150, 1.4);
      light.position.set(tx, ty + 8, tz + 14);
      root.add(light);
      flame.userData.light = light;
    });

    U3.enableShadows(root);
    flames.forEach((f) => (f.castShadow = false));
    clouds.castShadow = false;

    root.add(new T.HemisphereLight('#E8F4FF', '#6B4A30', 0.85));
    const sun = new T.DirectionalLight('#FFF0D8', 1.4);
    sun.position.set(-300, 460, 460);
    U3.shadowLight(sun, 2048, 420);
    sun.shadow.bias = -0.0005;
    root.add(sun);

    const rig = U3.makeCamera({ fov: 28, pitch: 0.17, yaw: 0.2, zoom: 1.0, tz: -36 });

    return {
      update(t, orbit) {
        U3.animateAnts(ants, scene, t, { swing: 0.45 });
        U3.poseSpider(spider, t);
        const es = 1 + 0.04 * (0.5 - 0.5 * Math.cos(t * Math.PI));
        eggs.forEach((m) => m.scale.setScalar(es));
        flames.forEach((f, i) => { f.userData.light.intensity = 1.5 + 0.15 * Math.sin(t * 9 + i * 2) + 0.1 * Math.sin(t * 23 + i); });
        rig.update(orbit);
      },
      render(renderer) {
        U3.prepare(renderer, { toneMapping: T.ACESFilmicToneMapping, exposure: 1.05 });
        renderer.render(root, rig.camera);
      },
    };
  }

  U3.register('voxel', { meta, create });
})();
