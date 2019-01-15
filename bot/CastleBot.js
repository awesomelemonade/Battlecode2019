import {SPECS} from 'battlecode'
import * as Util from './Util';
import {Vector, totalMoves, totalMoveCosts} from './Library';
import {Dijkstras} from './Dijkstras'

var initialized = false;
var isLeader = false;

// Use r.turn to differentiate castle vs other units?
// castle_talk among castles for the first few turns - 8 bits
const CASTLE_IDENTIFIER_BITSHIFT = 0; // Differentiate Castle and other units
const CASTLE_LEADER_BITSHIFT = 1; // Temporary leader identification system
const CASTLE_LOCATION_BITSHIFT = 2;
const CASTLE_LOCATION_BITMASK = 0b111111; // 6 bits (2^6 = 64) per x or y
// castle_talk among castles after the first few turns

var enemyPredictions = [];

function initialize(robot) {
	// TODO: Figure out best castle to start with
	
	// Dijkstra for some karbonite/fuel positions - TODO: use other castle locations for start
	var castlePosition = Vector.ofRobotPosition(robot.me);
	const adjacent = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
	var start = [];
	for (var i = 0; i < adjacent.length; i++) {
		var v = new Vector(castlePosition.x + adjacent[i][0], castlePosition.y + adjacent[i][1]);
		if ((!Util.outOfBounds(v)) && robot.map[v.x][v.y] === true) { // Check if passable
			start.push(v);
		}
	}
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
	// Enemy predictions
	addEnemyPrediction(castlePosition);
	initialized = true;
}

function addEnemyPrediction(position) {
	if (robot.isHorizontallySymmetric) {
		enemyPredictions.push(Util.flipPositionForHorizontallySymmmetric(position));
	}
	if (robot.isVerticallySymmetric) {
		enemyPredictions.push(Util.flipPositionForVerticallySymmetric(position));
	}
}

var karboniteOrder = [];
var fuelOrder = [];
var resourceOrder = [];
var action = undefined;

var unitsBuilt = 0;
var pilgrimsBuilt = 0;
var crusadersBuilt = 0;
var prophetsBuilt = 0;

function spawnPilgrim(robot) {
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
			return true;
		} else {
			robot.log("Unable to spawn pilgrim: " + location + " - " + robot.map[location.x][location.y]);
		}
	}
	return false;
}
function spawnCrusader(robot) {
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
}

function spawnProphet(robot) {
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
			return true;
		} else {
			robot.log("Unable to spawn prophet: " + location + " - " + robot.map[location.x][location.y]);
		}
	}
	return false;
}

function handleCastleTalk(robot) {
	// Check if leader castle is already claimed
	var hasLeader = false;
	var robots = robot.getVisibleRobots();
	
	for (var i = 0; i < robots.length; i++) {
		if (robots[i].team === robot.me.team && robots[i].id !== robot.me.id) {
			var robotIsCastle = ((robots[i].castle_talk >>> CASTLE_IDENTIFIER_BITSHIFT) & 1) === 1;
			var robotIsLeader = ((robots[i].castle_talk >>> CASTLE_LEADER_BITSHIFT) & 1) === 1;
			if (robotIsCastle && robotIsLeader) {
				hasLeader = true;
			}
			// TODO: store x and y positions of castles
		}
	}
	
	var signal = 0;
	
	// Identify as Castle
	signal |= (1 << CASTLE_IDENTIFIER_BITSHIFT);
	
	// Claim leader if no leader
	if (!hasLeader) {
		isLeader = true;
		signal |= (1 << CASTLE_LEADER_BITSHIFT);
	}
	
	// Broadcast x or y position
	if (robot.me.turn === 0) {
		signal |= ((robot.me.x & CASTLE_LOCATION_BITMASK) << CASTLE_LOCATION_BITSHIFT);
	} else if (robot.me.turn === 1) {
		signal |= ((robot.me.y & CASTLE_LOCATION_BITMASK) << CASTLE_LOCATION_BITSHIFT);
	}
	robot.castleTalk(signal);
}

export function castleTurn(robot) {
	action = undefined;
	if (!initialized) {
		initialize(robot);
	}
	handleCastleTalk(robot);
	if (isLeader) {
		if (unitsBuilt % 2 == 0) {
			if (!spawnPilgrim(robot)) {
				spawnProphet(robot);
			}
		} else {
			spawnProphet(robot);
		}
	}
	return action;
}
