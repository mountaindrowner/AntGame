// The Duke (build 54): Old Warty's model, half again bigger and darker, mud-green. He sinks out of sight when
// he dives (the ring shows where he'll come up), and a gulped crew swells his throat.
// Drawn each frame by SurfaceView._bosses (v is the view; ctx holds the frame's state and the shared decal and bar slots).
import SIM from '../../../sim/sim.js';
import { flashed, wrapAngle } from '../surfaceKit.js';
import { toad } from '../../models/toad.js';

const { T } = SIM;

export function drawDuke(v, ctx) {
  const { s, t, fdt, B, tele } = ctx;
  const dk = B.duke, DK = 150;
  if (dk && !v.duke) {
    v.duke = toad(); v.duke.group.scale.setScalar(DK); v.dyn.add(v.duke.group);
    v.dukeMats = []; v.duke.group.traverse((o) => { if (o.material) { o.material = o.material.clone(); v.dukeMats.push(o.material); } });
    v.dukeAnim = { yaw: 0, sink: 0 };
  }
  if (v.duke) {
    const D2 = v.duke, DA = v.dukeAnim, show = dk && (!dk.dead || s.t - dk.deadT < 14);
    D2.group.visible = !!show;
    if (show) {
      tele(dk);
      const aim = Math.atan2(dk.dy || 0, dk.dx ?? 1); DA.yaw += wrapAngle(aim - DA.yaw) * Math.min(1, fdt * 6);
      DA.sink += ((dk.under ? 1 : 0) - DA.sink) * Math.min(1, fdt * (dk.under ? 4 : 10));
      let y = -DA.sink * 110; if (dk.dead) y = -Math.max(0, (s.t - dk.deadT - 10) / 4) * 40;
      D2.group.position.set(dk.x, y, dk.y); D2.group.rotation.set(dk.dead ? Math.PI : 0, -DA.yaw, 0);
      const lash = dk.lashAt != null && s.t - dk.lashAt < 0.35 ? Math.sin(Math.PI * (s.t - dk.lashAt) / 0.35) : 0;
      D2.tongue.visible = lash > 0; if (lash > 0) D2.tongue.scale.set(Math.max(0.4, (dk.lashLen || 2 * T) / DK - 1.05) * lash, 1, 1);
      const gulp = dk.belly ? 1.7 + 0.2 * Math.sin(t * 9) : 1 + 0.4 * Math.max(0, Math.sin(t * 4));
      D2.body.scale.set(1, 1 + 0.02 * Math.sin(t * 2), 1); D2.throat.scale.set(1, gulp, 0.6 + 0.4 * gulp);
      const col = !dk.dead && flashed(s, dk) && Math.sin(t * 40) > 0.3 ? '#ffc8b8' : dk.pinned ? '#c8b890' : '#7a8a58';
      for (const m of v.dukeMats) m.color.set(col);
      if (!dk.dead && dk.hp < dk.maxHp) ctx.bar(dk.x, dk.y, 100 + Math.max(0, y), dk.hp / dk.maxHp, '#2a8a4a');
    }
  }
}
