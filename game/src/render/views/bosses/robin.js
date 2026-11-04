// The Old Robin (build 30): hops and pecks on the lawn; in its second phase it circles overhead
// (its shadow on the grass) and swoops down a lane. It flies off for good when beaten.
// Drawn each frame by SurfaceView._bosses (v is the view; ctx holds the frame's state and the shared decal and bar slots).
import * as THREE from 'three';
import { flashed, wrapAngle } from '../surfaceKit.js';
import { robin } from '../../models/bird.js';
import { psxBasic } from '../../ps1/materials.js';


export function drawRobin(v, ctx) {
  const { s, t, fdt, B, tele } = ctx;
  const rb = B.robin;
  if (rb && !v.oldRobin) {
    v.oldRobin = robin(); v.oldRobin.group.scale.setScalar(130); v.dyn.add(v.oldRobin.group);
    v.oldRobinMats = []; v.oldRobin.group.traverse((o) => { if (o.material && !v.oldRobinMats.includes(o.material)) v.oldRobinMats.push(o.material); });
    v.oldRobinShadow = new THREE.Mesh(new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2), psxBasic({ color: '#000000', transparent: true, opacity: 0.3, depthWrite: false }));
    v.dyn.add(v.oldRobinShadow); v.robinAnim = { yaw: 0, y: 0 };
  }
  if (v.oldRobin) {
    const R = v.oldRobin, RA = v.robinAnim, showRb = rb && (!rb.dead || s.t - rb.deadT < 4);
    R.group.visible = !!showRb; v.oldRobinShadow.visible = false;
    if (showRb) {
      tele(rb);
      const aim = Math.atan2(rb.dy || 0, rb.dx || 1); RA.yaw += wrapAngle(aim - RA.yaw) * Math.min(1, fdt * 6);
      let y = 0;
      if (rb.dead) y = (s.t - rb.deadT) * 220;
      else if (rb.swoop) y = 100 * (1 - Math.min(1, rb.swoop.t / 0.6));
      else if (rb.air) y = 100;
      else if (rb.hop) y = Math.sin(Math.PI * Math.min(1, rb.hop.t / 0.35)) * 34;
      RA.y += (y - RA.y) * (rb.swoop || rb.hop || rb.dead ? 1 : Math.min(1, fdt * 5));
      R.group.position.set(rb.x, RA.y, rb.y); R.group.rotation.set(0, -RA.yaw, 0);
      const peck = rb.peckAt != null && s.t - rb.peckAt < 0.35 ? Math.sin(Math.PI * (s.t - rb.peckAt) / 0.35) : rb.atk && rb.atk.what === 'peck' ? 0.25 : 0;
      R.body.rotation.z = -0.75 * peck; R.head.rotation.z = -0.4 * peck;
      const flap = RA.y > 4 || rb.dead || (rb.beatAt != null && s.t - rb.beatAt < 0.6) || (rb.atk && rb.atk.what === 'beat');
      for (const w of R.wings) w.pivot.rotation.x = flap ? w.s * (0.2 + Math.sin(t * 28) * 0.9) : w.s * (rb.pinned ? 0.35 + 0.15 * Math.sin(t * 20) : 0.05);
      const col = !rb.dead && flashed(s, rb) && Math.sin(t * 40) > 0.3 ? '#ffc8b8' : rb.pinned ? '#ffe2a0' : '#ffffff';
      for (const m of v.oldRobinMats) m.color.set(col);
      if (RA.y > 6) { const near = 1 - Math.min(1, RA.y / 300); v.oldRobinShadow.visible = true; v.oldRobinShadow.position.set(rb.x, 0.8, rb.y); v.oldRobinShadow.scale.setScalar(70 * (0.7 + 0.3 * near)); v.oldRobinShadow.material.opacity = 0.15 + 0.3 * near; }
      if (!rb.dead && rb.hp < rb.maxHp) ctx.bar(rb.x, rb.y, 70 + RA.y, rb.hp / rb.maxHp, '#b04ad0');
    }
  }
}
