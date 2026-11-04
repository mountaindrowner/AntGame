// The giant centipede (build 36): the head where it is, the rest of its segments laid back along the
// path its head took; their legs ripple. It curls round itself when it coils.
// Drawn each frame by SurfaceView._bosses (v is the view; ctx holds the frame's state and the shared decal and bar slots).
import * as THREE from 'three';
import { flashed } from '../surfaceKit.js';
import { CENTI_FRAMES, centipedeGeometry } from '../../models/bosses.js';
import { psx } from '../../ps1/materials.js';


export function drawCentipede(v, ctx) {
  const { s, t, B, tele } = ctx;
  const cp = B.centipede;
  if (cp && !v.centi) {
    const mat = psx({ vertexColors: true });
    v.centiGeo = { head: centipedeGeometry('head'), seg: Array.from({ length: CENTI_FRAMES }, (_, f) => centipedeGeometry('seg', f)), tail: centipedeGeometry('tail') };
    // Two plates for each of its six segments, plus the head.
    v.centi = Array.from({ length: 13 }, (_, i) => { const m = new THREE.Mesh(i ? v.centiGeo.seg[0] : v.centiGeo.head, mat); m.visible = false; v.dyn.add(m); return m; });
    v.centiMat = mat;
  }
  if (v.centi) {
    const show = cp && (!cp.dead || s.t - cp.deadT < 14), K = 10, gap = 20;
    for (const m of v.centi) m.visible = false;
    if (show) {
      tele(cp);
      const n = 1 + 2 * (cp.dead ? 6 : Math.max(1, cp.segs ?? 6)), coil = cp.atk && cp.atk.kind === 'ring';
      const path = (cp.path || []).slice().reverse(); const pts = [[cp.x, cp.y]];
      // Walk back along the path, one segment every gap pixels.
      let acc = 0, prev = [cp.x, cp.y];
      for (const p of path) { const d = Math.hypot(p[0] - prev[0], p[1] - prev[1]); acc += d; prev = p; if (acc >= gap) { pts.push(p); acc = 0; if (pts.length >= n) break; } }
      while (pts.length < n) { const l = pts[pts.length - 1], a = Math.atan2(-(cp.dy || 0), -(cp.dx ?? 1)) + (coil ? pts.length * 0.9 : 0); pts.push([l[0] + Math.cos(a) * gap, l[1] + Math.sin(a) * gap]); }
      if (coil) for (let i = 1; i < pts.length; i++) { const a = Math.atan2(-(cp.dy || 0), -(cp.dx ?? 1)) + i * 0.62, rr = 12 + i * 2.4; pts[i] = [cp.x + Math.cos(a) * rr, cp.y + Math.sin(a) * rr]; }
      const col = !cp.dead && flashed(s, cp) && Math.sin(t * 40) > 0.3 ? '#ffc8b8' : coil ? '#fff0c0' : '#ffffff';
      v.centiMat.color.set(col);
      for (let i = 0; i < n && i < 13; i++) {
        const m = v.centi[i], [x, z] = pts[i], ahead = i ? pts[i - 1] : [cp.x + (cp.dx ?? 1) * 10, cp.y + (cp.dy || 0) * 10];
        m.visible = true;
        if (i) m.geometry = i === n - 1 && n > 1 ? v.centiGeo.tail : v.centiGeo.seg[(Math.floor(t * 14) + i) % CENTI_FRAMES]; // a wave of legs running back
        m.position.set(x, cp.dead ? -Math.max(0, (s.t - cp.deadT - 10) / 4) * 10 : 0, z);
        m.rotation.set(cp.dead ? Math.PI : 0, -Math.atan2(ahead[1] - z, ahead[0] - x), 0); m.scale.setScalar(K);
      }
      if (!cp.dead && cp.hp < cp.maxHp) ctx.bar(cp.x, cp.y, 40, cp.hp / cp.maxHp, '#b04ad0');
    }
  }
}
