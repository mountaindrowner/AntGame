// The yard: one continuous map made of square regions. This file is data and
// layout only (no DOM, no rendering). The sim reads the blocked grid, the
// region of each tile, landmarks, pits and the nest sites; the renderer reads
// the same landmarks to draw them.
//
// The whole backyard is YARD_MAP below (a 10×8 grid of regions with the house
// along the top). The built part is a block of it (BLOCK): the first nine
// regions around home, and since build 10 the ring around them:
//
//   col:   2               3          4                5               6
//   row 1  Back Steps      Patio      Flowerbed        Woodpile        Grill
//   row 2  Tomato Rows     Spigot     Under the Rock   Compost Heap    Bird Feeder
//   row 3  Beans/Lettuce   Sandbox    Lawn             Picnic Blanket  Birdbath
//   row 4  Kiddie Pool     Swing Set  Clover Patch     Molehills       Dandelions
//
// Layouts are written in design units (40 per region) and stamped at SCALE
// tiles per unit, so the props tower over an ant the way a backyard should.

export const SCALE = 2;              // tiles per design unit (build 9: everything twice as big)
export const AREA = 40 * SCALE;      // tiles per region side
// The built yard, in yard-map cells: everything but the house's row.
export const BLOCK = { c0: 0, r0: 1, cols: 10, rows: 7 };

// Per region: where it sits on the yard map, what grows there, how fast, and
// what makes it dangerous. foods: [type, weight]; rate: items per minute;
// max: items at once; treat: chance a spawn is a treat instead; start: items
// at the start. strike: feet or birds coming down now and then ([min, max]
// seconds apart while ants are about). challenge / resource / reward are the
// region's card on the yard map.
export const AREAS = [
  { key: 'steps', at: [2, 1], name: 'The Back Steps', short: 'Steps', ground: 'slab',
    blurb: 'Where people come and go. Crumbs fall here, and so do feet.',
    challenge: 'Feet on the steps', resource: 'Kitchen crumbs, popcorn, cookies', reward: 'The most crumbs in the yard',
    foods: [['crumb', 6], ['popcorn', 3], ['seed', 1]], rate: 6, max: 20, treat: 0.15, treats: ['cookie'], start: 10, strike: { kind: 'foot', every: [40, 75] } },
  { key: 'patio', at: [3, 1], name: 'The Patio', short: 'Patio', ground: 'slab',
    blurb: 'Hot stone slabs. Pavement ants live in the cracks.',
    challenge: 'The rival pavement ants', resource: 'Crumbs, popcorn, now and then a cookie', reward: 'Take their queen and the yard is yours',
    foods: [['crumb', 5], ['popcorn', 2], ['seed', 3]], rate: 6, max: 26, treat: 0.05, treats: ['cookie'], start: 18 },
  { key: 'flowerbed', at: [4, 1], name: 'The Flowerbed', short: 'Flowerbed', ground: 'mulch',
    blurb: 'Tall stems and strawberries. The spider’s web hangs here.',
    challenge: 'The spider, waiting at its web', resource: 'Berries and seeds', reward: 'Kill the spider: its fang unlocks Venom ants',
    foods: [['berry', 5], ['seed', 3], ['crumb', 1]], rate: 4.5, max: 20, treat: 0, start: 12 },
  { key: 'woodpile', at: [5, 1], name: 'The Woodpile', short: 'Woodpile', ground: 'bark',
    blurb: 'Stacked logs and dead bugs. Protein, if you can find a way through.',
    challenge: 'A maze of logs, far from home', resource: 'Dead bugs: protein for soldiers', reward: 'Feeds an army',
    foods: [['bug', 5], ['seed', 3], ['crumb', 2]], rate: 3.5, max: 16, treat: 0, start: 9 },
  { key: 'grill', at: [6, 1], name: 'The Grill', short: 'Grill', ground: 'slab',
    blurb: 'A cookout table and a kettle grill. Hot dog scraps, chips, and people.',
    challenge: 'Feet under the table', resource: 'Hot dog scraps (protein), crumbs, chips', reward: 'Protein without a hunt',
    foods: [['crumb', 4], ['hotdog', 3], ['popcorn', 2]], rate: 5, max: 18, treat: 0.15, treats: ['chip'], start: 9, strike: { kind: 'foot', every: [50, 90] } },
  { key: 'tomatoes', at: [2, 2], name: 'The Tomato Rows', short: 'Tomatoes', ground: 'soil',
    blurb: 'Soft dug soil and tomato plants. Aphids crowd the stems.',
    challenge: 'Robins hunting the rows', resource: 'Fallen tomato, and aphids to milk', reward: 'Honeydew that never runs out',
    foods: [['tomato', 4], ['seed', 2], ['crumb', 1]], rate: 3.5, max: 14, treat: 0, start: 8, strike: { kind: 'bird', every: [55, 95] } },
  { key: 'spigot', at: [3, 2], name: 'The Spigot', short: 'Spigot', ground: 'mud',
    blurb: 'Mud and puddles under a dripping tap. Water, all you want.',
    challenge: 'Little food', resource: 'Puddles that never dry', reward: 'Water for every egg',
    foods: [['seed', 3], ['crumb', 2]], rate: 1.5, max: 8, treat: 0, start: 4 },
  { key: 'rock', at: [4, 2], name: 'Under the Rock', short: 'Home', ground: 'home',
    blurb: 'Home. Food here is thin and it will not last.',
    challenge: 'Food runs thin', resource: 'Crumbs and seeds for a while, now and then a dead bug', reward: 'Home',
    foods: [['crumb', 5], ['seed', 3], ['berry', 1], ['popcorn', 1], ['bug', 1]], rate: 1.8, max: 12, treat: 0, start: 24 },
  { key: 'compost', at: [5, 2], name: 'The Compost Heap', short: 'Compost', ground: 'compost',
    blurb: 'Rotting fruit and scraps. The richest ground in the yard, and the farthest.',
    challenge: 'Caterpillars, and a long walk', resource: 'Apple cores, the richest food', reward: 'Feeds a big colony',
    foods: [['apple', 4], ['berry', 2], ['crumb', 2], ['seed', 2]], rate: 5, max: 22, treat: 0, start: 10 },
  { key: 'feeder', at: [6, 2], name: 'Under the Bird Feeder', short: 'Feeder', ground: 'grass',
    blurb: 'Seed rains down from the feeder. So do the birds.',
    challenge: 'Birds, all day', resource: 'Seed, more than anywhere', reward: 'Seed rain from above',
    foods: [['seed', 8], ['crumb', 1]], rate: 8, max: 28, treat: 0, start: 14, strike: { kind: 'bird', every: [30, 55] } },
  { key: 'beans', at: [2, 3], name: 'Beans and Lettuce', short: 'Beans', ground: 'soil',
    blurb: 'Bean poles and lettuce heads in soft soil. Aphids on the vines.',
    challenge: 'Robins hunting the rows', resource: 'Seeds, tomato, and aphids to milk', reward: 'Honeydew that never runs out',
    foods: [['seed', 4], ['tomato', 1], ['crumb', 1]], rate: 3.5, max: 14, treat: 0, start: 8, strike: { kind: 'bird', every: [55, 95] } },
  { key: 'sandbox', at: [3, 3], name: 'The Sandbox', short: 'Sandbox', ground: 'sand',
    blurb: 'Kids drop sweets here. Antlions wait at the bottom of the pits.',
    challenge: 'Antlion pits', resource: 'Popcorn, and treats that need a crew', reward: 'Jelly beans and gummy bears',
    foods: [['popcorn', 3], ['crumb', 3]], rate: 3, max: 16, treat: 0.2, treats: ['jellybean', 'gummy'], start: 7 },
  { key: 'lawn', at: [4, 3], name: 'The Lawn', short: 'Lawn', ground: 'lawn',
    blurb: 'Seeds in the grass. Listen for the mower.',
    challenge: 'The mower', resource: 'Seeds galore, a few dead bugs', reward: 'Lots of seeds, if you time it',
    foods: [['seed', 6], ['crumb', 1], ['berry', 1], ['bug', 1]], rate: 4.5, max: 20, treat: 0, start: 10 },
  { key: 'picnic', at: [5, 3], name: 'The Picnic Blanket', short: 'Picnic', ground: 'picnic',
    blurb: 'Crumbs everywhere, and sometimes a whole cookie.',
    challenge: 'A long way from home', resource: 'Crumbs, popcorn and treats', reward: 'Cookies and gummy bears',
    foods: [['crumb', 6], ['popcorn', 3]], rate: 6, max: 24, treat: 0.12, treats: ['cookie', 'gummy', 'jellybean'], start: 14 },
  { key: 'birdbath', at: [6, 3], name: 'The Birdbath', short: 'Birdbath', ground: 'grass',
    blurb: 'A stone bowl of water on a pedestal. Splashes fill the grass below.',
    challenge: 'Birds come to drink', resource: 'Splash puddles, a few seeds', reward: 'Clean water, if the birds let you',
    foods: [['seed', 3], ['crumb', 1]], rate: 2, max: 8, treat: 0, start: 4, strike: { kind: 'bird', every: [40, 70] } },
  { key: 'pool', at: [2, 4], name: 'The Kiddie Pool', short: 'Pool', ground: 'long',
    blurb: 'A plastic pool in the long grass. Splashes and dropped snacks.',
    challenge: 'Birds in the open grass', resource: 'Splash puddles, snacks', reward: 'Water and seeds',
    foods: [['seed', 3], ['crumb', 2], ['popcorn', 1]], rate: 3, max: 12, treat: 0, start: 6, strike: { kind: 'bird', every: [60, 100] } },
  { key: 'swings', at: [3, 4], name: 'The Swing Set', short: 'Swings', ground: 'long',
    blurb: 'Kids kick up the dirt under the swings, and drop their sweets.',
    challenge: 'Running feet', resource: 'Crumbs, popcorn, treats', reward: 'Jelly beans and gummy bears',
    foods: [['crumb', 3], ['popcorn', 2], ['seed', 2]], rate: 4, max: 14, treat: 0.1, treats: ['jellybean', 'gummy'], start: 6, strike: { kind: 'foot', every: [45, 80] } },
  { key: 'clover', at: [4, 4], name: 'The Clover Patch', short: 'Clover', ground: 'long',
    blurb: 'Clover and long grass on the great lawn.',
    challenge: 'Birds in the open grass', resource: 'Seeds and berries', reward: 'Steady food',
    foods: [['seed', 5], ['berry', 1]], rate: 4, max: 16, treat: 0, start: 8, strike: { kind: 'bird', every: [55, 95] } },
  { key: 'molehills', at: [5, 4], name: 'The Molehills', short: 'Molehills', ground: 'long',
    blurb: 'Heaps of fresh dirt where a mole tunnels. It turns up grubs and dead bugs.',
    challenge: 'Birds after the grubs', resource: 'Seeds and dead bugs (protein)', reward: 'Protein near the great lawn',
    foods: [['seed', 3], ['bug', 2]], rate: 3, max: 12, treat: 0, start: 6, strike: { kind: 'bird', every: [55, 95] } },
  { key: 'dandelions', at: [6, 4], name: 'The Dandelions', short: 'Dandelions', ground: 'long',
    blurb: 'Yellow flowers and seed clocks in the long grass.',
    challenge: 'Birds in the open grass', resource: 'Seeds', reward: 'Seeds on the wind',
    foods: [['seed', 6]], rate: 4, max: 16, treat: 0, start: 8, strike: { kind: 'bird', every: [55, 95] } },
  ...WILD(),
];
export const REGION = Object.fromEntries(AREAS.map((A, i) => [A.key, i]));

