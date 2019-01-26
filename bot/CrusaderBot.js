import {SPECS} from 'battlecode'
import * as Util from './Util';
import {Dijkstras} from './Dijkstras'
import {Vector, totalMoves, totalMoveCosts} from './Library';

const SIGNAL_PROTOCOL;

export class CrusaderBot {
	constructor(controller) {
		this.controller = controller;
		this.init();
	}
	init() {
		// Retrieve signal from castle and set target
		var castleRobot = Util.getInitialCastleOrChurch();
		this.turnOffset = castleRobot.turn - this.controller.me.turn;
		var castleSignal = castleRobot.signal;
		if (castleSignal === -1) {
			this.controller.log("Unable to find castle signal? " + Vector.ofRobotPosition(this.controller.me) + " - " + this.controller.me.turn);
		} else {
			this.target = Util.decodePosition(castleSignal);
			this.controller.log("Crusader" + Vector.ofRobotPosition(this.controller.me) + " -> " + this.target);
		}
		this.isRushing = false; // if true, rush towards target
		this.isLeader = false; // Ez access - the same as (squadLeader === this.controller.me.id)
		this.hasLeader = false; // Used by squad members (squadLeader !== -1)
		this.squadIds = []; // Used by leader
		this.squadLeader = -1; // Used by squad members
		// Calculated expected rally points
		var crusaderPosition = Vector.ofRobotPosition(this.controller.me);
		var bfs = new Bfs(this.controller.map, crusaderPosition, totalMoves);
		var stop = bfs.resolve((location) => location.equals(this.target));
		if (stop === undefined) {
			this.controller.log("Failed to calculate expected rally point");
		} else {
			var route = this.getRoute(dijkstras, crusaderPosition, stop);
			// arbitrary index - fraction of the route
			var primaryIndex = Math.min(Math.floor(route.length / 3), 10);
			var secondaryIndex = primaryIndex + Math.min(Math.floor(route.length / 5), 3);
			this.primaryRallyPosition = route[primaryIndex];
			this.secondaryRallyPosition = route[secondaryIndex];
		}
	}
	getRoute(dijkstras, start, location) {
		var route = [location];
		while (!location.equals(start)) {
			location = dijkstras.prev[current.x][current.y];
			route.push(location);
		}
		return route;
	}
	getAttackMove() {
		// Attack enemy units
		// Move towards visible enemy units
		// Broadcast enemy unit
	}
	getMoveForTarget() {
		// Rush towards target
		var crusaderPosition = Vector.ofRobotPosition(this.controller.me);
		var dijkstras = new Dijkstras(this.controller.map, crusaderPosition, totalMoves, totalMoveCosts);
		var stop = dijkstras.resolve((location) => location.equals(this.target));
		if (stop === undefined) {
			// Cannot reach
			return undefined;
		} else {
			var move = Util.getMove(dijkstras, crusaderPosition, stop);
			if (move.isZero()) {
				this.controller.log("Move is zero when moving towards target?");
			} else {
				return this.controller.move(move.x, move.y);
			}
		}
	}
	getMoveForLeader() {
		// Broadcast to nearby crusaders/preachers
		var signalRadius = this.getFurthestCombatUnitDistance();
		if (signalRadius > 0) {
			// Broadcast we're a leader + secondaryRallyPosition
		}
	}
	getMoveForSecondaryRally() {
		
	}
	getMoveForPrimaryRally() {
		// Everybody goes to first rally point to receive signal for the second rally point (and id of "leader") - guarantees there is space for units to see "leader"
		// After "leader" decides to rush, will broadcast a large signal (combat units will know it's from our team because it has seen the leader's id)
		// This large signal will signal to attack
		
		var move = getMoveForRally(this.primaryRallyPosition, 2);
		if (move === null) {
			// Become leader
			this.isLeader = true;
			// Do rally leader's move
			return this.getMoveForRallyLeader();
		} else {
			return move;
		}
		
		// Check if we should switch to rushing
		// Broadcast if we're rushing - broadcast secondary rally point
	}
	getFurthestCombatUnitDistance() {
		var largestDistanceSquared = 0;
		var robots = controller.getVisibleRobots();
		for (var i = 0; i < robots.length; i++) {
			var robot = robots[i];
			if (!controller.isVisible(robot)) {
				continue;
			}
			if (robot.unit === SPECS.CRUSADER || robot.unit === SPECS.PREACHER) {
				// Avoid using vectors
				var dx = this.controller.me.x - robot.x;
				var dy = this.controller.me.y - robot.y;
				var distanceSquared = dx * dx + dy * dy;
				if (distanceSquared > largestDistanceSquared) {
					largestDistanceSquared = distanceSquared;
				}
			}
		}
		return largestDistanceSquared;
	}
	getMoveForRally(rallyPosition, distance) {
		var crusaderPosition = Vector.ofRobotPosition(this.controller.me);
		var dijkstras = new Dijkstras(this.controller.map, crusaderPosition, totalMoves, totalMoveCosts);
		var stop = dijkstras.resolve((location) => (location.getDistanceSquared(rallyPosition) <= distance));
		if (stop === undefined) {
			// Cannot reach
			return undefined;
		} else {
			if (stop.getDistanceSquared(rallyPosition) <= distance) {
				// Reached primaryRallyPosition
				// TODO: check if we should become leader
				return null;
			} else {
				var move = Util.getMove(dijkstras, crusaderPosition, stop);
				if (move.isZero()) {
					this.controller.log("Rally - move is zero when not at rally position?");
					return undefined;
				} else {
					// Move towards primaryRallyPosition
					return this.controller.move(move.x, move.y);
				}
			}
		}
	}
	turn() {
		// Process Signals
		
		// Do turn
		var visibleEnemies = Util.getVisibleEnemies();
		if (visibleEnemies.length === 0) {
			// Don't see enemy
			if (this.isRushing) {
				return this.getMoveForTarget();
			}
			if (this.isLeader) {
				return this.getMoveForLeader();
			}
			if (this.hasLeader) {
				return this.getMoveForSecondaryRally();
			}
			return this.getMoveForPrimaryRally();
		} else {
			// We see at least 1 enemy
			var attackMove = Util.getAttackMove();
			if (attackMove === undefined) {
				return this.getMoveForLattice();
			} else {
				return attackMove;
			}
		}
	}
}
