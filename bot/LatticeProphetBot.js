import {SPECS} from 'battlecode'
import * as Util from './Util';
import {Dijkstras} from './Dijkstras'
import {Vector, totalMoves, totalMoveCosts} from './Library';

export class ProphetBot {
	constructor(controller) {
		this.controller = controller;
		this.init();
	}
	init() {
		// Retrieve signal from castle and set target
		var castleSignal = Util.getInitialCastleOrChurchSignal();
		if (castleSignal === -1) {
			this.controller.log("Unable to find castle signal? " + Vector.ofRobotPosition(this.controller.me) + " - " + this.controller.me.turn);
		} else {
			this.target = Util.decodePosition(castleSignal);
			this.controller.log("Setting target: " + this.target);
		}
	}
	getMoveForTarget() {
		var prophetPosition = Vector.ofRobotPosition(this.controller.me);
		var dijkstras = new Dijkstras(this.controller.map, prophetPosition, totalMoves, totalMoveCosts);
		var stop = dijkstras.resolve((location) => location.equals(this.target));
		if (stop === undefined) {
			// Cannot reach
			return undefined;
		} else {
			var move = Util.getMove(dijkstras, prophetPosition, stop);
			if (!move.isZero()) {
				return this.controller.move(move.x, move.y);
			}
		}
	}
	getMoveForLattice() {
		var self = this;
		var prophetPosition = Vector.ofRobotPosition(this.controller.me);
		var dijkstras = new Dijkstras(this.controller.map, prophetPosition, totalMoves, totalMoveCosts);
		var stop = dijkstras.resolve(function(location) { // Stop Condition
			return (location.x + location.y) % 2 === 0 && (!Util.isNextToCastleOrChurch(location)) && (!Util.hasResource(location));
		}, function(location) { // Ignore Condition
			return self.controller.robot_map[location.x][location.y] === -1; // Ignore tiles outside of our vision range
		});
		if (stop === undefined) {
			// No visible valid stop areas
			// Go towards target to search for more stop areas
			return getMoveForTarget();
		} else {
			var move = Util.getMove(dijkstras, prophetPosition, stop);
			if (!move.isZero()) {
				return this.controller.move(move.x, move.y);
			}
		}
	}
	enemyCanSee(visibleEnemies, position) {
		for (var j = 0; j < visibleEnemies.length; j++) {
			var enemy = visibleEnemies[j];
			if (enemy.unit === SPECS.CASTLE || enemy.unit === SPECS.CHURCH || enemy.unit === SPECS.PILGRIM) {
				continue;
			}
			var enemyPosition = Vector.ofRobotPosition(enemy);
			var distanceSquared = position.getDistanceSquared(enemyPosition);
			if (distanceSquared <= SPECS.UNITS[enemy.unit].VISION_RADIUS) {
				return true;
			}
		}
		return false;
	}
	getKiteMove() {
		var visibleEnemies = Util.getVisibleEnemies();
		var currentPosition = Vector.ofRobotPosition(this.controller.me);
		// Check if enemies can see currentPosition
		if (!this.enemyCanSee(visibleEnemies, currentPosition)) {
			return undefined; // We have better things to do than standing still
		}
		var bestMove = null;
		for (var i = 0; i < totalMoves.length; i++) {
			var move = totalMoves[i];
			var endPosition = currentPosition.add(move);
			if (!this.enemyCanSee(visibleEnemies, endPosition)) {
				bestMove = move;
				break;
			}
		}
		if (bestMove === null) {
			// Nowhere to kite
			return undefined;
		} else {
			return this.controller.move(bestMove.x, bestMove.y);
		}
	}
	getAttackMove() {
		var robots = this.controller.getVisibleRobots();
		var bestDx = undefined;
		var bestDy = undefined;
		var bestUnitType = undefined;
		var bestDistanceSquared = 0;
		for (var i = 0; i < robots.length; i++) {
			var robot = robots[i];
			// Find visible enemy robot in attack range
			if (this.controller.isVisible(robot) && robot.team !== this.controller.me.team) {
				// To prevent unnecessary creation of vectors
				var dx = robot.x - this.controller.me.x;
				var dy = robot.y - this.controller.me.y;
				var distanceSquared = dx * dx + dy * dy;
				if (Util.isWithinAttackRange(this.controller.me.unit, distanceSquared)) {
					if (Util.hasHigherAttackPriority(robot.unit, distanceSquared, bestUnitType, bestDistanceSquared)) {
						bestDx = dx;
						bestDy = dy;
						bestUnitType = robot.unit;
						bestDistanceSquared = distanceSquared;
					}
				}
			}
		}
		// Can only return undefined if we cannot find a valid attack or kite move
		if (bestUnitType === undefined) {
			return this.getKiteMove();
		} else {
			if ((bestUnitType === SPECS.CRUSADER || bestUnitType === SPECS.PREACHER) &&
					bestDistanceSquared <= SPECS.UNITS[bestUnitType].VISION_RADIUS) {
				// We should kite
				var kiteMove = this.getKiteMove();
				if (kiteMove === undefined) {
					return this.controller.attack(bestDx, bestDy);
				} else {
					return kiteMove;
				}
			} else {
				return this.controller.attack(bestDx, bestDy);
			}
		}
	}
	turn() {
		var visibleEnemies = Util.getVisibleEnemies();
		if (visibleEnemies.length === 0) {
			// Don't see enemy
			return this.getMoveForLattice();
		} else {
			// We see at least 1 enemy
			var attackMove = this.getAttackMove();
			if (attackMove === undefined) {
				return this.getMoveForLattice();
			} else {
				return attackMove;
			}
		}
	}
}
