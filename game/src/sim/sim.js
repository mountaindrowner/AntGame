// Underfoot simulation. No DOM, no renderer: the views read this state; nothing here knows how it is drawn.
// This file only gathers the pieces (one module per topic, listed in game/README.md) into the SIM object
// everything else uses. The design of record is docs/HANDOFF.md; why things changed is docs/DECISIONS.md.
import { ZONES, ZONE_OF } from './growth.js';
import { AREA, AREAS, REGION, SCALE, areaBounds } from './yard.js';
import { BEDROCK_PRIZES, BEDROCK_Y, CASTES, CASTE_EVO, CASTE_ROOM, FOODS, FORAGE, H, HOME_X0, HOME_X1, HOME_Y1, NEST_CAP, NEST_FINDS, NEST_SECTIONS, NEST_SHIFT, NH, NW, QUEEN_UP, RIVALS, ROOMS, ROOM_KEYS, SECTION_BY, SHAFT, SOIL, SOIL_ROWS, SOIL_TOP, SPOIL_MAX, SURF, T, W, nidx, roomCap, roomCount, roomLevel, roomUpkeep, rspec, soilTier } from './core.js';
import { canPay, cordResist, costText, killAnt, queenCap } from './colony.js';
import { SEE, areaOf, findPath, forageRange, itemAt, nearestItem, rivalHome, wanted } from './world.js';
import { RAIN_LEN, rainK, DIG_ORDERS, digSpot, readyJob, roomPlan, snapPlan, wallOf, GLOW_NEED, GLOW_ROCKS, buildersInside, cellLocked, digAllowed, dugCount, findRoomRect, gainGlow, isGlowRock, openSection, playerDig, removeRoom, roomAt, roomOf, sectionAt, sectionLock, startBreach, toggleDigOrder, toggleFillOrder } from './nest.js';
import { BAND_GOOD, BAND_TEXT, advise, bite, buyEvo, carryCap, crewCap, doctrineOf, eggCost, evoLock, genesFound, has, hatchCapOf, inBand, lvl, maxHp, pickQueenTrait, picked, possess, roomCost, roomTier, setDoctrine, storeCap, upgradeCaste, upgradeLock, youHp, resSeen, tickSeen } from './progress.js';
import { DAUGHTERS, DAUGHTER_CAP, DROOMS, DROOMS_OF, EVO_GATE, FLIGHT_AT, buildDRoom, dRoomBuilt, dRoomLock, daughterCount, daughterLock, daughterNest, dcap, dpop, flightReady, flightsAllowed, foundDaughter, travel, travelLock } from './daughters.js';
import { CROWN, ORDERS, WILD_SIDE, callMuster, callSwarm, climb, climbDown, climbLock, coloniesJoined, endMuster, musterLock, musterRoll, orderOf, setOrder, spawnZbug, sporeAnt, stirWild, swarmCallLock, tickWild } from './wilds.js';
import { create } from './state.js';
import { outpostCap, outpostLock, placeOutpost, waterCapOf } from './outposts.js';
import { DAY, dayPhase, daylight, isNight, tick, untilTurn } from './tick.js';
import { DOOR_GUARD_MAX, DUTIES, JOBS0, doorGuardWanted, doorPost, dutyCounts, dutyNeed, fungusCap, jobsOf, posted, setDoorGuard, setJobFirst, toggleJob, woodGoal } from './jobs.js';
import { RAID, pullOut, raidLock, raidScout, raidTarget, startRaid } from './raids.js';
import { YOU_AS, youLoad, DEFEND, HOLD_R, actionLabel, attackTarget, buildNest, callDefend, crewAt, crewAttack, crewFollow, crewHold, crewSize, defendLeft, doAction, enemyAt, heldCount, queenDig, underAttack, zonesTaken } from './player.js';
import { DROP, HUNT } from './hazards.js';
import { BUGS, huntTarget } from './creatures.js';
import { LEG_HP, crippled as crippledLegs } from './spider.js';
import { DUEL_ROUND, duelGangs, duelStats, swing } from './combat.js';
import { ABILITIES, ABILITY_II, ABILITY_KEYS, abil, abilityLevel, abilityLock, useAbility } from './abilities.js';
import { BOSSES, HEDGE_ZONE, LAWN_ZONE, ROT_ZONE, SIDE_ZONE, TROPHY, WET_ZONE, bossArmour, ensureBoss } from './bosses.js';
import { EVENTS, startEvent } from './events.js';
import { CURIOS } from './curios.js';
import { PASSAGES, buyPassages, passagesLock, antCount, cancelBuilds, eggLock, pickLineage, queueEgg, queueRoom, recruit, release, roomLock, roomUpLock, stats, stress, upgradeForage, upgradeQueen, upgradeRoom } from './commands.js';
import { deserialize, serialize } from './saveload.js';

