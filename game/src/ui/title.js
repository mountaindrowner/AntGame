// The title screen and main menu: the logo over a slow drift across the live
// yard, with Continue, New colony, How to play, Options and the intro film.
// Opens after the film on a first run, and on every later run. Options live
// in localStorage (app.opts), apart from the saved colony.
import { ICONS } from './icons.js';
import { sfx } from '../audio/sfx.js';

const OPTS_KEY = 'underfoot-options';
export function loadOptions() {
  const def = { sound: true, music: 'quiet', fx: 'loud', graphics: 'auto' };
  try { return Object.assign(def, JSON.parse(localStorage.getItem(OPTS_KEY)) || {}); } catch (e) { return def; }
}
function saveOptions(o) { try { localStorage.setItem(OPTS_KEY, JSON.stringify(o)); } catch (e) { /* blocked */ } }

const btn = (act, icon, label, cls = '') => `<button class="t-btn ${cls}" data-t="${act}">${ICONS[icon]}<span>${label}</span></button>`;

export class TitleMenu {
  // hooks: { help(), film(), applyOptions() }
  constructor(app, hooks) {
    this.app = app;
    this.hooks = hooks;
    const el = (this.el = document.createElement('div'));
    el.id = 'title';
    el.className = 'hidden';
    document.body.appendChild(el);
    el.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) this._act(b.dataset.t); });
  }

  get isOpen() { return !this.el.classList.contains('hidden'); }

  // Anything worth continuing: the queen has dug in, or time has passed.
  get started() { const s = this.app.s; return s.queen.placed || s.t > 30; }

  open() {
    this.app.paused = true;
    this.app.titleOpen = true;
    document.body.classList.add('title-on');
    this.el.classList.remove('hidden');
    this._main();
    sfx.play('stinger');
  }

  close() {
    this.app.titleOpen = false;
    this.app.paused = false;
    this.app.surfaceFocus = null;
    document.body.classList.remove('title-on');
    this.el.classList.add('hidden');
  }

  _page(body) {
    this.el.innerHTML = `<div class="t-logo"><div class="big">Underfoot!</div><div class="sub">One queen. One rock. One very big yard.</div></div><div class="t-menu">${body}</div>`;
  }

  _main() {
    this._page((this.started ? btn('continue', 'play', 'Continue', 'primary') + btn('new', 'plus', 'New colony') : btn('new', 'play', 'Play', 'primary'))
      + btn('help', 'help', 'How to play') + btn('options', 'gear', 'Options') + btn('film', 'film', 'Watch the intro'));
  }

  _options() {
    const o = this.app.opts, pick = (k, v, label) => `<button class="t-opt${o[k] === v ? ' on' : ''}" data-t="opt:${k}:${v}">${label}</button>`;
    this._page(`<div class="t-row"><span>Sound</span>${pick('sound', true, 'On')}${pick('sound', false, 'Off')}</div>`
      + `<div class="t-row"><span>Music</span>${pick('music', 'off', 'Off')}${pick('music', 'quiet', 'Quiet')}${pick('music', 'loud', 'Loud')}</div>`
      + `<div class="t-row"><span>Effects</span>${pick('fx', 'off', 'Off')}${pick('fx', 'quiet', 'Quiet')}${pick('fx', 'loud', 'Loud')}</div>`
      + `<div class="t-row"><span>Graphics</span>${pick('graphics', 'auto', 'Auto')}${pick('graphics', 'sharp', 'Sharp')}${pick('graphics', 'fast', 'Fast')}</div>`
      + `<div class="t-note">Graphics: Auto starts sharp and eases off if your device struggles.</div>`
      + btn('back', 'back', 'Back'));
  }

  _act(a) {
    const app = this.app;
    if (a === 'continue') this.close();
    else if (a === 'new') {
      if (!this.started) { this.close(); return; }
      this._page(`<div class="t-note">Start a new colony? This one is lost for good.</div>${btn('reset', 'plus', 'New colony', 'primary')}${btn('back', 'back', 'Keep this one')}`);
    } else if (a === 'reset') { app.reset(); this.close(); }
    else if (a === 'help') { this.close(); this.hooks.help(); }
    else if (a === 'film') { this.close(); this.hooks.film(); }
    else if (a === 'options') this._options();
    else if (a === 'back') this._main();
    else if (a.startsWith('opt:')) {
      const [, k, v] = a.split(':');
      app.opts[k] = v === 'true' ? true : v === 'false' ? false : v;
      saveOptions(app.opts);
      this.hooks.applyOptions();
      this._options();
    }
  }
}
