// Player-facing text: short on purpose (one or two lines each), so the game
// teaches itself without a wall of reading. Edit copy here only.

export const EXPL = {
  dig: ['You are the queen', 'Tap the dirt beside her to dig. Two cells down, then press Build nest. Digging uses her energy.'],
  nest: ['The nest', 'Tap dirt by a tunnel to dig. Press Build to place a room. The yellow ant is you.'],
  surface: ['Outside', 'Tap to walk. Pick up food and bring it to the dark hole. Your path leaves a scent trail others follow.'],
  dew: ['Dew', 'Water beads, for a minute at a time. Each egg costs 1 water.'],
  cat: ['Caterpillar', 'Harmless, and 40 protein. Hold Recruit, lead your crew onto it, then haul the meat home.'],
  treat: ['A treat', 'Too big for one ant. Hold Recruit for a crew, lead them to it, press Lift.'],
  spider: ['Spider', 'Run! It bites anything close. Thirty ants, or five Venom ants, can kill it.'],
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

export const HELP = `
<div class="row head"><strong>Help</strong><button class="x" data-close="1">Close</button></div>
<div class="h"><button data-title="1" style="width:100%">Main menu</button></div>
<div class="h btnrow"><button data-reset="1">Start over</button><button data-stress="1">+200 ants (speed test)</button></div>
<div class="h"><b>Buttons</b> Hold any button to see its name. ⋯ in the top bar shows the colony's numbers.</div>
<div class="h"><b>Goal</b> Grow, then kill the rival queen on the Patio: hold her hole with eight fighters until she falls. Lose your queen and it's over.</div>
<div class="h"><b>Outside</b> Tap to walk. Pick up, carry home. Your path is a trail others follow. Hold Recruit for a crew; Lift carries treats.</div>
<div class="h"><b>The nest</b> Tap dirt to dig. Build places rooms. Tap the queen for eggs and upgrades.</div>
<div class="h"><b>Resources</b> 🌾 Food: every ant eats it. 💧 Water: each egg costs 1. 🥩 Protein: soldiers. 🪨 Stone: rooms and upgrades.</div>
<div class="h"><b>Evolve</b> The DNA button. 🧬 Genes come from scouting new regions, the first of each find brought home, every 10 eggs and big kills. Spend them on the evolution tree; spend materials on each kind of ant's levels. Ants rank up as they work: Veterans learn a promotion, Elites get a name, and when you die you can come back as one.</div>
<div class="h"><b>Outposts</b> Evolve Waypoints, walk out into the yard and press Outpost: you and your crew pile a cairn (10 stone). Foragers range round it and along the road home, and trails beside it never fade. An outpost in a region whose guardian is beaten holds it, and its prize is yours. Feet and the mower knock outposts flat.</div>
<div class="h"><b>Goals</b> Under Evolve → Goals: three at a time, each paying 🧬. Finish a whole set for a reward for good.</div>
<div class="h"><b>Ants</b> Forager: gathers. Builder: digs, builds, holds tunnels up. Nurse: faster eggs. Soldier: guards the door. Venom ant: kills spiders.</div>
<div class="h"><b>Rooms</b> Hatchery: more eggs at once. Food store: more food. Cistern: more water. Nursery: Nurses. Barracks: Soldiers. Workshop: deeper digging.</div>
<div class="h"><b>Dangers</b> Spider, rival raids, the mower, antlion pits, feet, birds, toads, acorns, bug spray, fire ants, rain and cave-ins. Each explains itself the first time.</div>`;

export const INTRO = [
  { text: 'A young queen has landed. She must get underground tonight.', btn: 'Next' },
  { text: 'Tap the dirt under her to dig.', done: s => s.queen.energy < 30 },
  { text: 'Two cells down is enough.', done: s => s.queen.y >= 2 },
  { text: 'Press Build nest.', done: s => s.queen.placed },
  { text: 'She lays her first egg. It hatches as you.', done: s => !!s.player.ant },
  { text: 'Tap the cells above you to climb out.', done: s => !s.player.inNest },
  { text: 'Find a crumb, press Pick up, bring it to the hole.', done: s => s.colony.delivered.reduce((a,b)=>a+b,0) > 0 },
  { text: 'Food in, eggs out. Tap the queen to lay a Builder, then dig and Build.', btn: 'Done' },
];