const SIM = { DOOR_GUARD_MAX, doorGuardWanted, doorPost, posted, setDoorGuard, RAIN_LEN, rainK, PASSAGES, buyPassages, passagesLock, YOU_AS, youLoad, DIG_ORDERS, digSpot, readyJob, roomPlan, snapPlan, wallOf, LEG_HP, crippledLegs, DEFEND, callDefend, defendLeft, underAttack, resSeen, tickSeen, CROWN, climbLock, climb, climbDown, spawnZbug, sporeAnt, WILD_SIDE, tickWild, stirWild, coloniesJoined, ORDERS, orderOf, setOrder, musterRoll, musterLock, callMuster, endMuster, GLOW_NEED, isGlowRock, gainGlow, swarmCallLock, callSwarm, DROOMS, DROOMS_OF, EVO_GATE, dRoomBuilt, dRoomLock, buildDRoom, daughterNest, dcap, travel, travelLock, DAUGHTERS, FLIGHT_AT, DAUGHTER_CAP, flightsAllowed, flightReady, daughterLock, foundDaughter, daughterCount, dpop, _fast: { nearestItem, itemAt, wanted }, GLOW_ROCKS, huntTarget, DAY, dayPhase, daylight, isNight, untilTurn, genesFound, advise, NEST_SECTIONS, SECTION_BY, NEST_FINDS, BEDROCK_PRIZES, sectionAt, cellLocked, sectionLock, startBreach, openSection, HOME_X0, HOME_X1, HOME_Y1, BEDROCK_Y, NEST_SHIFT, BAND_TEXT, BAND_GOOD, roomTier, inBand, NEST_CAP, cancelBuilds, ZONES, ZONE_OF, zonesTaken, ROT_ZONE, SIDE_ZONE, HEDGE_ZONE, abil, abilityLevel, ABILITY_II, bite, ABILITIES, ABILITY_KEYS, abilityLock, useAbility, WET_ZONE, bossArmour, LAWN_ZONE, crewHold, crewFollow, heldCount, HOLD_R, raidTarget, raidScout, raidLock, startRaid, pullOut, RAID, duelStats, swing, duelGangs, DUEL_ROUND, enemyAt, crewAttack, attackTarget, crewSize, RIVALS, rspec, rivalHome, hatchCapOf, crewCap, forageRange, dutyNeed, CASTE_EVO, pickLineage, cordResist, killAnt, carryCap, storeCapOf: storeCap, CASTE_ROOM, roomLevel, roomUpLock, upgradeRoom, woodGoal, fungusCap, CURIOS, BOSSES, TROPHY, EVENTS, startEvent, ensureBoss, DUTIES, JOBS0, jobsOf, setJobFirst, toggleJob, dutyCounts, roomCount, roomCap, roomUpkeep, roomLock, BUGS, W, H, T, NW, NH, SHAFT, AREAS, AREA, SCALE, SURF, REGION, DROP, HUNT, SEE, areaBounds, CASTES, ROOMS, FOODS, areaOf, findPath, crewAt, ROOM_KEYS, SOIL, SOIL_ROWS, SOIL_TOP, soilTier, QUEEN_UP, queenCap, create, tick, playerDig, buildersInside, actionLabel, doAction, recruit, release, queueEgg, eggLock, queueRoom, roomAt, roomOf, findRoomRect, toggleDigOrder, toggleFillOrder, removeRoom, digAllowed, upgradeQueen, upgradeForage, FORAGE, SPOIL_MAX, antCount, dugCount, queenDig, buildNest, stress, stats, serialize, deserialize, itemAt, nidx, canPay, costText,
  upgradeCaste, upgradeLock, casteLevel: lvl, youHp, picked, buyEvo, evoLock, has, possess, setDoctrine, doctrineOf, pickQueenTrait, eggCost, roomCost, maxHp, storeCap,
  placeOutpost, outpostLock, outpostCap, waterCapOf };
export default SIM;
export { SIM };
