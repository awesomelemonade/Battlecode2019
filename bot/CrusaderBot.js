import {SPECS} from 'battlecode'
import * as Util from './Util';
import {Bfs} from './Bfs'
import {Vector, totalMoves, totalMoveCosts} from './Library';

// regular signal
const SQUAD_LEADER_BITSHIFT = 0; // matches this.isLeader
const SQUAD_RUSH_BITSHIFT = 1; // matches this.isRushing
// unused bits 2 & 3
const SQUAD_LOCATION_X_BITSHIFT = 4;
const SQUAD_LOCATION_Y_BITSHIFT = 10;
const SQUAD_LOCATION_BITMASK = 0b111111;

// castle talk
const SQUAD_IDENTIFIER_BITSHIFT = 2;
const SQUAD_DONE_BITSHIFT = 3;
const SQUAD_INFO_BITSHIFT = 4;
const SQUAD_INFO_BITMASK = 0b1111; // 4 bits
const SQUAD_INFO_NUM_BITS = 4;

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
		this.isLeader = false; // Ez access - the same as (squadLeaderId === this.controller.me.id)
		this.hasLeader = false; // Used by squad members (squadLeaderId !== -1)
		this.squadIds = []; // Used by leader
		this.squadLeaderId = -1; // Used by squad members
		this.castleTalkQueue = [];
		// Calculated expected rally points
		var crusaderPosition = Vector.ofRobotPosition(this.controller.me);
		var bfs = new Bfs(this.controller.map, crusaderPosition, totalMoves);
		var stop = bfs.resolve((location) => location.equals(this.target));
		if (stop === undefined) {
			this.controller.log("Failed to calculate expected rally point");
		} else {
			var route = this.getRoute(bfs, crusaderPosition, stop);
			// arbitrary index - fraction of the route
			var primaryIndex = Math.min(Math.floor(route.length / 5), 10);
			var secondaryIndex = primaryIndex + Math.min(Math.floor(route.length / 5), 3);
			this.primaryRallyPosition = route[primaryIndex];
			this.secondaryRallyPosition = route[secondaryIndex];
			this.controller.log("Rally points: " + this.primaryRallyPosition + " - " + this.secondaryRallyPosition);
		}
	}
	getRoute(bfs, start, location) {
		var route = [location];
		while (!location.equals(start)) {
			location = bfs.prev[location.x][location.y];
			route.unshift(location); // route would be backwards if you push()
		}
		return route;
	}
	getAttackMove() {
		return Util.getAttackMove();
		// TODO
		// Attack enemy units
		// Move towards visible enemy units
		// Broadcast enemy unit
	}
	targetIsKilled() {
		var robotId = this.controller.robot_map[this.target.x][this.target.y];
		if (robotId === -1) {
			return false;
		} else if (robotId === 0) {
			return true;
		} else {
			var robot = this.controller.getRobot(robotId);
			return robot.team === this.controller.me.team;
		}
	}
	getMoveForTarget() {
		// Check if target is dead
		if (this.targetIsKilled()) {
			this.controller.log(this.target + " target is killed!"); 
			// Target is dead - castle talk to get new target
			var pieces = [];
			pieces.push((this.target.x >>> 2) & 0b1111);
			pieces.push(((this.target.x & 0b11) << 2) | ((this.target.y >>> 4) & 0b11));
			pieces.push(this.target.y & 0b1111);
			for (var i = 0; i < pieces.length; i++) {
				var signal = 0;
				signal |= (1 << SQUAD_IDENTIFIER_BITSHIFT);
				signal |= ((pieces[i] & SQUAD_INFO_BITMASK) << SQUAD_INFO_BITSHIFT);
				if (i === pieces.length - 1) {
					// Send "done" signal
					signal |= (1 << SQUAD_DONE_BITSHIFT);
				}
				this.castleTalkQueue.push(signal);
			}
		}
		// Send castle talk queue
		if (this.castleTalkQueue.length > 0) {
			this.controller.castleTalk(this.castleTalkQueue.shift());
		}
		// Rush towards target
		var crusaderPosition = Vector.ofRobotPosition(this.controller.me);
		var bfs = new Bfs(this.controller.map, crusaderPosition, totalMoves);
		var stop = bfs.resolve((location) => location.equals(this.target));
		if (stop === undefined) {
			// Cannot reach
			return undefined;
		} else {
			var move = Util.getMove(bfs, crusaderPosition, stop);
			if (move.isZero()) {
				this.controller.log("Move is zero when moving towards target?");
			} else {
				return this.controller.move(move.x, move.y);
			}
		}
	}
	getMoveForLeader() {
		// Check if rushing
		if (this.squadIds.length > 3) {
			this.controller.log("Rushing! target=" + this.target + " squad=" + this.squadIds);
			this.isRushing = true;
		}
		// Broadcast to nearby crusaders/preachers
		var largestDistanceSquared = 0;
		var robots = this.controller.getVisibleRobots();
		for (var i = 0; i < robots.length; i++) {
			var robot = robots[i];
			if (!this.controller.isVisible(robot)) {
				continue;
			}
			if (robot.unit === SPECS.CRUSADER || robot.unit === SPECS.PREACHER) {
				if (this.squadIds.includes(robot.id)) {
					continue;
				}
				// Recruit to squad
				this.squadIds.push(robot.id);
				// Avoid using vectors
				var dx = this.controller.me.x - robot.x;
				var dy = this.controller.me.y - robot.y;
				var distanceSquared = dx * dx + dy * dy;
				if (distanceSquared > largestDistanceSquared) {
					largestDistanceSquared = distanceSquared;
				}
			}
		}
		var signalRadius = largestDistanceSquared;
		if (this.isRushing) {
			signalRadius = 400; // r = 20, costs 20 fuel
		}
		if (signalRadius > 0) {
			// Broadcast we're a leader + secondaryRallyPosition
			var signal = 0;
			// Set leader
			signal |= (1 << SQUAD_LEADER_BITSHIFT);
			if (this.isRushing) {
				signal |= (1 << SQUAD_RUSH_BITSHIFT);
				// Set target
				signal |= (this.target.x << SQUAD_LOCATION_X_BITSHIFT);
				signal |= (this.target.y << SQUAD_LOCATION_Y_BITSHIFT);
			} else {
				// Set secondaryRallyPosition
				signal |= (this.secondaryRallyPosition.x << SQUAD_LOCATION_X_BITSHIFT);
				signal |= (this.secondaryRallyPosition.y << SQUAD_LOCATION_Y_BITSHIFT);
			}
			// Signal
			this.controller.signal(signal, signalRadius);
		}
	}
	getMoveForSecondaryRally() {
		return this.getMoveForRally(this.secondaryRallyPosition, 5);
	}
	getMoveForPrimaryRally() {
		// Everybody goes to first rally point to receive signal for the second rally point (and id of "leader") - guarantees there is space for units to see "leader"
		// After "leader" decides to rush, will broadcast a large signal (combat units will know it's from our team because it has seen the leader's id)
		// This large signal will signal to attack
		var move = this.getMoveForRally(this.primaryRallyPosition, 2);
		if (move === null) {
			this.controller.log(Vector.ofRobotPosition(this.controller.me) + " is becoming leader @ " + this.primaryRallyPosition);
			// Become leader
			this.isLeader = true;
			this.hasLeader = true;
			// Do rally leader's move
			return this.getMoveForLeader();
		} else {
			return move;
		}
	}
	getMoveForRally(rallyPosition, distance) {
		var crusaderPosition = Vector.ofRobotPosition(this.controller.me);
		var bfs = new Bfs(this.controller.map, crusaderPosition, totalMoves, totalMoveCosts);
		var stop = bfs.resolve((location) => (location.getDistanceSquared(rallyPosition) <= distance));
		if (stop === undefined) {
			// Cannot reach
			this.controller.log(crusaderPosition + " cannot reach rally position: " + rallyPosition + " @ distance " + distance);
			return undefined;
		} else {
			var move = Util.getMove(bfs, crusaderPosition, stop);
			if (move.isZero()) {
				// Reached rallyPosition
				return null;
			} else {
				// Move towards primaryRallyPosition
				return this.controller.move(move.x, move.y);
			}
		}
	}
	checkNewTargets() {
		if (this.controller.me.turn <= 1) {
			return;
		}
		var visibleRobots = this.controller.getVisibleRobots();
		for (var i = 0; i < visibleRobots.length; i++) {
			var robot = visibleRobots[i];
			if (this.controller.isRadioing(robot)) {
				var robotId = robot.id;
				if (this.controller.castles[robotId] !== undefined) {
					// We found a signal from the castle
					// Parse signal
					this.target = Util.decodePosition(robot.signal);
					this.controller.log("Received signal from castle: " + this.target + " - " + robot.signal_radius);
				}
			}
		}
	}
	turn() {
		// See if we received new target from castles
		this.checkNewTargets();
		// Process regular signals
		if (!this.isRushing) {
			if (this.hasLeader) {
				if (!this.isLeader) {
					// Listen for rush signal
					// TODO: is it possible to use this.controller.getRobot(id) to retrieve signals?
					var robot = Util.findRobot((robot) => robot.id === this.squadLeaderId, false);
					if (this.controller.isRadioing(robot)) {
						var signal = robot.signal;
						this.isRushing = ((signal >>> SQUAD_RUSH_BITSHIFT) & 1) === 1;
						if (this.isRushing) {
							var targetX = ((signal >>> SQUAD_LOCATION_X_BITSHIFT) & SQUAD_LOCATION_BITMASK);
							var targetY = ((signal >>> SQUAD_LOCATION_Y_BITSHIFT) & SQUAD_LOCATION_BITMASK);
							this.target = new Vector(targetX, targetY);
							this.controller.log("Received rush signal: " + this.target);
						}
					}
				}
			} else {
				// Listen for leader signal
				var self = this;
				var robot = Util.findRobot(function(robot) {
					if (robot.team === self.controller.me.team) {
						if (robot.unit === SPECS.CRUSADER || robot.unit === SPECS.PREACHER) {
							if (self.controller.isRadioing(robot)) {
								return true;
							}
						}
					}
					return false;
				});
				if (robot !== null) {
					var signal = robot.signal;
					var isLeader = ((signal >> SQUAD_LEADER_BITSHIFT) & 1) === 1;
					if (isLeader) {
						this.squadLeaderId = robot.id;
						this.hasLeader = true;
						this.isRushing = ((signal >>> SQUAD_RUSH_BITSHIFT) & 1) === 1;
						var x = ((signal >>> SQUAD_LOCATION_X_BITSHIFT) & SQUAD_LOCATION_BITMASK);
						var y = ((signal >>> SQUAD_LOCATION_Y_BITSHIFT) & SQUAD_LOCATION_BITMASK);
						this.secondaryRallyPosition = new Vector(x, y);
						this.controller.log("Found Leader: " + this.squadLeaderId + " - " + this.secondaryRallyPosition);
					}
				}
			}
		}
		// Do turn
		var visibleEnemies = Util.getVisibleEnemies();
		if (visibleEnemies.length > 0) {
			var attackMove = this.getAttackMove();
			if (attackMove !== undefined) {
				return attackMove;
			}
		}
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
	}
}
