import {SPECS} from 'battlecode'
import {Vector, totalMoves, totalMoveCosts} from './Library';
import {Dijkstras} from './Dijkstras'
import * as Util from './Util';

export class PilgrimBot {
	constructor(controller) {
		this.controller = controller;
		this.init();
	}
	init() {
		// Retrieve signal from castle and set target
		var castleSignal = Util.getInitialCastleSignal();
		if (castleSignal === -1) {
			this.controller.log("Unable to find castle signal?");
		} else {
			this.target = Util.decodePosition(castleSignal >>> 1);
			this.controller.log("Setting target: " + this.target);
		}
	}
	turn() {
		if (this.controller.me.fuel >= SPECS.UNITS[SPECS.PILGRIM].FUEL_CAPACITY || this.controller.me.karbonite >= SPECS.UNITS[SPECS.PILGRIM].KARBONITE_CAPACITY) {
			var start = Vector.ofRobotPosition(this.controller.me);
			var dijkstras = new Dijkstras(this.controller.map, start, totalMoves, totalMoveCosts);
			var stop = dijkstras.resolve(Util.isNextToCastleOrChurch);
			if (stop === undefined) {
				var visibleEnemies = Util.getVisibleEnemies();
				// Try to "kite"
				// Loop through all moves
				var bestMove = null;
				for (var i = 0; i < totalMoves.length; i++) {
					var tempMove = totalMoves[i];
					var tempEndPosition = start.add(tempMove);
					var enemyCanSee = false;
					for (var j = 0; j < visibleEnemies.length; j++) {
						var enemy = visibleEnemies[j];
						if (enemy.unit === SPECS.CASTLE || enemy.unit === SPECS.CHURCH || enemy.unit === SPECS.PILGRIM) {
							continue;
						}
						var enemyPosition = Vector.ofRobotPosition(enemy);
						var distanceSquared = tempEndPosition.getDistanceSquared(enemyPosition);
						if (distanceSquared <= SPECS.UNITS[enemy.unit].VISION_RADIUS) {
							enemyCanSee = true;
							break;
						}
					}
					if (!enemyCanSee) {
						bestMove = tempMove;
						break;
					}
				}
				if (bestMove == null) {
					// Nowhere to kite
					this.controller.log("yay im ded");
					return;
				} else {
					// We can kite
					return this.controller.move(bestMove.x, bestMove.y);
				}
			}
			var move = Util.getMove(dijkstras, start, stop);
			if (move.isZero()) {
				const adjacent = Util.getAdjacent(start);
				for (var i = 0; i < adjacent.length; i++) {
					var location = adjacent[i];
					var tempId = this.controller.robot_map[location.x][location.y];
					if (tempId > 0) {
						var temp = this.controller.getRobot(tempId);
						if (temp.team === this.controller.me.team && (temp.unit === SPECS.CASTLE || temp.unit === SPECS.CHURCH)) {
							var offset = location.subtract(start);
							return this.controller.give(offset.x, offset.y, this.controller.me.karbonite, this.controller.me.fuel);
						}
					}
				}
				this.controller.log("Doing Nothing? " + start);
			} else {
				return this.controller.move(move.x, move.y);
			}
		} else {
			var visibleEnemies = Util.getVisibleEnemies();
			var start = Vector.ofRobotPosition(this.controller.me);
			var dijkstras = new Dijkstras(this.controller.map, start, totalMoves, totalMoveCosts);
			var stop = dijkstras.resolve(this.isOnTarget.bind(this));
			if (stop === undefined) {
				// Try to "kite"
				// Loop through all moves
				var bestMove = null;
				for (var i = 0; i < totalMoves.length; i++) {
					var tempMove = totalMoves[i];
					var tempEndPosition = start.add(tempMove);
					var enemyCanSee = false;
					for (var j = 0; j < visibleEnemies.length; j++) {
						var enemy = visibleEnemies[j];
						if (enemy.unit === SPECS.CASTLE || enemy.unit === SPECS.CHURCH || enemy.unit === SPECS.PILGRIM) {
							continue;
						}
						var enemyPosition = Vector.ofRobotPosition(enemy);
						var distanceSquared = tempEndPosition.getDistanceSquared(enemyPosition);
						if (distanceSquared <= SPECS.UNITS[enemy.unit].VISION_RADIUS) {
							enemyCanSee = true;
							break;
						}
					}
					if (!enemyCanSee) {
						bestMove = tempMove;
						break;
					}
				}
				if (bestMove == null) {
					// Nowhere to kite
					this.controller.log("yay im ded");
					return;
				} else {
					// We can kite
					return this.controller.move(bestMove.x, bestMove.y);
				}
			}
			var move = Util.getMove(dijkstras, start, stop);
			var endPosition = start.add(move);
			var enemyCanSeeEndPosition = false;
			for (var i = 0; i < visibleEnemies.length; i++) {
				var enemy = visibleEnemies[i];
				if (enemy.unit === SPECS.CASTLE || enemy.unit === SPECS.CHURCH || enemy.unit === SPECS.PILGRIM) {
					continue;
				}
				var enemyPosition = Vector.ofRobotPosition(enemy);
				var distanceSquared = endPosition.getDistanceSquared(enemyPosition);
				if (distanceSquared <= SPECS.UNITS[enemy.unit].VISION_RADIUS) {
					enemyCanSeeEndPosition = true;
					break;
				}
			}
			if (enemyCanSeeEndPosition) {
				// Try to "kite"
				// Loop through all moves
				var bestMove = null;
				for (var i = 0; i < totalMoves.length; i++) {
					var tempMove = totalMoves[i];
					var tempEndPosition = start.add(tempMove);
					var enemyCanSee = false;
					for (var j = 0; j < visibleEnemies.length; j++) {
						var enemy = visibleEnemies[j];
						if (enemy.unit === SPECS.CASTLE || enemy.unit === SPECS.CHURCH || enemy.unit === SPECS.PILGRIM) {
							continue;
						}
						var enemyPosition = Vector.ofRobotPosition(enemy);
						var distanceSquared = tempEndPosition.getDistanceSquared(enemyPosition);
						if (distanceSquared <= SPECS.UNITS[enemy.unit].VISION_RADIUS) {
							enemyCanSee = true;
							break;
						}
					}
					if (!enemyCanSee) {
						bestMove = tempMove;
						break;
					}
				}
				if (bestMove == null) {
					// Nowhere to kite
					this.controller.log("yay im ded");
					return;
				} else {
					// We can kite
					return this.controller.move(bestMove.x, bestMove.y);
				}
			} else {
				if (move.isZero()) {
					if (Util.hasResource(start)) {
						return this.controller.mine();
					} else {
						this.controller.log("Doing Nothing? " + start);
					}
				} else {
					return this.controller.move(move.x, move.y);
				}
			}
		}
	}
	isOnTarget(location) {
		return this.target.equals(location);
	}
}
