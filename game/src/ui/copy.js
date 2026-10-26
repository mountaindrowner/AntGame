// Player-facing text, carried over verbatim from build 6 (prototype/app.js)
// so the game keeps teaching itself the same way. Edit copy here only.

export const EXPL = {
  dig: ['You are the queen', 'This is the underground, seen from the side. Tap the dirt next to the queen to dig. She has 30 digs of energy. Go at least two cells down, then press Build nest. Everything in this game costs food, so dig less and save energy.'],
  nest: ['The nest', 'Tap any dirt next to a tunnel to order a dig; the faint dots show where you can. Builders chip it away a quarter at a time. Press Build to see every room, its size and cost; pick one and tap a green cell to place it. The yellow ant is you: taps on tunnels walk you; the top cell leads outside.'],
  surface: ['Outside', 'Tap to walk, hold to keep walking. Yellow dots are food, blue is water, gray is grit (pebbles), red is protein (meat). Stand on one and press Pick up, then carry it to the dark hole. Carrying lays a scent trail; other ants follow trails to what you found.'],
  dew: ['Dew', 'Blue drops near the nest for one minute, every two minutes. Every egg costs 1 water. A Cistern raises your water cap from 10 to 60. The big blue puddle is permanent but far.'],
  cat: ['Caterpillar', 'The green one is harmless and worth 40 protein, which Soldiers and the Barracks need. Hold Recruit to call about 8 ants, walk them onto it, and they will bite it down. Then haul the red meat home.'],
  spider: ['Spider', 'It hunts anything within three tiles and bites once every two seconds. Run. Thirty ants or five Venom ants can kill it. Its fang unlocks Venom ants at the queen.'],
  raid: ['Rival raid', 'The red-ringed hole at the far end is a rival colony. When it has more soldiers than you it sends four to your entrance to steal food. A Soldier patrolling near your door halves what they take. To win, put six fighters on their entrance for five seconds.'],
  rain: ['Rain', 'Trails wash away and foragers go home. If a Cistern exists it fills. If no Builder is inside when the rain ends, the lowest level caves in.'],
  cavein: ['Cave-in', 'A tunnel collapsed. Each dug level needs one Builder inside to keep it shored up. Builders repair collapses by themselves. If you are inside and stuck, tap the collapsed cell next to you to dig through.'],
  protein: ['Protein', 'Red meat on the ground. Any ant that walks onto it carries 5 home. Protein pays for Soldiers, Venom ants, and the Barracks.'],
  grit: ['Stone', 'Gray pebbles. Builders fetch them when the colony has food to spare. Stone pays for the Food store, the Cistern, the Workshop, and queen upgrades.'],
  queen: ['', 'The queen lays one egg at a time until you build a Hatchery. Each caste has a job and a passive effect. See Help for the list.'],
  build: ['', 'Each room needs a dug pocket of its own size. Builders finish it. Costs are paid now. One of each room.'],
  soil: ['Soil', 'The ground gets harder with depth: soft topsoil for 14 rows, packed soil for the next 14 (needs a Workshop), clay below that (needs a Workshop and a queen upgrade). Rooms need room: a Barracks is 6 wide, a Workshop 5 by 4. Space is the economy.'],
  cap: ['The queen\u2019s reach', 'A queen can only hold so many ants together. At the cap, eggs stop hatching. Upgrade her at the queen menu to raise it and to dig deeper.'],
};