// The whole backyard as the yard map shows it: a 10×8 grid of regions with
// the house along the top. Each zone is a rectangle [col, row, cols, rows];
// built regions (AREAS) are drawn over them.
export const YARD_MAP = {
  cols: 10, rows: 8,
  zones: [
    { name: 'The House', at: [1, 0, 8, 1], house: true },
    { name: 'Side gate', at: [0, 0, 1, 1] },
    { name: 'Trash cans', at: [0, 1, 1, 1], note: 'Odorous house ants' },
    { name: 'Back steps', at: [1, 1, 2, 1], note: 'The doormat, and feet' },
    { name: 'Side yard', at: [0, 2, 1, 3] },
    { name: 'Vegetable garden', at: [1, 2, 2, 2], note: 'Aphids, Argentine ants' },
    { name: 'Grill and table', at: [6, 1, 2, 1], note: 'Grease and dropped food' },
    { name: 'Rock garden', at: [8, 1, 1, 2] },
    { name: 'Bird feeder', at: [6, 2, 2, 1], note: 'Birds' },
    { name: 'Birdbath', at: [6, 3, 1, 1], note: 'Birds, deep water' },
    { name: 'Stepping stones', at: [7, 3, 2, 1] },
    { name: 'Hedge row', at: [9, 0, 1, 7] },
    { name: 'Great lawn', at: [1, 4, 6, 3], note: 'Swing set, kiddie pool, moles' },
    { name: 'Garden shed', at: [0, 5, 1, 1], note: 'Bug spray, a centipede' },
    { name: 'The Oak', at: [7, 4, 2, 3], note: 'Carpenter ants' },
    { name: 'Wild corner', at: [0, 6, 1, 2], note: 'Weeds, a toad' },
    { name: 'Low wet strip', at: [1, 7, 5, 1] },
    { name: 'Leaf pile', at: [6, 7, 2, 1] },
    { name: 'Fire ant mound', at: [8, 7, 2, 1], note: 'The last fight' },
  ],
};

