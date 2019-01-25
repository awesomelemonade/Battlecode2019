import {SPECS} from 'battlecode'
import {Vector, totalMoves, totalMoveCosts, constantMoveCosts} from './Library';
import {Dijkstras} from './Dijkstras'
import {Bfs} from './Bfs'
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
			this.controller.log("Pilgrim" + Vector.ofRobotPosition(this.controller.me) + " -> " + this.target);
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
		var bfs = new Bfs(this.controller.map, start, totalMoves);
		var stop = bfs.resolve(function(location) {
			return location.isAdjacentTo(self.target);
		});
		if (start.equals(stop)) { // Move is zero - we reached our target!
			// Check if Church is affordable
			if (!Util.isAffordable(SPECS.CHURCH)) {
				return undefined;
			}
			// Check if this.target is actually empty and church is affordable
			if (this.controller.robot_map[this.target.x][this.target.y] === 0) {
				// Build the church
				var offset = this.target.subtract(start);
				var action = this.controller.buildUnit(SPECS.CHURCH, offset.x, offset.y);
				var self = this;
				return function () {
					self.controller.log("Building church at: " + self.target);
					// Set isBuildingChurch to false
					self.isBuildingChurch = false;
					// Queue a get harvest target from church
					self.searchingForTarget = true;
					return action;
				};
			} else {
				// Target is occupied!
				return undefined;
			}
		} else {
			var move = Util.getMove(bfs, start, stop);
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
			if (this.controller.true_map[endPosition.x][endPosition.y] === true &&
					this.controller.robot_map[endPosition.x][endPosition.y] === 0 && 
					(!this.enemyCanSee(visibleEnemies, endPosition))) {
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
		var action = undefined;
		if (this.searchingForTarget) {
			// Retrieve signal from castle and set target
			var castleSignal = Util.getInitialChurchSignal();
			if (castleSignal === -1) {
				this.controller.log("Unable to find church signal? " + Vector.ofRobotPosition(this.controller.me));
			} else {
				this.target = Util.decodePosition(castleSignal);
				this.controller.log("Setting target: " + this.target);
			}
			this.searchingForTarget = false;
		}
		// Assume We don't see enemy
		if (this.isBuildingChurch) {
			action = this.getMoveForBuildChurch(); // lol ugly code
		} else {
			if (this.controller.me.fuel >= SPECS.UNITS[SPECS.PILGRIM].FUEL_CAPACITY ||
					this.controller.me.karbonite >= SPECS.UNITS[SPECS.PILGRIM].KARBONITE_CAPACITY) {
				// Ready for giving to church or castle
				action = this.getMoveForReturn();
			} else {
				action = this.getMoveForHarvest();
			}
		}
		var visibleEnemies = Util.getVisibleEnemies();
		if (visibleEnemies.length >= 0) {
			// There's an enemy
			var start = Vector.ofRobotPosition(this.controller.me);
			var destination = null;
			if (action === undefined || (!Util.isMoveAction(action))) {
				destination = start;
			} else {
				destination = start.add(Util.getMoveVector(action));
			}
			if (this.enemyCanSee(visibleEnemies, destination)) {
				// We should kite
				action = this.getKiteMove();
			}
		}
		if (action instanceof Function) {
			return action();
		} else {
			return action;
		}
	}
}
