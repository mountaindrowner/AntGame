// Draws many copies of a few geometries with one InstancedMesh each.
// Call begin(), push() every visible thing, then end(). Batches grow on
// demand, so `+200` ants (or 1,000) costs a few draw calls.
import * as THREE from 'three';

const tmpM = new THREE.Matrix4();
const tmpC = new THREE.Color();
const tmpS = new THREE.Vector3();

export class Crowd {
  constructor(parent, material) {
    this.parent = parent;
    this.material = material;
    this.batches = new Map();
  }

  _make(geometry, cap) {
    const m = new THREE.InstancedMesh(geometry, this.material, cap);
    m.count = 0;
    m.frustumCulled = false;
    m.setColorAt(0, tmpC.set(1, 1, 1));
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.parent.add(m);
    return m;
  }

  _batch(key, geometry) {
    let b = this.batches.get(key);
    if (!b) {
      b = { mesh: this._make(geometry, 64), n: 0 };
      this.batches.set(key, b);
    }
    if (b.n >= b.mesh.instanceMatrix.count) {
      const old = b.mesh;
      const grown = this._make(geometry, old.instanceMatrix.count * 2);
      grown.instanceMatrix.array.set(old.instanceMatrix.array);
      grown.instanceColor.array.set(old.instanceColor.array);
      this.parent.remove(old);
      old.dispose();
      b.mesh = grown;
    }
    return b;
  }

  begin() { this.batches.forEach((b) => (b.n = 0)); }

  // matrix: THREE.Matrix4, color: anything THREE.Color accepts.
  push(key, geometry, matrix, color) {
    const b = this._batch(key, geometry);
    b.mesh.setMatrixAt(b.n, matrix);
    b.mesh.setColorAt(b.n, tmpC.set(color));
    b.n++;
  }

  // Convenience: position, yaw/quaternion, uniform scale.
  pushAt(key, geometry, pos, quat, scale, color) {
    tmpM.compose(pos, quat, tmpS.set(scale, scale, scale));
    this.push(key, geometry, tmpM, color);
  }

  end() {
    this.batches.forEach((b) => {
      b.mesh.count = b.n;
      b.mesh.instanceMatrix.needsUpdate = true;
      if (b.mesh.instanceColor) b.mesh.instanceColor.needsUpdate = true;
    });
  }
}
