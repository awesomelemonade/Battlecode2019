import {SPECS} from 'battlecode'
import {Vector, totalMoves, totalMoveCosts} from './Library';
import {Dijkstras} from './Dijkstras'
import * as Util from './Util';

export class PilgrimBot {
	constructor(controller) {
		this.controller = controller;
		this.init();
	}
	function init() {
		// Retrieve signal from castle and set target
		var castleSignal = Util.getInitialCastleSignal();
		if (castleSignal === -1) {
			this.controller.log("Unable to find castle signal?");
		} else {
			this.target = Util.decodePosition(castleSignal);
			this.controller.log("Setting target: " + target);
		}
	}
	function turn() {
		if (robot.me.fuel >= SPECS.UNITS[SPECS.PILGRIM].FUEL_CAPACITY || robot.me.karbonite >= SPECS.UNITS[SPECS.PILGRIM].KARBONITE_CAPACITY) {
			var start = Vector.ofRobotPosition(robot.me);
			var dijkstras = new Dijkstras(robot.map, start, totalMoves, totalMoveCosts);
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
					robot.log("yay im ded");
					return;
				} else {
					// We can kite
					return robot.move(bestMove.x, bestMove.y);
				}
			}
			var move = Util.getMove(dijkstras, start, stop);
			if (move.isZero()) {
				const adjacent = Util.getAdjacent(start);
				for (var i = 0; i < adjacent.length; i++) {
					var location = adjacent[i];
					var tempId = robot.robot_map[location.x][location.y];
					if (tempId > 0) {
						var temp = robot.getRobot(tempId);
						if (temp.team === robot.me.team && (temp.unit === SPECS.CASTLE || temp.unit === SPECS.CHURCH)) {
							var offset = location.subtract(start);
							return this.give(offset.x, offset.y, robot.me.karbonite, robot.me.fuel);
						}
					}
				}
				robot.log("Doing Nothing? " + start);
			} else {
				return robot.move(move.x, move.y);
			}
		} else {
			var visibleEnemies = Util.getVisibleEnemies();
			var start = Vector.ofRobotPosition(robot.me);
			var dijkstras = new Dijkstras(robot.map, start, totalMoves, totalMoveCosts);
			var stop = dijkstras.resolve(isOnTarget.bind(this));
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
					robot.log("yay im ded");
					return;
				} else {
					// We can kite
					return robot.move(bestMove.x, bestMove.y);
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
					robot.log("yay im ded");
					return;
				} else {
					// We can kite
					return robot.move(bestMove.x, bestMove.y);
				}
			} else {
				if (move.isZero()) {
					if (Util.hasResource(start)) {
						return robot.mine();
					} else {
						robot.log("Doing Nothing? " + start);
					}
				} else {
					return robot.move(move.x, move.y);
				}
			}
		}
	}
	function isOnTarget(location) {
		return this.target.equals(location);
	}
}
