// Free what a subtree holds on the GPU: geometries, materials and their textures. (A material or texture
// disposed here and used again elsewhere is simply uploaded afresh, so shared ones are safe.)
export function disposeTree(root) {
  root.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of ms) { for (const k in m) { const v = m[k]; if (v && v.isTexture) v.dispose(); } m.dispose(); }
  });
}
