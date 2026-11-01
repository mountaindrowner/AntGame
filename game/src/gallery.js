// The model gallery (build 20's asset pass): every model in the game, as it
// is baked, turning on a little stand, grouped as the game uses them. It
// also exposes window.exportGLB(name) so scripts/export-models.mjs can write
// each one out as a standalone .glb.
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { antGeometry, WALK_FRAMES, outfitGeometry } from './render/models/creatures.js';
import { COLORS } from './config.js';
import { spiderGeometry, caterpillarSegment, SPIDER_FOOT } from './render/models/bugs.js';
import { ladybugGeometry, earwigGeometry, cricketGeometry, millipedeSegment, MILLI } from './render/models/critters.js';
import { hornwormSegment, HORN_SEGMENTS, beetleGeometry, antlionGeometry, stalkGeometry, alateGeometry } from './render/models/bosses.js';
import { CURIO_GEO } from './render/models/curios.js';
import { FOOD } from './render/models/food.js';
import { PROPS } from './render/models/props.js';
import { robin } from './render/models/bird.js';
import { toad, fallingAcorn } from './render/models/toad.js';
import { sneaker } from './render/models/sneaker.js';
import { useSnapUniforms } from './render/ps1/materials.js';

// Some models carry the game's PS1 materials: give them a snap grid fine enough not to wobble.
useSnapUniforms({ uSnap: { value: new THREE.Vector2(1e5, 1e5) } });

const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
const mesh = (g, y = 0) => { const m = new THREE.Mesh(g, mat); m.position.y = y; return m; };
const one = (g, y) => () => mesh(g, y);
// A chain of segments in a gentle curve (caterpillar, millipede, hornworm).
function chain(kinds, make, gap, r) {
  return () => { const g = new THREE.Group(); kinds.forEach((k, i) => { const m = mesh(make(k, i)); m.scale.setScalar(r * (i === 0 ? 0.9 : 1)); const a = i * 0.12; m.position.set(-i * gap * Math.cos(a), r, Math.sin(a) * i * gap * 0.4); m.rotation.y = a * 0.6; g.add(m); }); return g; };
}
const G = [];
const add = (group, name, line, make) => G.push({ group, name, line, make });
// Ants: each kind in its colours and its outfit (build 20.2), then the bare body plans.
for (const [caste, plan, tint, line] of [['forager', 'worker', COLORS.ourAnt, 'Garden apron'], ['builder', 'worker', COLORS.builder, 'Work belt and hammer'], ['nurse', 'worker', COLORS.nurse, 'Nurse\u2019s cap'], ['soldier', 'soldier', COLORS.soldier, 'Army helmet'], ['venom', 'soldier', COLORS.venom, 'Skull bandana'], ['queen', 'queen', COLORS.queen, 'Crown']])
  add('Ants', caste[0].toUpperCase() + caste.slice(1), line, () => { const gr = new THREE.Group(); gr.add(new THREE.Mesh(antGeometry(plan, 1), new THREE.MeshLambertMaterial({ vertexColors: true, color: tint }))); gr.add(new THREE.Mesh(outfitGeometry(caste), mat)); return gr; });
for (const plan of ['worker', 'soldier']) for (let f = 0; f < WALK_FRAMES; f++) add('Ants', `${plan} ${f ? 'walk ' + f : 'stand'}`, plan === 'worker' ? 'Forager, builder, nurse (one tint each)' : 'Soldier and Venom ant', one(antGeometry(plan, f)));
// Creatures.
add('Creatures', 'Wolf spider: walking', 'The first boss', one(spiderGeometry(2), SPIDER_FOOT));
add('Creatures', 'Wolf spider: crouched', 'The tell before it lunges', one(spiderGeometry(-4), SPIDER_FOOT - 2.4));
add('Creatures', 'Wolf spider: rearing', 'As it bites', one(spiderGeometry(-5), SPIDER_FOOT));
add('Creatures', 'Wolf spider: dead', 'On its back, legs curled', () => { const m = mesh(spiderGeometry(-3), 8); m.rotation.x = Math.PI; return m; });
add('Creatures', 'Woolly bear caterpillar', 'Ten segments following its head', chain(['head', 'black', 'black', 'rust', 'rust', 'rust', 'rust', 'rust', 'black', 'black'], (k, i) => caterpillarSegment(k, [null, 'true', 'true', 'true', null, null, 'pro', 'pro', 'pro', 'pro'][i]), 1.3, 1));
add('Creatures', 'Ladybug', 'Eats your aphids', one(ladybugGeometry(1)));
add('Creatures', 'Ladybug: flying', 'Wing cases up, wings a blur', one(ladybugGeometry(-1, 1)));
add('Creatures', 'Earwig', 'Pinches ants', one(earwigGeometry(1, 0)));
add('Creatures', 'Earwig: threat', 'Tail up, forceps shut', one(earwigGeometry(-1, 1, true)));
add('Creatures', 'Cricket', 'Hops away', one(cricketGeometry('sit')));
add('Creatures', 'Cricket: leaping', 'Legs thrown back', one(cricketGeometry('leap')));
add('Creatures', 'Millipede', 'Curls up armoured', chain(Array.from({ length: MILLI.n }, (_, i) => (i === 0 ? 'head' : i >= MILLI.n - 2 ? 'tail' : 'body')), (k, i) => millipedeSegment(k, i % 4), 2.3, 1));
add('Creatures', 'Robin', 'Hunts the nearest ant', () => robin().group);
add('Creatures', 'Toad', 'Its tongue reaches five tiles', () => toad().group);
// Bosses.
add('Bosses', 'The Hornworm', 'Glutton of the Tomato Rows', chain(['head', ...Array(HORN_SEGMENTS - 2).fill('body'), 'tail'], (k) => hornwormSegment(k), 1.4, 1));
add('Bosses', 'The Ground Beetle', 'Armoured Hunter of the Rock Garden', one(beetleGeometry('walk', 1)));
add('Bosses', 'The Ground Beetle: charging', 'Head down, legs driving', one(beetleGeometry('charge', 2)));
add('Bosses', 'The Ground Beetle: dazed', 'Legs kicking: bite now', one(beetleGeometry('dazed', 1)));
add('Bosses', 'The Antlion Queen', 'Terror of the Sandbox (jaws open)', one(antlionGeometry(true)));
add('Bosses', 'The Antlion Queen: snapping', 'Jaws shut', one(antlionGeometry(false)));
add('Events', 'Cordyceps stalk', 'Grows from a dead ant, then bursts', one(stalkGeometry()));
add('Events', 'Winged queen', 'Swarm day', one(alateGeometry()));
// Curios.
for (const k in CURIO_GEO) add('Curios', k[0].toUpperCase() + k.slice(1), 'Lost in the yard; glints', one(CURIO_GEO[k]));
// Food and finds.
for (const k in FOOD) { if (k === 'star' || k === 'shine') continue; const v = FOOD[k]; (Array.isArray(v) ? v : [v]).forEach((g, i) => add('Food', k + (Array.isArray(v) ? ' ' + (i + 1) : ''), 'On the ground', one(g))); }
// Visitors and props.
add('Visitors', 'Sneaker', 'A foot coming down', () => sneaker());
add('Visitors', 'Acorn', 'Falls from the Oak', () => fallingAcorn());
for (const k in PROPS) add('Props', k, 'Shared shapes', one(PROPS[k]));

