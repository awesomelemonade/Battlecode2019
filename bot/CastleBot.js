import {SPECS} from 'battlecode'
import * as Util from './Util';
import {Vector, totalMoves, totalMoveCosts} from './Library';
import {Dijkstras} from './Dijkstras'

var initialized = false;
var isLeader = false;

const LEADER_SIGNAL = 1;

function initialize(robot) {
	// Check if leader castle is already claimed
	var hasLeader = false;
	var robots = robot.getVisibleRobots();
	
	for (var i = 0; i < robots.length; i++) {
		if (robots[i].castle_talk === LEADER_SIGNAL) {
			hasLeader = true;
			break;
		}
	}
	
	// Claim leader if no leader
	if (!hasLeader) {
		isLeader = true;
		robot.castleTalk(LEADER_SIGNAL);
	}
	
	// TODO: Figure out best castle to start with
	
	// Dijkstra for some karbonite/fuel positions
	var castlePosition = Vector.ofRobotPosition(robot.me);
	const adjacent = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
	var start = [];
	for (var i = 0; i < adjacent.length; i++) {
		var v = new Vector(castlePosition.x + adjacent[i][0], castlePosition.y + adjacent[i][1]);
		if ((!Util.outOfBounds(v)) && robot.map[v.x][v.y] === true) { // Check if passable
			start.push(v);
		}
	}
	dijkstras = new Dijkstras(robot.map, start, totalMoves, totalMoveCosts);
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
	initialized = true;
}

var dijkstras = null;
var karboniteOrder = [];
var fuelOrder = [];
var resourceOrder = [];
var action = undefined;

var numBuilt = 0;

function spawnPilgrim(robot) {
	if (numBuilt < resourceOrder.length) {
		var location = resourceOrder[numBuilt];
		// Build unit
		while (!location.equals(dijkstras.prev[location.x][location.y])) {
			location = dijkstras.prev[location.x][location.y];
		}
		if (robot.robot_map[location.x][location.y] === 0) {
			var offsetX = location.x - robot.me.x;
			var offsetY = location.y - robot.me.y
			action = robot.buildUnit(SPECS.PILGRIM, offsetX, offsetY); // Face towards target
			// Radio pilgrim's target position
			robot.signal(Util.encodePosition(resourceOrder[numBuilt]), offsetX * offsetX + offsetY * offsetY); // Broadcast target position
			numBuilt++;
		}
	}
}

export function castleTurn(robot) {
	action = undefined;
	if (!initialized) {
		initialize(robot);
	}
	robot.log("A Castle Turn");
	if (isLeader) {
		spawnPilgrim(robot);
	}
	return action;
}
