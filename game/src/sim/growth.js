// Growth (build 12, docs/PROGRESSION.md): the data behind 🧬 Genes, the
// upgrade levels of each ant type, veteran ranks, and the evolution tree.
// The sim applies the effects; the UI draws these tables. Anything marked
// `soon` needs a material, ant or system the yard doesn't have yet: it is
// shown so the player can see what's coming, but can't be bought.

// Materials the colony keeps (sim colony fields). Sugar, chitin and wood come
// in later builds; costs that use them can't be paid yet.
export const RES = { food: '🌾', water: '💧', protein: '🥩', grit: '🪨', genes: '🧬', sugar: '🍯', chitin: '🪲', wood: '🪵' };
export const LATER = { sugar: '🍯 sugar', chitin: '🪲 chitin', wood: '🪵 wood' };
export const laterIn = (cost) => Object.keys(cost || {}).find((k) => LATER[k]);

// ---------- veteran ranks ----------
// Every ant earns experience at its job and climbs these ranks. `mul` is how
// good it is at that job. A boss kill makes the ant that bit last a Legend.
export const RANKS = [
  { key: 'callow', name: 'Callow', xp: 0, mul: 1 },
  { key: 'seasoned', name: 'Seasoned', xp: 10, mul: 1.1 },
  { key: 'veteran', name: 'Veteran', xp: 50, mul: 1.2 },
  { key: 'elite', name: 'Elite', xp: 150, mul: 1.3 },
  { key: 'legend', name: 'Legend', xp: 400, mul: 1.4 },
];
export const rankOf = (a) => { if (a.legend) return 4; const x = a.xp || 0; let r = 0; for (let i = 1; i < 4; i++) if (x >= RANKS[i].xp) r = i; return x >= RANKS[4].xp ? 4 : r; };
// Elites get a name; Legends a title as well.
export const NAMES = ['Thorn', 'Burr', 'Pip', 'Flint', 'Moss', 'Sorrel', 'Bramble', 'Tansy', 'Rook', 'Clove', 'Wren', 'Sedge', 'Nettle', 'Fern', 'Pebble', 'Husk', 'Ash', 'Rue', 'Sage', 'Briar', 'Thistle', 'Juniper', 'Dock', 'Yarrow', 'Vetch', 'Teasel', 'Chert', 'Loam', 'Quill', 'Sloe'];

// Each ant type's family sets which promotions its veterans can learn.
export const FAMILY = { forager: 'gather', builder: 'dig', soldier: 'fight', venom: 'fight', nurse: 'nest' };
export const PROMOS = {
  gather: [['trailwise', 'Trailwise', '20% faster on a trail'], ['strongback', 'Strongback', 'Carries one more'], ['keen', 'Keen nose', 'Spots food further off'], ['dodger', 'Dodger', 'Dodges the first foot, beak or acorn']],
  dig: [['quick', 'Quick digger', 'Digs 25% faster'], ['steady', 'Steady', 'Counts double against cave-ins'], ['packer', 'Packer', 'Hauls two loads of spoil'], ['fixer', 'Fixer', 'Repairs cave-ins twice as fast']],
  fight: [['brawler', 'Brawler', 'Bites 20% harder'], ['guard', 'Guard', 'Bites 50% harder near the nest'], ['hunter', 'Hunter', 'Bites 50% harder on big bugs'], ['skirmisher', 'Skirmisher', '20% faster']],
  nest: [['gentle', 'Gentle', 'Eggs hatch faster in its care'], ['healer', 'Healer', 'Heals hurt ants in the nest']],
};