// One renderer, drawn into each card in turn (browsers allow few WebGL contexts).
const R0 = new THREE.WebGLRenderer({ antialias: false, alpha: true, preserveDrawingBuffer: true }); R0.setPixelRatio(1); R0.setSize(220, 220, false);
const grid = document.getElementById('grid'), tabs = document.getElementById('tabs');
const groups = [...new Set(G.map((e) => e.group))];
const Q = new URLSearchParams(location.search), STILL = Q.has('still') ? +Q.get('still') || -0.7 : null;
let shown = Q.get('g') || 'Bosses';
const cards = [];
function fit(obj) {
  const box = new THREE.Box3().setFromObject(obj), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  const k = 2 / Math.max(size.x, size.y, size.z, 1e-3);
  const pivot = new THREE.Group(); obj.position.sub(c); pivot.add(obj); pivot.scale.setScalar(k); return pivot;
}
function render() {
  grid.innerHTML = ''; cards.length = 0;
  tabs.innerHTML = groups.map((g) => `<button class="${g === shown ? 'on' : ''}" data-g="${g}">${g} (${G.filter((e) => e.group === g).length})</button>`).join('');
  for (const e of G.filter((e) => e.group === shown)) {
    const div = document.createElement('div'); div.className = 'm';
    const cv = document.createElement('canvas'); cv.width = cv.height = 220;
    div.appendChild(cv); div.insertAdjacentHTML('beforeend', `<b>${e.name}</b><i>${e.line}</i>`); grid.appendChild(div);
    const r = cv.getContext('2d'); r.imageSmoothingEnabled = false;
    const scene = new THREE.Scene(); scene.add(new THREE.HemisphereLight('#fff2dc', '#4a3a24', 1.4)); const sun = new THREE.DirectionalLight('#fff0d8', 1.4); sun.position.set(-0.4, 1, 0.6); scene.add(sun);
    const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 50); cam.position.set(0, 1.6, 4); cam.lookAt(0, 0, 0);
    const obj = fit(e.make()); scene.add(obj);
    cards.push({ r, scene, cam, obj });
  }
}
tabs.addEventListener('click', (ev) => { const b = ev.target.closest('button'); if (!b) return; shown = b.dataset.g; render(); });
render();
(function spin(t) { for (const c of cards) { c.obj.rotation.y = STILL != null ? STILL : t / 2400; R0.render(c.scene, c.cam); c.r.clearRect(0, 0, 220, 220); c.r.drawImage(R0.domElement, 0, 0); } requestAnimationFrame(spin); })(0);

// Standalone assets: each model as a binary glTF, for scripts/export-models.mjs.
window.MODELS = G.map((e) => ({ group: e.group, name: e.name }));
window.exportGLB = (i) => new Promise((ok, no) => {
  const obj = G[i].make(); obj.updateMatrixWorld(true);
  new GLTFExporter().parse(obj, (buf) => { const b = new Uint8Array(buf); let s = ''; for (let k = 0; k < b.length; k += 0x8000) s += String.fromCharCode.apply(null, b.subarray(k, k + 0x8000)); ok(btoa(s)); }, no, { binary: true });
});
