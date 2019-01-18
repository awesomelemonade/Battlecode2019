import {SPECS} from 'battlecode'
import * as Util from './Util';
import {Vector, totalMoves, totalMoveCosts} from './Library';
import {Dijkstras} from './Dijkstras'

// Castles & Churches must not have overlapping responsible tiles
const responsibleDistance = 5; // Must be less than church's vision radius to detect dead pilgrims & defenders

// Use r.turn to differentiate castle vs other units?
// castle_talk among castles for the first few turns - 8 bits
const CASTLE_IDENTIFIER_BITSHIFT = 0; // Differentiate Castle and other units
const CASTLE_UNUSED_BITSHIFT = 1; // Previously: Temporary leader identification system
const CASTLE_LOCATION_BITSHIFT = 2;
const CASTLE_LOCATION_BITMASK = 0b111111; // 6 bits (2^6 = 64) per x or y
// castle_talk among castles after the first few turns

const CASTLE_SPAWN_BITSHIFT = 1;
const CASTLE_SPAWNTYPE_BITSHIFT = 2;
const CASTLE_SPAWNTYPE_BITMASK = 0b11; // Pilgrims, Crusaders, Prophets, Preachers

export class CastleBot {
	constructor(controller) {
		this.controller = controller;
		// Init
		this.init();
	}
	init() {
		// Castle variables
		this.castlePositions = [];
		this.structurePositions = [];
		this.enemyCastlePredictions = [];
		this.xBuffers = {};
		// Church variables (Castle = church + extra)
		this.resourceOrder = [];
		// This following system limits 1 pilgrim and 1 defender per resource
		this.pilgrims = []; // Stores id or -1, indices correspond with resourceOrder
		this.defenders = []; // Stores id or -1, indices correspond with resourceOrder
		this.pilgrimsAlive = 0;
		this.defendersAlive = 0;
		// Calculate resourceOrder - resourceOrder should not change after construction
		var castlePosition = Vector.ofRobotPosition(this.controller.me);
		this.addCastlePosition(castlePosition);
		this.resourceOrder = this.getResourceOrder(castlePosition);
	}
	getResourceOrder(position) {
		var start = Util.getAdjacentPassable(position);
		var dijkstras = new Dijkstras(this.controller.true_map, start, totalMoves, totalMoveCosts);
		var karboniteOrder = [];
		var fuelOrder = [];
		var resourceOrder = [];
		dijkstras.resolve(function(location) { // Stop condition
			// Stop condition is guaranteed to be evaluated only once per square
			if (Util.hasKarbonite(location)) {
				karboniteOrder.push(location);
			}
			if (Util.hasFuel(location)) {
				fuelOrder.push(location);
			}
			return false; // Never trigger the stop condition
		}, function(location) { // Ignore condition
			return position.getDistanceSquared(location) > responsibleDistance;
		});
		// Interleave karbonite and fuel order
		for (var i = 0; i < Math.min(karboniteOrder.length, fuelOrder.length); i++) {
			resourceOrder.push(karboniteOrder[i]);
			resourceOrder.push(fuelOrder[i]);
		}
		// Push remaining resources into resourceOrder
		for (var i = Math.min(karboniteOrder.length, fuelOrder.length); i < Math.max(karboniteOrder.length, fuelOrder.length); i++) {
			var temp = karboniteOrder.length > fuelOrder.length ? karboniteOrder : fuelOrder;
			resourceOrder.push(temp[i]);
		}
		return resourceOrder;
	}
	spawnPilgrimForHarvesting() {
		// Check costs of pilgrim
		if (!isAffordable(SPECS.PILGRIM)) {
			return false;
		}
		// Find the first index where its value is -1 in this.pilgrims
		var index = Util.findIndex(this.pilgrims, -1);
		if (index === -1) { // Exhausted all resources this church is assigned to
			return false;
		}
		// Calculate which adjacent tile to build the pilgrim using Dijkstras
		
		// Build the unit
		this.action = this.controller.buildUnit(SPECS.PILGRIM, /*dx*/, /*dy*/);
		// Signal to pilgrim the target
		
		pilgrimsAlive++;
		return true;
	}
	spawnPilgrimForChurch(churchLocation) {
		// Check costs of pilgrim
		if (!isAffordable(SPECS.PILGRIM)) {
			return false;
		}
		// Calculate which adjacent tile to build the pilgrim using Dijkstras
		
		// Build the unit
		this.action = this.controller.buildUnit(SPECS.PILGRIM, /*dx*/, /*dy*/);
		// Signal to pilgrim the target church location
		
		return true;
	}
	spawnDefender() {
		
		return false;
	}
	hasHigherAttackPriority(unitType, distanceSquared, bestUnitType, bestDistanceSquared) {
		// Assumes that both targets are attackable (within attack range)
		// Assumes we are playing the long game - not rushing castle
		// Prioritize those that can attack back
		// then those that are combat units (crusaders, prophets, preachers) that can see us
		// then workers (pilgrims) that can see us (enemy may be using pilgrims for vision of crusaders/preachers)
		// then those that are combat units (crusaders, prophets, preachers) that cannot see us
		// then workers (pilgrims) that cannot see us
		// then structures (castles, churches)
	}
	castleAttack() {
		var robots = this.controller.getVisibleRobots();
		var bestDx = undefined;
		var bestDy = undefined;
		var bestUnitType = undefined;
		var bestDistanceSquared = 0;
		for (int i = 0; i < robots.length; i++) {
			var robot = robots[i];
			// Find visible enemy robot in attack range
			if (this.controller.isVisible(robot) && robot.team !== this.controller.me.team) {
				// To prevent unnecessary creation of vectors
				var dx = robot.x - this.controller.me.x;
				var dy = robot.y - this.controller.me.y;
				var distanceSquared = dx * dx + dy * dy;
				if (Util.isWithinAttackRange(SPECS.CASTLE, distanceSquared)) {
					if (this.hasHigherAttackPriority(robot.unit, distanceSquared, bestUnitType, bestDistanceSquared)) {
						bestDx = dx;
						bestDy = dy;
						bestUnitType = robot.unit;
						bestDistanceSquared = distanceSquared;
					}
				}
			}
		}
		if (bestUnitType === undefined) {
			return false;
		} else {
			this.action = this.controller.attack(bestDx, bestDy);
			return true;
		}
	}
	turn() {
		this.action = undefined;
		if (this.controller.me.turn <= 3) {
			if (this.controller.me.turn <= 2) {
				// castle talk for castle positions
				var signal = 0;
				
				// Identify as Castle
				signal |= (1 << CASTLE_IDENTIFIER_BITSHIFT);
				
				// Broadcast x or y position
				if (this.controller.me.turn === 1) {
					signal |= ((this.controller.me.x & CASTLE_LOCATION_BITMASK) << CASTLE_LOCATION_BITSHIFT);
				} else if (this.controller.me.turn === 2) {
					signal |= ((this.controller.me.y & CASTLE_LOCATION_BITMASK) << CASTLE_LOCATION_BITSHIFT);
				}
				this.controller.castleTalk(signal);
			}
			var robots = this.controller.getVisibleRobots();
			// Retrieve castle positions
			for (var i = 0; i < robots.length; i++) {
				if (robots[i].team === this.controller.me.team && robots[i].id !== this.controller.me.id) {
					var robotIsCastle = ((robots[i].castle_talk >>> CASTLE_IDENTIFIER_BITSHIFT) & 1) === 1;
					var robotUnusedBit = ((robots[i].castle_talk >>> CASTLE_UNUSED_BITSHIFT) & 1) === 1;
					var value = (robots[i].castle_talk >>> CASTLE_LOCATION_BITSHIFT) & CASTLE_LOCATION_BITMASK;
					if (robotIsCastle) {
						if (robots[i].turn === 1) {
							this.xBuffers[robots[i].id] = value;
						} else if (robots[i].turn === 2) {
							var newCastlePosition = new Vector(this.xBuffers[robots[i].id], value);
							this.addCastlePosition(newCastlePosition);
						}
					}
				}
			}
		}
		// Figure out actions
		if (!castleAttack()) { // Try castle attacking
			// Do normal stuff
			if (this.controller.me.turn <= 2) { // Force pilgrim spawning for the first n turns
				// spawn pilgrims for resourceOrder
				spawnPilgrimForHarvesting();
			} else {
				// TODO: Check progress of other castles/churches - see if we have enough funds to create units for this structure
				// doChurchPilgrimAndDefenderBuilding;
				if (pilgrimsAlive <= defendersAlive) {
					if (!spawnPilgrimForHarvesting()) {
						spawnDefender();
					}
				} else {
					spawnDefender();
				}
				if (this.action !== undefined) { // Check if we have spawned a defender or pilgrim
					// TODO: When to build attacker vs when to setup church vs do nothing
					// TODO: Should churches be able to setup a pilgrim to build churches
					// castle talk "progress" in creating pilgrims/defenders
					// retrieve castle talks from all units to calculate totalProgress
					// TODO: Figure out the way to decide "itIsThisCastleThatShouldBuildTheChurch"
					// if (totalProgress > arbitraryThreshold && itIsThisCastleThatShouldBuildTheChurch) {
					// 		queue a castle talk for a church to be built
					//		spawn a pilgrim
					//		send a signal to the pilgrim to build a church
					// }
					// for (go through the queue) {
					// 		execute castleTalk
					// }
				}
			}
		}
		return action;
	}
	addChurchPosition(churchPosition) {
		this.structurePositions.push(churchPosition);
	}
	addCastlePosition(castlePosition) {
		this.castlePositions.push(castlePosition);
		this.structurePositions.push(castlePosition);
		this.addEnemyPrediction(castlePosition);
	}
	addEnemyPrediction(position) {
		if (this.controller.isHorizontallySymmetric) {
			this.enemyCastlePredictions.push(Util.flipPositionForHorizontallySymmetric(position));
		}
		if (this.controller.isVerticallySymmetric) {
			this.enemyCastlePredictions.push(Util.flipPositionForVerticallySymmetric(position));
		}
	}
}


