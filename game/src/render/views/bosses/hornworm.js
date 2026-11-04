// Hornworm.
// Drawn each frame by SurfaceView._bosses (v is the view; ctx holds the frame's state and the shared decal and bar slots).
import { HIT, flashed } from '../surfaceKit.js';
import { HORN_SEGMENTS } from '../../models/bosses.js';


export function drawHornworm(v, ctx) {
  const { s, t, B, tele } = ctx;
  const hw = B.hornworm;
  const showHw = hw && (!hw.dead || s.t - hw.deadT < 14);
  v.horn.forEach((m) => (m.visible = !!showHw));
  if (showHw) {
    tele(hw);
    const gap = 13, n = HORN_SEGMENTS, path = v.hornPath, R = 9.5;
    if (!path.length || Math.hypot(path[0][0] - hw.x, path[0][1] - hw.y) > 80) { path.length = 0; for (let i = 0; i <= n + 2; i++) path.push([hw.x - (hw.dx || 1) * i * gap, hw.y - (hw.dy || 0) * i * gap]); }
    else if (Math.hypot(path[0][0] - hw.x, path[0][1] - hw.y) > 1) { path.unshift([hw.x, hw.y]); v.hornPhase = (v.hornPhase || 0) + 0.06; v.hornMoved = t; }
    const pts = [[hw.x, hw.y]]; let acc = 0, want = gap, prev = path[0];
    for (let i = 1; i < path.length && pts.length < n; i++) { const cur = path[i], l = Math.hypot(cur[0] - prev[0], cur[1] - prev[1]); while (pts.length < n && acc + l >= want) { const u = (want - acc) / l; pts.push([prev[0] + (cur[0] - prev[0]) * u, prev[1] + (cur[1] - prev[1]) * u]); want += gap; } acc += l; prev = cur; if (acc > gap * (n + 4)) { path.length = i + 1; break; } }
    while (pts.length < n) { const p = pts[pts.length - 1]; pts.push([p[0] - gap, p[1]]); }
    const crawl = t - (v.hornMoved || -9) < 0.4, dead = hw.dead ? Math.min(1, (s.t - hw.deadT) / 0.8) : 0, sink = hw.dead ? Math.max(0, (s.t - hw.deadT - 10) / 4) : 0;
    // Rearing: the front rises as the thrash winds up.
    const rear = hw.atk && hw.atk.kind === 'ring' ? Math.sin(Math.min(1, hw.atk.t / hw.atk.at) * Math.PI * 0.5) : 0;
    const flash = !hw.dead && flashed(s, hw);
    v.bossMat.color.set(flash ? HIT : '#ffffff');
    v.horn.forEach((m, i) => {
      const a = pts[Math.max(0, i - 1)], c = pts[Math.min(n - 1, i + 1)], yaw = Math.atan2(-(a[1] - c[1]), a[0] - c[0]);
      const r = R * (i === 0 ? 0.9 : i > n - 4 ? 1 - (i - (n - 4)) * 0.07 : 1), wave = crawl ? Math.max(0, Math.sin((v.hornPhase || 0) * (hw.phase === 2 ? 9 : 6) + i * 0.7)) * 3 : 0;
      const up = rear * Math.max(0, 5 - i) * 11 + wave;
      m.position.set(pts[i][0], r * (1 - dead * 0.5) + up - sink * 10, pts[i][1]);
      m.rotation.set(dead * (i % 2 ? 0.3 : -0.3), yaw || 0, i < 5 ? rear * 0.7 : 0);
      m.scale.set(r * (1 + dead * 0.2), r * (1 - dead * 0.45), r * (1 + dead * 0.15));
    });
    if (!hw.dead && hw.hp < hw.maxHp) ctx.bar(hw.x, hw.y, 40, hw.hp / hw.maxHp, '#b04ad0');
  }
}