// ---------- ant upgrades ----------
// Bought once for the whole ant type. A level with picks is bought by
// choosing one of them, for good. Forager levels 1–3 are the old "Train
// foragers" (range and pace, sim FORAGE).
export const UPGRADES = {
  forager: [
    { boost: 'Range 55, 10% faster', cost: { food: 15 } },
    { boost: 'Range 75, 20% faster', cost: { food: 40, grit: 10 }, picks: [['trailblazer', 'Trailblazer', 'Trails it lays are twice as strong'], ['sprinter', 'Sprinter', '25% faster off a trail']] },
    { boost: 'Range 100, 30% faster', cost: { food: 80, protein: 10, grit: 25 }, picks: [['pathfinder', 'Pathfinder', 'Spots food twice as far off'], ['hauler', 'Hauler', 'Chews pieces off treats and brings them home']] },
    { boost: 'Carries 7, range 130', cost: { food: 150, sugar: 20, chitin: 10 } },
    { boost: 'Mastery', cost: { food: 250, sugar: 50, genes: 2 }, picks: [['trailqueen', 'Trail queen', 'Every ant on a trail is 40% faster'], ['lonewolf', 'Lone wolf', 'Forages anywhere in the yard']] },
  ],
  builder: [
    { boost: 'Digs 30% faster', cost: { food: 20, grit: 10 } },
    { boost: 'Hauls 2 loads of spoil', cost: { food: 50, grit: 25 }, picks: [['shorer', 'Shorer', 'Cave-ins less than half as likely'], ['mason', 'Mason', 'Rooms cost 25% less 🪨']] },
    { boost: 'Builds rooms 50% faster', cost: { food: 90, grit: 40, protein: 10 }, picks: [['excavator', 'Excavator', 'Digs 50% faster again'], ['engineer', 'Field engineer', 'Repairs cave-ins twice as fast']] },
    { boost: 'Digs any soil 2× faster', cost: { food: 150, grit: 60, wood: 10 } },
    { boost: 'Mastery', cost: { food: 250, grit: 100, genes: 2 }, picks: [['foreman', 'Foreman', 'Builders work 50% faster'], ['tunnelmaster', 'Tunnel master', 'No cave-ins, ever']] },
  ],
  soldier: [
    { boost: '30% more health', cost: { food: 30, protein: 5 } },
    { boost: 'Bites 25% harder', cost: { food: 60, protein: 15 }, picks: [['doorkeeper', 'Doorkeeper', 'Raiders steal nothing past a guarded door'], ['escort', 'Escort', 'Patrols twice as far and scares off birds']] },
    { boost: '20% faster', cost: { food: 100, protein: 25, chitin: 5 }, picks: [['alarm', 'Alarm caller', 'Wakes every idle fighter when attacked'], ['phalanx', 'Phalanx', 'Bites 50% harder with 3 or more']] },
    { boost: '50% more health again', cost: { protein: 80, chitin: 25 } },
    { boost: 'Mastery', cost: { protein: 150, chitin: 50, genes: 2 }, picks: [['warlord', 'Warlord', 'Fighters near it bite 30% harder'], ['guardian', 'Guardian', 'Takes the hits meant for the queen']] },
  ],
  venom: [
    { boost: 'Venom 25% stronger', cost: { protein: 20 } },
    { boost: '30% more health', cost: { food: 40, protein: 35 }, picks: [['paralytic', 'Paralytic', 'Stung spiders and caterpillars slow to half'], ['hunter', 'Hunter', 'A kill lays a trail home for the haulers']] },
    { boost: 'Stings faster', cost: { protein: 60, sugar: 15 }, picks: [['neurotoxin', 'Neurotoxin', 'Every fifth sting stuns a boss'], ['lethal', 'Lethal dose', 'Small foes die in one sting']] },
  ],
  nurse: [
    { boost: 'Eggs hatch 15% faster', cost: { food: 20, water: 10 } },
    { boost: 'Six nurses can help, not three', cost: { food: 40, water: 20 }, picks: [['wetnurse', 'Wet nurse', 'Eggs cost 30% less food'], ['medic', 'Medic training', 'Hurt ants heal in the nest']] },
    { boost: 'Works 30% faster', cost: { food: 70, sugar: 10 }, picks: [['broodguard', 'Brood guard', 'Fights like a soldier inside'], ['attendant', 'Attendant', 'The queen lays 20% faster']] },
    { boost: 'Eggs hatch 25% faster again', cost: { food: 120, sugar: 25 } },
    { boost: 'Mastery', cost: { food: 200, sugar: 50, genes: 2 }, picks: [['teacher', 'Teacher', 'Every ant hatches Seasoned'], ['shaper', 'Caste-shaper', 'Any egg for a worker\'s cost']] },
  ],
};
// The queen's traits: picked once each, at levels IV, VI and VIII.
export const QUEEN_LEVELS = [{ food: 250, protein: 60, sugar: 20 }, { food: 400, protein: 90, sugar: 40 }, { food: 600, protein: 120, sugar: 60, chitin: 20 }, { food: 900, protein: 180, sugar: 100, wood: 40 }];
export const QUEEN_TRAITS = [
  { level: 3, picks: [['fertile', 'Fertile', 'Eggs hatch 20% faster'], ['hardy', 'Hardy', 'Raiders hurt her less than half as much']] },
  { level: 5, picks: [['broodmother', 'Brood mother', 'Eggs cost 30% less'], ['matriarch', 'Matriarch', 'Every ant has 10% more health']] },
  { level: 7, picks: [['nations', 'Mother of nations', 'Satellite queens start at level IV'], ['eternal', 'Eternal line', 'If she dies, a new queen takes over']] },
];

