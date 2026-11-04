// CUT-PAPER DIORAMA — construction paper, scissors and split pins.
// Every piece gets a 1 px lighter top edge and a drop shadow below. Soil is
// three stacked sheets; tunnels are holes showing a dark backing sheet.
// 12 fps; ants rock on a pin and their legs are two scissoring strips.
(function () {
  const UF = window.UF;
  const cache = UF.makeCache();
  const FPS = 12;

  const C = {
    sand: '#E8D9B8',
    sheets: ['#9C6A44', '#8B5E3C', '#77502F'],
    backing: '#3A271A',
    roomBacking: '#55392A',
    felt: '#6DA34D',
    card: '#1A1613',
    eye: '#FFFFFF',
    food: '#F0A040',
    egg: '#F7F1E3',
    index: '#FBF8EF',
    rule: '#A9C1DC',
    redRule: '#D9786E',
    pen: '#2E2A44',
    brass: '#C9A54A',
  };

  const meta = {
    label: 'Cut-paper',
    status: 'brief',
    tagline: 'A construction-paper diorama: layered sheets, drop shadows, felt and card.',
    refs: 'Paper Mario (TTYD), Tearaway, Yoshi’s Crafted World, Lumino City, LittleBigPlanet',
    matrix: ['Paper Mario, Tearaway', 'Medium', 'Medium', 'High', 'Medium'],
    palette: [
      ['Sand paper', C.sand], ['Soil sheet 1', C.sheets[0]], ['Soil sheet 2', C.sheets[1]], ['Soil sheet 3', C.sheets[2]],
      ['Backing', C.backing], ['Felt grass', C.felt], ['Black card', C.card], ['Orange card', C.food], ['Index card', C.index],
      ['Split pin (added)', C.brass],
    ],
    type: 'Patrick Hand on index cards (blue rules, red margin) held on with a strip of tape.',
    motion: '12 fps. Ants rock ±2.5° on a pin at the thorax; legs are two strips that scissor open and shut. Spider lifts one leg strip every 2 s.',
    risks: 'Twee. Props are kept minimal so the material does the work.',
    notes: 'Each soil sheet’s hand-cut bottom edge casts its shadow onto the sheet below. Brass split pins mark every pivot; they are the one colour added to the brief.',
  };

  const noise = UF.noise2(808);

  // Scissor-cut outline: straight facets with a little jitter.
  function cutRect(x, y, w, h, r, seed, step) {
    const pts = UF.sampleRoundRect(x, y, w, h, r, step || 9);
    const rr = UF.rng(seed);
    return UF.polyPath(pts.map(([px, py]) => [px + (rr() - 0.5) * 1.4, py + (rr() - 0.5) * 1.4]), true);
  }

  // A sheet spanning the width, with hand-cut top and bottom edges.
  function sheetPath(y0, y1, seed) {
    const rr = UF.rng(seed);
    const top = [], bot = [];
    const ty = () => y0 + (rr() - 0.5) * (y0 > 75 ? 5 : 1.2);
    for (let x = -20; x < UF.W + 20; x += 22 + rr() * 16) top.push([x, ty()]);
    top.push([UF.W + 20, ty()]);
    for (let x = UF.W + 20; x > -20; x -= 22 + rr() * 16) bot.push([x, y1 + (rr() - 0.5) * 5]);
    bot.push([-20, y1]);
    return UF.polyPath(top.concat(bot), true);
  }

  // Paper fibres: short pale and dark strokes, multiplied over everything.
  function fibreCanvas(s) {
    return cache.get('fibre' + s, () => {
      const c = UF.canvas(UF.W * s, UF.H * s);
      const g = c.getContext('2d');
      g.fillStyle = '#FFFFFF';
      g.fillRect(0, 0, c.width, c.height);
      g.drawImage(UF.grainCanvas(c.width / 2, c.height / 2, 21, 170, 255), 0, 0, c.width, c.height);
      const r = UF.rng(4);
      g.lineCap = 'round';
      for (let i = 0; i < 2600; i++) {
        const x = r() * c.width, y = r() * c.height, a = r() * Math.PI, l = (3 + r() * 9) * s;
        g.strokeStyle = r() < 0.5 ? 'rgba(120,100,80,0.5)' : 'rgba(255,255,255,0.9)';
        g.lineWidth = 0.6 * s;
        g.beginPath();
        g.moveTo(x, y);
        g.quadraticCurveTo(x + Math.cos(a + 0.5) * l * 0.5, y + Math.sin(a + 0.5) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
        g.stroke();
      }
      return c;
    });
  }

  // Composite a silhouette layer as a paper piece: lighter rim 1 px above,
  // drop shadow below, then the piece itself.
  function placePiece(g, layer, s, x, y, w, h, shadowPx) {
    const rim = UF.canvas(layer.width, layer.height);
    const rg = rim.getContext('2d');
    rg.drawImage(layer, 0, 0);
    rg.globalCompositeOperation = 'source-atop';
    rg.fillStyle = 'rgba(255,255,255,0.32)';
    rg.fillRect(0, 0, rim.width, rim.height);
    g.save();
    g.shadowColor = 'rgba(25,15,8,0.42)';
    g.shadowOffsetY = (shadowPx || 3) * s;
    g.shadowBlur = 2.5 * s;
    g.drawImage(rim, x, y - 1, w, h);
    g.restore();
    g.drawImage(layer, x, y, w, h);
  }

  function fullLayer(s, fn) {
    const c = UF.canvas(UF.W * s, UF.H * s);
    const g = c.getContext('2d');
    g.setTransform(s, 0, 0, s, 0, 0);
    fn(g);
    return c;
  }

  // ---------------------------------------------------------------- environment
  function env(scene, s) {
    return cache.get('env' + s, () =>
      UF.bakeRegion(s, 0, 0, UF.W, UF.H, (g) => {
        g.fillStyle = C.sand;
        g.fillRect(0, 0, UF.W, UF.H);

        const holes = UF.cavities(scene).map((c, i) =>
          cutRect(c.x, c.y, c.w, c.h, c.kind === 'room' ? 22 : 10, 900 + i, c.kind === 'room' ? 11 : 8)
        );

        // Backing sheet, with lighter paper behind each room.
        g.fillStyle = C.backing;
        g.fillRect(0, scene.groundY, UF.W, UF.H - scene.groundY);
        scene.rooms.forEach((rm, i) => {
          g.fillStyle = C.roomBacking;
          g.fill(cutRect(rm.x - 4, rm.y - 3, rm.w + 8, rm.h + 4, 24, 700 + i));
        });

        // Three soil sheets, back to front, each with the nest cut through it.
        const sheets = [
          { y0: 343, y1: 492, color: C.sheets[2], seed: 31 },
          { y0: 214, y1: 356, color: C.sheets[1], seed: 32 },
          { y0: scene.groundY, y1: 226, color: C.sheets[0], seed: 33 },
        ];
        sheets.forEach((sh) => {
          const layer = fullLayer(s, (lg) => {
            lg.fillStyle = sh.color;
            lg.fill(sheetPath(sh.y0, sh.y1, sh.seed));
            // Pressed-in specks of a darker paper.
            const r = UF.rng(sh.seed);
            lg.fillStyle = UF.lerpColor(sh.color, '#000000', 0.12);
            for (let i = 0; i < 30; i++) {
              lg.beginPath();
              lg.ellipse(r() * UF.W, sh.y0 + 10 + r() * (sh.y1 - sh.y0 - 20), 1 + r() * 3, 0.8 + r() * 2, r() * 3, 0, Math.PI * 2);
              lg.fill();
            }
            lg.globalCompositeOperation = 'destination-out';
            lg.save();
            lg.beginPath();
            lg.rect(0, scene.groundY - 30, UF.W, UF.H + 40);
            lg.clip();
            holes.forEach((h) => lg.fill(h));
            lg.restore();
          });
          placePiece(g, layer, s, 0, 0, UF.W, UF.H, 3.5);
        });

        // Felt grass strip with a gap over the shaft.
        const felt = fullLayer(s, (lg) => {
          const r = UF.rng(55);
          lg.fillStyle = C.felt;
          [[-6, 344], [376, UF.W + 6]].forEach(([x0, x1]) => {
            const p = new Path2D();
            p.moveTo(x0, 74);
            for (let x = x0; x <= x1; x += 3) p.lineTo(x, 64 + noise(x * 0.08, 3) * 2.5 + (r() - 0.5) * 1.6);
            p.lineTo(x1, 74);
            p.closePath();
            lg.fill(p);
          });
          // Felt fuzz.
          lg.strokeStyle = '#86BA66';
          lg.lineWidth = 0.5;
          for (let i = 0; i < 700; i++) {
            const x = r() * UF.W;
            if (x > 344 && x < 376) continue;
            const y = 64 + r() * 9;
            lg.beginPath();
            lg.moveTo(x, y);
            lg.lineTo(x + (r() - 0.5) * 3, y - r() * 2.5);
            lg.stroke();
          }
        });
        placePiece(g, felt, s, 0, 0, UF.W, UF.H, 2);

        // Food: orange-card mounds, each a stack of cut circles.
        const food = fullLayer(s, (lg) => {
          scene.foodPiles.forEach((p, i) => {
            const r = UF.rng(60 + i);
            lg.fillStyle = C.food;
            lg.fill(cutRect(p.x - 13, p.y + 1, 26, 15, 7, 70 + i, 5));
            [[-6, 0], [6, 0], [0, -6]].forEach(([dx, dy]) => {
              lg.fillStyle = UF.lerpColor(C.food, r() < 0.5 ? '#FFFFFF' : '#B05A10', 0.12);
              lg.beginPath();
              lg.arc(p.x + dx, p.y + dy + 2, 6, 0, Math.PI * 2);
              lg.fill();
            });
          });
          lg.fillStyle = C.food;
          lg.fill(cutRect(scene.crumb.x - 6, scene.crumb.y - 3, 12, 9, 4, 81, 4));
        });
        placePiece(g, food, s, 0, 0, UF.W, UF.H, 2.5);

        // Index-card labels, taped on.
        const card = (x, y, w, text, rot, size) => {
          g.save();
          g.translate(x, y);
          g.rotate(rot);
          const h = size + 14;
          g.save();
          g.shadowColor = 'rgba(25,15,8,0.35)';
          g.shadowOffsetY = 2.5 * s;
          g.shadowBlur = 2.5 * s;
          g.fillStyle = C.index;
          g.fillRect(0, 0, w, h);
          g.restore();
          g.strokeStyle = C.redRule;
          g.lineWidth = 0.8;
          g.beginPath();
          g.moveTo(0, 6.5); g.lineTo(w, 6.5);
          g.stroke();
          g.strokeStyle = C.rule;
          g.lineWidth = 0.5;
          for (let ly = 6.5 + 7; ly < h; ly += 7) {
            g.beginPath(); g.moveTo(0, ly); g.lineTo(w, ly); g.stroke();
          }
          g.fillStyle = C.pen;
          g.font = size + 'px "Patrick Hand", "Caveat", cursive';
          g.textAlign = 'center';
          g.fillText(text, w / 2, h - 4.5);
          // Tape strip.
          g.fillStyle = 'rgba(236,226,196,0.78)';
          g.save();
          g.translate(w / 2, 0);
          g.rotate(0.06);
          g.fillRect(-12, -4, 24, 8);
          g.restore();
          g.restore();
        };
        card(20, 10, 140, 'Underfoot · the nest', -0.025, 17);
        card(198, 104, 100, 'hatchery', 0.02, 14);
        card(400, 104, 108, 'queen’s chamber', -0.02, 14);
        card(156, 240, 96, 'food store', -0.015, 14);
        card(432, 240, 92, 'barracks', 0.025, 14);
      })
    );
  }

  // ---------------------------------------------------------------- creatures
  // Draws the silhouette (body, strips, eyes) in local units.
  function antShape(g, b, pose, opts) {
    const pin = [b.thorax.x, b.hipY - 0.4];
    // Puppet rock around the pin.
    if (!opts.resting) {
      g.translate(pin[0], pin[1]);
      g.rotate(pose ? 0.045 : -0.045);
      g.translate(-pin[0], -pin[1]);
    }
    const strip = (ang, len, w) => {
      g.save();
      g.translate(pin[0], pin[1]);
      g.rotate(ang);
      g.fillStyle = C.card;
      g.beginPath();
      g.moveTo(-w / 2, -2.2);
      g.lineTo(w / 2, -2.2);
      g.lineTo(w * 0.35, len);
      g.lineTo(-w * 0.35, len);
      g.closePath();
      g.fill();
      g.restore();
    };
    const legLen = b.footY - pin[1] + 1.4;
    if (opts.resting) {
      strip(1.15, legLen * 0.9, 1.6);
      strip(-1.15, legLen * 0.9, 1.6);
    } else {
      const a = pose ? 0.62 : 0.28;
      const w = opts.queen ? 1.1 : 1.6;
      strip(a, legLen / Math.cos(a), w);
      strip(-a, legLen / Math.cos(a), w);
    }

    g.fillStyle = C.card;
    [b.abdomen, b.thorax, b.head].forEach((o) => {
      g.beginPath();
      g.ellipse(o.x, o.y, o.rx, o.ry, 0, 0, Math.PI * 2);
      g.fill();
    });
    g.beginPath();
    g.arc(b.petiole.x, b.petiole.y, b.petiole.r + 0.3, 0, Math.PI * 2);
    g.fill();

    // Antennae: thin card strips.
    g.strokeStyle = C.card;
    g.lineWidth = 0.9;
    g.lineJoin = 'miter';
    UF.antAntennae(b).slice(0, 1).forEach(([p0, e, tip]) => {
      g.beginPath();
      g.moveTo(p0[0], p0[1]);
      g.lineTo(e[0], e[1]);
      g.lineTo(tip[0], tip[1]);
      g.stroke();
    });

    if (opts.queen) {
      // Wing scars: two slivers of tan paper glued on the thorax.
      g.fillStyle = '#C8B48E';
      [[-0.8, -0.35], [0.9, -0.2]].forEach(([dx, rot]) => {
        g.save();
        g.translate(b.thorax.x + dx, b.thorax.y - b.thorax.ry * 0.9);
        g.rotate(rot);
        g.fillRect(-0.25, -1.4, 0.5, 1.6);
        g.restore();
      });
    }

    // White paper eye with a pupil (a slit when resting).
    const ex = b.head.x + b.head.rx * 0.3, ey = b.head.y - b.head.ry * 0.25;
    const er = opts.queen ? 0.9 : 1.35;
    g.fillStyle = C.eye;
    g.beginPath();
    g.arc(ex, ey, er, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = C.card;
    if (opts.resting) {
      g.fillRect(ex - er, ey - 0.2, er * 2, er);
    } else {
      g.beginPath();
      g.arc(ex + er * 0.35, ey + 0.1, er * 0.5, 0, Math.PI * 2);
      g.fill();
    }

    if (opts.carrying) {
      g.fillStyle = C.food;
      g.beginPath();
      g.moveTo(b.carry.x - 2.4, b.carry.y + 1.8);
      g.lineTo(b.carry.x - 1.2, b.carry.y - 2.4);
      g.lineTo(b.carry.x + 2.6, b.carry.y - 1.6);
      g.lineTo(b.carry.x + 2.2, b.carry.y + 2.2);
      g.closePath();
      g.fill();
    }
    return pin;
  }

  function antSprite(a, pose, s) {
    return cache.get('ant' + a.key + '|' + pose + '|' + s, () => {
      const b = UF.antBody(a.caste);
      const R = a.caste === 'queen' ? 64 : a.caste === 'major' ? 34 : 26;
      const x0 = Math.floor(a.x - R), y0 = Math.floor(a.y - R);
      let pinWorld = null;
      const layer = UF.bakeRegion(s, x0, y0, R * 2, R * 2, (g) => {
        UF.orient(g, a.x, a.y, a.heading || 0);
        g.scale(b.scale, b.scale);
        const pin = antShape(g, b, pose, { resting: a.resting, carrying: a.carrying, queen: a.caste === 'queen' });
        const m = g.getTransform();
        pinWorld = [(m.a * pin[0] + m.c * pin[1] + m.e) / s + x0, (m.b * pin[0] + m.d * pin[1] + m.f) / s + y0];
      });
      return UF.bakeRegion(s, x0, y0, R * 2, R * 2, (g) => {
        placePiece(g, layer.canvas, s, x0, y0, R * 2, R * 2, 2.5);
        // Brass split pin on top.
        g.fillStyle = C.brass;
        g.beginPath();
        g.arc(pinWorld[0], pinWorld[1], a.caste === 'queen' ? 1.8 : 0.9, 0, Math.PI * 2);
        g.fill();
      });
    });
  }

  function spiderSprite(scene, twitch, s) {
    return cache.get('spider' + twitch + '|' + s, () => {
      const sp = scene.spider;
      const x0 = sp.x - 64, y0 = sp.y - 40;
      const pins = [];
      const build = (far) =>
        UF.bakeRegion(s, x0, y0, 128, 72, (g) => {
          g.translate(sp.x, sp.y);
          g.scale(-sp.facing, 1);
          // Legs: two strips each, pinned at the knee.
          const legs = far
            ? [[-10, 2, -24, -14, -36, 25], [-6, 3, -12, -18, -20, 25], [-2, 3, 10, -16, 20, 25], [1, 3, 22, -12, 38, 25]]
            : [[-12, 3, -30, -16, -44, 26], [-8, 4, -20, -20, -28, 26], [-4, 4, 4, -18, 14, 26], [0, 4, 16, -14, 30, 26]];
          legs.forEach(([hx, hy, kx, ky, fx, fy], i) => {
            const lift = !far && i === 0 && twitch ? 7 : 0;
            const seg = (ax, ay, bx, by, w) => {
              const ang = Math.atan2(by - ay, bx - ax), len = Math.hypot(bx - ax, by - ay);
              g.save();
              g.translate(ax, ay);
              g.rotate(ang);
              g.fillStyle = far ? '#2C2622' : C.card;
              g.fillRect(-0.5, -w / 2, len + 1, w);
              g.restore();
            };
            const kyy = ky - lift, fxx = fx - lift * 0.4, fyy = fy - lift;
            seg(hx, hy, kx, kyy, 2.4);
            seg(kx, kyy, fxx, fyy, 1.8);
            if (!far) {
              const m = g.getTransform();
              pins.push([(m.a * kx + m.c * kyy + m.e) / s + x0, (m.b * kx + m.d * kyy + m.f) / s + y0]);
            }
          });
          if (far) return;
          g.fillStyle = C.card;
          g.beginPath();
          g.ellipse(11, -5, 13, 11, -0.2, 0, Math.PI * 2);
          g.fill();
          g.beginPath();
          g.arc(-9, 2, 7, 0, Math.PI * 2);
          g.fill();
          // Paper eyes: two big, two small.
          [[-12, -1, 2.3], [-7, -2.4, 2.0], [-14.2, 3, 1.1], [-10.5, 3.6, 1.0]].forEach(([x, y, r]) => {
            g.fillStyle = C.eye;
            g.beginPath();
            g.arc(x, y, r, 0, Math.PI * 2);
            g.fill();
            g.fillStyle = C.card;
            g.beginPath();
            g.arc(x - r * 0.35, y + r * 0.2, r * 0.48, 0, Math.PI * 2);
            g.fill();
          });
        });
      const farL = build(true), nearL = build(false);
      return UF.bakeRegion(s, x0, y0, 128, 72, (g) => {
        placePiece(g, farL.canvas, s, x0, y0, 128, 72, 2);
        placePiece(g, nearL.canvas, s, x0, y0, 128, 72, 3);
        g.fillStyle = C.brass;
        pins.forEach(([x, y]) => {
          g.beginPath();
          g.arc(x, y, 1.1, 0, Math.PI * 2);
          g.fill();
        });
      });
    });
  }

  // ---------------------------------------------------------------- draw
  function draw(ctx, scene, t) {
    const s = UF.scaleOf(ctx);
    const tq = UF.quant(t, FPS);
    const frame = Math.round(tq * FPS);
    UF.drawBaked(ctx, env(scene, s));

    // Paper eggs.
    const es = UF.eggScale(scene, tq);
    scene.eggs.forEach((e) => {
      ctx.save();
      ctx.shadowColor = 'rgba(25,15,8,0.4)';
      ctx.shadowOffsetY = 2 * s;
      ctx.shadowBlur = 2 * s;
      ctx.fillStyle = C.egg;
      ctx.beginPath();
      ctx.ellipse(e.x, e.y, 3.4 * es, 4.4 * es, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    UF.creatures(scene).forEach((a) => {
      const pose = a.resting ? 0 : (frame + (UF.hash(a.key) % 2)) % 2;
      const bob = a.carrying ? (Math.floor(tq * 6) % 2 ? -1 : 1) : 0;
      UF.drawBaked(ctx, antSprite(a, pose, s), 0, bob);
    });
    UF.drawBaked(ctx, spiderSprite(scene, UF.spiderTwitch(scene, tq, 0.17), s));

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.08;
    ctx.drawImage(fibreCanvas(s), 0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
  }

  UF.register('cut-paper', { meta, fps: FPS, draw });
})();
