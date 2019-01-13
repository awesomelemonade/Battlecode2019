
var controller = null;

var initialized = false;
function init() {
	// Retrieve signal from castle and set target
	var castleSignal = Util.getInitialCastleSignal();
	if (castleSignal === -1) {
		controller.log("Unable to find castle signal?");
	} else {
		target = Util.decodePosition(castleSignal);
		controller.log("Setting target: " + target);
	}
	initialized = true;
}

var target = null;

export function prophetTurn(c) {
	controller = c;
	controller.log("A Prophet Turn");
	if (!initialized) {
		init();
	}
	var currentPosition = Vector.ofRobotPosition(controller.me);
	var visibleEnemies = Util.getVisibleEnemies();
	if (visibleEnemies.length === 0) {
		// Don't see enemy
		var dijkstras = new Dijkstras(controller.map, currentPosition, totalMoves, totalMoveCosts);
		var stop = dijkstras.resolve((vector) => vector.isAdjacentTo(target));
		var move = Util.getMove(dijkstras, currentPosition, stop);
		if (!move.isZero()) {
			controller.move(move.x, move.y);
		}
	} else {
		// We see at least 1 enemy
		var closestEnemy = null;
		var closestEnemyPosition = null;
		var closestDistanceSquared = 9999999; // Arbitrary Large Number
		for (var i = 0; i < visibleEnemies.length; i++) {
			var enemy = visibleEnemies[i];
			var enemyPosition = Vector.ofRobotPosition(enemy);
			var distanceSquared = currentPosition.getDistanceSquared(enemyPosition);
			if (distanceSquared < closestDistanceSquared) {
				closestEnemy = enemy;
				closestEnemyPosition = enemyPosition;
				closestDistanceSquared = distanceSquared;
			}
		}
		if (closestDistanceSquared <= SPECS.UNITS[closestEnemy.unit].VISION_RADIUS) {
			// Enemy can see you
			// TODO: Alternatively, you can use BFS instead of Dijkstras
			var costs = [];
			for (var j = 0; j < totalMoves.length; j++) {
				costs.push(1);
			}
			var dijkstras = new Dijkstras(controller.map, currentPosition, totalMoves, costs);
			var stop = dijkstras.resolve((vector) => vector.isAdjacentTo(target));
			var move = Util.getMove(dijkstras, currentPosition, stop);
			if (move.isZero()) {
				var offset = closestEnemyPosition.subtract(currentPosition);
			} else {
				controller.move(move.x, move.y);
			}
		} else {
			// Enemy cannot see you
			var offset = closestEnemyPosition.subtract(currentPosition);
			return this.attack(offset.x, offset.y);
		}
	}
	
	/*
	if (seeEnemy) {
		if (enemyCanSeeYou) {
			// Full speed towards destination
			if (alreadyAtDestination) {
				attack()
			} else {
				// move full speed
			}
		} else {
			attack()
		}
	} else {
		// Dijkstra towards destination if not at destination
	}
	*/
	
	// if (notSettled) {
	// 		If see enemy that cannot see you (maybe exception of prophet?), attack
	// 		If see enemy too close, run towards destination at full speed (costs would be uniform like in BFS)
	// 		If not, follow fuel efficient route
	// } else {
	//		Attack if enemy is near
	//	}
}
