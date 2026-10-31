// Player-facing text: short on purpose (one or two lines each), so the game
// teaches itself without a wall of reading. Edit copy here only.

export const EXPL = {
  dig: ['You are the queen', 'Tap the dirt beside her to dig. Two cells down, then press Build nest. Digging uses her energy.'],
  nest: ['The nest', 'Tap dirt by a tunnel to dig. Press Build to place a room. The yellow ant is you.'],
  surface: ['Outside', 'Tap to walk. Pick up food and bring it to the dark hole. Your path leaves a scent trail others follow.'],
  dew: ['Dew', 'Water beads, for a minute at a time. Each egg costs 1 water.'],
  cat: ['Caterpillar', 'Harmless, and 40 protein. Hold Recruit, lead your crew onto it, then haul the meat home.'],
  treat: ['A treat', 'Too big for one ant. Hold Recruit for a crew, lead them to it, press Lift.'],
  spider: ['Spider', 'Run! It crouches, then lunges. After a kill it stops to eat. Thirty ants, or five Venom ants, can kill it.'],
  ladybug: ['Ladybug', 'It eats your aphids. Bite it, and it flies off. A crew drives it away fast.'],
  earwig: ['Earwig', 'It pinches any ant that comes close, and foragers keep clear of it. Bring fighters, or go round.'],
  cricket: ['Cricket', '25 protein, if you can catch it. It hops away; chase it and after five hops it’s worn out.'],
  millipede: ['Millipede', 'Harmless. Bitten, it curls into an armoured ball and takes a third of the damage. 20 protein for a patient crew.'],
  raid: ['Rival raid', 'Pavement ants from the Patio. Keep Soldiers at your door or they reach the queen.'],
  queenhit: ['Queen under attack', 'Raiders got in. Lay Soldiers to guard the door.'],
  soldierfood: ['Soldiers need protein', 'Fighters eat protein. Hunt caterpillars or bring dead bugs from the Woodpile.'],
  mower: ['The mower', 'It sweeps the Lawn. Get off the grass when you hear it.'],
  starving: ['Starving', 'The store is empty. Forage farther, and lay fewer eggs for now.'],
  feet: ['Feet', 'A shadow means a shoe is coming. Get out from under it.'],
  bird: ['Robin', 'It hunts the nearest ant. Run, or bring five fighters to chase it off.'],
  toad: ['Toad', 'Its tongue reaches five tiles. Keep away, or bring five fighters.'],
  acorn: ['Acorns', 'A small shadow means an acorn is falling. It’s food for a crew of four once it lands.'],
  spray: ['Bug spray', 'Mist means the cloud is coming. Get out and stay out.'],
  fireants: ['Fire ants', 'Their red earth stings. Cross fast, or go round.'],
  lost: ['The colony is lost', 'The queen is dead. Start a new colony from the menu.'],
  rain: ['Rain', 'Trails wash away. Keep a Builder inside or the bottom tunnel caves in.'],
  cavein: ['Cave-in', 'A tunnel fell in. Builders inside repair it.'],
  protein: ['Protein', 'Red meat and dead bugs. It pays for Soldiers and feeds them.'],
  grit: ['Stone', 'Builders fetch pebbles. Stone pays for rooms and queen upgrades.'],
  queen: ['', 'Tap a caste to lay an egg. A Hatchery lets her lay more at once.'],
  build: ['', 'Each room needs a dug pocket its size. You pay now; Builders finish it.'],
  soil: ['Soil', 'Deeper is harder. Packed soil needs a Workshop; clay also needs a queen upgrade.'],
  outpost: ['An outpost', 'Foragers now range round it as they do round the nest, and along the road back home. Trails beside it never fade. Hold its region: beat any guardian there and the region’s prize is yours.'],
  held: ['A region held', 'An outpost stands here and nothing guards it: its prize is yours for as long as the outpost does. Feet and the mower can knock outposts flat.'],
  goal: ['Goals', 'Three goals at a time: next, soon and later. Each pays 🧬 Genes. Finish a whole set (Garden, Hunter…) for a reward for good. See them under Evolve → Goals.'],
  genes: ['🧬 Genes', 'You earn Genes by playing: scouting new ground, bringing home new finds, hatching eggs, killing big game. Spend them on the evolution tree. Press Evolve (the twist of DNA).'],
  veteran: ['A Veteran', 'Ants get better at their jobs. They hatch pale, darken as they learn, and Veterans pick up a promotion. Elites get names. Choose what they learn under Evolve → Ants.'],
  cap: ['The queen’s reach', 'She’s at her ant limit. Upgrade her to raise it.'],
};