function encodeCastleSpawnType(unit) {
	if (unit === SPECS.PILGRIM) {
		return 0;
	} else if (unit === SPECS.CRUSADER) {
		return 1;
	} else if (unit === SPECS.PROPHET) {
		return 2;
	} else if (unit === SEPCS.PREACHER) {
		return 3;
	} else {
		return -1;
	}
}
function decodeCastleSpawnType(code) {
	if (code === 0) {
		return SPECS.PILGRIM;
	} else if (code === 1) {
		return SPECS.CRUSADER;
	} else if (code === 2) {
		return SPECS.PROPHET;
	} else if (code === 3) {
		return SPECS.PREACHER;
	} else {
		return -1;
	}
}

export function castleTurn(r) {
	controller = r;
	action = undefined;
	if (!initialized) {
		initialize(r);
	}
	handleCastleTalk(r);
	if (castlePositionsInitialized) {
		if (unitsBuilt % 2 == 0 && unitsBuilt % 5 != 4) {
			if (!spawnPilgrim(r)) {
				spawnProphet(r);
			}
		} else {
			spawnProphet(r);
		}
		if (action === undefined) {
			if (controller.fuel > 10000) {
				var randomEnemyCastle = enemyPredictions[Math.floor(Math.random() * enemyPredictions.length)]; // Select a random enemy castle
				controller.signal(Util.encodePosition(randomEnemyCastle), 5000);
			}
		}
	} else {
		spawnPilgrim(r);
	}
	return action;
}
