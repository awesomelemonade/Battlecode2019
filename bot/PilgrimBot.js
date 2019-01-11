import {SPECS} from 'battlecode'
import {Vector, totalMoves, totalMoveCosts} from './Library';
import {Dijkstras} from './Dijkstras'

var controller = null;

export function pilgrimTurn(robot) {
	controller = robot;
	if (robot.me.fuel >= SPECS.UNITS[SPECS.PILGRIM].FUEL_CAPACITY || robot.me.karbonite >= SPECS.UNITS[SPECS.PILGRIM].KARBONITE_CAPACITY) {
		robot.log("Pilgrim is full :)");
		return robot.move(Math.floor(Math.random() * 3 - 1), Math.floor(Math.random() * 3 - 1));
	} else {
		var start = new Vector(robot.me.x, robot.me.y);
		var dijkstras = new Dijkstras(robot.map, start, totalMoves, totalMoveCosts);
		var stop = dijkstras.resolve(hasResource);
		var prev = stop;
		var current = stop;
		while (!current.equals(start)) {
			prev = current;
			current = dijkstras.prev[current.x][current.y];
		}
		var move = prev.subtract(start);
		if (move.isZero()) {
			if (hasResource(start)) {
				robot.log("Mining: " + robot.me.x + " - " + robot.me.y + " - " + robot.karbonite_map[robot.me.x][robot.me.y] + " - " + robot.fuel_map[robot.me.x][robot.me.y]);
				return robot.mine();
			} else {
				robot.log("Doing Nothing? " + start);
			}
		} else {
			robot.log("Moving: " + start + " - " + move);
			return robot.move(move.x, move.y);
		}
	}
}

function hasResource(location) {
	return controller.karbonite_map[location.x][location.y] || controller.fuel_map[location.x][location.y];
}
