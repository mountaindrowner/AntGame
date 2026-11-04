// The Hornet Queen (build 57): her grey paper nest hanging high on the Oak's south face, hornets wheeling
// round it, the queen on its flank; a diving hornet streaks to the climber it picked (a ring flashes there).
// Drawn each frame by SurfaceView._bosses (v is the view; ctx holds the frame's state and the shared decal and bar slots).
import * as THREE from 'three';
import SIM from '../../../sim/sim.js';
import { flashed } from '../surfaceKit.js';
import { psx, psxBasic } from '../../ps1/materials.js';

const { T } = SIM;

export function drawHornets(v, ctx) {
  const { s, t, B } = ctx;
  const hq = B.hornets;
  if (hq && !v.paper && v.oakL) {
    const L = v.oakL, R = L.r * T * (1.1 - 0.28 * SIM.CROWN / 1800);
    v.paper = new THREE.Group(); v.paper.position.set(L.x * T, SIM.CROWN + 20, L.y * T + R + 26);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10).scale(34, 46, 30), psx({ color: '#b8b0a0' }));
    for (let k = 0; k < 5; k++) { const band = new THREE.Mesh(new THREE.TorusGeometry(31 - Math.abs(k - 2) * 7, 2.2, 5, 18).rotateX(Math.PI / 2), psx({ color: '#8a8070' })); band.position.y = (k - 2) * 15; v.paper.add(band); }
    const hole = new THREE.Mesh(new THREE.CircleGeometry(8, 10).rotateX(Math.PI / 2), psxBasic({ color: '#120c08' })); hole.position.y = -46;
    v.paper.add(ball, hole); v.dyn.add(v.paper);
    v.hornetMat = psx({ vertexColors: true });
    v.hornets = Array.from({ length: 7 }, () => { const m = new THREE.Mesh(v.bugGeo.wsFly[0], v.hornetMat); m.scale.setScalar(3.4); v.dyn.add(m); return m; });
    v.hornetQ = new THREE.Mesh(v.bugGeo.wsRest, psx({ vertexColors: true, color: '#ffd080' })); v.hornetQ.scale.setScalar(9); v.dyn.add(v.hornetQ);
  }
  if (v.paper) {
    const show = hq && (!hq.dead || s.t - hq.deadT < 6); v.paper.visible = v.hornetQ.visible = !!show; for (const m of v.hornets) m.visible = !!show && !hq.dead;
    if (show) {
      const P0 = v.paper.position, awake = hq.mode === 'fight';
      v.hornetQ.position.set(P0.x + 30, P0.y + 10 + Math.sin(t * 3) * 3, P0.z + 12); v.hornetQ.rotation.set(0, -Math.PI / 2, hq.dead ? Math.PI : 0);
      v.hornetQ.material.color.set(!hq.dead && flashed(s, hq) && Math.sin(t * 40) > 0.3 ? '#ffc8b8' : '#ffd080');
      const diver = hq.dive && s.ants.find((o) => o.id === hq.dive.id);
      v.hornets.forEach((m, i) => {
        m.geometry = v.bugGeo.wsFly[Math.floor(t * 30 + i) % 2];
        if (i === 0 && diver && diver.climb != null && v.oakL) { const u = Math.min(1, hq.dive.t / hq.dive.at), L = v.oakL, R = L.r * T * (1.1 - 0.28 * diver.climb / 1800); m.position.set(P0.x + (diver.x - P0.x) * u, P0.y + (diver.climb - P0.y) * u, P0.z + (L.y * T + R + 6 - P0.z) * u); return; }
        const a = t * (awake ? 2.2 : 0.9) + (i / 7) * Math.PI * 2, r = (awake ? 70 : 50) + 12 * Math.sin(t * 1.3 + i);
        m.position.set(P0.x + Math.cos(a) * r, P0.y + Math.sin(t * 2 + i) * 30, P0.z + 20 + Math.sin(a) * r * 0.5); m.rotation.set(0, -a, 0);
      });
      if (diver && v.oakL) { ctx.decal({ kind: 'ring', x: diver.x, y: diver.y, r: 0.8 * T, t: hq.dive.t, at: hq.dive.at }, '#ff7a20'); v.hornets[0].visible = true; }
      if (!hq.dead && hq.hp < hq.maxHp) ctx.bar(P0.x, P0.z - 40, P0.y + 70, hq.hp / hq.maxHp, '#e0a020');
    }
  }
}
