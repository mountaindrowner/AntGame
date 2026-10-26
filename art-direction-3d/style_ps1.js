// PS1 — PlayStation-era 3D: 320-px framebuffer, wobbling vertex-snapped
// polygons, affine texture swim, Gouraud lighting, 15-bit dithering, fog and
// candlelight. Charming, slightly creepy, very underground.
(function () {
  const T = window.THREE, U3 = window.U3;

  const P = {
    skyTop: '#241A3A', skyLow: '#B85C36', fog: '#1A1016', grass: '#4F7A2E',
    soil: ['#6E4A2E', '#57402E', '#7A3E2A'], back: '#5A4232', ant: '#2A1A14', antHi: '#6A4A3A',
    queen: '#5E2C1E', food: '#D8A030', egg: '#E8DCC0', spider: '#2A2230', eye: '#FF2A2A', flame: '#FFC060',
  };

  const meta = {
    family: 'retro',
    label: 'PS1 retro',
    tagline: 'A lost 1998 PlayStation game: wobbling polygons, swimming textures, dithered candlelight in the tunnels and a spider you don’t want to meet.',
    refs: 'MediEvil, Ape Escape, Spyro, Bugs Bunny: Lost in Time, Puppet Combo and Haunted PS1 indies, Lunacid',
    matrix: ['MediEvil, Spyro, Haunted PS1 indies', 'Low', 'High', 'Medium', 'High'],
    palette: [
      ['Dusk', P.skyTop], ['Horizon', P.skyLow], ['Grass', P.grass], ['Topsoil', P.soil[0]], ['Packed', P.soil[1]],
      ['Clay', P.soil[2]], ['Nest wall', P.back], ['Chitin', P.ant], ['Queen', P.queen], ['Food', P.food],
      ['Spider', P.spider], ['Eye glow', P.eye], ['Candle', P.flame],
    ],
    rendering: 'Rendered at 384×256 and upscaled nearest-neighbour. Vertices snap to a coarse screen grid, textures are 32 px and mapped affinely (they swim as the camera moves), lighting is per-vertex Lambert, and a final pass reduces colour to 15-bit with a 4×4 Bayer dither. Distance fog and candle point lights.',
    motion: 'Stepped at 20 fps like a busy PS1 frame. Legs, bob and the spider twitch all run on that clock; polygons jitter as they move.',
    fit: 'Nostalgic and cheap, and the low resolution hides how simple the models are. Candlelit tunnels and a red-eyed spider give the colony stakes without gore.',
    risks: 'Retro-horror is a crowded niche, and the jitter can tire some players. At 0.6× zoom workers become a few pixels.',
    production: 'Very cheap: tiny textures, low-poly models, no post beyond one shader. Runs on anything; hides placeholder art well.',
  };

  // Low-res nearest-filtered texture from a palette and some speckle.
  function tex(seed, colors, o) {
    o = o || {};
    return U3.canvasTexture(32, 32, (g) => {
      const r = U3.rng(seed);
      const n = U3.noise(seed);
      for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
        const v = n(x * 0.25, y * 0.25) * 0.5 + 0.5 + (r() - 0.5) * 0.35;
        const c = colors[Math.max(0, Math.min(colors.length - 1, Math.floor(v * colors.length)))];
        g.fillStyle = c;
        g.fillRect(x, y, 1, 1);
      }
      if (o.stones) {
        for (let k = 0; k < o.stones; k++) {
          const x = Math.floor(r() * 30), y = Math.floor(r() * 30);
          g.fillStyle = '#8A8274';
          g.fillRect(x, y, 2, 2);
          g.fillStyle = '#B4AC9C';
          g.fillRect(x, y, 1, 1);
        }
      }
      if (o.band) {
        g.fillStyle = o.band;
        g.fillRect(0, 10, 32, 3);
      }
    }, { nearest: true, repeat: o.repeat });
  }

  // Vertex snapping + affine texture mapping, patched into Lambert.
  function psx(params) {
    const m = new T.MeshLambertMaterial(params);
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = 'varying vec3 vAffine;\n' + sh.vertexShader.replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        {
          vec4 p = gl_Position;
          p.xyz /= p.w;
          p.xy = floor(p.xy * vec2(96.0, 64.0) + 0.5) / vec2(96.0, 64.0);
          p.xyz *= p.w;
          gl_Position = p;
        }
        #ifdef USE_MAP
          vAffine = vec3(vUv * gl_Position.w, gl_Position.w);
        #endif`
      );
      sh.fragmentShader = 'varying vec3 vAffine;\n' + sh.fragmentShader.replace(
        '#include <map_fragment>',
        `#ifdef USE_MAP
          vec4 sampledDiffuseColor = texture2D( map, vAffine.xy / vAffine.z );
          diffuseColor *= sampledDiffuseColor;
        #endif`
      );
    };
    return m;
  }

  const DitherShader = {
    uniforms: { tDiffuse: { value: null }, levels: { value: 22.0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform float levels; varying vec2 vUv;
      float bayer2(vec2 a){ a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
      float bayer4(vec2 a){ return bayer2(0.5 * a) * 0.25 + bayer2(a); }
      void main(){
        vec3 c = texture2D(tDiffuse, vUv).rgb;
        c = pow(max(c, 0.0), vec3(1.0 / 2.2));
        float b = bayer4(gl_FragCoord.xy) - 0.5;
        c = floor(c * levels + b + 0.5) / levels;
        gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
      }`,
  };

  function create(env) {
    const scene = env.scene;
    const root = new T.Scene();
    root.background = U3.canvasTexture(4, 64, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, P.skyTop);
      gr.addColorStop(0.75, '#6A3A4A');
      gr.addColorStop(1, P.skyLow);
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
    }, { nearest: true });
    root.fog = new T.Fog(P.fog, 760, 1400);
    const DEPTH = 64;
    const cavs = U3.cavities(scene, { tunnelR: 10, roomR: 12 });
    const soil = U3.soilSDF(scene, cavs);
    const rep = [1 / 48, 1 / 48];

    const soilTex = [
      tex(3, ['#4E3220', '#6E4A2E', '#7E5634', '#94683E'], { stones: 3, repeat: rep }),
      tex(4, ['#4A3426', '#5E4434', '#6E5440', '#7E644C'], { stones: 6, repeat: rep }),
      tex(5, ['#5A2A1C', '#7A3E2A', '#8A4A30', '#9A5A3A'], { stones: 2, repeat: rep }),
    ];
    const bands = U3.bandShapes(scene, cavs, { step: 3, simplify: 2.5, edge: (x, i) => Math.sin(x * 0.05 + i * 2) * 4 });
    bands.forEach((b) => root.add(new T.Mesh(U3.extrude(b.shapes, DEPTH), psx({ map: soilTex[b.index] }))));
    const back = new T.Mesh(new T.PlaneGeometry(U3.W, U3.H - scene.groundY, 8, 6), psx({ map: tex(7, ['#4A3628', '#4E3A2B', '#523D2D'], { repeat: [10, 6] }) }));
    back.position.set(0, U3.Y((U3.H + scene.groundY) / 2), -DEPTH);
    root.add(back);

    // Grass: a strip of textured crossed quads along the top, PS1 billboard style.
    const grassTex = U3.canvasTexture(16, 16, (g) => {
      const r = U3.rng(8);
      for (let x = 0; x < 16; x++) {
        const h = 6 + Math.floor(r() * 10);
        g.fillStyle = r() < 0.5 ? '#4F7A2E' : '#3A5E22';
        g.fillRect(x, 16 - h, 1, h);
      }
    }, { nearest: true });
    const grassMat = psx({ map: grassTex, transparent: true, alphaTest: 0.5, side: T.DoubleSide });
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
    const topGrass = new T.Mesh(new T.PlaneGeometry(U3.W, DEPTH), psx({ map: tex(9, ['#2E4A1A', '#3A5E22', '#4F7A2E'], { repeat: [20, 2] }) }));
    topGrass.rotation.x = -Math.PI / 2;
    topGrass.position.set(0, U3.Y(scene.groundY) + 0.3, -DEPTH / 2);
    root.add(topGrass);

    const lay = U3.layout(scene, soil, DEPTH);
    const chitin = tex(12, ['#100A07', '#170E09', '#1E130C'], { band: '#8A6444' });
    const queenTex = tex(13, ['#6E3422', '#8A4630', '#9A5638'], { band: '#E0A070' });
    const foodTex = tex(14, ['#A87018', '#D8A030', '#F0C050']);
    const foodM = psx({ map: foodTex });
    const antMats = {
      worker: { body: psx({ map: chitin }), leg: psx({ color: '#140C08' }), food: foodM },
      queen: { body: psx({ map: queenTex }), leg: psx({ color: '#3A2418' }), scar: psx({ color: '#C8A888' }) },
    };
    antMats.major = antMats.worker;
    const ants = lay.ants.map((a) => {
      const ant = U3.makeAnt(a.caste, antMats[a.caste], { segments: 7, legR: 0.6, carrying: a.carrying });
      ant.entry = a;
      U3.placeAnt(ant, a, DEPTH);
      root.add(ant.root);
      return ant;
    });

    const spider = U3.makeSpider({
      body: psx({ map: tex(15, ['#1A141E', '#2A2230', '#3A3040'], { band: '#5A2A2A' }) }),
      leg: psx({ color: P.spider }),
      eye: new T.MeshBasicMaterial({ color: P.eye }),
    }, { segments: 7, legR: 1.2 });
    spider.root.position.set(U3.X(lay.spider.x), U3.Y(lay.spider.y) + spider.footY, lay.spider.z);
    spider.root.rotation.y = Math.PI;
    root.add(spider.root);
    const eyeGlow = new T.PointLight('#FF3020', 1.2, 60, 2);
    eyeGlow.position.set(U3.X(lay.spider.x) - 16, U3.Y(lay.spider.y) + spider.footY + 4, lay.spider.z + 10);
    root.add(eyeGlow);

    const crumb = new T.Mesh(new T.IcosahedronGeometry(5.5, 0), foodM);
    crumb.position.set(U3.X(lay.crumb.x), U3.Y(lay.crumb.y) + 4, lay.crumb.z);
    root.add(crumb);
    const eggM = psx({ map: tex(16, ['#C8BCA0', '#E8DCC0', '#F8F0E0']) });
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

    // Candles: a stub of wax, an unlit flame quad and a flickering point light.
    const wax = psx({ color: '#D8C8A0' });
    const flameM = new T.MeshBasicMaterial({ color: P.flame });
    const candles = [];
    scene.rooms.forEach((rm, i) => {
      const x = U3.X(rm.x + (i % 2 ? 18 : rm.w - 18)), fy = U3.Y(U3.floorY(soil, rm.x + (i % 2 ? 18 : rm.w - 18), rm.y + 40));
      const c = new T.Mesh(new T.CylinderGeometry(2, 2.4, 9, 5), wax);
      c.position.set(x, fy + 4.5, -DEPTH * 0.82);
      root.add(c);
      const f = new T.Mesh(new T.OctahedronGeometry(2.2, 0), flameM);
      f.scale.y = 1.8;
      f.position.set(x, fy + 12, -DEPTH * 0.82);
      root.add(f);
      const l = new T.PointLight('#FFA040', 3.2, 230, 1.3);
      l.position.set(x, fy + 16, -DEPTH * 0.55);
      root.add(l);
      candles.push({ f, l, i });
    });

    root.add(new T.AmbientLight('#6A5A7A', 0.7));
    // The "player lantern": a warm light riding with the camera, as PS1
    // games did to keep characters readable in the dark.
    const lantern = new T.PointLight('#FFD8A0', 0.7, 1400, 1);
    root.add(lantern);
    const moon = new T.DirectionalLight('#C8B8E8', 0.65);
    moon.position.set(-200, 400, 500);
    root.add(moon);

    const rig = U3.makeCamera({ fov: 40, pitch: 0.1, yaw: -0.14, zoom: 1.08, tz: -24 });

    let composer = null, dither = null;
    function ensureComposer(renderer, w, h) {
      if (!composer) {
        composer = new T.EffectComposer(renderer);
        composer.addPass(new T.RenderPass(root, rig.camera));
        dither = new T.ShaderPass(DitherShader);
        composer.addPass(dither);
      }
      composer.setPixelRatio(1);
      composer.setSize(w, h);
    }

    return {
      renderWidth: 384,
      pixelated: true,
      fps: 20,
      resize(w, h) { if (composer) composer.setSize(w, h); },
      update(t, orbit) {
        U3.animateAnts(ants, scene, t, { swing: 0.42, bob: 1.2 });
        U3.poseSpider(spider, t, { stepped: true });
        const es = 1 + 0.04 * (0.5 - 0.5 * Math.cos(t * Math.PI));
        eggs.forEach((m) => m.scale.set(3.4 * es, 4.6 * es, 3.4 * es));
        candles.forEach((c) => {
          const fl = 0.85 + 0.15 * Math.sin(t * 11 + c.i * 3) + 0.08 * Math.sin(t * 29 + c.i);
          c.l.intensity = 3.2 * fl;
          c.f.scale.set(1, 1.8 * fl, 1);
        });
        eyeGlow.intensity = 0.9 + 0.4 * Math.max(0, Math.sin(t * 1.3));
        rig.update(orbit);
        lantern.position.copy(rig.camera.position).multiplyScalar(0.35);
      },
      render(renderer, size) {
        U3.prepare(renderer, { clear: P.fog });
        if (!composer || composer._w !== size.w || composer._h !== size.h) {
          ensureComposer(renderer, size.w, size.h);
          composer._w = size.w;
          composer._h = size.h;
        }
        composer.render();
      },
    };
  }

  U3.register('ps1', { meta, create });
})();
