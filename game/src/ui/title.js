// The title screen and main menu: the logo over a slow drift across the live
// yard, with Continue, New colony, How to play, Options and the intro film.
// Opens after the film on a first run, and on every later run. Options live
// in localStorage (app.opts), apart from the saved colony.
import { ICONS } from './icons.js';
import { sfx } from '../audio/sfx.js';
import { slotMeta, slotOf, renameSlot, storageOk } from '../game/slots.js';

import { LAYOUTS, detectPhone } from '../device.js';
const OPTS_KEY = 'underfoot-options';
export function loadOptions() {
  // Build 44.2: Town Hall is the look (Mark's pick). A theme someone picked themselves stays; a saved default doesn't.
  const def = { sound: true, music: 'quiet', fx: 'loud', graphics: 'auto', skin: 'townhall', layout: 'auto' };
  let o = def; try { o = Object.assign(def, JSON.parse(localStorage.getItem(OPTS_KEY)) || {}); } catch (e) { /* blocked */ }
  if (!o.skinPicked) o.skin = 'townhall';
  return o;
}
function saveOptions(o) { try { localStorage.setItem(OPTS_KEY, JSON.stringify(o)); } catch (e) { /* blocked */ } }

// UI themes (themes.css): the key on <html data-skin>, and its name.
const SKINS = [['classic', 'Classic'], ['homestead', 'Homestead'], ['cellar', 'Cellar'], ['island', 'Island Phone'], ['townhall', 'Town Hall'], ['ledger', 'Lantern & Ledger'], ['crypt', 'Crypt'], ['station', 'Field Station'], ['tablet', 'Keeper Tablet']];
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const btn = (act, icon, label, cls = '') => `<button class="t-btn ${cls}" data-t="${act}">${ICONS[icon]}<span>${label}</span></button>`;