// ---------- the evolution tree ----------
// Paid in 🧬 plus materials. `after` is the node that must come first; `deed`
// halves the 🧬 part once done. `need` names a room the effect needs.
export const BRANCHES = [
  { key: 'bodies', name: 'Bodies', note: 'What an ant is' },
  { key: 'senses', name: 'Senses', note: 'How the colony thinks' },
  { key: 'nest', name: 'Nest', note: 'How the colony lives' },
  { key: 'society', name: 'Society', note: 'How ants organise' },
  { key: 'symbiosis', name: 'Symbiosis', note: 'Partners from other species' },
];
export const EVO = [
  // Bodies
  { key: 'mandibles', branch: 'bodies', name: 'Strong mandibles', cost: { genes: 2, protein: 10 }, fx: 'Fighters bite 25% harder', deed: ['Kill 20 rival ants', (s) => (s.rival.deaths.war || 0) >= 20] },
  { key: 'formic', branch: 'bodies', after: 'mandibles', name: 'Formic spray', cost: { genes: 4, protein: 20 }, fx: 'Fighters bite from 2 tiles away', deed: ['Kill the spider', (s) => (s.colony.kills.spider || 0) >= 1] },
  { key: 'exploders', branch: 'bodies', after: 'formic', name: 'Exploders', cost: { genes: 5, protein: 40 }, fx: 'The Exploder ant', soon: true },
  { key: 'stridulation', branch: 'bodies', after: 'mandibles', name: 'Stridulation', cost: { genes: 4 }, fx: 'Squeaks through the soil: every fighter answers an alarm', deed: ['Fight off 3 raids', (s) => (s.colony.raidsBeaten || 0) >= 3] },
  { key: 'trailrunners', branch: 'bodies', name: 'Trail runners', cost: { genes: 2, food: 30 }, fx: 'Ants on a scent trail are 25% faster', deed: ['Haul 5 treats home', (s) => (s.colony.treats || 0) >= 5] },
  { key: 'bigcrop', branch: 'bodies', after: 'trailrunners', name: 'Big crop', cost: { genes: 3, sugar: 10 }, fx: 'Foragers carry 8, not 5', soon: true },
  { key: 'stomach', branch: 'bodies', after: 'bigcrop', name: 'Social stomach', cost: { genes: 8, sugar: 50 }, fx: 'No ant far from home ever starves', soon: true, big: true },
  { key: 'cuticle', branch: 'bodies', name: 'Tough cuticle', cost: { genes: 3, chitin: 10 }, fx: '50% more health', soon: true },
  { key: 'majors', branch: 'bodies', after: 'cuticle', name: 'Majors', cost: { genes: 4, chitin: 20 }, fx: 'The Major ant', soon: true },
  { key: 'polymorphism', branch: 'bodies', after: 'majors', name: 'Polymorphism', cost: { genes: 9, chitin: 60 }, fx: 'The Supermajor ant', soon: true, big: true },
  { key: 'glands', branch: 'bodies', after: 'cuticle', name: 'Metapleural glands', cost: { genes: 5 }, fx: 'Mould and disease halved', soon: true },
  { key: 'heat', branch: 'bodies', name: 'Heat tolerance', cost: { genes: 3 }, fx: 'Work through summer heat', soon: true },
  { key: 'longlived', branch: 'bodies', after: 'heat', name: 'Long-lived workers', cost: { genes: 10, sugar: 40 }, fx: 'Ants live twice as long', soon: true, big: true },
  { key: 'lineage', branch: 'bodies', name: 'Lineage', cost: { genes: 8 }, fx: 'Pick one forever: Acid, Trap-jaw or Bullet', soon: true, big: true },
  // Senses
  { key: 'waypoints', branch: 'senses', name: 'Waypoints', cost: { genes: 1, grit: 10 }, fx: 'Outposts: claim ground far from the nest', deed: ['Scout 3 regions', (s) => Object.keys(s.colony.scouted).length >= 3] },
  { key: 'lookout', branch: 'senses', after: 'waypoints', name: 'Lookout', cost: { genes: 3, grit: 20 }, fx: 'Scouts; boss patrols on the map', soon: true },
  { key: 'suncompass', branch: 'senses', after: 'lookout', name: 'Sun compass', cost: { genes: 6 }, fx: 'Foragers never get lost', soon: true },
  { key: 'scent', branch: 'senses', name: 'Strong scent', cost: { genes: 2 }, fx: 'Trails fade half as fast', deed: ['Bring home 500 food', (s) => (s.colony.foodTotal || 0) >= 500] },
  { key: 'danger', branch: 'senses', after: 'scent', name: 'Danger scent', cost: { genes: 2 }, fx: 'Mark danger: foragers go round it', soon: true },
  { key: 'rally', branch: 'senses', after: 'danger', name: 'Rally scent', cost: { genes: 3 }, fx: 'Fighters gather to a mark', soon: true },
  { key: 'hivemind', branch: 'senses', after: 'rally', name: 'Hive mind', cost: { genes: 10 }, fx: 'Idle ants answer the biggest need on their own', soon: true, big: true },
  { key: 'propaganda', branch: 'senses', after: 'scent', name: 'Propaganda scent', cost: { genes: 7 }, fx: 'Rivals turn on each other in your raids', soon: true },
  { key: 'crews', branch: 'senses', name: 'Bigger crews', cost: { genes: 3 }, fx: 'Recruit up to 30', deed: ['Haul 3 treats home', (s) => (s.colony.treats || 0) >= 3] },
  { key: 'crews2', branch: 'senses', after: 'crews', name: 'Bigger crews II', cost: { genes: 5 }, fx: 'Recruit up to 45' },
  { key: 'warcolumns', branch: 'senses', after: 'crews2', name: 'War columns', cost: { genes: 9, protein: 80 }, fx: 'Raids of 60 march as one', soon: true, big: true },
  { key: 'nightsense', branch: 'senses', name: 'Night sense', cost: { genes: 3 }, fx: 'Forage at night', soon: true },
  { key: 'vibration', branch: 'senses', after: 'nightsense', name: 'Vibration sense', cost: { genes: 5 }, fx: 'Feel feet coming: more warning', soon: true },
  // Nest
  { key: 'hatchery2', branch: 'nest', name: 'Hatchery II', cost: { genes: 1, food: 30, grit: 10 }, fx: '4 eggs at once', need: 'hatchery', deed: ['Hatch 30 eggs', (s) => (s.colony.hatched || 0) >= 30] },
  { key: 'hatchery3', branch: 'nest', after: 'hatchery2', name: 'Hatchery III', cost: { genes: 1, food: 60, grit: 25 }, fx: '5 eggs at once', need: 'hatchery' },
  { key: 'brood', branch: 'nest', after: 'hatchery3', name: 'Brood chambers', cost: { genes: 6, sugar: 30 }, fx: 'Eggs cost 25% less', soon: true },
  { key: 'store2', branch: 'nest', name: 'Store II', cost: { genes: 1, food: 100, grit: 20 }, fx: 'Holds 400 food', need: 'store', deed: ['Fill the store to 150', (s) => (s.colony.storePeak || 0) >= 150] },
  { key: 'store3', branch: 'nest', after: 'store2', name: 'Store III', cost: { genes: 1, food: 300, grit: 50 }, fx: 'Holds 1,000 food', need: 'store' },
  { key: 'honeypot', branch: 'nest', after: 'store3', name: 'Honeypot vault', cost: { genes: 3, sugar: 20 }, fx: 'Repletes: living jars', soon: true },
  { key: 'granary', branch: 'nest', after: 'store2', name: 'Granary', cost: { genes: 2, grit: 30 }, fx: 'Harvesters; seeds never rot', soon: true },
  { key: 'insulation', branch: 'nest', name: 'Insulation', cost: { genes: 2 }, fx: 'Cave-ins halved; rain caves in less', deed: ['Repair 5 cave-ins', (s) => (s.colony.repaired || 0) >= 5] },
  { key: 'chimneys', branch: 'nest', after: 'insulation', name: 'Thermal chimneys', cost: { genes: 6, grit: 60 }, fx: 'No floods; eggs hatch 15% faster', soon: true },
  { key: 'infirmary', branch: 'nest', name: 'Infirmary', cost: { genes: 3 }, fx: 'Medics', soon: true },
  { key: 'midden', branch: 'nest', name: 'Midden', cost: { genes: 2 }, fx: 'Undertakers', soon: true },
  { key: 'workshop3', branch: 'nest', name: 'Workshop III', cost: { genes: 6, wood: 30 }, fx: 'Architects', soon: true },
  { key: 'deephalls', branch: 'nest', after: 'workshop3', name: 'Deep halls', cost: { genes: 8, grit: 100 }, fx: 'A fifth soil band; Miners', soon: true, big: true },
  { key: 'royal', branch: 'nest', name: 'Royal chamber', cost: { genes: 5, wood: 20 }, fx: 'Mating flights, satellite nests', soon: true },
  { key: 'highways', branch: 'nest', after: 'royal', name: 'Highways', cost: { genes: 5, wood: 30 }, fx: 'Tunnels between nests', soon: true },
  { key: 'shared', branch: 'nest', after: 'highways', name: 'Shared stores', cost: { genes: 9 }, fx: 'Every nest draws on every store', soon: true, big: true },
  // Society
  { key: 'division', branch: 'society', name: 'Division of labour', cost: { genes: 3 }, fx: 'Ants earn experience 25% faster', deed: ['Hatch 20 eggs', (s) => (s.colony.hatched || 0) >= 20] },
  { key: 'drillhall', branch: 'society', after: 'division', name: 'Drill hall', cost: { genes: 4, protein: 40 }, fx: 'Soldiers and Venom ants hatch Seasoned', need: 'barracks', deed: ['Have a Veteran fighter', (s) => s.ants.some((a) => !a.team && a.state !== 'dead' && (a.caste === 'soldier' || a.caste === 'venom') && (a.xp || 0) >= RANKS[2].xp)] },
  { key: 'memory', branch: 'society', after: 'drillhall', name: 'Colony memory', cost: { genes: 12 }, fx: 'Every ant hatches Seasoned', big: true },
  { key: 'warcamp', branch: 'society', name: 'War camp', cost: { genes: 3, grit: 30 }, fx: 'Raiders', soon: true },
  { key: 'broodraid', branch: 'society', after: 'warcamp', name: 'Brood raiding', cost: { genes: 6 }, fx: 'Brood raiders', soon: true },
  { key: 'polygyny', branch: 'society', name: 'Polygyny', cost: { genes: 6, sugar: 40 }, fx: 'A second queen', soon: true },
  { key: 'honourguard', branch: 'society', after: 'polygyny', name: 'Honour guard', cost: { genes: 5 }, fx: 'Elites guard the queens', soon: true },
  // Symbiosis
  { key: 'aphids', branch: 'symbiosis', name: 'Aphid farming', cost: { genes: 2 }, fx: 'Herders; 🍯 from aphids', soon: true },
  { key: 'mealybugs', branch: 'symbiosis', after: 'aphids', name: 'Mealybug ranching', cost: { genes: 4 }, fx: 'Ranchers: sugar underground', soon: true },
  { key: 'honeyeco', branch: 'symbiosis', after: 'mealybugs', name: 'Honey economy', cost: { genes: 8 }, fx: '🍯 pays wherever 🌾 does', soon: true, big: true },
  { key: 'fungus', branch: 'symbiosis', name: 'Fungus garden', cost: { genes: 4 }, fx: 'Leafcutters; leaves become food', soon: true },
  { key: 'beetles', branch: 'symbiosis', name: 'Beetle guests', cost: { genes: 4 }, fx: 'Rove beetles clean the nest', soon: true },
  { key: 'nectar', branch: 'symbiosis', name: 'Flower nectar', cost: { genes: 3 }, fx: 'Flowers in held regions give 🍯', soon: true },
];
export const EVO_BY = Object.fromEntries(EVO.map((n) => [n.key, n]));

