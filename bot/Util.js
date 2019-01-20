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

export function flipPositionForHorizontallySymmetric(position) {
	return new Library.Vector(position.x, controller.map[0].length - position.y - 1);
}

export function flipPositionForVerticallySymmetric(position) {
	return new Library.Vector(controller.map.length - position.x - 1, position.y);
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

export function trace(dijkstras, location) {
	while (!location.equals(dijkstras.prev[location.x][location.y])) {
		location = dijkstras.prev[location.x][location.y];
	}
	return location;
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
		if ((!outOfBounds(v)) && controller.map[v.x][v.y] === true && controller.robot_map[v.x][v.y] === 0) { // Check if passable
			ret.push(v);
		}
	}
	return ret;
}

export function getInitialCastleOrChurchSignal() {
	// Retrieve signal from castle and set target
	var robots = controller.getVisibleRobots();
	for (var i = 0; i < robots.length; i++) {
		var robot = robots[i];
		if (robot.team === controller.me.team && controller.isRadioing(robot) && 
				(robot.unit === SPECS.CASTLE || robot.unit === SPECS.CHURCH) ) {
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

export function getInitialChurchSignal() {
	// Retrieve signal from castle and set target
	var robots = controller.getVisibleRobots();
	for (var i = 0; i < robots.length; i++) {
		var robot = robots[i];
		if (robot.team === controller.me.team && robot.unit === SPECS.CHURCH && controller.isRadioing(robot)) {
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

export function isWithinAttackRange(unitType, distanceSquared) {
	var attackRadius = SPECS.UNITS[unitType].ATTACK_RADIUS;
	return distanceSquared >= attackRadius[0] && distanceSquared <= attackRadius[1];
}


export function findIndex(array, value) {
	for (var i = 0; i < array.length; i++) {
		if (array[i] === value) {
			return i;
		}
	}
	return -1;
}

export function isAffordable(type) {
	return controller.karbonite >= SPECS.UNITS[type].CONSTRUCTION_KARBONITE && controller.fuel >= SPECS.UNITS[type].CONSTRUCTION_FUEL;
}


export function hasHigherAttackPriority(unitType, distanceSquared, bestUnitType, bestDistanceSquared) {
	if (bestUnitType === undefined) {
		return true;
	}
	// Assumes that both targets are attackable (within attack range)
	// Assumes we are playing the long game - not rushing castle
	var isCombatUnit = (unitType === SPECS.CRUSADER || unitType === SPECS.PROPHET || unitType === SPECS.PREACHER);
	var bestIsCombatUnit = (bestUnitType === SPECS.CRUSADER || bestUnitType === SPECS.PROPHETS || bestUnitType === SPECS.PREACHER);
	// Prioritize combat units that can attack back
	// then those that are combat units (crusaders, prophets, preachers) that can see us
	// then those that are combat units (crusaders, prophets, preachers) that cannot see us
	// then workers (pilgrims) - vision is constant so one does not need to compare vision - comparing distanceSquared
	// then castles
	// then churches
	if (isCombatUnit) {
		if (!bestIsCombatUnit) {
			return true;
		}
		// Both are combat units
		var canAttack = isWithinAttackRange(unitType, distanceSquared);
		var bestCanAttack = isWithinAttackRange(bestUnitType, bestDistanceSquared);
		if (canAttack) {
			if (!bestCanAttack) {
				return true;
			} else {
				// Both can attack
				return distanceSquared < bestDistanceSquared;
			}
		} else {
			if (bestCanAttack) {
				return false;
			} else {
				// Both cannot attack
				var canSee = distanceSquared <= SPECS.UNITS[unitType].VISION_RADIUS;
				var bestCanSee = bestDistanceSquared <= SPECS.UNITS[bestUnitType].VISION_RADIUS;
				if (canSee) {
					if (!bestCanSee) {
						return true;
					}
				} else {
					if (bestCanSee) {
						return false;
					}
				}
				// Both either cannot see, or both can see
				return distanceSquared < bestDistanceSquared;
			}
		}
	} else if (bestIsCombatUnit) {
		return false;
	}
	var isPilgrim = (unitType === SPECS.PILGRIM);
	var bestIsPilgrim = (bestUnitType === SPECS.PILGRIM);
	if (isPilgrim) {
		if (!bestIsPilgrim) {
			return true;
		}
		return distanceSquared < bestDistanceSquared;
	} else if (bestIsPilgrim) {
		return false;
	}
	var isCastle = (unitType === SPECS.CASTLE);
	var bestIsCastle = (bestUnitType === SPECS.CASTLE);
	if (isCastle) {
		if (!bestIsCastle) {
			return true;
		}
		return distanceSquared < bestDistanceSquared;
	} else if (bestIsCastle) {
		return false;
	}
	// Both are churches at this point
	return distanceSquared < bestDistanceSquared;
}


export function getAttackMove() {
	var robots = controller.getVisibleRobots();
	var bestDx = undefined;
	var bestDy = undefined;
	var bestUnitType = undefined;
	var bestDistanceSquared = 0;
	for (var i = 0; i < robots.length; i++) {
		var robot = robots[i];
		// Find visible enemy robot in attack range
		if (controller.isVisible(robot) && robot.team !== controller.me.team) {
			// To prevent unnecessary creation of vectors
			var dx = robot.x - controller.me.x;
			var dy = robot.y - controller.me.y;
			var distanceSquared = dx * dx + dy * dy;
			if (isWithinAttackRange(controller.me.unit, distanceSquared)) {
				if (hasHigherAttackPriority(robot.unit, distanceSquared, bestUnitType, bestDistanceSquared)) {
					bestDx = dx;
					bestDy = dy;
					bestUnitType = robot.unit;
					bestDistanceSquared = distanceSquared;
				}
			}
		}
	}
	if (bestUnitType === undefined) {
		return undefined;
	} else {
		return controller.attack(bestDx, bestDy);
	}
}

export function isMoveAction(action) {
	return action.action === "move";
}

export function getMoveVector(action) {
	return new Library.Vector(action.dx, action.dy);
}
