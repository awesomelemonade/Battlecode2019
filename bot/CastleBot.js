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
		dijkstras.resolve(function(location) {
			if (Util.hasKarbonite(location)) {
				karboniteOrder.push(location);
			}
			if (Util.hasFuel(location)) {
				fuelOrder.push(location);
			}
			return position.getDistanceSquared(location) > responsibleDistance; // Never trigger the stop condition
		});
		// Interleave karbonite and fuel order
		for (var i = 0; i < Math.min(karboniteOrder.length, fuelOrder.length); i++) {
			resourceOrder.push(karboniteOrder[i]);
			resourceOrder.push(fuelOrder[i]);
		}
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
		
		// Signal to pilgrim the target
		
		return true;
	}
	spawnPilgrimForChurch(churchLocation) {
		// Check costs of pilgrim
		if (!isAffordable(SPECS.PILGRIM)) {
			return false;
		}
		// Calculate which adjacent tile to build the pilgrim using Dijkstras
		
		// Build the unit
		
		// Signal to pilgrim the target church location
		
	}
	turn() {
		if (this.controller.me.turn <= 3) {
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
		if (this.controller.me.turn <= 2) {
			// spawn pilgrims for resourceOrder
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
		} else {
			// doChurchPilgrimAndDefenderBuilding();
			// if (alreadySpawnedPilgrimOrDefender) return;
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
