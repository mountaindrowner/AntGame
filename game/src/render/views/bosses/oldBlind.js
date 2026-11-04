// Old Blind (build 58): a huge velvet-dark mole, pink star nose, pale shovel claws, eyes a pinprick of green.
// Under the earth, only a ridge of dirt moving toward your ants.
// Drawn each frame by SurfaceView._bosses (v is the view; ctx holds the frame's state and the shared decal and bar slots).
import * as THREE from 'three';
import { flashed, wrapAngle } from '../surfaceKit.js';
import { mole } from '../../models/wildBosses.js';
import { psx } from '../../ps1/materials.js';


export function drawOldBlind(v, ctx) {
  const { s, t, fdt, B, tele } = ctx;
  const ob = B.blind;
  if (ob && !v.mole) { // build 59: the real mole, a heaving ridge and a trail of turned earth, clods flung when it erupts
    const M = mole(); M.group.scale.setScalar(0.8); M.mats = []; M.group.traverse((o) => { if (o.material && o.material.vertexColors && !M.mats.includes(o.material)) M.mats.push(o.material); });
    const dirt = psx({ vertexColors: true }), ridgeGeo = new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(70, 22, 46);
    { const c = new Float32Array(ridgeGeo.attributes.position.count * 3); for (let k = 0; k < c.length; k += 3) { const g = 0.32 + ((k * 7919) % 13) / 60; c[k] = g * 1.1; c[k + 1] = g * 0.78; c[k + 2] = g * 0.52; } ridgeGeo.setAttribute('color', new THREE.BufferAttribute(c, 3)); }
    M.ridge = new THREE.Mesh(ridgeGeo, dirt);
    M.trail = Array.from({ length: 18 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(16, 7, 13), psx({ color: '#5a3e26' })); m.visible = false; v.dyn.add(m); return m; });
    M.clods = Array.from({ length: 22 }, (_, i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(7, 6, 7), psx({ color: i % 3 ? '#6a4a2e' : '#4a3220' })); m.visible = false; v.dyn.add(m); return m; });
    M.hist = []; M.histT = 0; v.mole = M; v.dyn.add(M.group, M.ridge); v.moleAnim = { yaw: 0 };
  }
  if (v.mole) {
    const M = v.mole, MA = v.moleAnim, show = ob && (!ob.dead || s.t - ob.deadT < 12), under = show && ob.under && !ob.dead && ob.mode === 'fight';
    M.group.visible = !!show && (!ob.under || ob.dead); M.ridge.visible = under;
    if (show) {
      tele(ob);
      const aim = Math.atan2(ob.dy || 0, ob.dx ?? 1); MA.yaw += wrapAngle(aim - MA.yaw) * Math.min(1, fdt * 5);
      const rise = ob.landAt != null ? Math.min(1, (s.t - ob.landAt) / 0.4) : 1;
      M.group.position.set(ob.x, ob.dead ? -Math.max(0, s.t - ob.deadT - 6) * 14 : -90 * (1 - rise), ob.y); M.group.rotation.set(0, -MA.yaw, ob.dead ? Math.PI / 2 : 0);
      M.ridge.position.set(ob.x, 0, ob.y); M.ridge.rotation.y = -MA.yaw; M.ridge.scale.y = 1 + 0.25 * Math.sin(t * 11);
      // The trail of turned earth behind the ridge, fading.
      M.histT += fdt; if (under && M.histT > 0.25) { M.histT = 0; M.hist.unshift({ x: ob.x, y: ob.y, t }); M.hist.length = Math.min(M.hist.length, M.trail.length); }
      M.trail.forEach((m, i) => { const h = M.hist[i]; m.visible = !!h && t - h.t < 6; if (h) { m.position.set(h.x, 0, h.y); m.scale.setScalar(1 - (t - h.t) / 6); } });
      // Eruption: clods flung out in arcs.
      const e = ob.landAt != null ? s.t - ob.landAt : 9;
      M.clods.forEach((m, i) => { m.visible = e < 1.1; if (m.visible) { const a = i * 2.4, sp = 90 + (i % 5) * 30; m.position.set(ob.x + Math.cos(a) * sp * e, Math.max(0, 160 * e - 260 * e * e), ob.y + Math.sin(a) * sp * e); m.rotation.set(e * 9 + i, e * 7, 0); } });
      const sw = ob.swipeAt != null && s.t - ob.swipeAt < 0.3 ? Math.sin(Math.PI * (s.t - ob.swipeAt) / 0.3) : ob.atk && ob.atk.kind === 'lane' ? -0.3 : 0;
      M.claws.forEach((c, i) => { c.position.x = c.userData.bx + sw * 34; c.rotation.y = (i ? 1 : -1) * (0.35 - sw * 0.5); });
      M.veins.color.setRGB(0.35 + 0.3 * Math.sin(t * 3), 1, 0.35 + 0.25 * Math.sin(t * 3));
      M.nose.rotation.x = t * 2.5; M.nose.scale.setScalar(1 + 0.15 * Math.sin(t * 16));
      M.eye.visible = Math.sin(t * 2.2) > -0.7;
      const hit = !ob.dead && flashed(s, ob) && Math.sin(t * 40) > 0.3; for (const m of M.mats) m.color.set(hit ? '#ffc8b8' : '#ffffff');
      if (!ob.dead && ob.hp < ob.maxHp) ctx.bar(ob.x, ob.y, 150, ob.hp / ob.maxHp, '#7dff6a');
    }
  }
}