// The rest of the yard (build 11). These regions lie dormant (no food grows,
// nothing strikes) until you first walk into one, and their scenery loads
// only when you come near.
function WILD() {
  const R = (key, at, name, short, ground, blurb, challenge, resource, reward, foods, rate, max, more) =>
    Object.assign({ key, at, name, short, ground, blurb, challenge, resource, reward, foods, rate, max, treat: 0, start: Math.round(max * 0.5), dormant: true }, more);
  const foot = (a, b) => ({ strike: { kind: 'foot', every: [a, b] } }), bird = (a, b) => ({ strike: { kind: 'bird', every: [a, b] } });
  const toad = (a, b) => ({ strike: { kind: 'toad', every: [a, b] } }), acorn = (a, b) => ({ strike: { kind: 'acorn', every: [a, b] } });
  const lawn = ['seed', 5], few = (t) => [t, 1];
  const L = [];
  // Along the house: trash cans, the porch, the cooler.
  L.push(R('trash', [0, 1], 'The Trash Cans', 'Trash', 'gravel', 'Three bins by the side gate. Everything people throw away ends up here, in bits.',
    'Feet, taking out the trash', 'Crumbs, popcorn, dead bugs, now and then a chip', 'The richest scraps in the yard', [['crumb', 5], ['popcorn', 3], ['bug', 2]], 6, 22, { treat: 0.15, treats: ['cookie', 'chip'], ...foot(40, 75) }));
  L.push(R('porch', [1, 1], 'The Porch Corner', 'Porch', 'deck', 'Grey deck boards in the shade of the house, and a pot of geraniums.',
    'Feet on the boards', 'Crumbs and popcorn', 'Crumbs, out of the rain', [['crumb', 5], ['popcorn', 2], ['seed', 1]], 4.5, 16, { treat: 0.08, treats: ['jellybean'], ...foot(45, 85) }));
  L.push(R('cooler', [7, 1], 'The Cooler', 'Cooler', 'slab', 'A cooler by the table, sweating ice-melt onto the concrete.',
    'Feet round the cooler', 'Ice-melt puddles, hot dog scraps, chips', 'Water and protein side by side', [['crumb', 3], ['popcorn', 3], ['hotdog', 2]], 4.5, 16, { treat: 0.15, treats: ['chip'], ...foot(45, 80) }));
  // The rock garden and the hedge along the east fence.
  L.push(R('rockgarden', [8, 1], 'The Rock Garden', 'Rocks', 'gravel', 'Boulders and succulents in raked gravel.',
    'Robins on the rocks', 'Seeds, berries, a few dead bugs', 'Shelter between the boulders', [['seed', 4], ['berry', 1], ['bug', 1]], 3, 12, bird(55, 95)));
  L.push(R('rockgarden2', [8, 2], 'The Rock Garden, South', 'Rocks', 'gravel', 'More boulders, and a cactus nobody waters.',
    'Robins on the rocks', 'Seeds and dead bugs', 'Protein in the gravel', [['seed', 3], ['bug', 2]], 3, 12, bird(55, 95)));
  for (let r = 1; r <= 6; r++) L.push(R('hedge' + r, [9, r], r === 1 ? 'The Hedge Row' : `The Hedge Row (${['', 'north', 'by the stones', 'by the Oak', 'east lawn', 'south'][r - 1] || r})`, 'Hedge', 'hedge',
    'A dark, tangled hedge against the fence. Tunnels run through it.', 'A slow maze', 'Berries and dead bugs, safe from birds', 'Safe ground: nothing hunts in here', [['berry', 4], ['seed', 2], ['bug', 2]], 3, 12));
  // The side yard down the west fence.
  for (let r = 2; r <= 4; r++) L.push(R('side' + r, [0, r], r === 2 ? 'The Side Yard' : r === 3 ? 'The Side Yard Path' : 'The Side Yard, South', 'Side', 'gravel',
    'A gravel path along the fence, where people walk round to the back.', 'Feet on the path', 'Crumbs and seeds', 'A quiet way south', [['seed', 3], ['crumb', 2], ['bug', 1]], 3, 12, foot(55, 95)));
  // The rest of the vegetable garden.
  L.push(R('peppers', [1, 2], 'Peppers and Squash', 'Peppers', 'soil', 'Pepper plants and the huge leaves of a squash vine.',
    'Robins hunting the rows', 'Fallen pepper, seeds, aphids to milk', 'Honeydew that never runs out', [['tomato', 3], ['seed', 2]], 3.5, 14, bird(55, 95)));
  L.push(R('herbs', [1, 3], 'The Herb Patch', 'Herbs', 'soil', 'Mint, basil and thyme. It smells so strong your trails fade faster.',
    'Robins hunting the rows', 'Seeds, berries, aphids to milk', 'Honeydew', [['seed', 3], ['berry', 1]], 3, 12, bird(55, 95)));
  // East of the feeder and the birdbath.
  L.push(R('suet', [7, 2], 'The Suet Feeder', 'Suet', 'grass', 'A cage of suet on a post. Birds knock bits of it everywhere.',
    'Birds, all day', 'Seed, and suet (protein)', 'Protein that falls from the sky', [['seed', 4], ['hotdog', 2]], 5, 18, bird(30, 55)));
  L.push(R('stones', [7, 3], 'The Stepping Stones', 'Stones', 'grass', 'Flat stones laid across the grass to the Oak.',
    'Feet on the stones', 'Crumbs and seeds', 'An easy road east', [['seed', 3], ['crumb', 2]], 3, 12, foot(50, 90)));
  L.push(R('gnomes', [8, 3], 'The Garden Gnome', 'Gnome', 'grass', 'More stepping stones, and a gnome with a fishing rod.',
    'Feet on the stones', 'Crumbs and seeds', 'A gnome to hide behind', [['seed', 3], ['crumb', 2]], 3, 12, foot(55, 95)));
  // The Oak: two regions across, three down.
  L.push(R('oakroots', [7, 4], 'The Oak Roots', 'Roots', 'oak', 'Great roots heave out of the ground under the Oak.',
    'Falling acorns', 'Acorns (a crew of four), dead bugs', 'Acorns: big food from above', [['seed', 3], ['bug', 2], ['berry', 1]], 3, 12, acorn(35, 70)));
  L.push(R('oak', [8, 4], 'The Oak', 'Oak', 'oak', 'The trunk of the Oak, wider than a house to an ant.',
    'Falling acorns', 'Acorns, dead bugs', 'Acorns: big food from above', [['bug', 3], ['seed', 2]], 3, 12, acorn(30, 60)));
  L.push(R('acorns', [7, 5], 'Acorn Drop', 'Acorns', 'oak', 'Where the Oak drops most of its acorns.',
    'Falling acorns', 'Acorns everywhere', 'The most acorns in the yard', [['seed', 3], ['bug', 1]], 3, 12, acorn(25, 50)));
  L.push(R('branches', [8, 5], 'Under the Branches', 'Branches', 'oak', 'Twigs and bark under the low branches.',
    'Falling acorns', 'Dead bugs under the bark', 'Protein', [['bug', 3], ['seed', 2]], 3, 12, acorn(35, 70)));
  L.push(R('oakeast', [7, 6], 'The Oak Shade', 'Shade', 'oak', 'Cool shade and roots, where the lawn gives up.',
    'Falling acorns', 'Seeds and dead bugs', 'Shade and acorns', [['seed', 3], ['bug', 2]], 3, 12, acorn(40, 80)));
  L.push(R('fallen', [8, 6], 'The Fallen Limb', 'Limb', 'oak', 'A dead limb the size of a fallen tower, soft with rot.',
    'Falling acorns', 'Dead bugs in the rot', 'Protein for an army', [['bug', 4], ['seed', 1]], 3.5, 14, acorn(40, 80)));
  // The garden shed and the wild corner down the west side.
  L.push(R('shed', [0, 5], 'The Garden Shed', 'Shed', 'slab', 'A wooden shed with sacks of fertiliser. Someone sprays for bugs here.',
    'Bug spray', 'Dead bugs, seeds, crumbs', 'Dead bugs by the dozen', [['bug', 3], ['seed', 2], ['crumb', 1]], 4, 16, { strike: { kind: 'spray', every: [50, 90] } }));
  L.push(R('thistles', [0, 6], 'The Thistles', 'Thistles', 'wild', 'Weeds and thistles nobody cuts.',
    'A toad', 'Seeds and berries', 'Thistle seed', [['seed', 4], ['berry', 2]], 3, 12, toad(60, 100)));
  L.push(R('toadhole', [0, 7], 'The Toad Hole', 'Toad', 'wild', 'Damp weeds round a toad\'s burrow.',
    'The toad lives here', 'Dead bugs and seeds', 'Protein, if you dare', [['bug', 3], ['seed', 2]], 3, 12, toad(30, 60)));
  // The great lawn's lower rows.
  const gl = [
    ['sprinkler', [1, 4], 'The Sprinkler', 'Sprinkler', 'A sprinkler head in the grass, and puddles all round it.', 'Robins in the open', 'Seeds, and puddles', 'Water on the lawn'],
    ['trampoline', [1, 5], 'The Trampoline', 'Trampoline', 'A trampoline on six legs, and its shade.', 'Feet', 'Crumbs and seeds', 'Treats dropped from above'],
    ['soccer', [2, 5], 'The Soccer Ball', 'Ball', 'A leather ball left in the grass.', 'Running feet', 'Seeds and crumbs', 'Seeds'],
    ['fairyring', [3, 5], 'The Fairy Ring', 'Mushrooms', 'A ring of mushrooms on the lawn.', 'Robins in the open', 'Seeds', 'Shelter in the ring'],
    ['gnome', [4, 5], 'The Lawn Gnome', 'Gnome', 'A gnome on the lawn with a wheelbarrow.', 'Robins in the open', 'Seeds and berries', 'Seeds'],
    ['frisbee', [5, 5], 'The Frisbee', 'Frisbee', 'A frisbee upside down, half full of rain.', 'Robins in the open', 'Seeds, and water in the frisbee', 'Water'],
    ['bone', [6, 5], 'The Dog Bone', 'Bone', 'A chewed bone the dog forgot.', 'Robins in the open', 'Seeds and scraps (protein)', 'Protein'],
    ['cloverhill', [1, 6], 'Clover Hill', 'Clover', 'A low rise thick with clover.', 'Robins in the open', 'Seeds and berries', 'Steady food'],
    ['truck', [2, 6], 'The Toy Truck', 'Truck', 'A plastic dump truck stuck in the lawn.', 'Robins in the open', 'Seeds and crumbs', 'Seeds'],
    ['bare', [3, 6], 'The Bare Patch', 'Bare', 'Where the grass died. Hot and open.', 'Robins in the open', 'Seeds', 'Seeds'],
    ['longgrass', [4, 6], 'The Long Grass', 'Long', 'Grass so long it hides you from the birds.', 'Hard going', 'Seeds', 'Cover from birds'],
    ['daisies', [5, 6], 'The Daisies', 'Daisies', 'White daisies in the lawn.', 'Robins in the open', 'Seeds and berries', 'Seeds'],
    ['lawnedge', [6, 6], 'The Lawn\'s Edge', 'Edge', 'Where the lawn meets the Oak\'s shade, edged with stones.', 'Robins in the open', 'Seeds', 'Seeds'],
  ];
  for (const [key, at, name, short, blurb, ch, res, rew] of gl)
    L.push(R(key, at, name, short, 'long', blurb, ch, res, rew, key === 'bone' ? [lawn, ['hotdog', 2]] : key === 'cloverhill' || key === 'gnome' || key === 'daisies' ? [lawn, few('berry')] : [lawn, few('crumb')], 3.5, 14,
      key === 'trampoline' || key === 'soccer' ? foot(50, 90) : key === 'longgrass' ? {} : bird(55, 95)));
  // The low wet strip along the back fence.
  const wet = [['reeds', 1, 'The Reeds', 'Reeds', 'Reeds and rushes in black mud.'], ['slugs', 2, 'Slug Alley', 'Slugs', 'Slime trails everywhere. The slugs make good eating.'],
    ['drain', 3, 'The Drain', 'Drain', 'A drainpipe empties here after every rain.'], ['mudflat', 4, 'The Mud Flats', 'Mud', 'Wide, sticky mud and still puddles.'], ['wetedge', 5, 'The Wet Edge', 'Wet', 'Where the wet strip dries into lawn.']];
  for (const [key, c, name, short, blurb] of wet)
    L.push(R(key, [c, 7], name, short, 'wet', blurb, 'A toad on the hunt', 'Slugs (protein), puddles', 'Water and protein', [['slug', 3], ['seed', 2]], 3.5, 12, toad(50, 90)));
  // The leaf pile and the fire ants in the back corner.
  L.push(R('leaves', [6, 7], 'The Leaf Pile', 'Leaves', 'leaf', 'Last autumn\'s leaves, heaped and rotting.', 'A toad under the leaves', 'Dead bugs and seeds', 'Protein in the rot', [['bug', 3], ['seed', 2], ['berry', 1]], 3.5, 14, toad(55, 95)));
  L.push(R('leaves2', [7, 7], 'Deep in the Leaves', 'Leaves', 'leaf', 'The deep end of the leaf pile.', 'A toad under the leaves', 'Dead bugs', 'Protein', [['bug', 4], ['seed', 1]], 3.5, 14, toad(55, 95)));
  L.push(R('fireout', [8, 7], 'Fire Ant Country', 'Fire ants', 'mound', 'Small mounds of red earth. Fire ants patrol here.',
    'Fire ants sting anything that stops', 'Seeds, dead bugs', 'The way to the mound', [['seed', 3], ['bug', 3]], 3, 12, { sting: 0.5 }));
  L.push(R('firemound', [9, 7], 'The Fire Ant Mound', 'Mound', 'mound', 'A great red mound in the corner. The last fight in the yard.',
    'Swarms of stinging fire ants', 'Dead bugs, and whatever they have hoarded', 'The yard, when you are strong enough', [['bug', 4], ['seed', 2]], 3, 12, { sting: 1.2 }));
  return L;
}

