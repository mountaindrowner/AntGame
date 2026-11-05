// three.js for the creature and object models (build 64, the Lean style): the same library, but every rounded
// shape is capped to a few segments, the way a PlayStation model is built. The world's files use plain 'three'.
import * as T from 'three';
export * from 'three';
const cap = (v, d, max, min = 3) => Math.max(min, Math.min(v ?? d, max));
export class SphereGeometry extends T.SphereGeometry { constructor(r = 1, w, h, ...a) { super(r, cap(w, 32, 8), cap(h, 16, 6, 2), ...a); } }
export class CylinderGeometry extends T.CylinderGeometry { constructor(rt = 1, rb = 1, h = 1, rs, hs, ...a) { super(rt, rb, h, cap(rs, 32, 6), Math.min(hs ?? 1, 2), ...a); } }
export class ConeGeometry extends T.ConeGeometry { constructor(r = 1, h = 1, rs, hs, ...a) { super(r, h, cap(rs, 32, 6), Math.min(hs ?? 1, 2), ...a); } }
export class LatheGeometry extends T.LatheGeometry { constructor(pts, seg, ...a) { super(pts, cap(seg, 12, 8), ...a); } }
export class TorusGeometry extends T.TorusGeometry { constructor(r = 1, t = 0.4, rs, ts, ...a) { super(r, t, cap(rs, 12, 4), cap(ts, 48, 10), ...a); } }
export class TubeGeometry extends T.TubeGeometry { constructor(path, tub, r = 1, rad, ...a) { super(path, cap(tub, 64, 8, 2), r, cap(rad, 8, 4), ...a); } }
export class CircleGeometry extends T.CircleGeometry { constructor(r = 1, seg, ...a) { super(r, cap(seg, 32, 10), ...a); } }
export class RingGeometry extends T.RingGeometry { constructor(ir = 0.5, or = 1, ts, ...a) { super(ir, or, cap(ts, 32, 12), ...a); } }
export class IcosahedronGeometry extends T.IcosahedronGeometry { constructor(r = 1) { super(r, 0); } }
export class DodecahedronGeometry extends T.DodecahedronGeometry { constructor(r = 1) { super(r, 0); } }
export class OctahedronGeometry extends T.OctahedronGeometry { constructor(r = 1) { super(r, 0); } }
