
import {Vector, totalMoves, totalMoveCosts} from './Library';
import {Dijkstras} from './Dijkstras'

var controller = null;

export function pilgrimTurn(robot) {
	robot.log("A Pilgrim Turn");
	controller = robot;
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
	if (!move.isZero()) {
		robot.log(start + " - " + move);
		return robot.move(move.x, move.y);
	}
}

function hasResource(location) {
	return controller.karbonite_map[location.x][location.y] || controller.fuel_map[location.x][location.y];
}
