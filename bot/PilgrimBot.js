import {SPECS} from 'battlecode'
import {Vector, totalMoves, totalMoveCosts} from './Library';
import {Dijkstras} from './Dijkstras'
import {getMove, hasResource, isNextToCastleOrChurch, outOfBounds} from './Util';

var controller = null;

export function pilgrimTurn(robot) {
	controller = robot;
	if (robot.me.fuel >= SPECS.UNITS[SPECS.PILGRIM].FUEL_CAPACITY || robot.me.karbonite >= SPECS.UNITS[SPECS.PILGRIM].KARBONITE_CAPACITY) {
		var start = Vector.ofRobotPosition(robot.me);
		var dijkstras = new Dijkstras(robot.map, start, totalMoves, totalMoveCosts);
		var stop = dijkstras.resolve(isNextToCastleOrChurch);
		var move = getMove(dijkstras, start, stop);
		if (move.isZero()) {
			const adjacent = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
			for (var i = 0; i < adjacent.length; i++) {
				var location = new Vector(start.x + adjacent[i][0], start.y + adjacent[i][1]);
				if (!outOfBounds(location)) {
					var tempId = robot.robot_map[location.x][location.y];
					if (tempId > 0) {
						var temp = robot.getRobot(tempId);
						if (temp.team === robot.me.team && (temp.unit === SPECS.CASTLE || temp.unit === SPECS.CHURCH)) {
							return this.give(adjacent[i][0], adjacent[i][1], robot.me.karbonite, robot.me.fuel);
						}
					}
				}
			}
			robot.log("Doing Nothing? " + start);
		} else {
			return robot.move(move.x, move.y);
		}
	} else {
		var start = Vector.ofRobotPosition(robot.me);
		var dijkstras = new Dijkstras(robot.map, start, totalMoves, totalMoveCosts);
		var stop = dijkstras.resolve(hasResource);
		var move = getMove(dijkstras, start, stop);
		if (move.isZero()) {
			if (hasResource(start)) {
				return robot.mine();
			} else {
				robot.log("Doing Nothing? " + start);
			}
		} else {
			return robot.move(move.x, move.y);
		}
	}
}
