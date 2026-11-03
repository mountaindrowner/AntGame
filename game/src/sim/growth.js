// Growth (build 12, docs/PROGRESSION.md): the data behind 🧬 Genes, the
// upgrade levels of each ant type, veteran ranks, and the evolution tree.
// The sim applies the effects; the UI draws these tables. Anything marked
// `soon` needs a material, ant or system the yard doesn't have yet: it is
// shown so the player can see what's coming, but can't be bought.

// Materials the colony keeps (sim colony fields). Sugar and chitin arrived in
// build 18; wood comes later, and costs that use it can't be paid yet.
export const RES = { food: '🌾', water: '💧', protein: '🥩', grit: '🪨', genes: '🧬', sugar: '🍯', chitin: '🪲', wood: '🪵' };
// Materials no build has yet (build 23: wood arrived; none left for now).
export const LATER = {};
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
export const FAMILY = { forager: 'gather', builder: 'dig', soldier: 'fight', venom: 'fight', nurse: 'nest', gardener: 'gather', harvester: 'gather', rancher: 'nest', medic: 'nest', major: 'fight', supermajor: 'fight', exploder: 'fight', replete: 'nest', undertaker: 'nest' };
export const PROMOS = {
  gather: [['trailwise', 'Trailwise', '20% faster on a trail'], ['strongback', 'Strongback', 'Carries one more'], ['keen', 'Keen nose', 'Spots food further off'], ['dodger', 'Dodger', 'Dodges the first foot, beak or acorn']],
  dig: [['quick', 'Quick digger', 'Digs 25% faster'], ['steady', 'Steady', 'Counts double against cave-ins'], ['packer', 'Packer', 'Hauls two loads of spoil'], ['fixer', 'Fixer', 'Repairs cave-ins twice as fast']],
  fight: [['brawler', 'Brawler', 'Bites 20% harder'], ['guard', 'Guard', 'Bites 50% harder near the nest'], ['hunter', 'Hunter', 'Bites 50% harder on big bugs'], ['skirmisher', 'Skirmisher', '20% faster']],
  nest: [['gentle', 'Gentle', 'Eggs hatch faster in its care (a rancher milks 30% more)'], ['healer', 'Healer', 'Heals hurt ants in the nest']],
};

