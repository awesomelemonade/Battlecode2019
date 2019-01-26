import {SPECS} from 'battlecode'
import * as Util from './Util';
import {Dijkstras} from './Dijkstras'
import {Vector, totalMoves, totalMoveCosts} from './Library';

const SQUAD_LEADER_BITSHIFT = 0; // matches this.isLeader
const SQUAD_RUSH_BITSHIFT = 1; // matches this.isRushing
// unused bits 2 & 3
const SQUAD_LOCATION_X_BITSHIFT = 4;
const SQUAD_LOCATION_Y_BITSHIFT = 10;
const SQUAD_LOCATION_BITMASK = 0b111111;

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
		// Check if rushing
		this.isRushing = false;
		// Broadcast to nearby crusaders/preachers
		var largestDistanceSquared = 0;
		var robots = controller.getVisibleRobots();
		for (var i = 0; i < robots.length; i++) {
			var robot = robots[i];
			if (!this.controller.isVisible(robot)) {
				continue;
			}
			if (robot.unit === SPECS.CRUSADER || robot.unit === SPECS.PREACHER) {
				if (squadIds.include(robot.id)) {
					continue;
				}
				// Recruit to squad
				squadIds.push(robot.id);
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
			signalRadius = 400; // costs 20 fuel
		}
		if (signalRadius > 0) {
			// Broadcast we're a leader + secondaryRallyPosition
			var signal = 0;
			// Set leader
			signal |= (1 << SQUAD_LEADER_BITSHIFT);
			if (this.isRushing) {
				signal |= (1 << SQUAD_RUSH_BITSHIFT);
				// Set secondaryRallyPosition
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
		return getMoveForRally(this.secondaryRallyPosition, 5);
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
		if (!this.isRushing) {
			// Process Signals
			if (this.hasLeader) {
				if (!this.isLeader) {
					// Listen for rush signal
					// TODO: is it possible to use this.controller.getRobot(id) to retrieve signals?
					var robot = Util.findRobot((robot) => robot.id === this.squadLeaderId, false);
					if (this.controller.isRadioing(robot)) {
						var signal = robot.signal;
						this.isRushing = ((signal >>> SQUAD_RUSH_BITSHIFT) & 1) === 1;
						var targetX = ((signal >>> SQUAD_LOCATION_X_BITSHIFT) & SQUAD_LOCATION_BITMASK);
						var targetY = ((signal >>> SQUAD_LOCATION_Y_BITSHIFT) & SQUAD_LOCATION_BITMASK);
						this.target = new Vector(targetX, targetY);
					}
				}
			} else {
				// Listen for leader signal
				var self = this;
				var robot = Util.findRobot(function(robot) {
					if (robot.team === self.controller.me.team) {
						if (robot.unit === SPECS.CRUSADER || robot.unit === SPECS.PREACHER) {
							if (self.isRadioing(robot)) {
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
					}
				}
			}
		}
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
