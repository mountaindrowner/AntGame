// Nevermore (build 55; build 59: his own raven model). Aloft he circles high
// with his shadow below; a snatched ant dangles; on the ground he struts and pecks like the Old Robin.
// Drawn each frame by SurfaceView._bosses (v is the view; ctx holds the frame's state and the shared decal and bar slots).
import * as THREE from 'three';
import { flashed, wrapAngle } from '../surfaceKit.js';
import { raven } from '../../models/wildBosses.js';
import { psxBasic } from '../../ps1/materials.js';


export function drawNevermore(v, ctx) {
  const { s, t, fdt, B, tele } = ctx;
  const cw = B.crow;
  if (cw && !v.oldBlack) {
    v.oldBlack = raven(); v.oldBlack.group.scale.setScalar(165); v.dyn.add(v.oldBlack.group);
    v.oldBlackMats = []; v.oldBlack.group.traverse((o) => { if (o.material && o.material.vertexColors) { o.material = o.material.clone(); v.oldBlackMats.push(o.material); } });
    v.oldBlackShadow = new THREE.Mesh(new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2), psxBasic({ color: '#000000', transparent: true, opacity: 0.3, depthWrite: false }));
    v.dyn.add(v.oldBlackShadow); v.crowAnim = { yaw: 0, y: 0 };
  }
  if (v.oldBlack) {
    const R = v.oldBlack, RA = v.crowAnim, show = cw && (!cw.dead || s.t - cw.deadT < 6);
    R.group.visible = !!show; v.oldBlackShadow.visible = false;
    if (show) {
      tele(cw);
      const aim = cw.air ? Math.atan2(Math.cos(cw.ang || 0), -Math.sin(cw.ang || 0)) : Math.atan2(cw.dy || 0, cw.dx || 1); RA.yaw += wrapAngle(aim - RA.yaw) * Math.min(1, fdt * 6);
      let y = 0; if (cw.dead) y = 0; else if (cw.air && cw.mode === 'fight') y = 85; else if (cw.hop) y = Math.sin(Math.PI * Math.min(1, cw.hop.t / 0.35)) * 40;
      RA.y += (y - RA.y) * (cw.hop ? 1 : Math.min(1, fdt * 3));
      R.group.position.set(cw.x, RA.y, cw.y); R.group.rotation.set(cw.dead ? 1.4 : 0, -RA.yaw, 0);
      const peck = cw.peckAt != null && s.t - cw.peckAt < 0.35 ? Math.sin(Math.PI * (s.t - cw.peckAt) / 0.35) : cw.atk && cw.atk.what === 'peck' ? 0.25 : 0;
      R.body.rotation.z = -0.75 * peck; R.head.rotation.z = -0.4 * peck;
      const flap = RA.y > 4 || (cw.beatAt != null && s.t - cw.beatAt < 0.6) || (cw.atk && cw.atk.what === 'beat');
      for (const w of R.wings) w.pivot.rotation.x = flap ? w.s * (0.2 + Math.sin(t * 22) * 0.9) : w.s * (cw.pinned ? 0.35 + 0.15 * Math.sin(t * 20) : 0.05);
      const col = !cw.dead && flashed(s, cw) && Math.sin(t * 40) > 0.3 ? '#ffc8b8' : cw.pinned ? '#d8d0b0' : '#ffffff'; R.glint.visible = Math.sin(t * 3) > -0.6;
      for (const m of v.oldBlackMats) m.color.set(col);
      if (RA.y > 6) { v.oldBlackShadow.visible = true; v.oldBlackShadow.position.set(cw.x, 0.8, cw.y); v.oldBlackShadow.scale.setScalar(150); v.oldBlackShadow.material.opacity = 0.3; }
      if (!cw.dead && cw.hp < cw.maxHp) ctx.bar(cw.x, cw.y, 80 + RA.y, cw.hp / cw.maxHp, '#3a3a5a');
    }
  }
}
