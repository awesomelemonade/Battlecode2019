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
		var castleSignal = Util.getInitialCastleOrChurchSignal();
		if (castleSignal === -1) {
			this.controller.log("Unable to find castle signal? " + Vector.ofRobotPosition(this.controller.me));
		} else {
			this.searchingForTarget = false;
			this.isBuildingChurch = (castleSignal & 1) === 1;
			this.target = Util.decodePosition(castleSignal >>> 1);
			this.controller.log("Setting target: " + this.target);
		}
	}
	getMoveForReturn() {
		var start = Vector.ofRobotPosition(this.controller.me);
		var dijkstras = new Dijkstras(this.controller.map, start, totalMoves, totalMoveCosts);
		var stop = dijkstras.resolve(Util.isNextToCastleOrChurch);
		if (start.equals(stop)) { // Move is zero - we reached our target!
			// Try giving
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
			return undefined;
		} else {
			var move = Util.getMove(dijkstras, start, stop);
			return this.controller.move(move.x, move.y);
		}
	}
	getMoveForHarvest() {
		var prophetPosition = Vector.ofRobotPosition(this.controller.me);
		var dijkstras = new Dijkstras(this.controller.map, prophetPosition, totalMoves, totalMoveCosts);
		var stop = dijkstras.resolve((location) => location.equals(this.target));
		if (stop === undefined) {
			// Cannot reach
			return undefined;
		} else {
			if (prophetPosition.equals(stop)) { // Move is zero - we reached our target!
				return this.controller.mine();
			} else {
				var move = Util.getMove(dijkstras, prophetPosition, stop);
				return this.controller.move(move.x, move.y);
			}
		}
	}
	getMoveForBuildChurch() {
		var self = this;
		var start = Vector.ofRobotPosition(this.controller.me);
		var dijkstras = new Dijkstras(this.controller.map, start, totalMoves, totalMoveCosts);
		var stop = dijkstras.resolve(function(location) {
			return location.isAdjacentTo(self.target);
		});
		if (start.equals(stop)) { // Move is zero - we reached our target!
			// Check if this.target is actually empty and church is affordable
			if (this.controller.robot_map[this.target.x][this.target.y] === 0 && Util.isAffordable(SPECS.CHURCH)) {
				// Set isBuildingChurch to false
				this.isBuildingChurch = false;
				// Queue a get harvest target from church
				this.searchingForTarget = true;
				// Build the church
				var offset = this.target.subtract(start);
				return this.controller.buildUnit(SPECS.CHURCH, offset.x, offset.y);
			} else {
				// Target is occupied!
				return undefined;
			}
		} else {
			var move = Util.getMove(dijkstras, start, stop);
			return this.controller.move(move.x, move.y);
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
	turn() {
		if (this.searchingForTarget) {
			// Retrieve signal from castle and set target
			var castleSignal = Util.getInitialChurchSignal();
			if (castleSignal === -1) {
				this.controller.log("Unable to find church signal?");
			} else {
				this.target = Util.decodePosition(castleSignal);
				this.controller.log("Setting target: " + this.target);
			}
			this.searchingForTarget = false;
		}
		var visibleEnemies = Util.getVisibleEnemies();
		if (visibleEnemies.length === 0) {
			// We don't see enemy
			if (this.isBuildingChurch) {
				return this.getMoveForBuildChurch();
			} else {
				if (this.controller.me.fuel >= SPECS.UNITS[SPECS.PILGRIM].FUEL_CAPACITY ||
						this.controller.me.karbonite >= SPECS.UNITS[SPECS.PILGRIM].KARBONITE_CAPACITY) {
					// Ready for giving to church or castle
					return this.getMoveForReturn();
				} else {
					return this.getMoveForHarvest();
				}
			}
		} else {
			// There's an enemy
			var action = undefined;
			if (this.isBuildingChurch) {
				action = this.getMoveForBuildChurch();
			} else {
				if (this.controller.me.fuel >= SPECS.UNITS[SPECS.PILGRIM].FUEL_CAPACITY ||
						this.controller.me.karbonite >= SPECS.UNITS[SPECS.PILGRIM].KARBONITE_CAPACITY) {
					// Ready for giving to church or castle
					action = this.getMoveForReturn();
				} else {
					action = this.getMoveForHarvest();
				}
			}
			var start = Vector.ofRobotPosition(this.controller.me);
			var destination = null;
			if (action === undefined || (!Util.isMoveAction(action))) {
				destination = start;
			} else {
				destination = start.add(Util.getMoveVector(action));
			}
			if (this.enemyCanSee(destination)) {
				return this.getKiteMove();
			} else {
				return action;
			}
		}
	}
}
