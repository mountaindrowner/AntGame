// Crisp text over the low-res 3D frame (room names, hints), positioned each
// frame by projecting world points. PS1 games drew their text this way too:
// sharp sprites over a soft world.
export class LabelLayer {
  constructor(root) {
    this.root = root;
    this.pool = [];
  }

  // items: [{ text, x, y, kind }] in CSS px.
  set(items) {
    while (this.pool.length < items.length) {
      const d = document.createElement('div');
      d.className = 'label';
      this.root.appendChild(d);
      this.pool.push(d);
    }
    this.pool.forEach((d, i) => {
      const it = items[i];
      if (!it) { if (d.style.display !== 'none') d.style.display = 'none'; return; }
      d.style.display = '';
      if (d.textContent !== it.text) d.textContent = it.text;
      if (d.dataset.kind !== it.kind) d.dataset.kind = it.kind;
      d.style.transform = `translate(${Math.round(it.x)}px, ${Math.round(it.y)}px)`;
    });
  }
}
