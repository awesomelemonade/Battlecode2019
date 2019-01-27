import {SPECS} from 'battlecode'
import {Vector} from './Library';

var unitTypes = new Map(); // Maps id -> unitType
var lastKnownPositions = new Map(); // Maps id -> Vector position
var currentUnitTypes = new Map();
var currentKnownPositions = new Map();

function swapMaps() {
	var temp = unitTypes;
	unitTypes = currentUnitTypes;
	currentUnitTypes = temp;
	var temp2 = lastKnownPositions;
	lastKnownPositions = currentKnownPositions;
	currentKnownPositions = temp2;
}

export function setKnownInfo(id, unitType, position) {
	currentUnitTypes.set(id, unitType);
	currentKnownPositions.set(id, position);
}

export function track(controller, castleDeadManager) {
	var count = 0; // hardcoding counting prophets that die outside of vision range
	// Memory management
	swapMaps();
	currentUnitTypes.clear();
	currentKnownPositions.clear();
	// Get list of ids and their respective unit types (or unknown) and positions
	var visibleRobots = controller.getVisibleRobots();
	for (var i = 0; i < visibleRobots.length; i++) {
		var robot = visibleRobots[i];
		// team is guaranteed available because we're working with castles
		if (robot.team === controller.me.team) {
			if (controller.isVisible(robot)) {
				currentUnitTypes.set(robot.id, robot.unit);
				currentKnownPositions.set(robot.id, Vector.ofRobotPosition(robot));
			} else {
				currentUnitTypes.set(robot.id, -1);
				currentKnownPositions.set(robot.id, null);
			}
		}
	}
	// Combine with previous turn's track
	for (var id of unitTypes.keys()) {
		if (currentUnitTypes.has(id)) {
			// Alive on both previous and current round
			var prevType = unitTypes.get(id);
			if ((prevType !== -1) && (currentUnitTypes.get(id) === -1)) {
				// Unit type does not change over each round
				currentUnitTypes.set(id, prevType);
				// Position does not change if it is a castle or church
				if (prevType === SPECS.CASTLE || prevType === SPECS.CHURCH) {
					currentKnownPositions.set(id, lastKnownPositions.get(id));
				}
			}
		} else {
			// Alive on previous but NOT current round
			// Robot is dead
			// Hard coded counter
			if (unitTypes.get(id) === SPECS.PROPHET && lastKnownPositions.get(id) === null) {
				count++;
			}
			if (unitTypes.get(id) === SPECS.CASTLE && lastKnownPositions.get(id) !== null) {
				castleDeadManager(id, lastKnownPositions.get(id));
			}
		}
	}
	return count;
	/*
	// Not needed
	for (var id of currentUnitTypes.keys()) {
		if (!unitTypes.has(id)) {
			// New unit that hasn't been seen before
			// Alive on this round, but not previous
			
		}
	}
	*/
}
