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
	
	// BFS for some karbonite/fuel positions
	initialized = true;
}
var test = false;
var action = undefined;

function spawnPilgrim(robot) {
	// Radio pilgrim's target position
	robot.signal(Util.encodePosition(new Vector(12, 34)), 1); // TODO: Actually calculate a position
	// Build unit
	action = robot.buildUnit(SPECS.PILGRIM, 1, 1); // TODO: Face towards target
}

export function castleTurn(robot) {
	var before = new Date().getTime();
	var dijkstras = new Dijkstras(robot.map, Vector.ofRobotPosition(robot.me), totalMoves, totalMoveCosts);
	dijkstras.resolve();
	var after = new Date().getTime();
	robot.log("# of milliseconds: " + (after - before));
	action = undefined;
	if (!initialized) {
		initialize(robot);
	}
	robot.log("A Castle Turn");
	if (isLeader && !test) {
		spawnPilgrim(robot);
		test = true;
	}
	return action;
}
