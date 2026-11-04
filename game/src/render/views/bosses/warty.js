// Old Warty (build 31): the strike toad's model, twice the size, darker. It turns to face, lashes its
// tongue down the lane, leaps in an arc, puffs up in its second phase; a swallowed ant bulges its throat.
// Drawn each frame by SurfaceView._bosses (v is the view; ctx holds the frame's state and the shared decal and bar slots).
import SIM from '../../../sim/sim.js';
import { flashed, wrapAngle } from '../surfaceKit.js';
import { toad } from '../../models/toad.js';

const { T } = SIM;

export function drawWarty(v, ctx) {
  const { s, t, fdt, B, tele } = ctx;
  const tw = B.toad, WK = 96;
  if (tw && !v.warty) {
    v.warty = toad(); v.warty.group.scale.setScalar(WK); v.dyn.add(v.warty.group);
    v.wartyMats = []; v.warty.group.traverse((o) => { if (o.material && !v.wartyMats.includes(o.material)) v.wartyMats.push(o.material); });
    v.wartyAnim = { yaw: 0 };
  }
  if (v.warty) {
    const W2 = v.warty, WA = v.wartyAnim, show = tw && (!tw.dead || s.t - tw.deadT < 14);
    W2.group.visible = !!show;
    if (show) {
      tele(tw);
      const aim = Math.atan2(tw.dy || 0, tw.dx ?? 1); WA.yaw += wrapAngle(aim - WA.yaw) * Math.min(1, fdt * 8);
      let y = 0; if (tw.leap) y = Math.sin(Math.PI * Math.min(1, tw.leap.t / 0.5)) * 70; if (tw.dead) y = -Math.max(0, (s.t - tw.deadT - 10) / 4) * 30;
      W2.group.position.set(tw.x, y, tw.y); W2.group.rotation.set(tw.dead ? Math.PI : 0, -WA.yaw, 0);
      const lash = tw.lashAt != null && s.t - tw.lashAt < 0.35 ? Math.sin(Math.PI * (s.t - tw.lashAt) / 0.35) : 0;
      W2.tongue.visible = lash > 0; if (lash > 0) W2.tongue.scale.set(Math.max(0.4, (tw.lashLen || 2 * T) / WK - 1.05) * lash, 1, 1);
      const puff = tw.puffT > 0 ? 1.28 : 1, gulp = tw.held ? 1.5 + 0.15 * Math.sin(t * 9) : 1 + 0.4 * Math.max(0, Math.sin(t * 5));
      W2.body.scale.set(puff, puff * (1 + 0.02 * Math.sin(t * 2)), puff); W2.throat.scale.set(1, gulp, 0.6 + 0.4 * gulp);
      const col = !tw.dead && flashed(s, tw) && Math.sin(t * 40) > 0.3 ? '#ffc8b8' : tw.puffT > 0 ? '#e8d890' : '#b8c0a8'; // bitten all the time: a flicker, not solid red
      for (const m of v.wartyMats) m.color.set(col);
      if (!tw.dead && tw.hp < tw.maxHp) ctx.bar(tw.x, tw.y, 70 + y, tw.hp / tw.maxHp, '#b04ad0');
    }
  }
}
