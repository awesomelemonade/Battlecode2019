export class Vector {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}
	add(vector) {
		return new Vector(this.x + vector.x, this.y + vector.y);
	}
	subtract(vector) {
		return new Vector(this.x - vector.x, this.y - vector.y);
	}
	getDistanceSquared(vector) {
		var tempX = this.x - vector.x;
		var tempY = this.y - vector.y;
		return tempX * tempX + tempY * tempY; 
	}
	isZero() {
		return this.x === 0 && this.y === 0;
	}
	equals(vector) {
		return this.x === vector.x && this.y === vector.y;
	}
	hash() {
		return this.x * 9999 + this.y;
	}
	toString() {
		return "[" + this.x + ", " + this.y + "]";
	}
	static ofRobotPosition(robot) {
		return new Vector(robot.x, robot.y);
	}
}

export var totalMoves = [];
export var totalMoveCosts = [];

function addMove(x, y, cost) {
	totalMoves.push(new Vector(x, y));
	totalMoveCosts.push(cost);
}
function addMoves(radius) {
	for (var x = 1; x <= radius; x++) {
		// Cardinal Directions = x * x
		var c = x * x;
		addMove(x, 0, c);
		addMove(0, x, c);
		addMove(-x, 0, c);
		addMove(0, -x, c);
		// Non cardinal directions or diagonals
		for (var y = 1; y < x; y++) {
			var cost = c + y * y;
			addMove(x, y, cost);
			addMove(y, x, cost);
			addMove(-x, y, cost);
			addMove(-y, x, cost);
			addMove(x, -y, cost);
			addMove(y, -x, cost);
			addMove(-x, -y, cost);
			addMove(-y, -x, cost);
		}
		// Diagonals = 2 * x * x
		c = 2 * c;
		addMove(x, x, c);
		addMove(-x, x, c);
		addMove(x, -x, c);
		addMove(-x, -x, c);
	}
}

function filter(oldMoves, oldCosts, cost) {
	var moves = []
	var moveCosts = []
	for (var i = 0; i < oldMoves.length; i++) {
		if (oldCosts[i] <= cost) {
			moves.push(oldMoves[i]);
			moveCosts.push(oldCosts[i]);
		}
	}
	return [moves, moveCosts];
}

addMoves(10);
var temp = filter(totalMoves, totalMoveCosts, 4);
totalMoves = temp[0];
totalMoveCosts = temp[1];