function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

// Build the yard. Returns the blocked grid, the region index of every tile,
// landmarks (for drawing), antlion pits, and where things live.
export function makeYard(seed) {
  const S = SCALE, W = AREA * BLOCK.cols, H = AREA * BLOCK.rows;
  const rnd = mulberry32(seed * 7919 + 13);
  const blocked = new Uint8Array(W * H), area = new Uint8Array(W * H), pit = new Uint8Array(W * H);
  const idx = (x, y) => y * W + x;
  for (let i = 0; i < AREAS.length; i++) {
    const b = areaBounds(i);
    for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) area[idx(x, y)] = i;
  }
  const landmarks = [];
  const inMap = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  // Layouts are written relative to a region's corner: O is that corner, in tiles.
  const O = { x: 0, y: 0 };
  const at = (key) => { const b = areaBounds(REGION[key]); O.x = b.x0; O.y = b.y0; };
  const u = (v) => Math.round(v * S); // design units to tiles
  const stamp = (x0, y0, w, h) => { for (let y = O.y + y0; y < O.y + y0 + h; y++) for (let x = O.x + x0; x < O.x + x0 + w; x++) if (inMap(x, y)) blocked[idx(x, y)] = 1; };
  const disc = (cx, cy, r) => { cx += O.x; cy += O.y; for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) if (inMap(x, y) && Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r) blocked[idx(x, y)] = 1; };
  const shift = (p) => { for (const k of ['x', 'x0', 'x1']) if (p[k] != null) p[k] += O.x; for (const k of ['y', 'y0', 'y1']) if (p[k] != null) p[k] += O.y; return p; };
  const mark = (kind, props) => { const l = shift(Object.assign({ kind }, props)); landmarks.push(l); return l; };
  const isBlocked = (x, y) => !inMap(O.x + x, O.y + y) || blocked[idx(O.x + x, O.y + y)];
  const puddles = [], aphids = [], slabs = [], soil = [], dirt = [];
  const puddle = (x, y, amt) => puddles.push([O.x + x, O.y + y, amt]);

  // Nests: ours under the big rock in the middle, the rival in the patio cracks.
  at('patio');
  const ex = O.x + u(60), ey = O.y + u(60), rx = O.x + u(17), ry = O.y + u(17);
  const clear = (x, y, r) => Math.hypot(O.x + x - ex, O.y + y - ey) < r || Math.hypot(O.x + x - rx, O.y + y - ry) < r;

  // The house's brick wall to the north (the house is the yard map's top
  // row, columns 1–8); a wooden fence round the rest of the yard.
  for (let x = 0; x < W; x++) blocked[idx(x, 0)] = 1;
  for (let k = 0; k < 2; k++) {
    for (let x = 0; x < W; x++) blocked[idx(x, H - 1 - k)] = 1;
    for (let y = 0; y < H; y++) { blocked[idx(k, y)] = 1; blocked[idx(W - 1 - k, y)] = 1; }
  }
  O.x = O.y = 0;
  const hx0 = (1 - BLOCK.c0) * AREA, hx1 = (9 - BLOCK.c0) * AREA;
  mark('wall', { x0: hx0, y0: 0, w: hx1 - hx0, h: 1 });
  mark('fence', { side: 'w' }); mark('fence', { side: 'e' }); mark('fence', { side: 's' });
  mark('fence', { side: 'n', x0: 0, x1: hx0 }); mark('fence', { side: 'n', x0: hx1, x1: W });

  // ---------- the first nine (build 8), written across three regions from the Patio's corner ----------
  at('patio');
  // Under the Rock. A big flat stone just north of our entrance.
  const big = mark('bigrock', { x0: u(54), y0: u(50), w: u(13), h: u(6) });
  stamp(u(54), u(50), u(13), u(6));
  scatterRocks(u(41), u(41), u(38), u(38), 10);

  // The Flowerbed. Stems, strawberry plants, and the spider's web.
  const web = { x: O.x + u(60), y: O.y + u(17) };
  for (let i = 0; i < 70; i++) {
    const x = u(42) + Math.floor(rnd() * u(36)), y = u(3) + Math.floor(rnd() * u(34));
    if (Math.hypot(O.x + x - web.x, O.y + y - web.y) < u(4) || isBlocked(x, y)) continue;
    stamp(x, y, 1, 1);
    mark('flower', { x, y, h: (70 + rnd() * 70) * S, petal: ['#e86a8a', '#f2c84a', '#f4f0e8', '#b07ad8', '#ff8a3a'][Math.floor(rnd() * 5)], seed: rnd() });
  }
  for (let i = 0; i < 10; i++) {
    const x = u(44) + Math.floor(rnd() * u(30)), y = u(5) + Math.floor(rnd() * u(30));
    if (Math.hypot(O.x + x - web.x, O.y + y - web.y) < u(5)) continue;
    stamp(x, y, u(2), u(2)); mark('strawberry', { x0: x, y0: y, w: u(2), h: u(2) });
  }
  stamp(u(57), u(17), 1, 1); stamp(u(63), u(17), 1, 1);
  mark('flower', { x: u(57), y: u(17), h: 120 * S, petal: '#e86a8a', seed: 0.3 });
  mark('flower', { x: u(63), y: u(17), h: 115 * S, petal: '#f4f0e8', seed: 0.7 });
  mark('web', { x: u(60), y: u(17), r: u(4) });

  // The Woodpile. Logs stacked in rows with gaps to squeeze through.
  for (let row = 0; row < 6; row++) {
    let x = u(82) + Math.floor(rnd() * u(4));
    const y = u(4) + row * u(6);
    while (x < u(116)) {
      const len = u(8) + Math.floor(rnd() * u(12));
      const w = Math.min(len, u(117) - x);
      if (w >= u(5)) { stamp(x, y, w, u(3)); mark('log', { x0: x, y0: y, w, h: u(3) }); }
      x += w + u(2) + Math.floor(rnd() * u(3));
    }
  }

  // The Spigot. The tap's pipe on a brick post, a coiled hose, mud.
  stamp(2, u(44), u(4), u(4)); mark('spigot', { x0: 2, y0: u(44), w: u(4), h: u(4) });
  disc(u(15), u(68), u(4)); mark('hose', { x: u(15), y: u(68), r: u(4) });
  for (const [x, y, a] of [[10, 50, 34], [24, 58, 30], [8, 74, 26], [30, 46, 22]]) puddle(u(x), u(y), a);
  scatterRocks(u(2), u(41), u(36), u(38), 4);

  // The Compost heap, a big mound of scraps.
  disc(u(100), u(58), u(6.5)); mark('heap', { x: u(100), y: u(58), r: u(6.5) });
  scatterRocks(u(81), u(41), u(37), u(37), 4);

  // The Sandbox. A wooden frame (two tiles thick) with two gaps, a bucket and a shovel.
  const sb = mark('frame', { x0: u(4), y0: u(84), x1: u(35) + 1, y1: u(115) + 1, t: S });
  {
    const lx0 = u(4), ly0 = u(84), lx1 = u(35) + 1, ly1 = u(115) + 1;
    for (let x = lx0; x <= lx1; x++) { if (x < u(17) || x > u(22)) stamp(x, ly0, 1, S); stamp(x, ly1 - S + 1, 1, S); }
    for (let y = ly0; y <= ly1; y++) { stamp(lx0, y, S, 1); if (y < u(96) || y > u(101)) stamp(lx1 - S + 1, y, S, 1); }
  }
  stamp(u(10), u(104), u(3), u(3)); mark('bucket', { x0: u(10), y0: u(104), w: u(3), h: u(3) });
  stamp(u(26), u(90), u(2), u(6)); mark('shovel', { x0: u(26), y0: u(90), w: u(2), h: u(6) });
  const pits = [], pr = 1.8 * S;
  for (let i = 0; i < 80 && pits.length < 7; i++) {
    const x = sb.x0 + u(4) + rnd() * (sb.x1 - sb.x0 - u(8)), y = sb.y0 + u(4) + rnd() * (sb.y1 - sb.y0 - u(8));
    if (pits.some((p) => Math.hypot(p.x - x, p.y - y) < pr * 3.6)) continue;
    let ok = true;
    for (let yy = Math.floor(y - pr - 1); yy <= y + pr + 1; yy++) for (let xx = Math.floor(x - pr - 1); xx <= x + pr + 1; xx++) if (blocked[idx(xx, yy)]) ok = false;
    if (!ok) continue;
    pits.push({ x, y, r: pr });
    // 2 = the deadly bottom, 1 = the sliding rim.
    for (let yy = Math.floor(y - pr - 1); yy <= y + pr + 1; yy++) for (let xx = Math.floor(x - pr - 1); xx <= x + pr + 1; xx++) {
      const d = Math.hypot(xx + 0.5 - x, yy + 0.5 - y);
      if (d < pr * 0.5) pit[idx(xx, yy)] = 2; else if (d < pr * 1.05) pit[idx(xx, yy)] = 1;
    }
  }
  landmarks.push({ kind: 'pits', pits });

  // The Lawn. A few stones in deep grass (the renderer grows the grass).
  scatterRocks(u(41), u(81), u(38), u(37), 6);
  const lawn = mark('lawn', { x0: u(40), y0: u(80), w: u(40), h: u(40) });

  // The Picnic blanket, with a soda can and a plate on it.
  const bl = mark('blanket', { x0: u(84), y0: u(84), w: u(31), h: u(28) });
  stamp(u(105), u(90), u(3), u(3)); mark('can', { x0: u(105), y0: u(90), w: u(3), h: u(3) });
  mark('plate', { x: u(94), y: u(100), r: u(4.5) });

  // The Patio. Laid slabs around the rival's crack, a flower pot.
  slabs.push(shift({ x0: u(2), y0: u(1), w: u(33), h: u(32) }));
  disc(u(30), u(30), u(3.5)); mark('pot', { x: u(30), y: u(30), r: u(3.5) });
  scatterRocks(u(2), u(2), u(36), u(36), 3);

  // ---------- the ring (build 10): one region at a time, each from its own corner ----------
  // The Back Steps: wooden steps down from the back door onto a concrete
  // landing, a doormat, a pot on each side.
  at('steps');
  stamp(u(7), 1, u(26), u(9)); mark('steps', { x0: u(7), y0: 1, w: u(26), h: u(9) });
  mark('mat', { x0: u(11), y0: u(10) + 1, w: u(18), h: u(7) });
  slabs.push(shift({ x0: u(4), y0: 0, w: u(32), h: u(20) }));
  for (const px of [3.5, 36.5]) { disc(u(px), u(6), u(2.5)); mark('pot', { x: u(px), y: u(6), r: u(2.5) }); }
  scatterRocks(u(2), u(22), u(36), u(16), 3);

  // The Grill: a kettle grill on three legs, a table and two chairs on a
  // concrete pad, grease spots underneath.
  at('grill');
  slabs.push(shift({ x0: u(3), y0: 1, w: u(34), h: u(34) }));
  const gr = mark('grill', { x: u(13), y: u(12), r: u(4.5) });
  for (let k = 0; k < 3; k++) { const a = k * 2.1 + 0.4; disc(u(13) + Math.cos(a) * u(3.6), u(12) + Math.sin(a) * u(3.6), 1.2); }
  const table = mark('table', { x: u(26), y: u(22), w: u(14), h: u(9) });
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) disc(u(26) + sx * u(6), u(22) + sy * u(3.8), 1.3);
  for (const [cx, cy, back] of [[u(26), u(31), 1], [u(26), u(13), -1]]) {
    mark('chair', { x: cx, y: cy, w: u(6), h: u(5), back });
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) disc(cx + sx * u(2.5), cy + sy * u(2), 1);
  }
  mark('grease', { spots: [[gr.x - O.x, gr.y - O.y + u(3)], [table.x - O.x - u(3), table.y - O.y + u(1)], [table.x - O.x + u(4), table.y - O.y - u(2)]].map(([x, y]) => [O.x + x, O.y + y, u(1.5 + rnd() * 1.5)]) });

  // The vegetable garden: three beds of soft soil each, tomatoes in the
  // north region, beans and lettuce in the south. Aphids cluster on stems.
  at('tomatoes');
  for (let k = 0; k < 3; k++) {
    const by = 3 + k * 12.5;
    soil.push(shift({ x0: u(4), y0: u(by), w: u(32), h: u(8) }));
    for (let x = 7; x < 34; x += 6.5) {
      const tx = u(x + rnd() * 1.5), ty = u(by + 4 + (rnd() - 0.5) * 2);
      stamp(tx, ty, 1, 1); mark('tomato', { x: tx, y: ty, h: (110 + rnd() * 50) * S, seed: rnd() });
      if (rnd() < 0.45 && !isBlocked(tx + 2, ty)) aphids.push([O.x + tx + 2, O.y + ty]);
    }
  }
  at('beans');
  for (let k = 0; k < 3; k++) {
    const by = 3 + k * 12.5;
    soil.push(shift({ x0: u(4), y0: u(by), w: u(32), h: u(8) }));
    for (let x = 7; x < 34; x += k === 1 ? 6 : 5) {
      const tx = u(x + rnd()), ty = u(by + 4 + (rnd() - 0.5) * 2);
      if (k === 1) { if (!isBlocked(tx, ty)) { disc(tx, ty, u(1.8)); mark('lettuce', { x: tx, y: ty, r: u(1.8), seed: rnd() }); } continue; }
      stamp(tx, ty, 1, 1); mark('beanpole', { x: tx, y: ty, h: (200 + rnd() * 60) * S, seed: rnd() });
      if (rnd() < 0.4 && !isBlocked(tx - 2, ty)) aphids.push([O.x + tx - 2, O.y + ty]);
    }
  }

  // Under the Bird Feeder: a pole with the feeder up high, seed spilled below.
  at('feeder');
  disc(u(20), u(20), 1.6); mark('feeder', { x: u(20), y: u(20) });
  dirt.push([O.x + u(20), O.y + u(20), u(6)]);
  scatterRocks(u(2), u(2), u(36), u(36), 4);

  // The Birdbath: a stone bowl on a pedestal; splashes leave puddles.
  at('birdbath');
  disc(u(20), u(18), u(2.4)); mark('birdbath', { x: u(20), y: u(18), r: u(2.4), bowl: u(8) });
  for (const [x, y, a] of [[13, 25, 24], [28, 24, 22], [21, 30, 20]]) puddle(u(x), u(y), a);
  scatterRocks(u(2), u(2), u(36), u(36), 3);

  // The great lawn's top row: long grass, and one thing in each region.
  at('pool');
  disc(u(20), u(18), u(8.5)); mark('pool', { x: u(20), y: u(18), r: u(8.5) });
  for (const [x, y, a] of [[8, 30, 26], [32, 30, 22], [20, 31, 20]]) puddle(u(x), u(y), a);
  at('swings');
  const sw = mark('swingset', { x0: u(6), x1: u(34), y: u(18), spread: u(4) });
  for (const lx of [u(6), u(34)]) for (const s of [-1, 1]) disc(lx, u(18) + s * u(4), 1.5);
  for (const sx of [15, 25]) dirt.push([O.x + u(sx), sw.y, u(4)]);
  at('clover');
  for (let i = 0; i < 24; i++) { const x = u(3) + Math.floor(rnd() * u(34)), y = u(3) + Math.floor(rnd() * u(34)); if (isBlocked(x, y)) continue; stamp(x, y, 1, 1); mark('dandelion', { x, y, h: (40 + rnd() * 40) * S, puff: rnd() < 0.3, seed: rnd() }); }
  mark('clover', { x0: u(4), y0: u(4), w: u(32), h: u(32) });
  at('molehills');
  for (let i = 0; i < 12 && landmarks.filter((l) => l.kind === 'molehill').length < 6; i++) {
    const x = u(6) + Math.floor(rnd() * u(28)), y = u(6) + Math.floor(rnd() * u(28)), r = u(2 + rnd());
    if (landmarks.some((l) => l.kind === 'molehill' && Math.hypot(l.x - O.x - x, l.y - O.y - y) < r * 3)) continue;
    disc(x, y, r); mark('molehill', { x, y, r });
    dirt.push([O.x + x, O.y + y, r + u(2)]);
  }
  at('dandelions');
  for (let i = 0; i < 40; i++) { const x = u(3) + Math.floor(rnd() * u(34)), y = u(3) + Math.floor(rnd() * u(34)); if (isBlocked(x, y)) continue; stamp(x, y, 1, 1); mark('dandelion', { x, y, h: (45 + rnd() * 45) * S, puff: rnd() < 0.4, seed: rnd() }); }
  scatterRocks(u(2), u(2), u(36), u(36), 3);

  // ---------- the rest of the yard (build 11), region by region ----------
  const grounds = []; // ground patches, world tiles: { kind, x0, y0, w, h, soft }
  const ground = (kind, x0, y0, w, h, soft = 0) => grounds.push({ kind, x0: O.x + x0, y0: O.y + y0, w, h, soft });
  const here = (key, kind, soft = 6) => { at(key); ground(kind, 0, 0, AREA, AREA, soft); };
  const some = (n, x0, y0, w, h, fn) => { for (let i = 0, k = 0; i < n * 4 && k < n; i++) { const x = u(x0) + Math.floor(rnd() * u(w)), y = u(y0) + Math.floor(rnd() * u(h)); if (isBlocked(x, y) || isBlocked(x + 1, y) || isBlocked(x, y + 1)) continue; if (fn(x, y) !== false) k++; } };

  // Trash cans by the side gate, on a gravel pad.
  here('trash', 'gravel', 2);
  for (const [x, y, c] of [[9, 12, '#5a6a5a'], [20, 9, '#3a4a6a'], [31, 13, '#6a6a62']]) { disc(u(x), u(y), u(4.5)); mark('trashcan', { x: u(x), y: u(y), r: u(4.5), color: c }); }
  disc(u(14), u(24), u(2.5)); mark('bag', { x: u(14), y: u(24), r: u(2.5) });
  scatterRocks(u(2), u(28), u(36), u(10), 2);
  // The porch corner: deck boards, a pot, a chair.
  at('porch'); ground('deck', 0, 1, AREA, u(18));
  disc(u(8), u(6), u(3)); mark('pot', { x: u(8), y: u(6), r: u(3) });
  mark('chair', { x: u(26), y: u(9), w: u(7), h: u(6), back: -1 });
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) disc(u(26) + sx * u(3), u(9) + sy * u(2.4), 1);
  scatterRocks(u(2), u(22), u(36), u(16), 3);
  // The cooler, sweating onto the concrete.
  at('cooler'); slabs.push(shift({ x0: 0, y0: 1, w: u(30), h: u(26) }));
  stamp(u(12), u(10), u(10), u(6)); mark('cooler', { x0: u(12), y0: u(10), w: u(10), h: u(6) });
  for (const [x, y, a] of [[11, 18, 24], [20, 19, 20], [25, 14, 18]]) puddle(u(x), u(y), a);
  mark('chair', { x: u(31), y: u(10), w: u(6), h: u(5), back: 1 });
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) disc(u(31) + sx * u(2.5), u(10) + sy * u(2), 1);
  // The rock garden: boulders and succulents in gravel.
  for (const key of ['rockgarden', 'rockgarden2']) {
    here(key, 'gravel', 5);
    some(key === 'rockgarden' ? 6 : 5, 4, 4, 32, 32, (x, y) => { const r = u(2 + rnd() * 2.2); if (landmarks.some((l) => l.kind === 'boulder' && Math.hypot(l.x - O.x - x, l.y - O.y - y) < l.r + r + u(3))) return false; disc(x, y, r); mark('boulder', { x, y, r, seed: rnd() }); });
    some(10, 3, 3, 34, 34, (x, y) => { disc(x, y, u(0.9)); mark('succulent', { x, y, r: u(0.9), seed: rnd() }); });
    if (key === 'rockgarden2') { disc(u(28), u(28), u(1.2)); mark('cactus', { x: u(28), y: u(28), r: u(1.2) }); }
  }
  // The hedge: dense bushes against the fence, tunnels through them.
  for (let r = 1; r <= 6; r++) {
    here('hedge' + r, 'hedge', 4);
    for (let y = 0; y < 40; y += 10) {
      const gap = 3 + Math.floor(rnd() * 4);
      stamp(u(14), u(y), u(26), u(10 - gap)); mark('hedge', { x0: u(14), y0: u(y), w: u(26), h: u(10 - gap), seed: rnd() });
    }
    some(3, 2, 4, 10, 32, (x, y) => { disc(x, y, u(1.2)); mark('bush', { x, y, r: u(1.2), seed: rnd() }); });
  }
  // The side yard: a gravel path down the middle, odds and ends by the fence.
  for (let r = 2; r <= 4; r++) {
    at('side' + r); ground('gravel', u(14), 0, u(12), AREA, 2);
    if (r === 2) { disc(u(6), u(20), u(3.5)); mark('hosereel', { x: u(6), y: u(20), r: u(3.5) }); }
    if (r === 3) { disc(u(6), u(14), u(4)); mark('trashcan', { x: u(6), y: u(14), r: u(4), color: '#2a6a3a' }); disc(u(33), u(28), u(3)); mark('pot', { x: u(33), y: u(28), r: u(3) }); }
    if (r === 4) { stamp(u(3), u(6), u(2), u(2)); mark('drainpipe', { x: u(4), y: u(7) }); puddle(u(8), u(10), 26); disc(u(32), u(22), u(2.5)); mark('pot', { x: u(32), y: u(22), r: u(2.5) }); }
    scatterRocks(u(28), u(2), u(10), u(36), 3);
  }
  // Peppers and squash; the herb patch. Beds like the rest of the garden.
  at('peppers');
  for (let k = 0; k < 3; k++) {
    const by = 3 + k * 12.5;
    soil.push(shift({ x0: u(4), y0: u(by), w: u(32), h: u(8) }));
    for (let x = 7; x < 34; x += k === 2 ? 9 : 6.5) {
      const tx = u(x + rnd() * 1.5), ty = u(by + 4 + (rnd() - 0.5) * 2);
      if (k === 2) { if (!isBlocked(tx, ty)) { disc(tx, ty, u(2.2)); mark('squash', { x: tx, y: ty, r: u(2.2), seed: rnd() }); } continue; }
      stamp(tx, ty, 1, 1); mark('tomato', { x: tx, y: ty, h: (90 + rnd() * 40) * S, seed: rnd(), fruit: rnd() < 0.5 ? 'yellow' : 'green' });
      if (rnd() < 0.4 && !isBlocked(tx + 2, ty)) aphids.push([O.x + tx + 2, O.y + ty]);
    }
  }
  at('herbs');
  for (let k = 0; k < 3; k++) {
    const by = 3 + k * 12.5;
    soil.push(shift({ x0: u(4), y0: u(by), w: u(32), h: u(8) }));
    for (let x = 7; x < 34; x += 4.5) {
      const tx = u(x + rnd()), ty = u(by + 4 + (rnd() - 0.5) * 2);
      if (isBlocked(tx, ty)) continue;
      disc(tx, ty, u(1.3)); mark('herb', { x: tx, y: ty, r: u(1.3), seed: rnd(), kind2: k });
      if (rnd() < 0.25 && !isBlocked(tx + u(2), ty)) aphids.push([O.x + tx + u(2), O.y + ty]);
    }
  }
  // The suet feeder; the stepping stones and the gnome.
  at('suet'); disc(u(20), u(20), 1.6); mark('feeder', { x: u(20), y: u(20), suet: true }); dirt.push([O.x + u(20), O.y + u(20), u(6)]); scatterRocks(u(2), u(2), u(36), u(36), 3);
  for (const key of ['stones', 'gnomes']) {
    at(key);
    for (let i = 0; i < 6; i++) { const x = u(4 + i * 6.4), y = u(20 + Math.sin(i * 0.9 + (key === 'gnomes' ? 2 : 0)) * 6); mark('stepstone', { x, y, r: u(2.4), seed: rnd() }); }
    if (key === 'gnomes') { disc(u(22), u(32), u(1.6)); mark('gnome', { x: u(22), y: u(32), r: u(1.6), rod: true }); }
    scatterRocks(u(2), u(2), u(36), u(8), 2);
  }
  // The Oak: the trunk, roots spreading through the regions round it.
  for (const key of ['oakroots', 'oak', 'acorns', 'branches', 'oakeast', 'fallen']) here(key, 'oak', 8);
  at('oak'); disc(u(16), u(26), u(8)); mark('oak', { x: u(16), y: u(26), r: u(8) });
  for (let k = 0; k < 7; k++) {
    const a = k * 0.9 + rnd() * 0.4, len = u(10 + rnd() * 8);
    mark('root', { x: u(16) + Math.cos(a) * u(7), y: u(26) + Math.sin(a) * u(7), a, len, seed: rnd() });
    for (let d = 0; d < len; d += 1) { const x = Math.round(u(16) + Math.cos(a) * (u(7) + d)), y = Math.round(u(26) + Math.sin(a) * (u(7) + d)); stamp(x, y, 1, 1); }
  }
  at('oakroots');
  for (let k = 0; k < 5; k++) { const a = Math.PI * (0.6 + rnd() * 0.8), x0 = u(36), y0 = u(30 + rnd() * 8), len = u(10 + rnd() * 14); mark('root', { x: x0, y: y0, a, len, seed: rnd() }); for (let d = 0; d < len; d += 1) stamp(Math.round(x0 + Math.cos(a) * d), Math.round(y0 + Math.sin(a) * d), 1, 1); }
  at('branches'); some(6, 4, 4, 32, 32, (x, y) => { const w = u(3 + rnd() * 4); if (isBlocked(x + w, y)) return false; stamp(x, y, w, 1); mark('twig', { x0: x, y0: y, w, h: 1, seed: rnd() }); });
  at('fallen'); stamp(u(4), u(16), u(30), u(4)); mark('log', { x0: u(4), y0: u(16), w: u(30), h: u(4), rot: true });
  at('acorns'); scatterRocks(u(2), u(2), u(36), u(36), 2);
  at('oakeast'); some(4, 4, 4, 32, 32, (x, y) => { const a = rnd() * Math.PI * 2, len = u(6 + rnd() * 6); mark('root', { x, y, a, len, seed: rnd() }); for (let d = 0; d < len; d++) stamp(Math.round(x + Math.cos(a) * d), Math.round(y + Math.sin(a) * d), 1, 1); });
  // The garden shed.
  at('shed'); slabs.push(shift({ x0: u(2), y0: u(4), w: u(28), h: u(28) }));
  stamp(u(4), u(6), u(22), u(20)); mark('shed', { x0: u(4), y0: u(6), w: u(22), h: u(20) });
  for (const [x, y] of [[30, 10], [33, 14]]) { disc(u(x), u(y), u(2.2)); mark('bag', { x: u(x), y: u(y), r: u(2.2), color: '#c8b070' }); }
  disc(u(30), u(32), u(2.5)); mark('pot', { x: u(30), y: u(32), r: u(2.5) });
  // The wild corner: thistles, weeds, the toad's hole.
  here('thistles', 'wild'); some(18, 3, 3, 34, 34, (x, y) => { stamp(x, y, 1, 1); mark('thistle', { x, y, h: (60 + rnd() * 50) * S, seed: rnd() }); });
  here('toadhole', 'wild'); mark('toadhole', { x: u(18), y: u(16), r: u(3) }); some(12, 3, 3, 34, 34, (x, y) => { if (Math.hypot(x - u(18), y - u(16)) < u(6)) return false; stamp(x, y, 1, 1); mark('thistle', { x, y, h: (40 + rnd() * 40) * S, seed: rnd(), weed: true }); });
  // The great lawn's other regions: one thing in each.
  at('sprinkler'); mark('sprinkler', { x: u(20), y: u(20) }); stamp(u(20), u(20), 1, 1); for (let k = 0; k < 6; k++) { const a = k * 1.05, d = 8 + rnd() * 8; puddle(Math.round(u(20) + Math.cos(a) * u(d)), Math.round(u(20) + Math.sin(a) * u(d)), 20 + Math.floor(rnd() * 10)); }
  at('trampoline'); mark('trampoline', { x: u(20), y: u(20), r: u(12) }); for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; disc(u(20) + Math.cos(a) * u(11), u(20) + Math.sin(a) * u(11), 1.4); }
  at('soccer'); disc(u(22), u(18), u(4)); mark('ball', { x: u(22), y: u(18), r: u(4) });
  at('fairyring'); for (let k = 0; k < 11; k++) { const a = (k / 11) * Math.PI * 2, x = Math.round(u(20) + Math.cos(a) * u(11)), y = Math.round(u(20) + Math.sin(a) * u(11)), r = u(0.8 + rnd() * 0.8); disc(x, y, r); mark('mushroom', { x, y, r, seed: rnd() }); }
  at('gnome'); disc(u(18), u(20), u(1.6)); mark('gnome', { x: u(18), y: u(20), r: u(1.6) }); stamp(u(24), u(19), u(5), u(3)); mark('barrow', { x0: u(24), y0: u(19), w: u(5), h: u(3) });
  at('frisbee'); mark('frisbee', { x: u(20), y: u(22), r: u(4) }); puddle(u(20), u(22), 30);
  at('bone'); stamp(u(16), u(20), u(8), u(2)); mark('bone', { x0: u(16), y0: u(20), w: u(8), h: u(2) });
  at('cloverhill'); mark('clover', { x0: u(2), y0: u(2), w: u(36), h: u(36) }); some(14, 3, 3, 34, 34, (x, y) => { stamp(x, y, 1, 1); mark('dandelion', { x, y, h: (40 + rnd() * 40) * S, puff: rnd() < 0.3, seed: rnd() }); });
  at('truck'); stamp(u(14), u(16), u(10), u(6)); mark('truck', { x0: u(14), y0: u(16), w: u(10), h: u(6) });
  at('bare'); dirt.push([O.x + u(20), O.y + u(20), u(14)], [O.x + u(8), O.y + u(30), u(7)]); scatterRocks(u(4), u(4), u(32), u(32), 4);
  at('longgrass'); ground('tall', 0, 0, AREA, AREA, 8);
  at('daisies'); some(30, 3, 3, 34, 34, (x, y) => { stamp(x, y, 1, 1); mark('flower', { x, y, h: (35 + rnd() * 25) * S, petal: '#f8f6f0', seed: rnd(), small: true }); });
  at('lawnedge'); for (let i = 0; i < 9; i++) { const x = u(36), y = u(2 + i * 4.3); stamp(x, y, u(2), u(3)); mark('stone', { x0: x, y0: y, w: u(2), h: u(3), seed: rnd() }); }
  // The low wet strip: mud, puddles, reeds; slime; a drain.
  for (const key of ['reeds', 'slugs', 'drain', 'mudflat', 'wetedge']) {
    here(key, 'wet', key === 'wetedge' ? 10 : 5);
    const n = key === 'mudflat' ? 6 : 3;
    for (let k = 0; k < n; k++) puddle(u(4 + rnd() * 32), u(8 + rnd() * 26), 20 + Math.floor(rnd() * 14));
    some(key === 'reeds' ? 22 : 8, 3, 3, 34, 34, (x, y) => { stamp(x, y, 1, 1); mark('reed', { x, y, h: (80 + rnd() * 80) * S, seed: rnd() }); });
    if (key === 'drain') { stamp(u(18), u(36), u(4), u(3)); mark('drainpipe', { x: u(20), y: u(37), out: true }); }
    if (key === 'slugs') mark('slime', { pts: Array.from({ length: 5 }, () => [O.x + u(4 + rnd() * 32), O.y + u(4 + rnd() * 32), rnd() * Math.PI]) });
  }
  // The leaf pile: heaps of leaves you can wade through, a few you can't.
  for (const key of ['leaves', 'leaves2']) {
    here(key, 'leaf', 6);
    some(key === 'leaves' ? 3 : 5, 6, 6, 28, 28, (x, y) => { const r = u(2.5 + rnd() * 2); disc(x, y, r); mark('leafheap', { x, y, r, seed: rnd() }); });
  }
  // Fire ants: little mounds, then the great one in the corner.
  here('fireout', 'mound', 8); some(5, 4, 4, 32, 32, (x, y) => { const r = u(1.6 + rnd()); disc(x, y, r); mark('firemound', { x, y, r }); });
  here('firemound', 'mound', 6); disc(u(20), u(20), u(7)); mark('firemound', { x: u(20), y: u(20), r: u(7), big: true });
  const stings = [...landmarks.filter((l) => l.kind === 'firemound')].map((l) => ({ x: l.x, y: l.y, r: l.r + (l.big ? u(9) : u(4)), power: l.big ? 1.2 : 0.5 }));

  // The great lawn's long grass: columns 1–6, rows 4–6 of the yard map.
  O.x = O.y = 0;
  const long = { x0: (1 - BLOCK.c0) * AREA, y0: (4 - BLOCK.r0) * AREA, w: 6 * AREA, h: 3 * AREA };

  // Loose stones: a rock is a landmark of its own, one to four tiles across.
  function scatterRocks(x0, y0, w, h, n) {
    for (let i = 0; i < n * 3 && n > 0; i++) {
      const cx = x0 + Math.floor(rnd() * w), cy = y0 + Math.floor(rnd() * h);
      if (clear(cx, cy, 12)) continue;
      const rw = 1 + Math.floor(rnd() * 2 * S), rh = 1 + Math.floor(rnd() * 2 * S);
      let ok = true;
      for (let y = cy - 2; y < cy + rh + 2; y++) for (let x = cx - 2; x < cx + rw + 2; x++) if (isBlocked(x, y)) ok = false;
      if (!ok) continue;
      stamp(cx, cy, rw, rh); mark('stone', { x0: cx, y0: cy, w: rw, h: rh, seed: rnd() }); n--;
    }
  }
  // Nest sites and aphid spots stay open.
  for (const [nx, ny] of [[ex, ey], [rx, ry]]) for (let y = ny - 2; y <= ny + 2; y++) for (let x = nx - 2; x <= nx + 2; x++) blocked[idx(x, y)] = 0;
  for (const [x, y] of aphids) blocked[idx(x, y)] = 0;
  return { W, H, S, blocked, area, pit, landmarks, pits, puddles, aphids, ex, ey, rx, ry, web, sandbox: sb, blanket: bl, lawn, long, slabs, soil, dirt, grounds, stings, bigrock: big, rnd };
}

// A region's bounds, in tiles.
export function areaBounds(i) {
  const [c, r] = AREAS[i].at, ax = (c - BLOCK.c0) * AREA, ay = (r - BLOCK.r0) * AREA;
  return { x0: ax, y0: ay, x1: ax + AREA - 1, y1: ay + AREA - 1 };
}
