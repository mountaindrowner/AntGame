// The praying mantis (build 34): nearly invisible in the hedge until you're close; it sways before it
// strikes, flings its forelegs out, and eats with them clutched to its jaws.
// Drawn each frame by SurfaceView._bosses (v is the view; ctx holds the frame's state and the shared decal and bar slots).
import * as THREE from 'three';
import { flashed, wrapAngle } from '../surfaceKit.js';
import { mantisGeometry } from '../../models/bosses.js';
import { psx } from '../../ps1/materials.js';


export function drawMantis(v, ctx) {
  const { s, t, fdt, B, tele } = ctx;
  const mt = B.mantis;
  if (mt && !v.mantis) {
    v.mantisGeo = { stand: mantisGeometry('stand'), strike: mantisGeometry('strike'), eat: mantisGeometry('eat') };
    v.mantisMat = psx({ vertexColors: true, transparent: true, opacity: 1 });
    v.mantis = new THREE.Mesh(v.mantisGeo.stand, v.mantisMat); v.mantis.rotation.order = 'YZX'; v.dyn.add(v.mantis); v.mantisAnim = { yaw: 0, see: 0 };
  }
  if (v.mantis) {
    const M = v.mantis, MA = v.mantisAnim, show = mt && (!mt.dead || s.t - mt.deadT < 14);
    M.visible = !!show;
    if (show) {
      tele(mt);
      const aim = Math.atan2(mt.dy || 0, mt.dx ?? 1); MA.yaw += wrapAngle(aim - MA.yaw) * Math.min(1, fdt * 6);
      MA.see += ((mt.hidden && !mt.dead ? 0.12 : 1) - MA.see) * Math.min(1, fdt * 3);
      const striking = mt.strikeAt != null && s.t - mt.strikeAt < 0.3;
      M.geometry = mt.eat ? v.mantisGeo.eat : striking ? v.mantisGeo.strike : v.mantisGeo.stand;
      const sway = mt.atk ? Math.sin(t * 14) * 0.18 - 0.12 : mt.hidden ? Math.sin(t * 1.3) * 0.04 : 0;
      let y = 0; if (mt.hop) y = Math.sin(Math.PI * Math.min(1, mt.hop.t / 0.45)) * 40;
      M.position.set(mt.x, y, mt.y); M.rotation.set(mt.dead ? 1.3 : 0, MA.yaw, mt.dead ? 0 : sway); M.scale.setScalar(5);
      v.mantisMat.opacity = MA.see; v.mantisMat.depthWrite = MA.see > 0.9;
      v.mantisMat.color.set(!mt.dead && flashed(s, mt) && Math.sin(t * 40) > 0.3 ? '#ffc8b8' : mt.eat ? '#fff0b0' : '#ffffff');
      if (!mt.dead && !mt.hidden && mt.hp < mt.maxHp) ctx.bar(mt.x, mt.y, 60 + y, mt.hp / mt.maxHp, '#b04ad0');
    }
  }
}
