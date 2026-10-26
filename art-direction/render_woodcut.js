// FOLK-ART WOODCUT — a block print / Lotería card.
// Five colours, heavy black cuts, flat fills, texture only from cut patterns.
// 8 fps, two-pose legs, hard cuts. A marigold sun turns one notch a second.
(function () {
  const UF = window.UF;
  const cache = UF.makeCache();
  const noise = UF.noise2(311);

  const C = { ink: '#141414', cream: '#F6E7C1', teal: '#1F5E63', red: '#C8382B', marigold: '#F2B632' };
  const FONT = 'Rye, "Alfa Slab One", "Rockwell Extra Bold", Rockwell, Georgia, serif';
  const SIZE = 1.15; // silhouettes run 1.15× the base size so heavy cuts have room

  const meta = {
    label: 'Woodcut',
    status: 'full',
    tagline: 'A Mexican block print or Lotería card: heavy black cuts, flat saturated fills, cream paper, decorative borders.',
    refs: 'Guacamelee!, Grim Fandango, Cuphead (ink confidence), Dicey Dungeons, Inscryption, José Guadalupe Posada broadsides, Lotería by Don Clemente',
    matrix: ['Guacamelee, Inscryption cards', 'Low–Medium', 'High', 'Highest', 'Medium'],
    palette: [['Ink', C.ink], ['Cream', C.cream], ['Teal', C.teal], ['Red', C.red], ['Marigold', C.marigold]],
    type: 'Rye 13 px uppercase, letter-spacing 1, cream on black caption bars; title card Rye 22 px, letter-spacing 2 (Alfa Slab One as fallback).',
    motion: '8 fps, two-pose leg swap, no easing, hard cuts only. Eggs hold still; the marigold sun turns one notch a second.',
    risks: 'Crowds of black silhouettes can merge into blobs. Check caste separation at 1× and 0.6×. Eggs and piles must stay chunky.',
    notes: 'Room caption bars run across the top of each room (the bottoms are corridor) and are set in Spanish to match the Lotería cards. Creatures carry a thin cream cut around the silhouette so black ants stay separate from black rules and the grass zigzag. Soil bands differ by cut pattern: wood grain, cross-hatch, dot screen.',
  };

  // ------------------------------------------------------------ helpers
  function chunky(pts, seed, amp) {
    return pts.map(([x, y]) => [x + noise(x * 0.03 + seed, y * 0.03) * (amp || 1.1), y + noise(x * 0.03, y * 0.03 + seed) * (amp || 1.1)]);
  }
  function cutRect(x, y, w, h, r, seed) {
    return UF.polyPath(chunky(UF.sampleRoundRect(x, y, w, h, r, 4), seed), true);
  }
  function spaced(g, str, x, y, spacing, align) {
    const ws = [...str].map((ch) => g.measureText(ch).width);
    const total = ws.reduce((a, b) => a + b, 0) + spacing * (ws.length - 1);
    let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
    g.textAlign = 'left';
    [...str].forEach((ch, i) => { g.fillText(ch, cx, y); cx += ws[i] + spacing; });
    return total;
  }
  function measureSpaced(g, str, spacing) {
    return [...str].reduce((a, ch) => a + g.measureText(ch).width, 0) + spacing * (str.length - 1);
  }
  function linesIn(g, path, bb, angle, gap, width, color, alpha, wavy) {
    g.save();
    g.clip(path);
    g.strokeStyle = color;
    g.lineWidth = width;
    g.globalAlpha = alpha;
    const [x0, y0, w, h] = bb;
    if (wavy) {
      for (let y = y0; y < y0 + h + gap; y += gap) {
        g.beginPath();
        for (let x = x0; x <= x0 + w; x += 4) {
          const yy = y + Math.sin(x * 0.045 + y * 0.31) * 2.2 + noise(x * 0.02, y * 0.05) * 2.4;
          x === x0 ? g.moveTo(x, yy) : g.lineTo(x, yy);
        }
        g.stroke();
      }
    } else {
      UF.hatch(g, path, { angle, spacing: gap, width, alpha, color, bbox: bb });
    }
    g.restore();
  }
  function downVec(headingDeg) {
    const h = (headingDeg * Math.PI) / 180;
    return Math.cos(h) < -1e-6 ? [Math.sin(h), -Math.cos(h)] : [-Math.sin(h), Math.cos(h)];
  }

  // ------------------------------------------------------------ print
  function bandEdge(y, seed) {
    const pts = [];
    for (let x = 0; x <= UF.W; x += 6) pts.push([x, y + noise(x * 0.025, seed) * 4]);
    return pts;
  }

  function env(scene, s) {
    return cache.get('env' + s, () =>
      UF.bakeRegion(s, 0, 0, UF.W, UF.H, (g) => {
        g.fillStyle = C.cream;
        g.fillRect(0, 0, UF.W, UF.H);
        g.fillStyle = C.marigold;
        g.fillRect(0, 0, UF.W, scene.groundY);

        // Soil: teal, each band carved with its own pattern.
        g.fillStyle = C.teal;
        g.fillRect(0, scene.groundY, UF.W, UF.H - scene.groundY);
        const bandPaths = scene.soil.map((b, i) => {
          const top = i === 0 ? [[0, b.y0], [UF.W, b.y0]] : bandEdge(b.y0, i);
          const bot = i === scene.soil.length - 1 ? [[UF.W, UF.H], [0, UF.H]] : bandEdge(b.y1, i + 1).reverse();
          return UF.polyPath(top.concat(bot), true);
        });
        linesIn(g, bandPaths[0], [0, 70, UF.W, 160], 0, 8, 1.2, C.cream, 0.5, true);
        linesIn(g, bandPaths[1], [0, 210, UF.W, 150], 45, 8, 1.6, C.ink, 0.55);
        linesIn(g, bandPaths[1], [0, 210, UF.W, 150], 135, 8, 1.6, C.ink, 0.55);
        g.save();
        g.clip(bandPaths[2]);
        g.fillStyle = C.ink;
        g.globalAlpha = 0.6;
        g.beginPath();
        for (let y = 344; y < UF.H; y += 10) for (let x = (y / 10) % 2 ? 5 : 0; x < UF.W; x += 10) { g.moveTo(x + 2, y); g.arc(x, y, 2, 0, Math.PI * 2); }
        g.fill();
        g.restore();
        // Heavy cuts between bands.
        g.strokeStyle = C.ink;
        g.lineWidth = 5;
        g.lineJoin = 'round';
        [1, 2].forEach((i) => g.stroke(UF.polyPath(bandEdge(scene.soil[i].y0, i), false)));

        // The nest, carved out.
        const cav = UF.cavities(scene).map((c, i) => ({ c, path: cutRect(c.x, c.y, c.w, c.h, c.kind === 'room' ? 4 : 5, i * 5 + 1) }));
        const all = new Path2D();
        cav.forEach((c) => all.addPath(c.path));
        const tunnels = cav.filter((c) => c.c.kind === 'tunnel');
        const rooms = cav.filter((c) => c.c.kind === 'room');
        const clipGround = (h) => { h.beginPath(); h.rect(0, scene.groundY, UF.W, UF.H); h.clip(); };
        g.save();
        clipGround(g);
        g.fillStyle = C.cream;
        tunnels.forEach((c) => g.fill(c.path));
        const roomFill = { queen: C.red, barracks: C.red, hatchery: C.cream, store: C.cream };
        rooms.forEach((c) => { g.fillStyle = roomFill[c.c.id]; g.fill(c.path); });
        UF.drawBaked(g, UF.unionOutline(s, cav.map((c) => ({ path: c.path, width: 5.5 })), [all], C.ink, clipGround));
        // Inner rule 10 px inset, interrupted by the corridors.
        UF.drawBaked(g, UF.bakeRegion(s, 0, 0, UF.W, UF.H, (h) => {
          h.strokeStyle = C.ink;
          h.lineWidth = 2;
          rooms.forEach((c) => h.strokeRect(c.c.x + 10, c.c.y + 10, c.c.w - 20, c.c.h - 20));
          h.globalCompositeOperation = 'destination-out';
          tunnels.forEach((c) => h.fill(c.path));
        }));
        g.restore();

        // Caption bars across the top of each room.
        const names = { queen: 'LA REINA', hatchery: 'LOS HUEVOS', store: 'LA DESPENSA', barracks: 'EL CUARTEL' };
        rooms.forEach((c) => {
          g.save();
          g.clip(c.path);
          g.fillStyle = C.ink;
          g.fillRect(c.c.x - 4, c.c.y - 4, c.c.w + 8, 22);
          g.fillStyle = C.cream;
          g.font = '13px ' + FONT;
          g.textBaseline = 'alphabetic';
          spaced(g, names[c.c.id], c.c.x + c.c.w / 2, c.c.y + 14, 1, 'center');
          g.restore();
        });

        // Store: marigold mounds with a black cut line.
        scene.foodPiles.forEach((p, i) => {
          const pts = [];
          for (let k = 0; k <= 12; k++) {
            const a = Math.PI + (k / 12) * Math.PI;
            pts.push([p.x + Math.cos(a) * 13, 349 + Math.sin(a) * 17]);
          }
          const m = UF.polyPath(chunky(pts, i * 3, 0.8), true);
          g.fillStyle = C.marigold;
          g.fill(m);
          g.strokeStyle = C.ink;
          g.lineWidth = 3;
          g.lineJoin = 'round';
          g.stroke(m);
          g.lineWidth = 2;
          g.beginPath();
          g.moveTo(p.x - 7, 343); g.quadraticCurveTo(p.x, 337, p.x + 7, 343);
          g.moveTo(p.x - 3, 336); g.lineTo(p.x + 2, 336);
          g.stroke();
        });

        // Hatchery: chunky marigold eggs.
        scene.eggs.forEach((e) => {
          g.fillStyle = C.marigold;
          g.strokeStyle = C.ink;
          g.lineWidth = 2.2;
          g.beginPath();
          g.ellipse(e.x, e.y, 4.2, 5.6, 0.3, 0, Math.PI * 2);
          g.fill();
          g.stroke();
          g.lineWidth = 1.6;
          g.beginPath();
          g.moveTo(e.x + 1.4, e.y - 2.2); g.lineTo(e.x + 1.8, e.y + 1.6);
          g.stroke();
        });

        // Crumb.
        const cr = scene.crumb;
        g.fillStyle = C.marigold;
        g.strokeStyle = C.ink;
        g.lineWidth = 2.6;
        const crumb = UF.polyPath(chunky(UF.sampleEllipse(cr.x, cr.y + 1, 7, 5.5, 9, 0.2), 7, 0.8), true);
        g.fill(crumb);
        g.stroke(crumb);
        g.lineWidth = 1.6;
        g.beginPath(); g.moveTo(cr.x - 3, cr.y - 1); g.lineTo(cr.x + 2, cr.y + 2); g.stroke();

        // Papel-picado zigzag on the ground line, with punched holes.
        const shaft = scene.tunnels.find((t) => t.id === 'shaft');
        g.fillStyle = C.ink;
        [[0, shaft.x - 2], [shaft.x + shaft.w + 2, UF.W]].forEach(([a, b]) => {
          const p = new Path2D();
          p.moveTo(a, 76);
          p.lineTo(a, 70);
          for (let x = a; x < b; x += 12) {
            p.lineTo(Math.min(x + 6, b), 63);
            p.lineTo(Math.min(x + 12, b), 70);
          }
          p.lineTo(b, 76);
          p.closePath();
          g.fill(p);
          g.fillStyle = C.cream;
          for (let x = a + 6; x < b - 3; x += 12) {
            g.beginPath();
            g.arc(x, 72.5, 1.3, 0, Math.PI * 2);
            g.fill();
          }
          g.fillStyle = C.ink;
        });

        // Title card and the spider's Lotería card.
        g.textBaseline = 'alphabetic';
        g.font = '22px ' + FONT;
        const title = 'LA HORMIGA · UNDERFOOT';
        const tw = measureSpaced(g, title, 2);
        g.fillStyle = C.red;
        g.fillRect(24, 20, tw + 24, 30);
        g.strokeStyle = C.ink;
        g.lineWidth = 4;
        g.strokeRect(24, 20, tw + 24, 30);
        g.fillStyle = C.cream;
        spaced(g, title, 36, 43, 2, 'left');

        g.font = '13px ' + FONT;
        const card = 'No. 11  LA ARAÑA';
        const cw = measureSpaced(g, card, 1);
        const cx = 684 - cw - 16, cy = 96;
        g.fillStyle = C.cream;
        g.fillRect(cx, cy, cw + 16, 24);
        g.strokeStyle = C.ink;
        g.lineWidth = 4;
        g.strokeRect(cx, cy, cw + 16, 24);
        g.fillStyle = C.ink;
        spaced(g, card, cx + 8, cy + 17, 1, 'left');

        // Frame: paper margin, 6 px black frame at 8 px, dashed cream rule inside.
        g.fillStyle = C.cream;
        g.fillRect(0, 0, UF.W, 8);
        g.fillRect(0, UF.H - 8, UF.W, 8);
        g.fillRect(0, 0, 8, UF.H);
        g.fillRect(UF.W - 8, 0, 8, UF.H);
        g.strokeStyle = C.ink;
        g.lineWidth = 6;
        g.strokeRect(11, 11, UF.W - 22, UF.H - 22);
        g.strokeStyle = C.cream;
        g.lineWidth = 1.6;
        g.setLineDash([6, 5]);
        g.strokeRect(19, 19, UF.W - 38, UF.H - 38);
        g.setLineDash([]);
      })
    );
  }

  // ------------------------------------------------------------ creatures
  // Knee just under the body line, pushed outward, so legs cut as angled
  // chevrons instead of vertical bars.
  function legPts(l) {
    const [hx, hy] = l.hip, [fx, fy] = l.foot;
    const dx = fx - hx;
    const sg = dx < -0.3 ? -1 : dx > 0.3 ? 1 : l.side ? -1 : 1;
    return [[hx, hy], [hx + dx * 0.35 + sg * 2.2, hy + 0.5], [fx, fy]];
  }

  function drawAnt(g, a, pose) {
    const b = UF.antBody(a.caste);
    b.reach = b.reach.map((r) => r * 1.4); // splayed legs read better as cut silhouettes
    const k = b.scale * SIZE;
    const queen = a.caste === 'queen', major = a.caste === 'major';
    g.save();
    UF.orient(g, a.x, a.y, a.heading || 0);
    g.scale(k, k);
    g.lineJoin = 'miter';
    g.lineCap = 'butt';

    const legs = UF.antLegs(b, pose ? (3 * Math.PI) / 2 : Math.PI / 2, { tucked: a.resting, strideMul: 1.2 });
    const legW = (queen ? 3.4 : 2.6) / k;
    const ants = UF.antAntennae(b);
    const parts = [];
    const ab = b.abdomen, th = b.thorax, hd = b.head, pt = b.petiole;
    const ell = (e, rx, ry) => { const p = new Path2D(); p.ellipse(e.x, e.y, rx, ry, 0, 0, Math.PI * 2); return p; };
    parts.push(ell(ab, ab.rx, ab.ry), ell(pt, pt.r * 1.2, pt.r * 1.3), ell(th, th.rx, th.ry));
    let head;
    if (major) {
      head = new Path2D();
      UF.roundRectPath(head, hd.x - hd.rx, hd.y - hd.ry, hd.rx * 2, hd.ry * 2, 1.2);
    } else {
      head = ell(hd, hd.rx, hd.ry);
    }
    parts.push(head);
    let carry = null;
    if (a.carrying) {
      carry = new Path2D();
      carry.arc(b.carry.x + 0.6, b.carry.y, b.carry.r * 1.1, 0, Math.PI * 2);
    }

    const strokeLegs = (col, w, nearOnly) => {
      g.strokeStyle = col;
      legs.forEach((l) => {
        if (nearOnly && l.side) return;
        g.lineWidth = l.side ? w * 0.75 : w;
        g.stroke(UF.polyPath(legPts(l), false));
      });
      g.lineWidth = w;
      ants.forEach((an) => g.stroke(UF.polyPath(an, false)));
      const mx = hd.x + hd.rx * 0.85, my = hd.y + hd.ry * 0.4, big = major ? 1.6 : 1;
      g.stroke(UF.polyPath([[mx, my], [mx + 2.4 * big, my + 0.2], [mx + 1.6 * big, my + 1.9 * big]], false));
    };
    // Cream cut around the whole silhouette first.
    const halo = 2.8 / k;
    strokeLegs(C.cream, legW + halo, true);
    g.strokeStyle = C.cream;
    g.lineWidth = halo;
    parts.forEach((p) => g.stroke(p));
    if (carry) g.stroke(carry);
    // Then the black block.
    strokeLegs(C.ink, legW);
    g.fillStyle = C.ink;
    parts.forEach((p) => g.fill(p));

    if (queen) {
      // Marigold panel on the gaster, cut with hatching.
      const panel = new Path2D();
      panel.ellipse(ab.x + 0.6, ab.y - ab.ry * 0.12, ab.rx * 0.7, ab.ry * 0.55, 0, 0, Math.PI * 2);
      g.fillStyle = C.marigold;
      g.fill(panel);
      UF.hatch(g, panel, { angle: 60, spacing: 1.6, width: 0.5, alpha: 1, color: C.ink, bbox: [ab.x - ab.rx, ab.y - ab.ry, ab.rx * 2, ab.ry * 2] });
      // Wing scars: two cream cuts on the thorax.
      g.strokeStyle = C.cream;
      g.lineWidth = 0.7;
      g.beginPath();
      g.moveTo(th.x - 1.4, th.y - th.ry * 0.5); g.lineTo(th.x - 0.2, th.y - th.ry * 0.05);
      g.moveTo(th.x + 0.2, th.y - th.ry * 0.6); g.lineTo(th.x + 1.3, th.y - th.ry * 0.1);
      g.stroke();
      // The crown: iconography, not biology.
      const cy = hd.y - hd.ry - 0.2;
      const crown = UF.polyPath([[hd.x - 2.1, cy], [hd.x - 2.4, cy - 2.6], [hd.x - 1.1, cy - 1.3], [hd.x, cy - 3.0], [hd.x + 1.1, cy - 1.3], [hd.x + 2.4, cy - 2.6], [hd.x + 2.1, cy]], true);
      g.fillStyle = C.marigold;
      g.fill(crown);
      g.strokeStyle = C.ink;
      g.lineWidth = 0.45;
      g.stroke(crown);
    }

    // One cream eye-dot.
    g.fillStyle = C.cream;
    g.beginPath();
    g.arc(hd.x + hd.rx * 0.32, hd.y - hd.ry * 0.25, (queen ? 0.55 : 1.05) * (major ? 0.9 : 1), 0, Math.PI * 2);
    g.fill();

    if (carry) {
      g.fillStyle = C.marigold;
      g.fill(carry);
      g.strokeStyle = C.ink;
      g.lineWidth = 1.2 / k * 1.4;
      g.stroke(carry);
      g.beginPath();
      g.moveTo(b.carry.x - 0.6, b.carry.y - 1);
      g.lineTo(b.carry.x + 1.4, b.carry.y + 0.8);
      g.stroke();
    }
    g.restore();
  }

  function drawSpider(g, sp, twitch) {
    g.save();
    g.translate(sp.x, sp.y);
    g.scale(-sp.facing, 1);
    g.lineJoin = 'miter';
    const ground = 26;
    const legs = [
      [[-11, 3], [-27, -11], [-50, ground]],
      [[-8, 4.5], [-18, -14], [-34, ground]],
      [[-3, 5], [10, -13], [21, ground]],
      [[0, 3.5], [25, -9], [45, ground]],
    ];
    if (twitch) { legs[0] = [[-11, 3], [-29, -16], [-53, ground - 8]]; legs[1][1] = [-19, -16]; }
    const body = () => {
      const p = new Path2D();
      p.ellipse(13, -3, 13, 11, -0.18, 0, Math.PI * 2);
      p.moveTo(1.5, 2);
      p.ellipse(-6, 2, 7.5, 6.5, 0, 0, Math.PI * 2);
      return p;
    };
    const strokeLegs = (col, w, off) => {
      g.strokeStyle = col;
      g.lineWidth = w;
      legs.forEach(([h, kn, f]) => g.stroke(UF.polyPath([[h[0] + off, h[1]], [kn[0] + off, kn[1]], [f[0] + off * 1.3, f[1]]], false)));
    };
    strokeLegs(C.cream, 2.6 + 2.8, 5);
    strokeLegs(C.cream, 2.6 + 2.8, 0);
    g.strokeStyle = C.cream;
    g.lineWidth = 5.6;
    g.stroke(body());
    strokeLegs(C.ink, 2.2, 5);
    strokeLegs(C.ink, 2.6, 0);
    g.fillStyle = C.ink;
    g.fill(body());
    // Cuts on the abdomen, and the only red on a creature: two eyes.
    g.strokeStyle = C.cream;
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(6, -9); g.lineTo(12, -6); g.lineTo(18, -9);
    g.moveTo(8, -3); g.lineTo(13, -0.5); g.lineTo(18, -3);
    g.stroke();
    g.fillStyle = C.red;
    [[-10, -0.5], [-6.5, -2.2]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 1.6, 0, Math.PI * 2); g.fill(); });
    g.restore();
  }

  function sprites(scene, s) {
    return cache.get('spr' + s, () => {
      const out = {};
      UF.creatures(scene).forEach((a) => {
        const ext = a.caste === 'queen' ? 70 : 34;
        const poses = a.resting ? [0] : [0, 1];
        out[a.key] = poses.map((pose) => UF.bakeRegion(s, a.x - ext, a.y - ext, ext * 2, ext * 2, (g) => drawAnt(g, a, pose)));
      });
      const sp = scene.spider;
      out.spider = [0, 1].map((tw) => UF.bakeRegion(s, sp.x - 64, sp.y - 34, 128, 70, (g) => drawSpider(g, sp, tw)));
      return out;
    });
  }

  function sun(g, t) {
    const cx = 478, cy = 36;
    const notch = Math.floor(t + 1e-6) % 24;
    g.save();
    g.translate(cx, cy);
    g.rotate((notch / 24) * Math.PI * 2);
    g.fillStyle = C.ink;
    g.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2, w = Math.PI / 12 * 0.75;
      g.moveTo(Math.cos(a - w) * 12, Math.sin(a - w) * 12);
      g.lineTo(Math.cos(a) * 21, Math.sin(a) * 21);
      g.lineTo(Math.cos(a + w) * 12, Math.sin(a + w) * 12);
    }
    g.fill();
    g.beginPath();
    g.arc(0, 0, 13, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = C.marigold;
    g.beginPath();
    g.arc(0, 0, 10, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = C.ink;
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.moveTo(Math.cos(a) * 6.5 + 1.1, Math.sin(a) * 6.5);
      g.arc(Math.cos(a) * 6.5, Math.sin(a) * 6.5, 1.1, 0, Math.PI * 2);
    }
    g.fill();
    g.restore();
  }

  function draw(ctx, scene, t) {
    const s = UF.scaleOf(ctx);
    const f = Math.floor(t * 8 + 1e-6);
    UF.drawBaked(ctx, env(scene, s));
    sun(ctx, t);
    const spr = sprites(scene, s);
    UF.creatures(scene).forEach((a) => {
      let dx = 0, dy = 0;
      if (a.carrying) {
        const bob = Math.round(UF.carryBob(scene, f / 8));
        const d = downVec(a.heading || 0);
        dx = d[0] * bob;
        dy = d[1] * bob;
      }
      UF.drawBaked(ctx, spr[a.key][a.resting ? 0 : f % 2], dx, dy);
    });
    UF.drawBaked(ctx, spr.spider[UF.spiderTwitch(scene, f / 8, 0.25)]);
  }

  UF.register('woodcut', { meta, fps: 8, draw });
})();