export const HELP = `
<div class="row head"><strong>Help</strong><button class="x" data-close="1">Close</button></div>
<div class="h"><b>Goal</b> Grow the colony, then kill the rival queen: six fighters on the red-ringed hole with no rival soldiers near it for five seconds.</div>
<div class="h"><b>Food</b> Yellow crumbs and tan seeds. Every ant eats 1 a minute, soldiers 2. The top bar shows income vs upkeep. Food store raises the cap from 20 to 150.</div>
<div class="h"><b>Water</b> Blue. Dew for one minute every two minutes, plus one permanent puddle. Every egg costs 1. Cistern raises the cap to 60 and fills in rain.</div>
<div class="h"><b>Protein</b> Red meat from kills (caterpillar 40, spider 40). Pays for Soldiers, Venom ants, Barracks.</div>
<div class="h"><b>Stone</b> Gray pebbles. Pays for Food store, Cistern, Workshop, queen upgrades.</div>
<div class="h"><b>Digging and building</b> Tap dirt next to a tunnel to order a dig (faint dots mark the frontier). Builders break each cell a quarter at a time and spread across orders. Topsoil is 14 rows; packed soil below needs a Workshop; clay below that needs a queen upgrade too. Every 40 dug cells need one builder inside or tunnels cave in. Tap a dug cell to see which rooms fit the pocket around it; each room lists its size (Barracks 6×3, Workshop 5×4, Cistern 4×4, Store 5×3, Hatchery and Nursery 4×3). Press Build for the catalog: every room with size, cost and status; pick one and green cells show where it fits. Tools: Fill tunnel packs dirt back, Remove room tears one out for half its cost.</div>
<div class="h"><b>The queen</b> Holds 20 ants per level of upgrade (20, 40, 60, 80). At the cap, eggs pause. Upgrades cost food, protein, and later stone.</div>
<div class="h"><b>Castes and what they do on their own</b></div>
<div class="h">Forager: gathers food, water, grit. Lays trails home.<br>Builder: digs rooms and levels. Passive: each dug level needs one builder inside or tunnels cave in; builders hold the drains in rain and repair collapses.<br>Nurse (needs Nursery): passive: each nurse inside, up to three, hatches eggs 12% faster.<br>Soldier (needs Barracks): fights on contact, answers alarm at the door. Passive: a soldier patrolling near the entrance halves what raiders steal.<br>Venom ant (needs spider fang): 8× bite. Five take a spider.</div>
<div class="h"><b>Rooms</b> Hatchery: +2 eggs at a time. Food store: cap 150. Cistern: water cap 60. Nursery: unlocks Nurses, eggs hatch 30% faster. Barracks: unlocks Soldiers. Workshop: packed soil, builders 2× faster.</div>
<div class="h"><b>Outside controls</b> Tap to walk, hold to keep walking. Pinch to zoom. Pick up / Drop. Mark trail lays scent while you walk. Hold Recruit to call up to 20 ants (near the nest or near other ants); Release lets them go, and if they are standing on food they haul it. Enter nest appears near the hole.</div>
<div class="h"><b>Nest controls</b> Tap the queen for eggs and upgrades. Tap dirt to order digging. Tap inside a dug pocket to build. Build opens the catalog; Cancel leaves placement. Exit nest walks you to the top. Pinch to zoom, drag to scroll the nest. Clear dig orders is in the build sheet.</div>
<div class="h"><b>You</b> The yellow ant. Hunger drains as you walk; it refills near the nest or beside a forager carrying food. If you die you become the next hatchling. You bite at double power and heal when not fighting.</div>
<div class="h"><b>Threats</b> Spider (run, or 30 ants), rival soldiers (foragers flee them), rain (trails wash out, cave-in without a builder inside), cave-ins (one builder per level).</div>`;

export const INTRO = [
  { text: 'A young queen lands after her mating flight. She drops her wings. Her body holds enough food for a few eggs, and tonight she has to get underground.', btn: 'Next' },
  { text: 'Dig. Tap the dirt directly under her.', done: s => s.queen.energy < 30 },
  { text: 'Two cells down is enough. Every dig costs energy she could spend on eggs.', done: s => s.queen.y >= 2 },
  { text: 'Press Build nest. She hollows out a chamber around herself.', done: s => s.queen.placed },
  { text: 'She lays one egg from her own body. It hatches as you.', done: s => !!s.player.ant },
  { text: 'You are a Forager. Tap the cell above you to climb the shaft, then tap the top cell to go outside.', done: s => !s.player.inNest },
  { text: 'Find a yellow crumb. Tap it, press Pick up, then carry it to the dark hole.', done: s => s.colony.delivered.reduce((a,b)=>a+b,0) > 0 },
  { text: 'That is the loop: food in, eggs out. Next: tap Nest, tap the queen, lay a Builder. Tap dirt to order digs. Press Build to see every room with its size and cost; pick one and tap a green cell to place it. Pinch to zoom.', btn: 'Done' },
];
