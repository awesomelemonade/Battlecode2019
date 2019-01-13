import {SPECS} from 'battlecode'
import * as Library from './Library';

const X_SHIFT = 6;
const BITMASK = 0b111111;

var controller = null;

export function setUtilController(c) {
	controller = c;
}

export function encodePosition(position) {
	// position.x and position.y should have domain [0, 63]: 2^6-1
	return ((position.x & BITMASK) << X_SHIFT) | (position.y & BITMASK);
}

export function decodePosition(encodedPosition) {
	return new Library.Vector((encodedPosition >>> X_SHIFT) & BITMASK, encodedPosition & BITMASK);
}

// Pass in boolean array
export function isHorizontallySymmetric(array) {
	for (var x = 0; x < array.length; x++) {
		for (var y = 0; y < array[0].length / 2; y++) {
			if (array[x][y] !== array[x][array[0].length - y - 1]) {
				return false;
			}
		}
	}
	return true;
}

// Pass in boolean array
export function isVerticallySymmetric(array) {
	for (var x = 0; x < array.length / 2; x++) {
		for (var y = 0; y < array[0].length; y++) {
			if (array[x][y] !== array[array.length - x - 1][y]) {
				return false;
			}
		}
	}
	return true;
}

export function getMove(dijkstras, start, location) {
	var prev = location;
	var current = location;
	while (!current.equals(start)) {
		prev = current;
		current = dijkstras.prev[current.x][current.y];
	}
	return prev.subtract(start);
}

export function hasKarbonite(location) {
	return controller.karbonite_map[location.x][location.y];
}

export function hasFuel(location) {
	return controller.fuel_map[location.x][location.y];
}

export function hasResource(location) {
	return hasKarbonite(location) || hasFuel(location);
}

export function isNextToCastleOrChurch(location) {
	var castles = Object.values(controller.castles);
	for (var i = 0; i < castles.length; i++) {
		if (location.getDistanceSquared(castles[i]) <= 2) {
			return true;
		}
	}
	var churches = Object.values(controller.churches);
	for (var i = 0; i < churches.length; i++) {
		if (location.getDistanceSquared(churches[i]) <= 2) {
			return true;
		}
	}
	return false;
}

export function outOfBounds(vector) {
	return vector.x < 0 || vector.x >= controller.map.length || vector.y < 0 || vector.y >= controller.map[0].length;
}

const adjacent = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];

export function getAdjacent(position) {
	var ret = [];
	for (var i = 0; i < adjacent.length; i++) {
		var v = new Library.Vector(position.x + adjacent[i][0], position.y + adjacent[i][1]);
		if (!outOfBounds(v)) { // Check if out of bounds
			ret.push(v);
		}
	}
	return ret;
}

export function getAdjacentPassable(position) {
	var ret = [];
	for (var i = 0; i < adjacent.length; i++) {
		var v = new Library.Vector(position.x + adjacent[i][0], position.y + adjacent[i][1]);
		if ((!outOfBounds(v)) && controller.map[v.x][v.y] === true) { // Check if passable
			ret.push(v);
		}
	}
	return ret;
}

export function getInitialCastleSignal() {
	// Retrieve signal from castle and set target
	var robots = controller.getVisibleRobots();
	for (var i = 0; i < robots.length; i++) {
		var robot = robots[i];
		if (robot.unit === SPECS.CASTLE && controller.isRadioing(robot)) {
			var distX = robot.x - controller.me.x;
			var distY = robot.y - controller.me.y;
			var distSquared = distX * distX + distY * distY;
			if (distSquared <= 2 && distSquared === robot.signal_radius) {
				return robot.signal;
			}
		}
	}
	return -1;
}

export function getVisibleEnemies() {
	var ret = [];
	var robots = controller.getVisibleRobots();
	for (var i = 0; i < robots.length; i++) {
		var robot = robots[i];
		if (robot.team !== controller.me.team) {
			ret.push(robot);
		}
	}
	return ret;
}
