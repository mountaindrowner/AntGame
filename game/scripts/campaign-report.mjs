// Prints the milestone table, final states, zones, hunts, deaths by cause and hourly medians from campaign.mjs runs
// (OUT=<dir>/<strategy>-<seed>.json). Usage: node scripts/campaign-report.mjs <dir>
import fs from 'node:fs';
const D = process.argv[2], files = fs.readdirSync(D).filter((f) => /^(sensible|military)-\d+\.json$/.test(f)).sort();
const runs = files.map((f) => JSON.parse(fs.readFileSync(D + '/' + f, 'utf8')));
const mm = (t) => t == null ? '—' : `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const keyMiles = ['first food delivered', 'room hatchery', '10 ants', '20 ants', 'first evolution', 'queen level 1', '40 ants', 'first soldier', 'queen level 2', '60 ants', 'rival pavement beaten', 'killed spider', 'killed hornworm', 'killed beetle', 'killed antlion', 'killed robin', 'killed toad', 'killed mantis', 'killed widow', 'killed centipede', 'first daughter', 'PHASE 1 DONE: the whole yard'];
console.log('run'.padEnd(14), keyMiles.map((k, i) => String(i).padStart(5)).join(''));
for (const r of runs) { const at = (k) => (r.miles.find((m) => m.k === k) || {}).t; console.log(`${r.strategy}-${r.seed}`.padEnd(14), keyMiles.map((k) => mm(at(k)).padStart(5)).join('')); }
keyMiles.forEach((k, i) => console.log(i, k));
console.log('\nfinal state:');
for (const r of runs) { const f = r.final; console.log(`${r.strategy}-${r.seed}`.padEnd(14), `min ${r.minutes} lost ${r.lost} ants ${f.ants}/${f.cap} fighters ${f.fighters} queen L${f.queen} rooms ${f.rooms} evos ${f.evos} zones ${f.zones} held ${f.held} outposts ${f.outposts} rivals beaten ${f.rivalsBeaten} genes ${f.genesTotal} deaths ${f.deaths} player deaths ${f.playerDeaths}`); }
console.log('\nzones taken:'); for (const r of runs) console.log(`${r.strategy}-${r.seed}`.padEnd(14), Object.entries(r.zones).map(([k, t]) => `${k}@${mm(t)}`).join(' '));
console.log('\nhunts:'); for (const r of runs) { const h = r.log.filter((l) => /hunt on|killed|broke off|scouting|siege on|raid on/.test(l)); const g = {}; for (const l of h) { const m = l.match(/(hunt on \w+|broke off|killed \w+|scouting \w+|siege on \w+|raid on \w+)/); if (m) { const k = m[1].replace(/ \(.*/, ''); g[k] = (g[k] || 0) + 1; } } console.log(`${r.strategy}-${r.seed}`.padEnd(14), JSON.stringify(g)); }
console.log('\ndeaths by cause (final):'); const tot = {}; for (const r of runs) { for (const [k, v] of Object.entries(r.deaths || {})) tot[k] = (tot[k] || 0) + v; } console.log(Object.entries(tot).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', '));
console.log('\nhourly (median across runs): ants, fighters, food, protein, zones, evos, deaths');
for (let h = 1; h <= 8; h++) { const pick = (f) => { const v = runs.map((r) => r.series.find((x) => x.min === h * 60)).filter(Boolean).map(f).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : '—'; }; console.log(`h${h}`, ['ants', 'fighters', 'food', 'protein', 'zones', 'evos', 'deaths'].map((k) => `${k} ${pick((x) => x[k])}`).join('  ')); }
