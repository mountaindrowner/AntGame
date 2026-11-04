// STORYBOOK WATERCOLOR — picture-book washes on warm paper. No hard outlines:
// every wash is blurred, pooled at the edge and multiplied with paper.
// 24 fps eased; a slight squash when each tripod of legs lands.
(function () {
  const UF = window.UF;
  const cache = UF.makeCache();
  const FPS = 24;

  const C = {
    paper: '#F3EAD6',
    soil: ['#D9B98F', '#C6A276', '#B38A5E'],
    tunnel: '#6B4A33',
    room: '#7A5840',
    roomGlow: '#9C7A57',
    ant: '#3A2A22',
    water: '#7FA8C9',
    food: '#E6B85C',
    grass: '#A3B37A',
    egg: '#FBF4E4',
    letter: '#5A3F2C',
  };

  const meta = {
    label: 'Storybook',
    status: 'brief',
    tagline: 'Picture-book watercolour. Soft edges, paper texture, warm palette, no outline.',
    refs: 'Spiritfarer, Dordogne, Gris, Wandersong, Ori (soft light), Jon Klassen picture books',
    matrix: ['Spiritfarer, Gris', 'Medium', 'Low–Medium', 'Medium', 'Medium'],
    palette: [
      ['Paper', C.paper], ['Topsoil', C.soil[0]], ['Packed', C.soil[1]], ['Clay', C.soil[2]],
      ['Tunnel', C.tunnel], ['Ant', C.ant], ['Water', C.water], ['Food', C.food], ['Grass (added)', C.grass],
    ],
    type: 'Caveat 600 for hand-lettered room labels and the title (Patrick Hand as fallback).',
    motion: '24 fps, eased. Four leg poses per 6 Hz cycle; the body squashes slightly as each tripod lands. Carrying ants bob, eggs pulse.',
    risks: 'Soft edges plus 200 ants turn to mush. Test at 0.6× first.',
    notes: 'Environment edges use the full 1.5 px blur; creatures use 0.6 px so six legs survive at worker size. A sap-green for grass is the one colour added to the brief’s palette. The spider gets Klassen-style deadpan eyes.',
  };

  // ---------------------------------------------------------------- helpers
  const noise = UF.noise2(511);

  function wobblyRect(x, y, w, h, r, amp, seed) {
    const pts = UF.sampleRoundRect(x, y, w, h, r, 5);
    return UF.smoothPath(UF.wobble(pts, noise, amp, 0.045, seed, seed * 0.7), true);
  }

  function blob(cx, cy, rx, ry, amp, seed) {
    const pts = UF.sampleEllipse(cx, cy, rx, ry, 28);
    return UF.smoothPath(UF.wobble(pts, noise, amp, 0.12, seed, seed), true);
  }

  // A full-canvas layer drawn by fn, then softened.
  function washLayer(s, blurPx, fn) {
    const c = UF.canvas(UF.W * s, UF.H * s);
    const g = c.getContext('2d');
    g.setTransform(s, 0, 0, s, 0, 0);
    fn(g);
    return UF.blurCanvas(c, blurPx * s);
  }

  // Fill + pooled edge + granulation, the three marks of a wash.
  function wash(g, path, color, alpha, seed) {
    g.save();
    g.globalAlpha = alpha;
    g.fillStyle = color;
    g.fill(path);
    g.globalAlpha = alpha * 0.55;
    g.strokeStyle = color;
    g.lineWidth = 2.2;
    g.stroke(path);
    g.clip(path);
    const r = UF.rng(seed || 3);
    g.fillStyle = UF.lerpColor(color, '#3A2A22', 0.35);
    for (let i = 0; i < 260; i++) {
      g.globalAlpha = 0.05 + r() * 0.08;
      g.beginPath();
      g.arc(r() * UF.W, r() * UF.H, 0.6 + r() * 1.4, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }

  // ---------------------------------------------------------------- environment
  function env(scene, s) {
    return cache.get('env' + s, () =>
      UF.bakeRegion(s, 0, 0, UF.W, UF.H, (g) => {
        g.fillStyle = C.paper;
        g.fillRect(0, 0, UF.W, UF.H);

        // Sky: a pale water wash fading toward the ground.
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.drawImage(
          washLayer(s, 4, (w) => {
            const gr = w.createLinearGradient(0, 0, 0, 72);
            gr.addColorStop(0, 'rgba(127,168,201,0.45)');
            gr.addColorStop(1, 'rgba(127,168,201,0.05)');
            w.fillStyle = gr;
            w.fill(wobblyRect(-10, -10, UF.W + 20, 84, 0, 3, 9));
          }),
          0, 0
        );

        // Soil bands.
        g.drawImage(
          washLayer(s, 1.5, (w) => {
            scene.soil.forEach((b, i) => {
              const p = wobblyRect(-12, b.y0 - (i ? 3 : 0), UF.W + 24, b.y1 - b.y0 + 16, 0, i ? 3.5 : 1.6, 40 + i * 17);
              wash(w, p, C.soil[i], 0.9, 100 + i);
            });
            // Blooms: darker cauliflower edges where the paint pooled.
            const r = UF.rng(77);
            for (let i = 0; i < 26; i++) {
              const x = r() * UF.W, y = 90 + r() * 380;
              w.globalAlpha = 0.12;
              w.strokeStyle = C.tunnel;
              w.lineWidth = 1.2;
              w.stroke(blob(x, y, 8 + r() * 18, 5 + r() * 10, 3, i * 13));
            }
            w.globalAlpha = 1;
            // Pebbles.
            for (let i = 0; i < 18; i++) {
              const x = 20 + r() * 680, y = 230 + r() * 240;
              wash(w, blob(x, y, 3 + r() * 4, 2 + r() * 3, 1, i), '#9E8A72', 0.55, i);
            }
          }),
          0, 0
        );

        // Roots reaching into the topsoil (a reason the nest feels like a garden).
        g.drawImage(
          washLayer(s, 0.8, (w) => {
            const r = UF.rng(12);
            w.strokeStyle = '#8A6A4A';
            w.lineCap = 'round';
            [40, 210, 455, 560, 690].forEach((x0) => {
              let x = x0, y = 70;
              w.globalAlpha = 0.45;
              w.lineWidth = 1.6;
              w.beginPath();
              w.moveTo(x, y);
              for (let k = 0; k < 6; k++) {
                const nx = x + (r() - 0.5) * 14, ny = y + 8 + r() * 10;
                w.quadraticCurveTo(x + (r() - 0.5) * 10, (y + ny) / 2, nx, ny);
                x = nx; y = ny;
                w.lineWidth = Math.max(0.5, w.lineWidth - 0.2);
              }
              w.stroke();
            });
          }),
          0, 0
        );

        // Tunnels and rooms.
        g.drawImage(
          washLayer(s, 1.5, (w) => {
            w.save();
            w.beginPath();
            w.rect(0, scene.groundY - 1, UF.W, UF.H);
            w.clip();
            UF.cavities(scene).forEach((c, i) => {
              const r = c.kind === 'room' ? 26 : 11;
              const p = wobblyRect(c.x, c.y, c.w, c.h, r, 1.8, 300 + i * 31);
              wash(w, p, c.kind === 'room' ? C.room : C.tunnel, 1, 200 + i);
            });
            w.restore();
            // Warm light pooled in each room.
            scene.rooms.forEach((rm, i) => {
              const gr = w.createRadialGradient(rm.x + rm.w / 2, rm.y + rm.h * 0.62, 4, rm.x + rm.w / 2, rm.y + rm.h * 0.62, rm.w * 0.55);
              gr.addColorStop(0, 'rgba(156,122,87,0.85)');
              gr.addColorStop(1, 'rgba(156,122,87,0)');
              w.fillStyle = gr;
              w.fill(wobblyRect(rm.x + 6, rm.y + 6, rm.w - 12, rm.h - 12, 20, 1.5, 500 + i));
            });
          }),
          0, 0
        );

        // Props: food, crumb, grass.
        g.drawImage(
          washLayer(s, 1.1, (w) => {
            scene.foodPiles.forEach((p, i) => {
              const m = new Path2D();
              m.moveTo(p.x - 13, p.y + 14);
              m.quadraticCurveTo(p.x - 11, p.y - 9, p.x, p.y - 7);
              m.quadraticCurveTo(p.x + 11, p.y - 9, p.x + 13, p.y + 14);
              m.closePath();
              wash(w, m, C.food, 0.95, 600 + i);
              w.globalAlpha = 0.25;
              w.fillStyle = '#B07A3A';
              w.beginPath();
              w.ellipse(p.x + 2, p.y + 9, 10, 4, 0, 0, Math.PI * 2);
              w.fill();
              w.globalAlpha = 1;
            });
            wash(w, blob(scene.crumb.x, scene.crumb.y + 2, 6.5, 5, 1.4, 7), C.food, 0.95, 9);
            // Grass tufts along the ground, broken over the shaft.
            const r = UF.rng(5);
            w.lineCap = 'round';
            for (let x = 4; x < UF.W; x += 3 + r() * 4) {
              if (x > 340 && x < 380) continue;
              const h = 5 + r() * 9;
              w.strokeStyle = r() < 0.3 ? '#8C9E62' : C.grass;
              w.globalAlpha = 0.7;
              w.lineWidth = 1.6;
              w.beginPath();
              w.moveTo(x, 72);
              w.quadraticCurveTo(x + (r() - 0.5) * 3, 72 - h * 0.6, x + (r() - 0.5) * 6, 72 - h);
              w.stroke();
            }
            w.globalAlpha = 1;
          }),
          0, 0
        );
        g.setTransform(s, 0, 0, s, 0, 0);

        // Paper texture, multiplied at 15%.
        const paper = UF.fractalCanvas(240, 160, 33, 0.06, 1.4);
        g.save();
        g.globalCompositeOperation = 'multiply';
        g.globalAlpha = 0.15;
        g.drawImage(paper, 0, 0, UF.W, UF.H);
        g.restore();

        // Hand-lettered labels stay crisp, on top of the washes.
        g.fillStyle = C.letter;
        g.font = '600 26px Caveat, "Patrick Hand", cursive';
        g.fillText('Underfoot', 24, 36);
        g.font = '600 15px Caveat, "Patrick Hand", cursive';
        g.globalAlpha = 0.8;
        g.fillText('a nest under the garden', 128, 36);
        g.globalAlpha = 1;
        g.font = '600 17px Caveat, "Patrick Hand", cursive';
        scene.rooms.forEach((rm) => {
          const label = rm.label.toLowerCase();
          g.save();
          g.translate(rm.x + 8, rm.y - 6);
          g.rotate(-0.03);
          g.fillText(label, 0, 0);
          g.restore();
        });
      })
    );
  }

  function grain(s) {
    return cache.get('grain' + s, () => UF.grainCanvas(UF.W * s, UF.H * s, 91, 70, 255));
  }

  // ---------------------------------------------------------------- creatures
  // Soften a sprite and give it a pale halo so dark ants lift off dark tunnels,
  // the way a picture book leaves a little paper around each figure.
  function soften(canvas, s) {
    const soft = UF.blurCanvas(canvas, 0.6 * s);
    const out = UF.canvas(canvas.width, canvas.height);
    const g = out.getContext('2d');
    g.shadowColor = 'rgba(243,234,214,0.5)';
    g.shadowBlur = 3 * s;
    g.drawImage(soft, 0, 0);
    g.shadowColor = 'transparent';
    g.drawImage(soft, 0, 0);
    return out;
  }

  function drawAnt(g, b, pose, opts) {
    const phase = pose * (Math.PI / 2) + Math.PI / 2;
    const legs = UF.antLegs(b, phase, { tucked: opts.resting });
    const lw = 1.05 / b.scale + (b.scale > 1 ? 0.25 : 0);

    // Soft shadow under the feet.
    g.fillStyle = 'rgba(58,42,34,0.3)';
    g.beginPath();
    g.ellipse(-1, b.footY + 0.8, 13, 1.7, 0, 0, Math.PI * 2);
    g.fill();

    // Squash as the tripod lands (poses 0 and 2).
    if (!opts.resting && pose % 2 === 0) {
      g.translate(0, b.footY);
      g.scale(1.035, 0.94);
      g.translate(0, -b.footY);
    }

    g.lineCap = 'round';
    g.lineJoin = 'round';
    const legPath = (l) => {
      g.beginPath();
      g.moveTo(l.hip[0], l.hip[1]);
      g.quadraticCurveTo(l.knee[0], l.knee[1], l.foot[0], l.foot[1]);
      g.stroke();
    };
    g.strokeStyle = UF.lerpColor(C.ant, C.tunnel, 0.5);
    g.lineWidth = lw;
    legs.filter((l) => l.side === 1).forEach(legPath);

    g.fillStyle = C.ant;
    const ell = (o, kx, ky) => {
      g.beginPath();
      g.ellipse(o.x, o.y, o.rx * (kx || 1), o.ry * (ky || 1), 0, 0, Math.PI * 2);
      g.fill();
    };
    ell(b.abdomen);
    g.beginPath();
    g.arc(b.petiole.x, b.petiole.y, b.petiole.r, 0, Math.PI * 2);
    g.fill();
    ell(b.thorax);
    // A soft, round head: a touch larger than the anatomy.
    ell(b.head, 1.08, 1.15);

    // Wash highlight on the gaster.
    g.fillStyle = 'rgba(243,234,214,0.16)';
    g.beginPath();
    g.ellipse(b.abdomen.x + 0.5, b.abdomen.y - b.abdomen.ry * 0.4, b.abdomen.rx * 0.6, b.abdomen.ry * 0.35, -0.1, 0, Math.PI * 2);
    g.fill();

    g.strokeStyle = C.ant;
    g.lineWidth = lw;
    legs.filter((l) => l.side === 0).forEach(legPath);
    UF.antAntennae(b).forEach(([a, e, tip], i) => {
      g.globalAlpha = i ? 0.6 : 1;
      g.lineWidth = lw * 0.85;
      g.beginPath();
      g.moveTo(a[0], a[1]);
      g.quadraticCurveTo(e[0], e[1], tip[0], tip[1]);
      g.stroke();
    });
    g.globalAlpha = 1;

    if (opts.queen) {
      // Wing scars: two pale strokes on the thorax.
      g.strokeStyle = 'rgba(243,234,214,0.35)';
      g.lineWidth = 0.45;
      g.beginPath();
      g.moveTo(b.thorax.x - 0.4, b.thorax.y - b.thorax.ry * 0.55);
      g.lineTo(b.thorax.x - 1.4, b.thorax.y - b.thorax.ry * 0.95);
      g.moveTo(b.thorax.x + 0.9, b.thorax.y - b.thorax.ry * 0.6);
      g.lineTo(b.thorax.x - 0.1, b.thorax.y - b.thorax.ry * 1.0);
      g.stroke();
    }

    // Bead eye (closed for resting majors).
    const ex = b.head.x + b.head.rx * 0.35, ey = b.head.y - b.head.ry * 0.25;
    if (opts.resting) {
      g.strokeStyle = 'rgba(243,234,214,0.8)';
      g.lineWidth = 0.4;
      g.beginPath();
      g.arc(ex, ey - 0.3, 0.8, 0.2, Math.PI - 0.2);
      g.stroke();
    } else {
      const er = opts.queen ? 0.75 : 1.0;
      g.fillStyle = '#F7EFDD';
      g.beginPath();
      g.arc(ex, ey, er, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#1C140F';
      g.beginPath();
      g.arc(ex + er * 0.3, ey + er * 0.1, er * 0.6, 0, Math.PI * 2);
      g.fill();
    }

    if (opts.carrying) {
      g.fillStyle = C.food;
      g.beginPath();
      g.ellipse(b.carry.x + 0.6, b.carry.y - 0.4, b.carry.r * 1.05, b.carry.r * 0.9, 0.3, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(176,122,58,0.45)';
      g.beginPath();
      g.ellipse(b.carry.x + 1, b.carry.y + 0.6, b.carry.r * 0.7, b.carry.r * 0.4, 0, 0, Math.PI * 2);
      g.fill();
    }
  }

  function antSprite(a, pose, s) {
    return cache.get('ant' + a.key + '|' + pose + '|' + s, () => {
      const b = UF.antBody(a.caste);
      const R = a.caste === 'queen' ? 64 : a.caste === 'major' ? 34 : 26;
      const spr = UF.bakeRegion(s, Math.floor(a.x - R), Math.floor(a.y - R), R * 2, R * 2, (g) => {
        UF.orient(g, a.x, a.y, a.heading || 0);
        g.scale(b.scale, b.scale);
        drawAnt(g, b, pose, { resting: a.resting, carrying: a.carrying, queen: a.caste === 'queen' });
      });
      spr.canvas = soften(spr.canvas, s);
      return spr;
    });
  }

  function spiderSprite(scene, twitch, s) {
    return cache.get('spider' + twitch + '|' + s, () => {
      const sp = scene.spider;
      const spr = UF.bakeRegion(s, sp.x - 64, sp.y - 40, 128, 72, (g) => {
        g.translate(sp.x, sp.y);
        g.scale(-sp.facing, 1); // local +x = behind
        g.fillStyle = 'rgba(58,42,34,0.28)';
        g.beginPath();
        g.ellipse(-2, 26.5, 44, 2.6, 0, 0, Math.PI * 2);
        g.fill();
        const legs = [
          [-12, 3, -30, -16, -44, 26], [-9, 4, -22, -20, -32, 26], [-5, 5, 0, -18, 12, 26], [-2, 5, 14, -14, 32, 26],
        ];
        g.lineCap = 'round';
        const leg = ([hx, hy, kx, ky, fx, fy], lift, far) => {
          g.strokeStyle = far ? '#7A6253' : C.ant;
          g.lineWidth = far ? 1.3 : 1.7;
          g.beginPath();
          g.moveTo(hx, hy);
          g.quadraticCurveTo(kx + (far ? 3 : 0), ky - lift + (far ? 2 : 0), fx + (far ? 5 : 0) - lift * 0.5, fy - lift);
          g.stroke();
        };
        legs.forEach((l) => leg(l, 0, true));
        g.fillStyle = '#4A362B';
        g.beginPath();
        g.ellipse(11, -5, 13.5, 11.5, -0.2, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = C.ant;
        g.beginPath();
        g.arc(-9, 2, 7.5, 0, Math.PI * 2);
        g.fill();
        legs.forEach((l, i) => leg(l, i === 0 && twitch ? 6 : 0, false));
        // Deadpan eyes, looking sideways at the ants.
        [[-12.5, -1.5], [-7.5, -2.5]].forEach(([x, y]) => {
          g.fillStyle = '#F7EFDD';
          g.beginPath();
          g.ellipse(x, y, 2.4, 1.9, 0, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = '#1C140F';
          g.beginPath();
          g.arc(x - 1.2, y + 0.3, 1.05, 0, Math.PI * 2);
          g.fill();
        });
      });
      spr.canvas = soften(spr.canvas, s);
      return spr;
    });
  }

  // ---------------------------------------------------------------- draw
  function draw(ctx, scene, t) {
    const s = UF.scaleOf(ctx);
    const tq = UF.quant(t, FPS);
    const frame = Math.round(tq * FPS);
    UF.drawBaked(ctx, env(scene, s));

    // Eggs: soft ovals with a soft shadow, pulsing.
    const es = UF.eggScale(scene, tq);
    ctx.save();
    ctx.shadowColor = 'rgba(58,42,34,0.45)';
    ctx.shadowBlur = 2.2 * s;
    ctx.shadowOffsetY = 1 * s;
    ctx.fillStyle = C.egg;
    scene.eggs.forEach((e) => {
      ctx.beginPath();
      ctx.ellipse(e.x, e.y, 3.4 * es, 4.4 * es, 0.35, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    UF.creatures(scene).forEach((a) => {
      const offset = UF.hash(a.key) % 4;
      const pose = a.resting ? 0 : (frame + offset) % 4;
      const bob = a.carrying ? UF.carryBob(scene, tq) : 0;
      UF.drawBaked(ctx, antSprite(a, pose, s), 0, bob);
    });
    UF.drawBaked(ctx, spiderSprite(scene, UF.spiderTwitch(scene, tq, 0.17), s));

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.1;
    const gr = grain(s);
    ctx.drawImage(gr, 0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
  }

  UF.register('storybook', { meta, fps: FPS, draw });
})();
