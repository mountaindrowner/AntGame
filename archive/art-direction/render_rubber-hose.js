// RUBBER-HOSE CARTOON — 1930s ink-and-paint. Thick outlines, huge pie-cut
// eyes, jointless noodle legs, squash and stretch on every step at 12 fps.
(function () {
  const UF = window.UF;
  const cache = UF.makeCache();
  const FPS = 12;
  const LINE = 3;

  const C = {
    ink: '#140C16',
    ant: '#2B1B33',
    antShine: '#6E5A7E',
    eye: '#F2E6FF',
    soil: ['#A8623A', '#9A5732', '#894C2B'],
    rock: '#7A4426',
    tunnel: '#4A2416',
    room: '#5E3020',
    roomFloor: '#74402A',
    sky: '#7CC8FF',
    cloud: '#FFFFFF',
    grass: '#67C23A',
    grassDark: '#4E9A2A',
    title: '#FFD23F',
    food: '#FFB52E',
    plaque: '#FFF1D0',
    egg: '#FFF8EC',
  };

  const meta = {
    label: 'Rubber-hose',
    status: 'brief',
    tagline: '1930s rubber-hose cartoon. Big eyes, thick ink, everything bounces.',
    refs: 'Cuphead, A Hat in Time (expressions), Bendy, A Bug’s Life (faces), Hotel Transylvania (silhouettes)',
    matrix: ['Cuphead, Bug’s Life', 'High', 'Medium', 'Medium', 'Low'],
    palette: [
      ['Ant', C.ant], ['Eyes', C.eye], ['Soil', C.soil[0]], ['Sky', C.sky], ['Grass', C.grass],
      ['Ink', C.ink], ['Tunnel (added)', C.tunnel], ['Title (added)', C.title], ['Food (added)', C.food],
    ],
    type: 'Bangers for the title and shouts; Fredoka 600 for the room plaques.',
    motion: '12 fps. Two leg poses swap every frame; walkers squash and stretch (scale-y 0.9 / 1.1) on each step. Carrying ants bob, eggs pulse, the spider taps a foot every 2 s.',
    risks: 'Fights the colony-as-hero tone: every ant becomes a character.',
    notes: 'No dashes or bites happen in the shared scene, so there are no speed lines or “CHOMP”; the one shout is a “zzz” over a resting major. Majors sleep with closed eyes.',
  };

  const noise = UF.noise2(1930);

  function blob(cx, cy, rx, ry, amp, seed) {
    const pts = UF.sampleEllipse(cx, cy, rx, ry, 18);
    return UF.smoothPath(UF.wobble(pts, noise, amp, 0.2, seed, seed), true);
  }

  // Fill a path with a thick ink outline.
  function inked(g, path, fill, lw) {
    g.lineJoin = 'round';
    g.strokeStyle = C.ink;
    g.lineWidth = lw || LINE;
    g.stroke(path);
    g.fillStyle = fill;
    g.fill(path);
  }

  // ---------------------------------------------------------------- environment
  function env(scene, s) {
    return cache.get('env' + s, () =>
      UF.bakeRegion(s, 0, 0, UF.W, UF.H, (g) => {
        g.fillStyle = C.sky;
        g.fillRect(0, 0, UF.W, scene.groundY + 4);

        // A cartoon cloud.
        const cloud = new Path2D();
        [[470, 30, 14], [488, 22, 16], [508, 28, 13], [522, 34, 9], [456, 36, 8]].forEach(([x, y, r]) => {
          cloud.moveTo(x + r, y);
          cloud.arc(x, y, r, 0, Math.PI * 2);
        });
        g.strokeStyle = C.ink;
        g.lineWidth = LINE * 2;
        g.stroke(cloud);
        g.fillStyle = C.cloud;
        g.fill(cloud);

        // Soil bands with wavy seams.
        scene.soil.forEach((b, i) => {
          const seam = new Path2D();
          seam.moveTo(-5, b.y0);
          for (let x = -5; x <= UF.W + 17; x += 12) seam.lineTo(x, b.y0 + (i ? Math.sin(x * 0.05 + i) * 3 : 0));
          const p = new Path2D(seam);
          p.lineTo(UF.W + 17, UF.H + 5);
          p.lineTo(-5, UF.H + 5);
          p.closePath();
          g.fillStyle = C.soil[i];
          g.fill(p);
          if (i) {
            g.strokeStyle = C.ink;
            g.lineWidth = 2;
            g.globalAlpha = 0.5;
            g.stroke(seam);
            g.globalAlpha = 1;
          }
        });

        // Rocks.
        const r = UF.rng(31);
        for (let i = 0; i < 22; i++) {
          const x = 15 + r() * 690, y = 95 + r() * 370;
          const p = blob(x, y, 3 + r() * 5, 2.5 + r() * 3, 1, i);
          inked(g, p, C.rock, 1.6);
          g.strokeStyle = 'rgba(255,255,255,0.35)';
          g.lineWidth = 1;
          g.beginPath();
          g.arc(x - 1, y - 1, 2, Math.PI * 1.1, Math.PI * 1.6);
          g.stroke();
        }

        // Nest.
        const cav = UF.cavities(scene);
        const paths = cav.map((c) => UF.roundRectPath(new Path2D(), c.x, c.y, c.w, c.h, c.kind === 'room' ? 26 : 11));
        g.save();
        g.beginPath();
        g.rect(0, scene.groundY, UF.W, UF.H);
        g.clip();
        cav.forEach((c, i) => {
          g.fillStyle = c.kind === 'room' ? C.room : C.tunnel;
          g.fill(paths[i]);
        });
        scene.rooms.forEach((rm) => {
          g.fillStyle = C.roomFloor;
          g.beginPath();
          g.ellipse(rm.x + rm.w / 2, rm.y + rm.h - 8, rm.w * 0.42, 9, 0, 0, Math.PI * 2);
          g.fill();
        });
        g.restore();
        const outline = UF.unionOutline(s, paths.map((p) => ({ path: p, width: LINE })), paths, C.ink, (og) => {
          og.beginPath();
          og.rect(0, scene.groundY, UF.W, UF.H);
          og.clip();
        });
        UF.drawBaked(g, outline);

        // Grass: scalloped strip, gap over the shaft.
        [[-10, 342], [378, UF.W + 10]].forEach(([x0, x1]) => {
          const p = new Path2D();
          p.moveTo(x0, 74);
          for (let x = x0; x < x1; x += 10) p.quadraticCurveTo(x + 5, 58, Math.min(x + 10, x1), 66);
          p.lineTo(x1, 74);
          p.closePath();
          inked(g, p, C.grass, LINE);
        });
        g.strokeStyle = C.grassDark;
        g.lineWidth = 1.4;
        g.lineCap = 'round';
        for (let x = 6; x < UF.W; x += 23) {
          if (x > 336 && x < 384) continue;
          g.beginPath();
          g.moveTo(x, 71); g.lineTo(x + 2, 66);
          g.stroke();
        }

        // Food piles and crumb.
        scene.foodPiles.forEach((p, i) => {
          [[-6, 8, 6], [6, 8, 6], [0, 1, 6]].forEach(([dx, dy, rr], k) => {
            inked(g, blob(p.x + dx, p.y + dy, rr, rr * 0.85, 0.8, i * 5 + k), C.food, 2);
          });
          g.strokeStyle = '#FFFFFF';
          g.lineWidth = 1.2;
          g.beginPath();
          g.arc(p.x - 1.5, p.y - 1, 2.5, Math.PI * 1.1, Math.PI * 1.6);
          g.stroke();
        });
        inked(g, blob(scene.crumb.x, scene.crumb.y + 1, 6, 5, 0.8, 99), C.food, 2.4);

        // Title.
        g.font = '34px Bangers, "Fredoka", Impact, sans-serif';
        g.lineJoin = 'round';
        g.strokeStyle = C.ink;
        g.lineWidth = 6;
        g.save();
        g.translate(18, 44);
        g.rotate(-0.04);
        g.strokeText('UNDERFOOT!', 0, 0);
        g.fillStyle = C.title;
        g.fillText('UNDERFOOT!', 0, 0);
        g.restore();

        // Plaques.
        g.font = '600 12px Fredoka, "DM Sans", sans-serif';
        g.textAlign = 'center';
        scene.rooms.forEach((rm, i) => {
          const label = rm.label;
          const w = g.measureText(label).width + 18;
          const x = rm.x + rm.w / 2 - w / 2, y = rm.y - 22;
          g.save();
          g.translate(rm.x + rm.w / 2, y + 9);
          g.rotate(i % 2 ? 0.03 : -0.03);
          inked(g, UF.roundRectPath(new Path2D(), -w / 2, -9, w, 18, 5), C.plaque, 2);
          g.fillStyle = C.ink;
          g.fillText(label, 0, 4);
          g.beginPath();
          g.arc(-w / 2 + 5, 0, 1.3, 0, Math.PI * 2);
          g.arc(w / 2 - 5, 0, 1.3, 0, Math.PI * 2);
          g.fill();
          g.restore();
          void x;
        });
        g.textAlign = 'left';

        // The one shout: a sleeping major.
        const m = scene.majors[1];
        g.font = '15px Bangers, Impact, sans-serif';
        g.lineWidth = 3;
        g.strokeStyle = C.ink;
        g.fillStyle = C.eye;
        [['z', 0, 0], ['z', 6, -8], ['Z', 13, -17]].forEach(([z, dx, dy]) => {
          g.strokeText(z, m.x + 10 + dx, m.y - 12 + dy);
          g.fillText(z, m.x + 10 + dx, m.y - 12 + dy);
        });
      })
    );
  }

  // ---------------------------------------------------------------- creatures
  // An eye with a pie-cut pupil looking along +x.
  function eye(g, x, y, r, look, closed) {
    g.lineWidth = r * 0.32;
    g.strokeStyle = C.ink;
    g.fillStyle = C.eye;
    g.beginPath();
    g.ellipse(x, y, r * 0.82, r, 0, 0, Math.PI * 2);
    g.stroke();
    g.fill();
    if (closed) {
      g.beginPath();
      g.arc(x, y - r * 0.1, r * 0.6, 0.15 * Math.PI, 0.85 * Math.PI);
      g.stroke();
      return;
    }
    const px = x + r * 0.32 * (look || 1), py = y + r * 0.15;
    g.fillStyle = C.ink;
    g.beginPath();
    g.ellipse(px, py, r * 0.36, r * 0.58, 0, 0, Math.PI * 2);
    g.fill();
    // The pie cut.
    g.fillStyle = C.eye;
    g.beginPath();
    g.moveTo(px, py - r * 0.05);
    g.arc(px, py - r * 0.05, r * 0.5, -1.5, -0.95);
    g.closePath();
    g.fill();
  }

  function noodle(g, hip, foot, bend, lw) {
    g.strokeStyle = C.ink;
    g.lineWidth = lw;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(hip[0], hip[1]);
    g.bezierCurveTo(hip[0] + bend, hip[1] - 2.2, foot[0] - bend * 0.4, foot[1] - 3.5, foot[0], foot[1]);
    g.stroke();
    g.fillStyle = C.ink;
    g.beginPath();
    g.ellipse(foot[0] + 0.5, foot[1] - 0.3, 1.1, 0.75, 0, 0, Math.PI * 2);
    g.fill();
  }

  function drawAnt(g, a, frame, scene, tq) {
    const b = UF.antBody(a.caste);
    const queen = a.caste === 'queen';
    const k = b.scale;
    g.save();
    UF.orient(g, a.x, a.y, a.heading || 0);
    g.scale(k, k);
    const unit = 1 / k;

    const pose = (frame + (UF.hash(a.key) % 2)) % 2;
    // Squash and stretch, anchored at the feet.
    if (!a.resting) {
      const sy = pose ? 0.9 : 1.1;
      g.translate(0, b.footY);
      g.scale(1 / Math.sqrt(sy), sy);
      g.translate(0, -b.footY);
    }

    const legs = UF.antLegs(b, pose ? Math.PI * 1.5 : Math.PI * 0.5, { tucked: a.resting, strideMul: 1.4 });
    const legW = (queen ? 3.4 : 2.2) * unit;
    legs.filter((l) => l.side === 1).forEach((l) => noodle(g, l.hip, l.foot, l.index === 2 ? -2 : 2, legW * 0.85));

    // Body: ink stroke at double width under the fills = outer outline only.
    const parts = [b.abdomen, b.thorax, b.head];
    const body = new Path2D();
    parts.forEach((o) => {
      body.moveTo(o.x + o.rx, o.y);
      body.ellipse(o.x, o.y, o.rx, o.ry, 0, 0, Math.PI * 2);
    });
    body.moveTo(b.petiole.x + b.petiole.r + 0.4, b.petiole.y);
    body.arc(b.petiole.x, b.petiole.y, b.petiole.r + 0.4, 0, Math.PI * 2);
    g.lineJoin = 'round';
    g.strokeStyle = C.ink;
    g.lineWidth = LINE * 2 * unit;
    g.stroke(body);

    legs.filter((l) => l.side === 0).forEach((l) => noodle(g, l.hip, l.foot, l.index === 2 ? -2 : 2, legW));

    g.fillStyle = C.ant;
    g.fill(body);
    if (queen) {
      g.strokeStyle = '#4A3557';
      g.lineWidth = 1.4 * unit;
      [-0.45, 0, 0.45].forEach((f) => {
        const x = b.abdomen.x + b.abdomen.rx * f;
        g.beginPath();
        g.ellipse(x, b.abdomen.y, b.abdomen.rx * 0.12, b.abdomen.ry * 0.86, 0, -1.3, 1.3);
        g.stroke();
      });
    }
    // Shine.
    g.strokeStyle = C.antShine;
    g.lineWidth = (queen ? 2 : 1.1) * unit;
    g.lineCap = 'round';
    g.beginPath();
    g.ellipse(b.abdomen.x + 0.6, b.abdomen.y - 0.4, b.abdomen.rx * 0.62, b.abdomen.ry * 0.55, 0, Math.PI * 1.15, Math.PI * 1.55);
    g.stroke();

    // Antennae with ball tips.
    UF.antAntennae(b).forEach(([p0, e, tip], i) => {
      g.strokeStyle = C.ink;
      g.lineWidth = 1.5 * unit;
      g.beginPath();
      g.moveTo(p0[0], p0[1]);
      g.quadraticCurveTo(e[0] - 1, e[1] - 1.5, tip[0], tip[1] - 1);
      g.stroke();
      if (!i) {
        g.fillStyle = C.ink;
        g.beginPath();
        g.arc(tip[0], tip[1] - 1, 1.3 * unit * (queen ? 2 : 1), 0, Math.PI * 2);
        g.fill();
      }
    });

    if (queen) {
      // Wing scars: two outlined stubs.
      [[-1.2, -0.5], [0.8, -0.25]].forEach(([dx, rot]) => {
        g.save();
        g.translate(b.thorax.x + dx, b.thorax.y - b.thorax.ry * 0.95);
        g.rotate(rot);
        const p = UF.roundRectPath(new Path2D(), -0.45, -1.6, 0.9, 1.9, 0.4);
        g.lineWidth = 0.9 * unit;
        g.strokeStyle = C.ink;
        g.stroke(p);
        g.fillStyle = '#A894B8';
        g.fill(p);
        g.restore();
      });
    }

    // Eyes: r 4 world px at worker scale, bulging out of the head.
    const er = (queen ? 6.5 : a.caste === 'major' ? 4.8 : 4) * unit;
    const ex = b.head.x + b.head.rx * 0.15, ey = b.head.y - b.head.ry * 0.55;
    eye(g, ex - er * 0.9, ey - er * 0.15, er * 0.9, 1, a.resting);
    eye(g, ex + er * 0.3, ey, er, 1, a.resting);
    if (queen) {
      g.strokeStyle = C.ink;
      g.lineWidth = 1.2 * unit;
      [[-0.5, -1.15], [0, -1.25], [0.5, -1.1]].forEach(([dx, dy]) => {
        g.beginPath();
        g.moveTo(ex + er * 0.3 + dx * er, ey + dy * er * 0.8);
        g.lineTo(ex + er * 0.3 + dx * er * 1.3, ey + dy * er * 1.15);
        g.stroke();
      });
    }

    if (a.carrying) {
      const bob = UF.carryBob(scene, tq);
      g.translate(0, bob * unit);
      inked(g, blob(b.carry.x + 1, b.carry.y, b.carry.r * 1.1, b.carry.r, 0.3, 3), C.food, 1.6 * unit);
    }
    g.restore();
  }

  function drawSpider(g, scene, tq) {
    const sp = scene.spider;
    const tap = UF.spiderTwitch(scene, tq, 0.17);
    g.save();
    g.translate(sp.x, sp.y);
    g.scale(-sp.facing, 1); // local +x = behind
    const legs = [
      [-12, 3, -44, 26], [-9, 4, -30, 26], [-4, 5, 12, 26], [-1, 5, 30, 26],
    ];
    const far = [[-10, 2, -36, 25], [-7, 3, -20, 25], [-3, 3, 20, 25], [0, 3, 38, 25]];
    far.forEach(([hx, hy, fx, fy]) => noodle(g, [hx, hy], [fx, fy], (fx - hx) * 0.6, 2.2));
    const body = new Path2D();
    body.ellipse(11, -5, 13, 11, -0.2, 0, Math.PI * 2);
    body.moveTo(-2, 2);
    body.arc(-9, 2, 7.5, 0, Math.PI * 2);
    g.strokeStyle = C.ink;
    g.lineWidth = LINE * 2;
    g.stroke(body);
    legs.forEach(([hx, hy, fx, fy], i) => {
      const lift = i === 0 && tap ? 6 : 0;
      noodle(g, [hx, hy], [fx - lift * 0.4, fy - lift], (fx - hx) * 0.6, 2.8);
    });
    g.fillStyle = C.ant;
    g.fill(body);
    g.strokeStyle = C.antShine;
    g.lineWidth = 1.6;
    g.beginPath();
    g.arc(13, -7, 7, Math.PI * 1.1, Math.PI * 1.5);
    g.stroke();
    // Villain face: eyes glaring at the ants, heavy brows, a toothy grin.
    g.save();
    g.scale(-1, 1); // eyes look forward (toward −x)
    eye(g, 13, -2, 4.4, 1);
    eye(g, 5.5, -2.5, 4.0, 1);
    g.restore();
    g.strokeStyle = C.ink;
    g.lineWidth = 2.6;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(-17.5, -9.5); g.lineTo(-10, -6.5);
    g.moveTo(-8.5, -8); g.lineTo(-2, -10);
    g.stroke();
    const grin = new Path2D();
    grin.moveTo(-15, 4.5);
    grin.quadraticCurveTo(-9, 10, -3, 5);
    grin.quadraticCurveTo(-9, 7, -15, 4.5);
    g.lineWidth = 1.4;
    g.stroke(grin);
    g.fillStyle = '#FFFFFF';
    g.fill(grin);
    g.restore();
  }

  // ---------------------------------------------------------------- draw
  function draw(ctx, scene, t) {
    const s = UF.scaleOf(ctx);
    const tq = UF.quant(t, FPS);
    const frame = Math.round(tq * FPS);
    UF.drawBaked(ctx, env(scene, s));

    const es = UF.eggScale(scene, tq);
    scene.eggs.forEach((e, i) => {
      const p = new Path2D();
      p.ellipse(e.x, e.y, 3.4 * es, 4.4 * es, 0.3, 0, Math.PI * 2);
      inked(ctx, p, C.egg, 1.8);
      ctx.strokeStyle = 'rgba(180,160,200,0.8)';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.arc(e.x - 0.8, e.y - 1.2, 1.6, Math.PI * 1.1, Math.PI * 1.6);
      ctx.stroke();
      void i;
    });

    UF.creatures(scene).forEach((a) => drawAnt(ctx, a, frame, scene, tq));
    drawSpider(ctx, scene, tq);
  }

  UF.register('rubber-hose', { meta, fps: FPS, draw });
})();