// Help, in pages (build 14): the tabs along the top pick one.
export const HELP_PAGES = [
  ['Basics', `
<div class="h"><b>Your goal</b> Grow the colony, then take the yard: kill the rival queen on the Patio by holding her hole with eight fighters until she falls. Lose your own queen and it's over.</div>
<div class="h"><b>Outside</b> Tap to walk, and hold to keep walking. Stand on food and press <b>Pick up</b>, then carry it to the dark hole. Your path home is a scent trail other ants follow.</div>
<div class="h"><b>Your ant</b> ❤ is your health, 🍖 your hunger. Eat at the nest, or stand beside a forager carrying food. A red edge means you're hurt. When you die, choose what to come back as.</div>
<div class="h"><b>Buttons</b> Every button has its name on it. Hold one to hear more. ⋯ in the top bar shows the colony's numbers.</div>`],
  ['Colony', `
<div class="h"><b>The nest</b> Tap <b>Nest</b> (top right). Tap dirt beside a tunnel to order digging. <b>Build</b> places a room in a pocket you've dug. Tap the queen for eggs.</div>
<div class="h"><b>Ants</b> Forager: gathers. Builder: digs, builds, hauls dirt out, holds tunnels up. Nurse: faster eggs. Soldier: guards the door. Venom ant: kills spiders.</div>
<div class="h"><b>Rooms</b> Hatchery: more eggs at once. Food store: more food. Cistern: more water. Nursery: Nurses. Barracks: Soldiers. Workshop: deeper digging.</div>
<div class="h"><b>Resources</b> 🌾 Food: every ant eats it. 💧 Water: each egg costs 1. 🥩 Protein: for soldiers. 🪨 Stone: rooms and upgrades.</div>
<div class="h"><b>Crews</b> Hold <b>Recruit</b> to gather ants round you; they follow until you <b>Release</b>. A crew lifts treats too big for one ant, and fights.</div>`],
  ['Growth', `
<div class="h"><b>Evolve</b> The DNA button. 🧬 Genes come from scouting new regions, the first of each find brought home, every 10 eggs, big kills and goals. Spend them on the evolution tree.</div>
<div class="h"><b>Upgrades</b> Each kind of ant, and you, has levels bought with materials. Some levels make you pick one of two abilities, for good.</div>
<div class="h"><b>Veterans</b> Ants get better at their jobs. Veterans learn a promotion, Elites get a name, a big kill makes a Legend.</div>
<div class="h"><b>Outposts</b> Evolve Waypoints, walk out and press <b>Outpost</b>: you and your crew pile a cairn (10 stone). Foragers range round it. Beat a region's guardian and its prize is yours.</div>
<div class="h"><b>Goals</b> Three at a time, each paying 🧬. Finish a set for a reward for good.</div>`],
  ['Dangers', `
<div class="h"><b>Spider</b> Waits by its web in the Flowerbed. It crouches, then lunges. After a kill it stops to eat, and after three it goes back to its web to sleep. Thirty ants, or five Venom ants, can kill it.</div>
<div class="h"><b>Small creatures</b> Ladybugs eat your aphids: bite them and they fly off. Earwigs pinch: bring fighters. Crickets hop away until they tire: 25 protein. Millipedes curl up armoured: 20 protein for a patient crew.</div>
<div class="h"><b>Raids</b> Rival pavement ants grow bolder. Keep Soldiers at your door or they reach the queen.</div>
<div class="h"><b>From above</b> A shadow means a foot or an acorn is coming; mist means bug spray. Robins and the toad hunt the nearest ant: run, or bring five fighters.</div>
<div class="h"><b>The ground</b> The mower sweeps the Lawn; antlion funnels in the Sandbox pull ants down; fire ants sting anything that stops.</div>
<div class="h"><b>Weather</b> Thunder means rain soon. Rain washes trails away, knocks ants about so some drop their loads, and caves in tunnels unless Builders are inside.</div>`],
  ['Menu', `
<div class="h"><button data-title="1" style="width:100%">Main menu</button></div>
<div class="h btnrow"><button data-retips="1">Show tips again</button><button data-reset="1">Start over</button></div>
<div class="h btnrow"><button data-stress="1">+200 ants (speed test)</button></div>`],
];

// The first minutes, step by step (build 14: it now walks you through the
// basics, not just the landing). `done` advances a step; `btn` waits for a
// tap. From the eighth step on, "Skip tips" ends it.
const followers = s => s.ants.filter(a => a.follow).length;
export const INTRO = [
  { text: 'A young queen has landed. She must get underground tonight.', btn: 'Next' },
  { text: 'Tap the dirt under her to dig.', done: s => s.queen.energy < 30 },
  { text: 'Two cells down is enough.', done: s => s.queen.y >= 2 },
  { text: 'Press Build nest.', done: s => s.queen.placed },
  { text: 'She lays her first egg. It hatches as you.', done: s => !!s.player.ant },
  { text: 'Tap the cells above you to climb out.', done: s => !s.player.inNest },
  { text: 'Find a crumb, press Pick up, bring it to the hole.', done: s => s.colony.delivered.reduce((a,b)=>a+b,0) > 0 },
  { text: 'Good. Fetch a few more: food is everything. Watch ❤ health and 🍖 hunger, top left.', done: s => (s.colony.foodTotal || 0) >= 15, skip: true },
  { text: 'Tap Nest (top right), tap the queen, and lay a Builder.', done: s => s.ants.some(a => a.caste === 'builder' && !a.team) || s.colony.eggQueue.includes('builder') || s.colony.eggs.some(e => e.caste === 'builder'), skip: true },
  { text: 'In the nest, tap dirt beside a tunnel to dig. A Hatchery needs a 4×3 pocket.', done: s => s.nest.digOrders.length > 0 || (s.colony.dug || 0) >= 4, skip: true },
  { text: 'When the pocket is dug, press Build, pick Hatchery, and tap the green spot.', done: s => s.nest.rooms.some(r => r.key === 'hatchery') || s.colony.buildQueue.length > 0, skip: true },
  { text: 'Lay Foragers: they bring food in on their own while you explore.', done: s => s.ants.filter(a => a.caste === 'forager' && !a.team && !a.isPlayer).length >= 3, skip: true },
  { text: 'Outside, hold Recruit by the nest to call a crew. Lead them to a treat or a caterpillar.', done: s => followers(s) >= 3 || (s.colony.treats || 0) > 0, skip: true },
  { text: 'Far from home, press Trail as you walk back: foragers follow your scent out to far food.', done: s => !!s.seen.marked, skip: true },
  { text: 'You earn 🧬 Genes by playing. Tap Evolve (top right) to spend them.', done: s => !!s.seen.evolveOpened, skip: true },
  { text: 'That’s the basics. Grow, explore, and take the yard.', btn: 'Done' },
];
