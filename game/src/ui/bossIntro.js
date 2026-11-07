// Build 78 (Mark: "everything stops and the ants turn their attention to the boss and the boss turns their
// attention… an introduction sequence when a boss is introduced"; docs/BOSS-INTROS.md). The first time you're
// within fighting range of a boss awake (or a war party's champion), the game freezes for about three and a half
// seconds: black bars slide in, every ant turns to it, it turns to you, the camera glides to it, it roars and its
// name lands; then the camera glides back and play resumes. Any click or key skips it.
import SIM from '../sim/sim.js';
import { sfx } from '../audio/sfx.js';

const ICON = { hornworm: '🐛', beetle: '🪲', antlion: '🌀', robin: '🐦', toad: '🐸', duke: '🐸', mantis: '🦗', widow: '🕷', centipede: '🐛', crow: '🐦‍⬛', hollow: '🍄', hornets: '🐝', blind: '🕳' };
export const INTRO_LEN = 3.6, ROAR_AT = 1.0;
const ease = (u) => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };

export class BossIntro {
  constructor(app, hooks) {
    this.app = app; this.hooks = hooks; this.seen = null; this.q = null;
    const el = (this.el = document.createElement('div'));
    el.id = 'bossintro'; el.className = 'hidden';
    el.innerHTML = '<div class="bar top"></div><div class="bar bot"></div><div class="card"><div class="ic"></div><div class="nm"></div><div class="tt"></div><div class="tp"></div></div><div class="skip">click to skip</div>';
    document.body.appendChild(el);
    el.addEventListener('pointerdown', (e) => { if (this.q) { e.stopPropagation(); this.end(); } });
    window.addEventListener('keydown', (e) => { if (this.q) { e.stopPropagation(); e.preventDefault(); this.end(); } }, true);
  }

  get playing() { return !!this.q; }

  // A new introduction from the sim, played when you're out in the yard with nothing else open.
  check(s) {
    const q = s.introSeq, app = this.app; if (!q || q === this.seen || this.q) return;
    if (app.view !== 'surface' || app.titleOpen || app.menu || !s.player.ant || s.player.inNest || (s.t - q.t) > 20) return;
    this.seen = q; this.start(s, q);
  }

  start(s, q) {
    const app = this.app, me = s.player.ant;
    const foe = q.kind === 'boss' ? s.bosses[q.key] : s.ants.find((a) => a.id === q.id);
    if (!foe) return;
    // It turns to you.
    { const dx = me.x - foe.x, dy = me.y - foe.y, d = Math.hypot(dx, dy) || 1; foe.dx = dx / d; foe.dy = dy / d; }
    this.q = q; this.t = 0; this.from = { x: me.x, y: me.y }; this.at = { x: foe.x, y: foe.y }; this.roared = false; this.paused = !app.paused;
    app.paused = true; app.intro = { x: foe.x, y: foe.y, t: 0, id: q.kind === 'champ' ? q.id : null };
    const D = q.kind === 'boss' ? SIM.BOSSES[q.key] : null;
    this.el.querySelector('.ic').textContent = D ? ICON[q.key] || '👑' : '⚔';
    this.el.querySelector('.nm').textContent = D ? D.name : q.name;
    this.el.querySelector('.tt').textContent = D ? D.title : 'Champion of the pavement ants';
    this.el.querySelector('.tp').textContent = D ? D.tip : `Kill ${q.name} and the war party loses heart.`;
    this.el.className = 'on'; document.body.classList.add('intro-on');
    sfx.play('bossIntro');
  }

  update(dt) {
    if (!this.q) return;
    const app = this.app; if (!this.hold) this.t += dt; const t = this.t; // (hold: for screenshots)
    // The camera glides to it, holds, and glides back.
    const w = ease(t / 0.7) * (1 - ease((t - (INTRO_LEN - 0.7)) / 0.7));
    app.surfaceFocus = { x: this.from.x + (this.at.x - this.from.x) * w, y: this.from.y + (this.at.y - this.from.y) * w };
    app.introZoom = 1 + 0.45 * w; app.intro.t = t;
    if (!this.roared && t >= ROAR_AT) { this.roared = true; sfx.play('roar', null, this.q.kind === 'champ' ? 1.4 : 0.8); if (this.hooks.shake) this.hooks.shake(0.9); }
    if (t >= ROAR_AT + 0.15) this.el.classList.add('card-on');
    if (t >= INTRO_LEN - 0.5) this.el.classList.add('out');
    if (t >= INTRO_LEN) this.end();
  }

  end() {
    const app = this.app; if (!this.q) return;
    this.q = null; app.surfaceFocus = null; app.introZoom = 1; app.intro = null;
    if (this.paused) app.paused = false;
    this.el.className = 'hidden'; document.body.classList.remove('intro-on');
  }
}
