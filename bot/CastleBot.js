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
		// Castle variables
		this.castlePositionsInitialized = false;
		this.castlePositions = [];
		this.structurePositions = [];
		this.enemyCastlePredictions = [];
		// Init
		this.init();
	}
	function init() {
		// Church variables (Castle is church + extra)
		this.resourceOrder = [];
		// This following system limits 1 pilgrim and 1 defender per resource
		this.pilgrims = []; // Stores id or -1, indices correspond with resourceOrder
		this.defenders = []; // Stores id or -1, indices correspond with resourceOrder
		this.pilgrimsAlive = 0;
		this.defendersAlive = 0;
		// Calculate resourceOrder - resourceOrder should not change after construction
		
	}
	function turn() {
		if (!castlePositionsInitialized) {
			// spawn pilgrims for resourceOrder
			// castle talk for castle positions
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
	function addChurchPosition(churchPosition) {
		this.structurePositions.push(churchPosition);
	}
	function addCastlePosition(castlePosition) {
		this.castlePositions.push(castlePosition);
		this.structurePositions.push(castlePosition);
		this.addEnemyPrediction(castlePosition);
	}
	function addEnemyPrediction(position) {
		if (this.controller.isHorizontallySymmetric) {
			this.enemyPredictions.push(Util.flipPositionForHorizontallySymmetric(position));
		}
		if (this.controller.isVerticallySymmetric) {
			this.enemyPredictions.push(Util.flipPositionForVerticallySymmetric(position));
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

function initialize() {
	// Dijkstra for some karbonite/fuel positions - TODO: use other castle locations for start
	var castlePosition = Vector.ofRobotPosition(controller.me);
	addCastlePosition(castlePosition);
	const adjacent = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
	var start = [];
	for (var i = 0; i < adjacent.length; i++) {
		var v = new Vector(castlePosition.x + adjacent[i][0], castlePosition.y + adjacent[i][1]);
		if ((!Util.outOfBounds(v)) && controller.map[v.x][v.y] === true) { // Check if passable
			start.push(v);
		}
	}
	var dijkstras = new Dijkstras(controller.true_map, start, totalMoves, totalMoveCosts);
	dijkstras.resolve(function(location) {
		for (var i = 0; i < castlePositions.length; i++) {
			var position = castlePositions[i];
			if (position.equals(castlePosition)) { // It's our own castle
				continue;
			}
			if (position.getDistanceSquared(location) <= 5) {
				return false;
			}
		}
		if (Util.hasKarbonite(location)) {
			karboniteOrder.push(location);
		}
		if (Util.hasFuel(location)) {
			fuelOrder.push(location);
		}
		return false; // Never trigger the stop condition
	});
	for (var i = 0; i < Math.min(karboniteOrder.length, fuelOrder.length); i++) {
		resourceOrder.push(karboniteOrder[i]);
		resourceOrder.push(fuelOrder[i]);
	}
	for (var i = Math.min(karboniteOrder.length, fuelOrder.length); i < Math.max(karboniteOrder.length, fuelOrder.length); i++) {
		var temp = karboniteOrder.length > fuelOrder.length ? karboniteOrder : fuelOrder;
		resourceOrder.push(temp[i]);
	}
	initialized = true;
}

var xBuffers = {};

function handleCastleTalk(controller) {
	var robots = controller.getVisibleRobots();
	
	for (var i = 0; i < robots.length; i++) {
		if (robots[i].team === controller.me.team && robots[i].id !== controller.me.id) {
			var robotIsCastle = ((robots[i].castle_talk >>> CASTLE_IDENTIFIER_BITSHIFT) & 1) === 1;
			var robotUnusedBit = ((robots[i].castle_talk >>> CASTLE_UNUSED_BITSHIFT) & 1) === 1;
			var value = (robots[i].castle_talk >>> CASTLE_LOCATION_BITSHIFT) & CASTLE_LOCATION_BITMASK;
			if (robotIsCastle) {
				if (robots[i].turn === 1) {
					xBuffers[robots[i].id] = value;
				} else if (robots[i].turn === 2) {
					var newCastlePosition = new Vector(xBuffers[robots[i].id], value);
					addCastlePosition(newCastlePosition);
				} else if (robots[i].turn > 2) {
					/*var castleTurn = robots[i].turn;
					var castleSpawned = ((robots[i].castle_talk >>> CASTLE_SPAWN_BITSHIFT) & 1) === 1;
					var castleSpawnType = decodeCastleSpawnType((robots[i].castle_talk >>> CASTLE_SPAWNTYPE_BITSHIFT) & CASTLE_SPAWNTYPE_MASK);
					if (castleSpawned) {
						// TODO: Remove from fuelOrder, karboniteOrder, and resourceOrder
						if (castleSpawnType === SPECS.PILGRIM) {
							pilgrimsBuilt++;
						}
						if (castleSpawnType === SPECS.CRUSADER) {
							crusadersBuilt++;
						}
						if (castleSpawnType === SPECS.PROPHET) {
							prophetsBuilt++;
						}
						if (castleSpawnType === SPECS.PREACHER) {
							preachersBuilt++;
						}
						unitsBuilt++;
					}*/
				}
			}
		}
	}
	
	var signal = 0;
	
	// Identify as Castle
	signal |= (1 << CASTLE_IDENTIFIER_BITSHIFT);
	
	// Broadcast x or y position
	if (controller.me.turn === 1) {
		signal |= ((controller.me.x & CASTLE_LOCATION_BITMASK) << CASTLE_LOCATION_BITSHIFT);
	} else if (controller.me.turn === 2) {
		signal |= ((controller.me.y & CASTLE_LOCATION_BITMASK) << CASTLE_LOCATION_BITSHIFT);
	} else if (controller.me.turn === 3) {
		castlePositionsInitialized = true;
		// Run Dijkstras on all castle positions to figure out resourceOrder
		// Temporary - remove all resourceOrder near other castles
		var castlePosition = Vector.ofRobotPosition(controller.me);
		
		for (var i = 0; i < resourceOrder.length; i++) {
			var resourcePosition = resourceOrder[i];
			for (var j = 0; j < castlePositions.length; j++) {
				var position = castlePositions[j];
				if (position.equals(castlePosition)) { // It's our own castle
					continue;
				}
				if (position.getDistanceSquared(resourcePosition) <= 5) {
					resourceOrder.splice(i, 1);
					i--;
					break;
				}
			}
		}
	}
	controller.castleTalk(signal);
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
