// The black widow (build 35): hangs in her web over the ground; the web is silver lines from the
// middle to its four anchors and three rings between; cut anchors leave loose threads. On the floor
// she crawls. Ants stuck in silk wear a white ring.
// Drawn each frame by SurfaceView._bosses (v is the view; ctx holds the frame's state and the shared decal and bar slots).
import * as THREE from 'three';
import { flashed, wrapAngle } from '../surfaceKit.js';
import { widowGeometry } from '../../models/bosses.js';
import { PROPS } from '../../models/props.js';
import { psx } from '../../ps1/materials.js';

const tmpV = new THREE.Vector3(), tmpQ2 = new THREE.Quaternion();

export function drawWidow(v, ctx) {
  const { s, t, fdt, B, tele } = ctx;
  const wd = B.widow;
  if (wd && !v.widow) {
    v.widowGeo = { hang: widowGeometry('hang'), bite: widowGeometry('bite') };
    v.widow = new THREE.Mesh(v.widowGeo.hang, psx({ vertexColors: true })); v.widow.rotation.order = 'YZX'; v.dyn.add(v.widow);
    v.webLines = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#e8eef4', transparent: true, opacity: 0.75 })); v.dyn.add(v.webLines);
    v.widowAnim = { yaw: 0, y: 30, key: '' };
  }
  if (v.widow) {
    const M = v.widow, WA = v.widowAnim, show = wd && (!wd.dead || s.t - wd.deadT < 14);
    M.visible = !!show; v.webLines.visible = !!(show && wd.web && !wd.grounded && !wd.dead);
    if (show) {
      tele(wd);
      const aim = Math.atan2(wd.dy || 0, wd.dx ?? 1); WA.yaw += wrapAngle(aim - WA.yaw) * Math.min(1, fdt * 6);
      const up = !wd.grounded && !wd.dead ? 30 : 0; WA.y += (up - WA.y) * Math.min(1, fdt * (up ? 2 : 10));
      let y = WA.y; if (wd.atk && wd.atk.what === 'drop') y += Math.min(1, wd.atk.t / wd.atk.at) * 60;
      const biting = (wd.biteAt != null && s.t - wd.biteAt < 0.3) || (wd.atk && wd.atk.what === 'bite');
      M.geometry = biting ? v.widowGeo.bite : v.widowGeo.hang;
      M.position.set(wd.x, y, wd.y); M.rotation.set(wd.dead ? Math.PI : 0, WA.yaw, 0); M.scale.setScalar(4.2);
      M.material.color.set(!wd.dead && flashed(s, wd) && Math.sin(t * 40) > 0.3 ? '#ffc8b8' : '#ffffff');
      // The web, rebuilt when its middle or its anchors change.
      if (wd.web && !wd.grounded) {
        const Wb = wd.web, key = Math.round(Wb.x) + ',' + Math.round(Wb.y) + ':' + Wb.anchors.map((a) => (a.hp > 0 ? 1 : 0)).join('');
        if (WA.key !== key) {
          WA.key = key; const pts = [], h = 26, cx = Wb.x, cz = Wb.y;
          const rim = (k) => { const out = []; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + 0.4, an = Wb.anchors[Math.floor(i / 2)], rr = (i % 2 ? 0.8 : 1) * Math.hypot(an.x - cx, an.y - cz) * k; out.push([cx + Math.cos(a) * rr, h * (1 - k * 0.7), cz + Math.sin(a) * rr]); } return out; };
          for (const k of [0.35, 0.65, 0.95]) { const R = rim(k); for (let i = 0; i < 8; i++) pts.push(...R[i], ...R[(i + 1) % 8]); }
          for (const an of Wb.anchors) { if (an.hp > 0) pts.push(cx, h, cz, an.x, 1, an.y); else pts.push(cx, h, cz, cx + (an.x - cx) * 0.4, h * 0.4, cz + (an.y - cz) * 0.4); }
          for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + 0.4 + Math.PI / 8, rr = Wb.r * 0.9; pts.push(cx, h, cz, cx + Math.cos(a) * rr, h * 0.25, cz + Math.sin(a) * rr); }
          v.webLines.geometry.dispose(); v.webLines.geometry = new THREE.BufferGeometry(); v.webLines.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
        }
        // The anchors: white knots, pulsing when bitten.
        for (const an of Wb.anchors) if (an.hp > 0) { tmpV.set(an.x, 3, an.y); v.fx.pushAt('dot', v.dotGeo, tmpV, tmpQ2.identity(), 4 + 2 * (an.hp / an.max) + (s.t - (an.hitT ?? -9) < 0.2 ? 1.5 : 0), an.hitT && s.t - an.hitT < 0.2 ? '#ffd0c0' : '#f4f4f0'); }
      }
      // Stuck ants: a white ring.
      for (const a of s.ants) if (a.webT > s.t && a.state !== 'dead' && a.state !== 'away') { tmpV.set(a.x, 0.9, a.y); v.fx.pushAt('ring', PROPS.ring, tmpV, tmpQ2.identity(), 6, '#f0f0f0'); }
      if (!wd.dead && wd.hp < wd.maxHp) ctx.bar(wd.x, wd.y, 50 + y, wd.hp / wd.maxHp, '#b04ad0');
    }
  }
}