export class TitleMenu {
  // hooks: { help(), film(), applyOptions(), switchTo(id), newColony(id), deleteSlot(id), exportFile(), importFile(file, id) }
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
    const m = slotMeta(), name = slotOf(m, m.active).name;
    this._page((this.started ? btn('continue', 'play', 'Continue', 'primary') + `<div class="t-note t-playing">${esc(name)}</div>` : btn('new', 'play', 'Play', 'primary'))
      + btn('colonies', 'nest', 'Colonies')
      + btn('help', 'help', 'How to play') + btn('options', 'gear', 'Options') + btn('film', 'film', 'Watch the intro'));
  }

  // Build 76 (Mark: "save files… so you can have different nests"): three colonies, each a card.
  _colonies(renaming, note) {
    if (!storageOk()) { this._page(`<div class="t-note">This browser isn’t letting the game store anything (a private window, or storage blocked), so there’s only the colony you’re playing, and it won’t be there next time.</div>` + btn('back', 'back', 'Back')); return; } // build 79
    const m = slotMeta(); { const a = slotOf(m, m.active); if (this.started) a.empty = false; } // (build 79: the colony you're playing is never "empty")
    const ago = (at) => { if (!at) return ''; const d = (Date.now() - at) / 60000; return d < 2 ? 'just now' : d < 60 ? Math.round(d) + ' min ago' : d < 1440 ? Math.round(d / 60) + ' h ago' : Math.round(d / 1440) + ' days ago'; };
    const hm = (t) => { const h = Math.floor(t / 3600), mm = Math.floor((t % 3600) / 60); return h ? `${h} h ${mm} min` : `${mm} min`; };
    let h = note ? `<div class="t-note">${note}</div>` : '';
    for (const sl of m.list) {
      const on = sl.id === m.active, S = sl.sum;
      h += `<div class="t-slot${on ? ' on' : ''}${sl.empty ? ' empty' : ''}">`;
      if (renaming === sl.id) h += `<div class="t-slot-name"><input id="t-rename" maxlength="28" value="${esc(sl.name)}"><button class="t-opt on" data-t="renamed:${sl.id}">OK</button></div>`;
      else h += `<div class="t-slot-name">${esc(sl.empty ? 'Empty' : sl.name)}${on ? ' <i>playing</i>' : ''}</div>`;
      if (!sl.empty) h += `<div class="t-slot-sum">${S ? `Day ${S.day} · ${S.ants} ants · queen level ${S.queen}${S.lost ? ' · lost' : ''}<br>${hm(S.t)} played${sl.at ? ' · ' + ago(sl.at) : ''}` : 'Just begun'}</div>`;
      h += `<div class="t-slot-btns">`;
      if (sl.empty) h += `<button class="t-opt on" data-t="slotnew:${sl.id}">New colony</button><button class="t-opt" data-t="import:${sl.id}">Import</button>`;
      else if (on) h += `<button class="t-opt on" data-t="continue">Play</button><button class="t-opt" data-t="rename:${sl.id}">Rename</button><button class="t-opt" data-t="export">Export</button><button class="t-opt" data-t="slotnew:${sl.id}">Start over</button>`;
      else h += `<button class="t-opt on" data-t="slot:${sl.id}">Play</button><button class="t-opt" data-t="rename:${sl.id}">Rename</button><button class="t-opt" data-t="slotdel:${sl.id}">Delete</button>`;
      h += `</div></div>`;
    }
    this._page(`<div class="t-slots">${h}</div><div class="t-note">Every colony saves itself as you play. Export saves one as a file; Import loads one into an empty slot.</div>` + btn('back', 'back', 'Back'));
    const inp = this.el.querySelector('#t-rename'); if (inp) { inp.focus(); inp.select(); inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') this._act('renamed:' + renaming); e.stopPropagation(); }); }
  }
  _confirm(text, yes, yesLabel) { this._page(`<div class="t-note">${text}</div>${btn(yes, 'plus', yesLabel, 'primary')}${btn('colonies', 'back', 'Back')}`); }

  _options() {
    const o = this.app.opts, pick = (k, v, label) => `<button class="t-opt${o[k] === v ? ' on' : ''}" data-t="opt:${k}:${v}">${label}</button>`;
    this._page(`<div class="t-row"><span>Sound</span>${pick('sound', true, 'On')}${pick('sound', false, 'Off')}</div>`
      + `<div class="t-row"><span>Music</span>${pick('music', 'off', 'Off')}${pick('music', 'quiet', 'Quiet')}${pick('music', 'loud', 'Loud')}</div>`
      + `<div class="t-row"><span>Effects</span>${pick('fx', 'off', 'Off')}${pick('fx', 'quiet', 'Quiet')}${pick('fx', 'loud', 'Loud')}</div>`
      + `<div class="t-row"><span>Graphics</span>${pick('graphics', 'auto', 'Auto')}${pick('graphics', 'sharp', 'Sharp')}${pick('graphics', 'fast', 'Fast')}</div>`
      + `<div class="t-note">Graphics: Auto starts sharp and eases off if your device struggles.</div>`
      + `<div class="t-row"><span>Layout</span>${LAYOUTS.map(([k, n]) => pick('layout', k, n)).join('')}</div>`
      + `<div class="t-note">Layout: Auto uses the phone layout on a phone. Phone: bigger buttons, made for fingers. A change takes full effect the next time the game starts.</div>`
      + `<div class="t-row t-skins"><span>Look</span>${SKINS.map(([k, n]) => pick('skin', k, n)).join('')}</div>`
      + btn('back', 'back', 'Back'));
  }

  _act(a) {
    const app = this.app;
    const [verb, arg] = a.split(':'), id = +arg;
    if (a === 'continue') this.close();
    else if (a === 'new') { if (!this.started) { this.close(); return; } this._colonies(); }
    else if (a === 'colonies') this._colonies();
    else if (verb === 'slot') this.hooks.switchTo(id);
    else if (verb === 'slotnew') {
      const sl = slotOf(slotMeta(), id);
      if (sl.empty && id !== slotMeta().active) this.hooks.newColony(id); // (build 79: the one you're playing always asks)
      else this._confirm(`Start a new colony in place of ${esc(sl.name)}? It is lost for good.`, 'slotnew!:' + id, 'Start over');
    } else if (verb === 'slotnew!') this.hooks.newColony(id);
    else if (verb === 'slotdel') this._confirm(`Delete ${esc(slotOf(slotMeta(), id).name)}? It is lost for good.`, 'slotdel!:' + id, 'Delete');
    else if (verb === 'slotdel!') this.hooks.deleteSlot(id).then(() => this._colonies());
    else if (verb === 'rename') this._colonies(id);
    else if (verb === 'renamed') { const inp = this.el.querySelector('#t-rename'); renameSlot(id, inp ? inp.value : ''); this._colonies(); }
    else if (a === 'export') this.hooks.exportFile();
    else if (verb === 'import') {
      const f = document.createElement('input'); f.type = 'file'; f.accept = '.json,application/json';
      f.onchange = () => { if (f.files[0]) this.hooks.importFile(f.files[0], id).then(() => this._colonies('', 'Imported.'), (e) => this._colonies('', esc(String(e && e.message || e)))); };
      f.click();
    }
    else if (a === 'help') { this.close(); this.hooks.help(); }
    else if (a === 'film') { this.close(); this.hooks.film(); }
    else if (a === 'options') this._options();
    else if (a === 'back') this._main();
    else if (a.startsWith('opt:')) {
      const [, k, v] = a.split(':');
      app.opts[k] = v === 'true' ? true : v === 'false' ? false : v;
      if (k === 'skin') app.opts.skinPicked = true;
      if (k === 'layout'){ app.phone = detectPhone(v); document.documentElement.classList.toggle('phone', app.phone); } // (the layout now; the renderer's phone settings at the next start)
      saveOptions(app.opts);
      this.hooks.applyOptions();
      this._options();
    }
  }
}
