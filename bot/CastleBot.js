import {SPECS} from 'battlecode'
import * as Util from './Util';
import {Vector, totalMoves, totalMoveCosts} from './Library';
import {Dijkstras} from './Dijkstras'

var initialized = false;
var castlePositionsInitialized = false;

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

function encodeCastleSpawnType(int unit) {
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
function decodeCastleSpawnType(int code) {
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

var castlePositions = [];
var enemyPredictions = [];

var castleKarboniteOrders = [];
var castleFuelOrders = [];
var castleResourceOrders = [];

function initialize(robot) {
	// Dijkstra for some karbonite/fuel positions - TODO: use other castle locations for start
	var castlePosition = Vector.ofRobotPosition(robot.me);
	addCastlePosition(castlePosition);
	initialized = true;
}

function addCastlePosition(castlePosition) {
	const adjacent = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
	var start = [];
	for (var i = 0; i < adjacent.length; i++) {
		var v = new Vector(castlePosition.x + adjacent[i][0], castlePosition.y + adjacent[i][1]);
		if ((!Util.outOfBounds(v)) && robot.map[v.x][v.y] === true) { // Check if passable
			start.push(v);
		}
	}
	var karboniteOrder = [];
	var fuelOrder = [];
	var resourceOrder = [];
	var dijkstras = new Dijkstras(robot.map, start, totalMoves, totalMoveCosts);
	dijkstras.resolve(function(location) {
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
	castleKarboniteOrders.push(karboniteOrder);
	castleFuelOrders.push(fuelOrder);
	castleResourceOrders.push(resourceOrder);
	castlePositions.push(castlePosition);
	addEnemyPrediction(castlePosition);
}

function addEnemyPrediction(position) {
	if (robot.isHorizontallySymmetric) {
		enemyPredictions.push(Util.flipPositionForHorizontallySymmmetric(position));
	}
	if (robot.isVerticallySymmetric) {
		enemyPredictions.push(Util.flipPositionForVerticallySymmetric(position));
	}
}

var action = undefined;

var totalUnitsBuilt = 0;
var totalPilgrimsBuilt = 0;
var totalCrusadersBuilt = 0;
var totalProphetsBuilt = 0;
var totalPreachersBuilt = 0;

var unitToSpawn = null;

function spawnPilgrim(robot) {
	if (SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_KARBONITE < robot.karbonite || SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_FUEL < robot.fuel) {
		return false;
	}
	if (pilgrimsBuilt < resourceOrder.length) {
		// Rerun dijkstras to account for pilgrims blocking spawn locations
		var location = resourceOrder[pilgrimsBuilt];
		var castlePosition = Vector.ofRobotPosition(robot.me);
		var start = Util.getAdjacentPassable(castlePosition);
		var dijkstras = new Dijkstras(robot.map, start, totalMoves, totalMoveCosts);
		dijkstras.resolve((vector) => vector.equals(location));
		// Build unit
		while (!location.equals(dijkstras.prev[location.x][location.y])) {
			location = dijkstras.prev[location.x][location.y];
		}
		if (robot.robot_map[location.x][location.y] === 0) {
			var offsetX = location.x - robot.me.x;
			var offsetY = location.y - robot.me.y
			action = robot.buildUnit(SPECS.PILGRIM, offsetX, offsetY); // Face towards target
			// Radio pilgrim's target position
			robot.signal(Util.encodePosition(resourceOrder[pilgrimsBuilt]), offsetX * offsetX + offsetY * offsetY); // Broadcast target position
			pilgrimsBuilt++;
			unitsBuilt++;
			unitsToSpawn = SPECS.PILGRIM;
			return true;
		} else {
			robot.log("Unable to spawn pilgrim: " + location + " - " + robot.map[location.x][location.y]);
		}
	}
	return false;
}

/*function spawnCrusader(robot) {
	if (crusadersBuilt < resourceOrder.length) {
		// Rerun dijkstras to account for pilgrims blocking spawn locations
		var location = resourceOrder[crusadersBuilt];
		var castlePosition = Vector.ofRobotPosition(robot.me);
		var start = Util.getAdjacentPassable(castlePosition);
		var dijkstras = new Dijkstras(robot.map, start, totalMoves, totalMoveCosts);
		location = dijkstras.resolve((vector) => vector.isAdjacentTo(location)); // TODO: could be occupying a pilgrim's resource
		// Build unit
		while (!location.equals(dijkstras.prev[location.x][location.y])) {
			location = dijkstras.prev[location.x][location.y];
		}
		if (robot.robot_map[location.x][location.y] === 0) {
			var offsetX = location.x - robot.me.x;
			var offsetY = location.y - robot.me.y
			action = robot.buildUnit(SPECS.CRUSADER, offsetX, offsetY); // Face towards target
			// Radio crusader's target position
			robot.signal(Util.encodePosition(resourceOrder[crusadersBuilt]), offsetX * offsetX + offsetY * offsetY); // Broadcast target position
			crusadersBuilt++;
			unitsBuilt++;
			return true;
		} else {
			robot.log("Unable to spawn crusader: " + location + " - " + robot.map[location.x][location.y]);
		}
	}
	return false;
}*/

function spawnProphet(robot) {
	if (SPECS.UNITS[SPECS.PROPHET].CONSTRUCTION_KARBONITE < robot.karbonite || SPECS.UNITS[SPECS.PROPHET].CONSTRUCTION_FUEL < robot.fuel) {
		return false;
	}
	if (prophetsBuilt < resourceOrder.length) {
		// Rerun dijkstras to account for pilgrims blocking spawn locations
		var location = resourceOrder[prophetsBuilt];
		var castlePosition = Vector.ofRobotPosition(robot.me);
		var start = Util.getAdjacentPassable(castlePosition);
		var dijkstras = new Dijkstras(robot.map, start, totalMoves, totalMoveCosts);
		location = dijkstras.resolve((vector) => vector.isAdjacentTo(location)); // TODO: could be occupying a pilgrim's resource
		// Build unit
		while (!location.equals(dijkstras.prev[location.x][location.y])) {
			location = dijkstras.prev[location.x][location.y];
		}
		if (robot.robot_map[location.x][location.y] === 0) {
			var offsetX = location.x - robot.me.x;
			var offsetY = location.y - robot.me.y
			action = robot.buildUnit(SPECS.PROPHET, offsetX, offsetY); // Face towards target
			// Radio prophet's target position
			robot.signal(Util.encodePosition(resourceOrder[prophetsBuilt]), offsetX * offsetX + offsetY * offsetY); // Broadcast target position
			prophetsBuilt++;
			unitsBuilt++;
			unitsToSpawn = SPECS.PROPHET;
			return true;
		} else {
			robot.log("Unable to spawn prophet: " + location + " - " + robot.map[location.x][location.y]);
		}
	}
	return false;
}

var xBuffers = {};

function handleCastleTalk(robot) {
	var robots = robot.getVisibleRobots();
	
	for (var i = 0; i < robots.length; i++) {
		if (robots[i].team === robot.me.team && robots[i].id !== robot.me.id) {
			var robotIsCastle = ((robots[i].castle_talk >>> CASTLE_IDENTIFIER_BITSHIFT) & 1) === 1;
			var robotUnusedBit = ((robots[i].castle_talk >>> CASTLE_UNUSED_BITSHIFT) & 1) === 1;
			var value = (robots[i].castle_talk >>> CASTLE_LOCATION_BITSHIFT) & CASTLE_LOCATION_BITMASK;
			if (robotIsCastle) {
				if (robots[id].turn === 1) {
					xBuffers[robots[i].id] = value;
				} else if (robots[id].turn === 2) {
					var newCastlePosition = new Vector(xBuffers[robots[i].id], value);
					addCastlePosition(newCastlePosition);
				} else if (robots[id].turn > 2) {
					var castleTurn = robots[i].turn;
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
						totalUnitsBuilt++;
					}
				}
			}
		}
	}
	
	var signal = 0;
	
	// Identify as Castle
	signal |= (1 << CASTLE_IDENTIFIER_BITSHIFT);
	
	// Broadcast x or y position
	if (robot.me.turn === 1) {
		signal |= ((robot.me.x & CASTLE_LOCATION_BITMASK) << CASTLE_LOCATION_BITSHIFT);
	} else if (robot.me.turn === 2) {
		signal |= ((robot.me.y & CASTLE_LOCATION_BITMASK) << CASTLE_LOCATION_BITSHIFT);
	} else if (robot.me.turn === 3) {
		castlePositionsInitialized = true;
		// Run Dijkstras on all castle positions to figure out resourceOrder
	}
	robot.castleTalk(signal);
}

export function castleTurn(robot) {
	action = undefined;
	if (!initialized) {
		initialize(robot);
	}
	if (castlePositionsInitialized) {
		if (unitsBuilt % 2 == 0) {
			if (!spawnPilgrim(robot)) {
				spawnProphet(robot);
			}
		} else {
			spawnProphet(robot);
		}
	} else {
		spawnPilgrim(robot);
	}
	handleCastleTalk(robot);
	return action;
}