// Great evolutions: three per colony, from a later build.
export const GREAT = ['Living Bridges', 'Raft Colony', 'Weaver Canopy', 'Fungus Empire', 'The Great Mound', 'Army of the March', 'The Peony Pact', 'Blue Butterfly Pact', 'Supercolony', 'Swarm Day', 'Titan Line', 'Brood Empire'];

// The 🧬 part of a node's cost, halved (rounded up) once its deed is done.
export function evoCost(s, n) {
  const cost = Object.assign({}, n.cost);
  if (n.deed && cost.genes && n.deed[1](s)) cost.genes = Math.ceil(cost.genes / 2);
  return cost;
}

// ---------- the map: outposts, held regions, prizes (build 13) ----------
// An outpost is a cairn of pebbles you raise far from home. Foragers range
// round it (and along the road back to the nest) as they do round the nest,
// trails near it never fade, and it lifts the fog round it.
export const OUTPOST = { cost: { grit: 10 }, work: 30, spacing: 14, reach: 26, road: 2, keep: 6, see: 20, hp: 2 };
// What must be beaten before a region can be held. Bosses from later builds
// don't stop you holding their ground yet; the fire ants do.
export const GUARDIANS = {
  flowerbed: ['the spider', (s) => (s.colony.kills.spider || 0) >= 1],
  patio: ['the pavement ants’ queen', (s) => !s.rival.queenAlive],
  fireout: ['the fire ants', () => false],
  firemound: ['the fire ants', () => false],
};
// Each held region's prize, for good while you hold it. The sim reads `fx`.
const GARDEN = { text: 'Aphids here refill twice as fast', fx: 'aphids' };
const OAKS = { text: 'Acorns fall twice as often', fx: 'acorns' };
export const PRIZES = {
  steps: { text: 'Feet come half as often', fx: 'calm' },
  patio: { text: 'Their nest becomes your outpost; no more raids', fx: 'none' },
  flowerbed: { text: 'Berries grow back twice as fast', fx: 'food2' },
  woodpile: { text: 'Twice the pebbles turn up here', fx: 'stone' },
  grill: { text: 'Scraps grow back twice as fast', fx: 'food2' },
  tomatoes: GARDEN, beans: GARDEN, peppers: GARDEN, herbs: GARDEN,
  spigot: { text: 'Water cap +40', fx: 'water' },
  rock: null,
  compost: { text: 'Eggs hatch 15% faster (it’s warm)', fx: 'warm' },
  feeder: { text: 'Seed rain twice as heavy', fx: 'food2' },
  sandbox: { text: 'Crews carry treats 30% faster', fx: 'crew' },
  lawn: { text: 'The mower warns you twice as early', fx: 'mower' },
  picnic: { text: 'A treat lands here every few minutes', fx: 'picnic' },
  birdbath: { text: 'Birds come half as often', fx: 'calm' },
  rockgarden: { text: 'Twice the pebbles turn up here', fx: 'stone' },
  rockgarden2: { text: 'Twice the pebbles turn up here', fx: 'stone' },
  oakroots: OAKS, oak: OAKS, acorns: OAKS, branches: OAKS, oakeast: OAKS,
};
export const prizeOf = (key) => (key in PRIZES ? PRIZES[key] : { text: 'Food grows back half again as fast', fx: 'food15' });

