// The Evolution window (build 14): a full-screen book of pages you flip
// through or swipe: Goals, You, Ants, the five branches of the tree, and
// Ranks. Branch pages draw the tree; tap a node to read it, then Evolve.
// Opened by the Evolve button and the 🧬 chip. Mark: "Should be cooler. More
// design to it. To feel more epic."
import SIM from '../sim/sim.js';
import { BRANCHES, EVO, EVO_BY, evoCost, laterIn, LATER, RES } from '../sim/growth.js';
import { sfx } from '../audio/sfx.js';

const costIcons = (cost) => Object.entries(cost).map(([k, v]) => `<span class="cost">${RES[k] || k}${v}</span>`).join(' ') || 'free';
const BRANCH_ART = { bodies: '🦴', senses: '👁', nest: '🏺', society: '👑', symbiosis: '🌿' };

export class EvolveView {
  // pages: { goals(), you(), ants(), ranks() } → html, from the HUD's sheet code.
  constructor(app, pages) {
    this.app = app;
    this.pages = [
      { key: 'goals', title: 'Goals', sub: 'Three at a time. Each pays 🧬.', html: pages.goals },
      { key: 'you', title: 'You', sub: 'The ant you play', html: pages.you },
      { key: 'ants', title: 'The Ants', sub: 'Every kind, level by level', html: pages.ants },
      ...BRANCHES.map((B) => ({ key: B.key, title: B.name, sub: B.note, art: BRANCH_ART[B.key], branch: B.key })),
      { key: 'ranks', title: 'Ranks', sub: 'Veterans, Legends and the fallen', html: pages.ranks },
    ];
    this.i = 0; this.pick = null;
    const el = (this.el = document.createElement('div'));
    el.id = 'evo'; el.className = 'hidden';
    el.innerHTML = `<div class="evo-sky"></div><div class="evo-spores">${'<i></i>'.repeat(14)}</div>
      <div class="evo-top"><div class="evo-genes" data-tip="Genes: earned by playing"><span>🧬</span><b></b><small>Genes</small></div><button class="evo-x" aria-label="Close">✕</button></div>
      <div class="evo-head"><div class="evo-art"></div><h1></h1><p></p></div>
      <div class="evo-page"></div>
      <div class="evo-detail hidden"></div>
      <div class="evo-nav"><button class="evo-prev" aria-label="Previous page">‹</button><div class="evo-dots"></div><button class="evo-next" aria-label="Next page">›</button></div>`;
    document.body.appendChild(el);
    el.querySelector('.evo-x').addEventListener('click', () => this.close());
    el.querySelector('.evo-prev').addEventListener('click', () => this.go(this.i - 1));
    el.querySelector('.evo-next').addEventListener('click', () => this.go(this.i + 1));
    el.addEventListener('click', (e) => this._click(e));
    // Swipe between pages.
    let sx = null, sy = 0;
    el.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; });
    el.addEventListener('pointerup', (e) => { if (sx == null) return; const dx = e.clientX - sx, dy = e.clientY - sy; sx = null; if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && !e.target.closest('.evo-tree')) this.go(this.i + (dx < 0 ? 1 : -1)); });
  }

  get isOpen() { return !this.el.classList.contains('hidden'); }
  open(key) {
    const i = this.pages.findIndex((p) => p.key === key);
    if (i >= 0) this.i = i;
    this.app.paused = true; this.app.evoOpen = true; this.app.s.seen.evolveOpened = true;
    this.el.classList.remove('hidden'); document.body.classList.add('evo-on');
    sfx.play('sheetOpen'); this.pick = null; this.render(true);
  }
  close() { this.el.classList.add('hidden'); document.body.classList.remove('evo-on'); this.app.paused = false; this.app.evoOpen = false; sfx.play('sheetClose'); }
  go(i) {
    if (i < 0 || i >= this.pages.length || i === this.i) return;
    const dir = i > this.i ? 1 : -1; this.i = i; this.pick = null; sfx.play('whoosh', null, dir > 0);
    this.render(true, dir);
  }

  render(fresh, dir) {
    const s = this.app.s, c = s.colony, P = this.pages[this.i];
    this.el.querySelector('.evo-genes b').textContent = c.genes;
    this.el.querySelector('.evo-art').textContent = P.art || '🧬';
    this.el.querySelector('h1').textContent = P.title;
    this.el.querySelector('.evo-head p').textContent = P.sub;
    const dots = this.pages.map((p, k) => `<button data-page="${k}" class="${k === this.i ? 'on' : ''}" aria-label="${p.title}"></button>`).join(''), de = this.el.querySelector('.evo-dots');
    if (de.dataset.html !== dots) { de.dataset.html = dots; de.innerHTML = dots; }
    this.el.querySelector('.evo-prev').disabled = this.i === 0;
    this.el.querySelector('.evo-next').disabled = this.i === this.pages.length - 1;
    const page = this.el.querySelector('.evo-page');
    const html = P.branch ? this._tree(s, P.branch) : P.html();
    if (page.dataset.html !== html) { page.dataset.html = html; page.innerHTML = html; }
    if (fresh) { page.scrollTop = 0; page.classList.remove('in-l', 'in-r'); void page.offsetWidth; page.classList.add(dir < 0 ? 'in-l' : 'in-r'); }
    this._detail(s);
  }

  // A branch as a tree: roots across the top, what each leads to below.
  _tree(s, branch) {
    const kids = (key) => EVO.filter((n) => n.branch === branch && (n.after || null) === key);
    const node = (n) => {
      const lock = SIM.evoLock(s, n.key), pay = SIM.canPay(s.colony, evoCost(s, n));
      const cls = lock === 'owned' ? 'owned' : n.soon ? 'soon' : !lock && pay ? 'ready' : 'locked';
      const k = kids(n.key);
      return `<li><button class="enode ${cls}${n.big ? ' big' : ''}${this.pick === n.key ? ' pick' : ''}" data-node="${n.key}"><b>${n.name}</b><i>${lock === 'owned' ? 'evolved' : n.soon ? 'later' : '🧬' + evoCost(s, n).genes}</i></button>${k.length ? `<ul>${k.map(node).join('')}</ul>` : ''}</li>`;
    };
    return `<div class="evo-tree"><ul>${kids(null).map(node).join('')}</ul></div><div class="evo-legend"><span class="owned">evolved</span><span class="ready">ready</span><span class="locked">not yet</span><span class="soon">later build</span></div>`;
  }

  // The picked node's card, with its Evolve button.
  _detail(s) {
    const d = this.el.querySelector('.evo-detail'), n = this.pick && EVO_BY[this.pick];
    if (!n) { d.classList.add('hidden'); return; }
    const lock = SIM.evoLock(s, n.key), cost = evoCost(s, n), pay = SIM.canPay(s.colony, cost), later = laterIn(cost);
    const deed = n.deed ? (n.deed[1](s) ? '<div class="deed done">Deed done: half the 🧬</div>' : `<div class="deed">Deed: ${n.deed[0]}, for half the 🧬</div>`) : '';
    const why = lock === 'owned' ? 'Evolved' : lock ? lock[0].toUpperCase() + lock.slice(1) : later ? `Needs ${LATER[later]}` : pay ? '' : 'Short on materials';
    const html = `<b>${n.name}</b><p>${n.fx}</p><div class="cost">${costIcons(cost)}</div>${deed}<button class="evo-buy" data-buy="${n.key}" ${lock || !pay ? 'disabled' : ''}>${why || 'Evolve'}</button>`;
    if (d.dataset.html !== html) { d.dataset.html = html; d.innerHTML = html; }
    d.classList.remove('hidden');
  }

  _click(e) {
    const b = e.target.closest('button'); if (!b) return;
    const s = this.app.s;
    if (b.dataset.page) { this.go(+b.dataset.page); return; }
    if (b.dataset.node) { this.pick = this.pick === b.dataset.node ? null : b.dataset.node; sfx.play('tap'); this.render(); return; }
    if (b.dataset.buy) { if (SIM.buyEvo(s, b.dataset.buy)) { sfx.play('evolve'); this.el.classList.remove('burst'); void this.el.offsetWidth; this.el.classList.add('burst'); } this.render(); return; }
    if (b.dataset.upc) { const [k, pk] = b.dataset.upc.split(':'); if (SIM.upgradeCaste(s, k, pk || undefined)) sfx.play('evolve'); this.render(); return; }
    if (b.dataset.doc) { const [k, slot, pk] = b.dataset.doc.split(':'); SIM.setDoctrine(s, k, +slot, pk); this.render(); }
  }

  // Keep the Genes count and the page fresh while open.
  update() { if (this.isOpen) this.render(); }
}