// ---------- ant upgrades ----------
// Bought once for the whole ant type. A level with picks is bought by
// choosing one of them, for good. Forager levels 1–3 are the old "Train
// foragers" (range and pace, sim FORAGE).
export const UPGRADES = {
  // You: the ant you play (build 14). Slower than before at the start; these
  // make it quicker, tougher and better at leading.
  you: [
    { boost: 'Long legs: 25% faster', cost: { food: 25 } },
    { boost: 'Thick shell: health 12 → 20', cost: { food: 40, protein: 10 }, picks: [['sprint', 'Sprinter', '10% faster again'], ['stomach', 'Iron stomach', 'Hunger drains half as fast']] },
    { boost: 'Strong jaws: bite 50% harder', cost: { protein: 25, grit: 15 }, picks: [['bigjaws', 'Big mandibles', 'Carry 8, not 5'], ['rally', 'Rallying cry', 'Recruit from 10 tiles, not 7']] },
    { boost: 'Swift: 25% faster again', cost: { food: 80, grit: 30, genes: 1 } },
    { boost: 'Mastery', cost: { food: 150, protein: 40, genes: 3 }, picks: [['hero', 'Hero', 'Your crew keeps up and bites 20% harder'], ['survivor', 'Survivor', 'Once a life, a killing blow leaves you at 1 health']] },
  ],
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
    { boost: 'Mastery', cost: { protein: 150, chitin: 50, genes: 2 }, picks: [['warlord', 'Warlord', 'Fighters near it bite 30% harder'], ['guardian', 'Guardian', 'Raiders hurt the queen half as much']] },
  ],
  venom: [
    { boost: 'Venom 25% stronger', cost: { protein: 20 } },
    { boost: '30% more health', cost: { food: 40, protein: 35 }, picks: [['paralytic', 'Paralytic', 'Stung spiders and caterpillars slow to half'], ['hunter', 'Hunter', 'A kill lays a trail home for the haulers']] },
    { boost: 'Stings faster', cost: { protein: 60, sugar: 15 }, picks: [['neurotoxin', 'Neurotoxin', 'Its stings now and then slow a boss'], ['lethal', 'Lethal dose', 'Small foes die in one sting']] },
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
  { level: 3, picks: [['fertile', 'Fertile', 'Eggs hatch 25% faster'], ['hardy', 'Hardy', 'Raiders hurt her less than half as much']] },
  { level: 5, picks: [['broodmother', 'Brood mother', 'Eggs cost 30% less'], ['matriarch', 'Matriarch', 'Every ant has 10% more health']] },
  { level: 7, picks: [['nations', 'Mother of nations', 'Stolen pupae hatch two to one, as Veterans'], ['eternal', 'Eternal line', 'If she dies, a new queen takes over']] },
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
  { key: 'mandibles', branch: 'bodies', name: 'Strong mandibles', cost: { genes: 2, protein: 10 }, fx: 'Fighters bite 25% harder. Your ant learns 🦷 Mandible Lock: stun an enemy, and cancel a boss’s wind-up', deed: ['Kill 20 rival ants', (s) => (s.rivals || [s.rival]).reduce((n, r) => n + (r.deaths.war || 0), 0) >= 20] },
  { key: 'formic', branch: 'bodies', after: 'mandibles', name: 'Formic spray', cost: { genes: 4, protein: 20 }, fx: 'Fighters bite from 2 tiles away. Your ant learns 🧪 Formic Spray: an acid cloud that Exposes enemies', deed: ['Kill the spider', (s) => (s.colony.kills.spider || 0) >= 1] },
  // Build 33: second levels of your ant's abilities.
  { key: 'spray2', branch: 'bodies', after: 'formic', name: 'Acid jets', cost: { genes: 4, protein: 20 }, fx: '🧪 Formic Spray II: a wider cloud (3½ tiles), Exposed lasts 9 s, cooldown 7 s' },
  { key: 'lock2', branch: 'bodies', after: 'mandibles', name: 'Iron grip', cost: { genes: 4, protein: 15 }, fx: '🦷 Mandible Lock II: stuns for 4 s (a boss 2½ s), cooldown 11 s' },
  { key: 'exploders', branch: 'bodies', after: 'formic', name: 'Exploders', cost: { genes: 5, protein: 40 }, fx: 'The Exploder ant: it bursts when it dies, hurting everything near' },
  { key: 'stridulation', branch: 'bodies', after: 'mandibles', name: 'Stridulation', cost: { genes: 4 }, fx: 'Squeaks through the soil: every fighter answers an alarm, and fights at your door with +1 Attack while it sounds', deed: ['Fight off 3 raids', (s) => (s.colony.raidsBeaten || 0) >= 3] },
  { key: 'trailrunners', branch: 'bodies', name: 'Trail runners', cost: { genes: 2, food: 30 }, fx: 'Ants on a scent trail are 25% faster', deed: ['Haul 5 treats home', (s) => (s.colony.treats || 0) >= 5] },
  { key: 'bigcrop', branch: 'bodies', after: 'trailrunners', name: 'Big crop', cost: { genes: 3, sugar: 10 }, fx: 'Every ant carries 3 more' },
  { key: 'stomach', branch: 'bodies', after: 'bigcrop', name: 'Social stomach', cost: { genes: 8, sugar: 50 }, fx: 'Your ant never starves, and hunger kills half as many', big: true },
  // Build 32.1: real ants play dead when caught (thanatosis). Teaches your ant Play Dead.
  { key: 'thanatosis', branch: 'bodies', name: 'Playing dead', cost: { genes: 2 }, fx: 'Your ant learns 💀 Play Dead: 3 seconds untouchable, and it heals' },
  { key: 'dead2', branch: 'bodies', after: 'thanatosis', name: 'Death feint', cost: { genes: 3 }, fx: '💀 Play Dead II: 5 s untouchable, heal 60%, and enemies close by lose track of you' },
  { key: 'cuticle', branch: 'bodies', name: 'Tough cuticle', cost: { genes: 3, chitin: 10 }, fx: 'Every ant has 50% more health' },
  { key: 'majors', branch: 'bodies', after: 'cuticle', name: 'Majors', cost: { genes: 4, chitin: 20 }, fx: 'The Major ant: big, slow, tough' },
  { key: 'polymorphism', branch: 'bodies', after: 'majors', name: 'Polymorphism', cost: { genes: 9, chitin: 60 }, fx: 'The Supermajor ant: a living tank', big: true },
  { key: 'glands', branch: 'bodies', after: 'cuticle', name: 'Metapleural glands', cost: { genes: 5 }, fx: 'Cordyceps spreads half as much' },
  { key: 'heat', branch: 'bodies', name: 'Heat tolerance', cost: { genes: 3 }, fx: 'Heat waves don’t slow your ants, and dry the cistern a third as fast' },
  { key: 'longlived', branch: 'bodies', after: 'heat', name: 'Long-lived workers', cost: { genes: 10, sugar: 40 }, fx: 'Ants live slow: they eat 25% less', big: true },
  { key: 'lineage', branch: 'bodies', name: 'Lineage', cost: { genes: 8 }, fx: 'Pick one forever: Acid (fighters hurt bugs and bosses 50% more), Trap-jaw (fighters bite 40% harder) or Bullet (fighters’ bites slow their prey)', big: true },
  // Senses
  { key: 'waypoints', branch: 'senses', name: 'Waypoints', cost: { genes: 1, grit: 10 }, fx: 'Outposts: claim ground far from the nest', deed: ['Scout 3 regions', (s) => Object.keys(s.colony.scouted).length >= 3] },
  { key: 'lookout', branch: 'senses', after: 'waypoints', name: 'Lookout', cost: { genes: 3, grit: 20 }, fx: 'Ants spot things 3 tiles further off' },
  { key: 'suncompass', branch: 'senses', after: 'lookout', name: 'Sun compass', cost: { genes: 6 }, fx: 'Foragers range 25% further on their own' },
  { key: 'scent', branch: 'senses', name: 'Strong scent', cost: { genes: 2 }, fx: 'Trails fade half as fast', deed: ['Bring home 500 food', (s) => (s.colony.foodTotal || 0) >= 500] },
  { key: 'danger', branch: 'senses', after: 'scent', name: 'Danger scent', cost: { genes: 2 }, fx: 'Foragers keep twice as wide of the spider. Your ant learns 📯 Alarm Call: your crew Frenzies' },
  { key: 'alarm2', branch: 'senses', after: 'danger', name: 'War scent', cost: { genes: 4 }, fx: '📯 Alarm Call II: reaches 12 tiles, Frenzy lasts 12 s and gives +3 Attack' },
  { key: 'rally', branch: 'senses', after: 'danger', name: 'Rally scent', cost: { genes: 3 }, fx: 'Recruit from half again as far' },
  { key: 'hivemind', branch: 'senses', after: 'rally', name: 'Hive mind', cost: { genes: 10 }, fx: 'Every ant answers what the colony needs twice as readily, and fights a raid at your door with +1 Attack', big: true },
  { key: 'propaganda', branch: 'senses', after: 'scent', name: 'Propaganda scent', cost: { genes: 7 }, fx: 'Rival ants bite 25% weaker' },
  { key: 'crews', branch: 'senses', name: 'Bigger crews', cost: { genes: 3 }, fx: 'Recruit up to 30', deed: ['Haul 3 treats home', (s) => (s.colony.treats || 0) >= 3] },
  { key: 'crews2', branch: 'senses', after: 'crews', name: 'Bigger crews II', cost: { genes: 5 }, fx: 'Recruit up to 45' },
  { key: 'warcolumns', branch: 'senses', after: 'crews2', name: 'War columns', cost: { genes: 9, protein: 80 }, fx: 'Recruit up to 60', big: true },
  { key: 'nightsense', branch: 'senses', name: 'Rain sense', cost: { genes: 3 }, fx: 'Ants keep foraging in the rain' },
  { key: 'vibration', branch: 'senses', after: 'nightsense', name: 'Vibration sense', cost: { genes: 5 }, fx: 'Feel feet and acorns coming: over a second more warning' },
  // Nest
  { key: 'hatchery2', branch: 'nest', name: 'Hatchery II', cost: { genes: 1, food: 30, grit: 10 }, fx: '4 eggs at once', need: 'hatchery', deed: ['Hatch 30 eggs', (s) => (s.colony.hatched || 0) >= 30] },
  { key: 'hatchery3', branch: 'nest', after: 'hatchery2', name: 'Hatchery III', cost: { genes: 1, food: 60, grit: 25 }, fx: '5 eggs at once', need: 'hatchery' },
  { key: 'trophic', branch: 'nest', after: 'hatchery2', name: 'Trophic eggs', cost: { genes: 4, food: 60 }, fx: 'The Egg larder room: the queen lays food eggs, and the colony turns 🌾 food into 🥩 meat', deed: ['Have 10 fighters at once', (s) => s.ants.filter((a) => !a.team && a.state !== 'dead' && ['soldier', 'venom', 'major', 'supermajor', 'exploder'].includes(a.caste)).length >= 10] },
  { key: 'brood', branch: 'nest', after: 'hatchery3', name: 'Brood chambers', cost: { genes: 6, sugar: 30 }, fx: 'Eggs cost 25% less' },
  { key: 'store2', branch: 'nest', name: 'Store II', cost: { genes: 1, food: 100, grit: 20 }, fx: 'Holds 400 food', need: 'store', deed: ['Fill the store to 150', (s) => (s.colony.storePeak || 0) >= 150] },
  { key: 'store3', branch: 'nest', after: 'store2', name: 'Store III', cost: { genes: 1, food: 300, grit: 50 }, fx: 'Holds 1,000 food', need: 'store' },
  { key: 'honeypot', branch: 'nest', after: 'store3', name: 'Honeypot vault', cost: { genes: 3, sugar: 20 }, fx: 'The Honeypot vault room, and Repletes: living food jars' },
  { key: 'granary', branch: 'nest', after: 'store2', name: 'Granary', cost: { genes: 3, grit: 30 }, fx: 'The Granary room, and Harvesters: seed in double loads' },
  { key: 'insulation', branch: 'nest', name: 'Insulation', cost: { genes: 2 }, fx: 'Cave-ins halved; rain caves in less', deed: ['Repair 5 cave-ins', (s) => (s.colony.repaired || 0) >= 5] },
  { key: 'chimneys', branch: 'nest', after: 'insulation', name: 'Thermal chimneys', cost: { genes: 6, grit: 60 }, fx: 'Rain never caves tunnels in; eggs hatch 15% faster' },
  { key: 'infirmary', branch: 'nest', after: 'insulation', name: 'Infirmary', cost: { genes: 4, sugar: 15 }, fx: 'The Infirmary room, and Medics: heal the wounded, cure Cordyceps' },
  { key: 'midden', branch: 'nest', name: 'Midden', cost: { genes: 2 }, fx: 'The Midden room, and Undertakers: Cordyceps spreads half as much' },
  { key: 'workshop3', branch: 'nest', name: 'Workshop III', cost: { genes: 6, wood: 30 }, fx: 'Architects: builders work 50% faster, rooms cost 20% less' },
  { key: 'deephalls', branch: 'nest', after: 'workshop3', name: 'Deep halls', cost: { genes: 8, grit: 100 }, fx: 'The queen holds 20 more ants', big: true },
  { key: 'royal', branch: 'nest', name: 'Royal chamber', cost: { genes: 5, wood: 20 }, fx: 'Satellite nests: foragers drop their loads at a finished outpost when it’s nearer than home' },
  { key: 'highways', branch: 'nest', after: 'royal', name: 'Highways', cost: { genes: 5, wood: 30 }, fx: 'Ants on a trail are 30% faster, and your ant a quarter faster on one' },
  { key: 'shared', branch: 'nest', after: 'highways', name: 'Shared stores', cost: { genes: 9 }, fx: 'Every finished outpost adds 50 food cap', big: true },
  // Society
  { key: 'division', branch: 'society', name: 'Division of labour', cost: { genes: 3 }, fx: 'Ants earn experience 25% faster', deed: ['Hatch 20 eggs', (s) => (s.colony.hatched || 0) >= 20] },
  { key: 'drillhall', branch: 'society', after: 'division', name: 'Drill hall', cost: { genes: 4, protein: 40 }, fx: 'Soldiers and Venom ants hatch Seasoned', need: 'barracks', deed: ['Have a Veteran fighter', (s) => s.ants.some((a) => !a.team && a.state !== 'dead' && (a.caste === 'soldier' || a.caste === 'venom') && (a.xp || 0) >= RANKS[2].xp)] },
  { key: 'memory', branch: 'society', after: 'drillhall', name: 'Colony memory', cost: { genes: 12 }, fx: 'Every ant hatches a Veteran', big: true },
  { key: 'warcamp', branch: 'society', name: 'War camp', cost: { genes: 3, grit: 30 }, fx: 'Rivals killed near their nest drop their food' },
  { key: 'broodraid', branch: 'society', after: 'warcamp', name: 'Brood raiding', cost: { genes: 6 }, fx: '1 in 5 rivals killed near their nest comes home as brood and hatches as yours' },
  { key: 'polygyny', branch: 'society', name: 'Polygyny', cost: { genes: 6, sugar: 40 }, fx: 'A second queen: 2 more eggs at once, laid 30% faster' },
  { key: 'honourguard', branch: 'society', after: 'polygyny', name: 'Honour guard', cost: { genes: 5 }, fx: 'Raiders hurt the queen half as much, and your ants fight at the door with +2 Defence' },
  // Symbiosis
  { key: 'aphids', branch: 'symbiosis', name: 'Aphid farming', cost: { genes: 2, food: 20 }, fx: 'Honeydew gives three times the 🍯' },
  { key: 'mealybugs', branch: 'symbiosis', after: 'aphids', name: 'Root aphid ranching', cost: { genes: 4, sugar: 10 }, fx: 'The Aphid barn room, and Ranchers: 🍯 underground' },
  { key: 'honeyeco', branch: 'symbiosis', after: 'mealybugs', name: 'Honey economy', cost: { genes: 8 }, fx: '🍯 pays wherever 🌾 does, and feeds the colony when the store runs dry', big: true },
  { key: 'fungus', branch: 'symbiosis', after: 'aphids', name: 'Fungus garden', cost: { genes: 5, food: 40 }, fx: 'The Fungus garden room, and Gardeners: leaves become food' },
  { key: 'beetles', branch: 'symbiosis', name: 'Beetle guests', cost: { genes: 4 }, fx: 'Rove beetles: cave-ins mend half again faster, loose spoil tidied away' },
  { key: 'nectar', branch: 'symbiosis', name: 'Flower nectar', cost: { genes: 3, sugar: 10 }, fx: 'Each region you hold gives 🍯 a minute, and heals your ants in it' },
];
export const EVO_BY = Object.fromEntries(EVO.map((n) => [n.key, n]));