// ---------- the goals board (build 13) ----------
// Three goals open at once: one short, one medium, one long. Each pays 🧬 and
// points at something the colony hasn't done. Goals come in themed sets;
// finishing a set pays a reward for good.
const scouted = (s) => Object.keys(s.colony.scouted).length;
const held = (s) => Object.keys(s.colony.held || {}).length;
const roomsBuilt = (s) => s.nest.rooms.filter((r) => r.key !== 'queen').length;
const ours = (s) => s.ants.filter((a) => !a.team && a.state !== 'dead');
export const SETS = {
  explorer: { name: 'Explorer', reward: 'One more outpost', fx: 'outpost' },
  garden: { name: 'Garden', reward: 'Foragers carry one more', fx: 'carry' },
  hunter: { name: 'Hunter', reward: 'Fighters bite 10% harder', fx: 'bite' },
  builder: { name: 'Builder', reward: 'Rooms build 25% faster', fx: 'build' },
  colony: { name: 'Colony', reward: 'Eggs hatch 10% faster', fx: 'eggs' },
};
export const TIERS = { short: { name: 'Next', genes: 1 }, medium: { name: 'Soon', genes: 2 }, long: { name: 'Later', genes: 3 } };
// In board order: the first unfinished goal of each tier is the one shown.
export const GOALS = [
  { key: 'food50', set: 'garden', tier: 'short', text: 'Bring home 50 food', n: (s) => s.colony.foodTotal, of: 50 },
  { key: 'scout2', set: 'explorer', tier: 'short', text: 'Scout 2 new regions', n: scouted, of: 2 },
  { key: 'hatch10', set: 'colony', tier: 'short', text: 'Hatch 10 eggs', n: (s) => s.colony.hatched, of: 10 },
  { key: 'hatchery', set: 'builder', tier: 'short', text: 'Build a Hatchery', n: (s) => (s.nest.rooms.some((r) => r.key === 'hatchery') ? 1 : 0), of: 1 },
  { key: 'cat', set: 'hunter', tier: 'short', text: 'Hunt a caterpillar', n: (s) => s.colony.kills.caterpillar || 0, of: 1 },
  { key: 'treat1', set: 'garden', tier: 'medium', text: 'Haul a treat home with a crew', n: (s) => s.colony.treats, of: 1 },
  { key: 'outpost1', set: 'explorer', tier: 'medium', text: 'Raise an outpost', n: (s) => (s.outposts || []).filter((o) => o.done).length, of: 1 },
  { key: 'dig40', set: 'builder', tier: 'medium', text: 'Dig 40 cells', n: (s) => s.colony.dug || 0, of: 40 },
  { key: 'ants30', set: 'colony', tier: 'medium', text: 'Grow to 30 ants', n: (s) => ours(s).length, of: 30 },
  { key: 'rivals10', set: 'hunter', tier: 'medium', text: 'Kill 10 rival ants', n: (s) => s.rival.deaths.war || 0, of: 10 },
  { key: 'scout6', set: 'explorer', tier: 'medium', text: 'Scout 6 regions', n: scouted, of: 6 },
  { key: 'store100', set: 'garden', tier: 'medium', text: 'Fill the store to 100 food', n: (s) => Math.floor(s.colony.storePeak), of: 100 },
  { key: 'rooms4', set: 'builder', tier: 'medium', text: 'Build 4 rooms', n: roomsBuilt, of: 4 },
  { key: 'evolve3', set: 'colony', tier: 'medium', text: 'Evolve 3 times', n: (s) => Object.keys(s.colony.evo).length, of: 3 },
  { key: 'hold1', set: 'explorer', tier: 'long', text: 'Hold a region: an outpost, its guardian beaten', n: held, of: 1 },
  { key: 'spider', set: 'hunter', tier: 'long', text: 'Kill the spider', n: (s) => s.colony.kills.spider || 0, of: 1 },
  { key: 'food1000', set: 'garden', tier: 'long', text: 'Bring home 1,000 food', n: (s) => s.colony.foodTotal, of: 1000 },
  { key: 'rooms6', set: 'builder', tier: 'long', text: 'Build all six rooms', n: roomsBuilt, of: 6 },
  { key: 'queen3', set: 'colony', tier: 'long', text: 'Raise the queen to level III', n: (s) => s.queen.level + 1, of: 3 },
  { key: 'vets3', set: 'hunter', tier: 'long', text: 'Have 3 Veteran fighters', n: (s) => ours(s).filter((a) => (a.caste === 'soldier' || a.caste === 'venom') && rankOf(a) >= 2).length, of: 3 },
  { key: 'hold3', set: 'explorer', tier: 'long', text: 'Hold 3 regions', n: held, of: 3 },
  { key: 'treat5', set: 'garden', tier: 'long', text: 'Haul 5 treats home', n: (s) => s.colony.treats, of: 5 },
  { key: 'elite', set: 'colony', tier: 'long', text: 'Raise an Elite (it gets a name)', n: (s) => s.colony.named, of: 1 },
  { key: 'scout15', set: 'explorer', tier: 'long', text: 'Scout 15 regions', n: scouted, of: 15 },
];
export const GOAL_BY = Object.fromEntries(GOALS.map((g) => [g.key, g]));
export function goalBoard(s) {
  const done = (s.colony.goals || {}).done || {};
  return ['short', 'medium', 'long'].map((t) => GOALS.find((g) => g.tier === t && !done[g.key]) || null);
}
