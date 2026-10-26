// FLAT VECTOR — Mini Metro meets a cross-section infographic.
// No outlines; shapes separate by value. 60 fps, eased. Draws the scent trail.
(function () {
  const UF = window.UF;
  const cache = UF.makeCache();

  const C = {
    ground: '#F4F1EA',
    soil: ['#DCC7A3', '#C9AD84', '#B08A62'],
    tunnel: '#3B2D22',
    ink: '#1F1A16',
    rooms: { queen: '#7A5A8A', hatchery: '#8A7A46', store: '#9A8A42', barracks: '#6A4646' },
    food: '#F2D36B',
    water: '#7CC4EE',
    protein: '#D96B5A',
    stone: '#A9A49C',
    scent: '#6FD36B',
    alarm: '#E4524A',
  };

  const meta = {
    label: 'Flat vector',
    status: 'full',
    tagline: 'Mini Metro meets a cross-section infographic. Flat bands, rounded shapes, glowing scent.',
    refs: 'Mini Metro, Alto’s Odyssey, Monument Valley, Rymdkapsel, Prune, Two Point Hospital, Dorfromantik',
    matrix: ['Mini Metro, Rymdkapsel', 'Lowest', 'Highest', 'Low', 'Low'],
    palette: [
      ['Ground', C.ground], ['Topsoil', C.soil[0]], ['Packed', C.soil[1]], ['Clay', C.soil[2]],
      ['Tunnel', C.tunnel], ['Ink', C.ink], ['Queen', C.rooms.queen], ['Hatchery', C.rooms.hatchery],
      ['Store', C.rooms.store], ['Barracks', C.rooms.barracks], ['Cistern', '#3A6A8A'], ['Workshop', '#5A5A3A'],
      ['Food', C.food], ['Water', C.water], ['Protein', C.protein], ['Stone', C.stone],
      ['Scent', C.scent], ['Alarm', C.alarm],
    ],
    type: 'DM Sans 500 — 11 px room labels (white 90%), 13 px HUD strip in a white 90% rounded box.',
    motion: '60 fps, eased. No legs: ants bounce ±0.6 px at 6 Hz. Eggs pulse. Scent breathes 0.6→0.9 at 0.5 Hz.',
    risks: 'Low distinctiveness. It is the shipping fallback if no illustrated style wins.',
    notes: 'With no outlines, ink ants vanish on the dark tunnel colour, so ants take the value opposite their ground: ink on the surface, ground-cream underground. Wing scars are two short cuts on the queen’s thorax.',
  };

  function env(scene, s) {
    return cache.get('env' + s, () =>
      UF.bakeRegion(s, 0, 0, UF.W, UF.H, (g) => {
        g.fillStyle = C.ground;
        g.fillRect(0, 0, UF.W, UF.H);
        scene.soil.forEach((b, i) => {
          g.fillStyle = C.soil[i];
          g.fillRect(0, b.y0, UF.W, b.y1 - b.y0);
        });

        g.save();
        g.beginPath();
        g.rect(0, scene.groundY, UF.W, UF.H);
        g.clip();
        g.fillStyle = C.tunnel;
        UF.cavities(scene).filter((c) => c.kind === 'tunnel').forEach((c) => {
          g.fill(UF.roundRectPath(new Path2D(), c.x, c.y, c.w, c.h, 11.5));
        });
        g.restore();

        scene.rooms.forEach((r) => {
          g.fillStyle = C.tunnel;
          g.fill(UF.roundRectPath(new Path2D(), r.x, r.y, r.w, r.h, 16));
          g.fillStyle = C.rooms[r.id];
          g.fill(UF.roundRectPath(new Path2D(), r.x + 5, r.y + 5, r.w - 10, r.h - 10, 11));
        });

        // Store piles: stacked food dots.
        scene.foodPiles.forEach((p) => {
          g.fillStyle = C.food;
          [[-7, 7], [0, 7], [7, 7], [-3.5, 1], [3.5, 1], [0, -5]].forEach(([dx, dy]) => {
            g.beginPath();
            g.arc(p.x + dx, p.y + dy, 3.6, 0, Math.PI * 2);
            g.fill();
          });
        });

        // Crumb.
        g.fillStyle = C.food;
        g.beginPath();
        g.arc(scene.crumb.x, scene.crumb.y + 2, 5, 0, Math.PI * 2);
        g.fill();

        // Room labels.
        g.font = '500 11px "DM Sans", system-ui, sans-serif';
        g.fillStyle = 'rgba(255,255,255,0.9)';
        g.textBaseline = 'alphabetic';
        scene.rooms.forEach((r) => g.fillText(r.label, r.x + 11, r.y + 20));

        // HUD strip.
        g.font = '500 13px "DM Sans", system-ui, sans-serif';
        const items = [[C.food, 'Food 124'], [C.water, 'Water 40'], [C.protein, 'Protein 18'], [C.stone, 'Stone 9']];
        let w = 16;
        items.forEach(([, s]) => (w += 14 + g.measureText(s).width + 12));
        w += g.measureText('212 ants').width;
        g.fillStyle = 'rgba(255,255,255,0.9)';
        g.fill(UF.roundRectPath(new Path2D(), 10, 10, w, 24, 12));
        let x = 22;
        items.forEach(([col, s]) => {
          g.fillStyle = col;
          g.beginPath();
          g.arc(x + 4, 22, 4.5, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = C.ink;
          g.fillText(s, x + 13, 26.5);
          x += 14 + g.measureText(s).width + 12;
        });
        g.fillStyle = C.ink;
        g.globalAlpha = 0.65;
        g.fillText('212 ants', x, 26.5);
        g.globalAlpha = 1;
      })
    );
  }

  function circle(g, x, y, r) {
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }

  function ant(g, scene, a, t, color) {
    const bounce = a.resting ? 0 : Math.sin(t * scene.motion.legHz * Math.PI * 2) * 0.6;
    g.save();
    UF.orient(g, a.x, a.y, a.heading || 0);
    g.translate(0, bounce);
    g.fillStyle = color;
    if (a.caste === 'major') {
      circle(g, -5.5, 0, 7.5);
      circle(g, 7.6, -0.6, 4.8);
    } else {
      circle(g, -3.8, 0, 5);
      circle(g, 4.6, -0.4, 3.2);
    }
    if (a.carrying) {
      const bob = UF.carryBob(scene, t);
      g.fillStyle = C.food;
      circle(g, a.caste === 'major' ? 15.4 : 10.8, -0.2 + bob, 3);
    }
    g.restore();
  }

  function queen(g, scene, t, color) {
    const q = scene.queen;
    const bounce = Math.sin(t * scene.motion.legHz * Math.PI * 2) * 0.6;
    g.save();
    UF.orient(g, q.x, q.y, q.heading || 0);
    g.translate(-2, bounce);
    g.fillStyle = color;
    g.beginPath();
    g.ellipse(-8, 0, 24, 13, 0, 0, Math.PI * 2);
    g.fill();
    circle(g, 21, -2, 6.4);
    circle(g, 32, -3.4, 5.4);
    // Wing scars: two short cuts in the room colour.
    g.strokeStyle = C.rooms.queen;
    g.lineWidth = 1.4;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(18.5, -5.5); g.lineTo(16, -9.5);
    g.moveTo(22.5, -6.2); g.lineTo(21, -10.6);
    g.stroke();
    g.fillStyle = C.food;
    circle(g, 32, -13.5, 2.6);
    g.restore();
  }

  function spider(g, scene, t) {
    const sp = scene.spider;
    const ph = t % scene.motion.spiderTwitchEvery;
    const tw = ph < 0.35 ? Math.sin((ph / 0.35) * Math.PI) : 0;
    g.save();
    g.translate(sp.x, sp.y);
    g.scale(-sp.facing, 1);
    // Local: +x = behind (abdomen side), −x = forward.
    g.strokeStyle = C.ink;
    g.lineWidth = 2.4;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    const legs = [
      [-12, 2, -26, -12, -40, 26], [-10, 3, -20, -16, -30, 26],
      [-6, 4, 2, -16, 14, 26], [-4, 4, 12, -12, 30, 26],
    ];
    legs.forEach(([hx, hy, kx, ky, fx, fy], i) => {
      const lift = i === 0 ? tw * 5 : 0;
      g.beginPath();
      g.moveTo(hx, hy);
      g.quadraticCurveTo(kx, ky - lift, fx - lift * 0.6, fy - lift);
      g.stroke();
    });
    g.fillStyle = C.ink;
    g.beginPath();
    g.ellipse(10, -4, 13, 11, -0.2, 0, Math.PI * 2);
    g.fill();
    circle(g, -9, 2, 7);
    g.fillStyle = C.alarm;
    circle(g, -14, 0, 1.8);
    g.restore();
  }

  function draw(ctx, scene, t) {
    const s = UF.scaleOf(ctx);
    UF.drawBaked(ctx, env(scene, s));

    // Scent trail.
    const breathe = 0.75 - 0.15 * Math.cos(t * 0.5 * Math.PI * 2);
    ctx.save();
    ctx.globalAlpha = breathe;
    ctx.strokeStyle = C.scent;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = C.scent;
    ctx.shadowBlur = 6 * s;
    ctx.stroke(UF.trailPath(scene));
    ctx.restore();

    // Eggs.
    const es = UF.eggScale(scene, t);
    ctx.fillStyle = C.ground;
    scene.eggs.forEach((e) => {
      ctx.beginPath();
      ctx.ellipse(e.x, e.y, 3.2 * es, 4.2 * es, 0.3, 0, Math.PI * 2);
      ctx.fill();
    });

    UF.creatures(scene).forEach((a) => {
      if (a.caste === 'queen') return;
      const onSurface = a.y < scene.groundY;
      ant(ctx, scene, a, t, onSurface ? C.ink : C.ground);
    });
    queen(ctx, scene, t, C.ground);
    spider(ctx, scene, t);
  }

  UF.register('vector', { meta, draw });
})();