// Great evolutions: three per colony, from a later build.
export const GREAT = ['Living Bridges', 'Raft Colony', 'Weaver Canopy', 'Fungus Empire', 'The Great Mound', 'Army of the March', 'The Peony Pact', 'Blue Butterfly Pact', 'Supercolony', 'Swarm Day', 'Titan Line', 'Brood Empire'];

// The 🧬 part of a node's cost, halved (rounded up) once its deed is done.
export function evoCost(s, n) {
  const cost = Object.assign({}, n.cost);
  if (n.deed && n.deed[1](s)) {
    if (cost.genes > 1) cost.genes = Math.ceil(cost.genes / 2);
    else for (const k in cost) if (k !== 'genes') cost[k] = Math.ceil(cost[k] / 2); // build 40: on a 1-gene node, the deed halves the rest
  }
  return cost;
}

// ---------- the map: outposts, held regions, prizes (build 13) ----------
// An outpost is a cairn of pebbles you raise far from home. Foragers range
// round it (and along the road back to the nest) as they do round the nest,
// trails near it never fade, and it lifts the fog round it.
export const OUTPOST = { cost: { grit: 10 }, work: 30, spacing: 14, reach: 26, road: 2, keep: 6, see: 20, hp: 2 };
// What must be beaten before a region can be held: its boss (build 19).
const rivalAlive = (s, key) => (s.rivals || []).some((r) => r.key === key && r.queenAlive);
export const GUARDIANS = {
  flowerbed: ['the spider', (s) => (s.colony.kills.spider || 0) >= 1],
  tomatoes: ['the hornworm', (s) => (s.colony.kills.hornworm || 0) >= 1],
  rockgarden: ['the ground beetle', (s) => (s.colony.kills.beetle || 0) >= 1],
  sandbox: ['the antlion queen', (s) => (s.colony.kills.antlion || 0) >= 1],
  patio: ['the pavement ants’ queen', (s) => !s.rival.queenAlive],
  // Build 25: the rival colonies' regions are held once their queen is dead.
  fireout: ['the fire ants’ queen', (s) => !rivalAlive(s, 'fire')],
  firemound: ['the fire ants’ queen', (s) => !rivalAlive(s, 'fire')],
  trash: ['the odorous house ants’ queen', (s) => !rivalAlive(s, 'odorous')],
  oak: ['the carpenter ants’ queen', (s) => !rivalAlive(s, 'carpenter')],
};
// Build 30: the Great Lawn's regions are held once the Old Robin is driven off.
// Build 39: the yard's 13 zones, each with the guardian that rules it (COMBAT.md). Phase 1 ends when all
// 13 have fallen.
export const ZONES = [
  { key: 'patio', home: 'patio', name: 'The Patio', regions: ['patio', 'steps', 'porch', 'grill', 'cooler'], guardian: 'the pavement ants’ queen', icon: '🐜', done: (s) => !s.rival.queenAlive },
  { key: 'trash', home: 'trash', name: 'The Trash', regions: ['trash'], guardian: 'the odorous ants’ queen', icon: '🐜', done: (s) => !rivalAlive(s, 'odorous') },
  { key: 'flowerbed', home: 'flowerbed', name: 'The Flowerbed', regions: ['flowerbed'], guardian: 'the wolf spider', icon: '🕷', done: (s) => (s.colony.kills.spider || 0) >= 1 },
  { key: 'garden', home: 'tomatoes', name: 'The Vegetable Garden', regions: ['tomatoes', 'beans', 'peppers', 'herbs', 'spigot'], guardian: 'the hornworm', icon: '🐛', done: (s) => (s.colony.kills.hornworm || 0) >= 1 },
  { key: 'rocks', home: 'rockgarden', name: 'The Rock Garden', regions: ['rockgarden', 'rockgarden2', 'stones', 'gnomes'], guardian: 'the ground beetle', icon: '🪲', done: (s) => (s.colony.kills.beetle || 0) >= 1 },
  { key: 'playground', home: 'sandbox', name: 'The Playground', regions: ['sandbox', 'swings', 'trampoline', 'soccer'], guardian: 'the antlion queen', icon: '🌀', done: (s) => (s.colony.kills.antlion || 0) >= 1 },
  { key: 'oak', home: 'oak', name: 'The Oak', regions: ['oakroots', 'oak', 'acorns', 'branches', 'oakeast', 'fallen'], guardian: 'the carpenter ants’ queen', icon: '🐜', done: (s) => !rivalAlive(s, 'carpenter') },
  { key: 'fire', home: 'firemound', name: 'Fire Ant Country', regions: ['fireout', 'firemound'], guardian: 'the fire ants’ queen', icon: '🔥', done: (s) => !rivalAlive(s, 'fire') },
  { key: 'lawn', home: 'bare', name: 'The Great Lawn', regions: ['lawn', 'clover', 'molehills', 'dandelions', 'pool', 'sprinkler', 'fairyring', 'gnome', 'frisbee', 'bone', 'cloverhill', 'truck', 'bare', 'longgrass', 'daisies', 'lawnedge'], guardian: 'the Old Robin', icon: '🐦', done: (s) => (s.colony.kills.robin || 0) >= 1 },
  { key: 'wet', home: 'toadhole', name: 'The Wet Edge', regions: ['toadhole', 'thistles', 'reeds', 'slugs', 'drain', 'mudflat', 'wetedge'], guardian: 'Old Warty the toad', icon: '🐸', done: (s) => (s.colony.kills.toad || 0) >= 1 },
  { key: 'hedge', home: 'hedge3', name: 'The Hedge Row', regions: ['hedge1', 'hedge2', 'hedge3', 'hedge4', 'hedge5', 'hedge6'], guardian: 'the praying mantis', icon: '🦗', done: (s) => (s.colony.kills.mantis || 0) >= 1 },
  { key: 'side', home: 'shed', name: 'The Side Yard', regions: ['shed', 'side2', 'side3', 'side4'], guardian: 'the black widow', icon: '🕷', done: (s) => (s.colony.kills.widow || 0) >= 1 },
  { key: 'rot', home: 'leaves2', name: 'The Rot', regions: ['leaves', 'leaves2', 'compost'], guardian: 'the giant centipede', icon: '🐛', done: (s) => (s.colony.kills.centipede || 0) >= 1 },
];
export const ZONE_OF = Object.fromEntries(ZONES.flatMap((z) => z.regions.map((k) => [k, z])));
// (Zones are for the map and for progress. Outlying regions with no guardian of their own, like the
// Spigot and the Back Steps, stay free to hold, as they always were.)
// Build 36: the Rot (the leaves and the compost), once the giant centipede is dead.
for (const k of ['leaves', 'leaves2', 'compost']) GUARDIANS[k] = ['the giant centipede', (s) => (s.colony.kills.centipede || 0) >= 1];
// Build 35: the Side Yard, once the black widow is dead.
for (const k of ['shed', 'side2', 'side3', 'side4']) GUARDIANS[k] = ['the black widow', (s) => (s.colony.kills.widow || 0) >= 1];
// Build 34: the Hedge Row, once the mantis is dead.
for (const k of ['hedge1', 'hedge2', 'hedge3', 'hedge4', 'hedge5', 'hedge6']) GUARDIANS[k] = ['the praying mantis', (s) => (s.colony.kills.mantis || 0) >= 1];
// Build 31: the Wet Edge, once Old Warty is beaten.
for (const k of ['toadhole', 'thistles', 'reeds', 'slugs', 'drain', 'mudflat', 'wetedge']) GUARDIANS[k] = ['Old Warty the toad', (s) => (s.colony.kills.toad || 0) >= 1];
for (const k of ['lawn', 'clover', 'molehills', 'dandelions', 'pool', 'sprinkler', 'fairyring', 'gnome', 'frisbee', 'bone', 'cloverhill', 'truck', 'bare', 'longgrass', 'daisies', 'lawnedge']) GUARDIANS[k] = ['the Old Robin', (s) => (s.colony.kills.robin || 0) >= 1];
// Each held region's prize, for good while you hold it. The sim reads `fx`.
const GARDEN = { text: 'Aphids here refill twice as fast and give twice the 🍯', fx: 'aphids' };
const OAKS = { text: 'Acorns fall twice as often', fx: 'acorns' };
export const PRIZES = {
  steps: { text: 'Feet come half as often', fx: 'calm' },
  patio: { text: 'Their nest becomes your outpost; no more raids', fx: 'none' },
  flowerbed: { text: 'Berries grow back twice as fast', fx: 'food2' },
  woodpile: { text: 'Beetle shells turn up here, and dead bugs give twice the 🪲', fx: 'chitin' },
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
