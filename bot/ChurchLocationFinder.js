import * as Util from './Util'
import {Vector, totalMoves, totalMoveCosts} from './Library'

var UNEXPLORED = -1;

export function resolve(controller, castlePositions) {
	var map = controller.true_map;
	var dist = new Array(map.length).fill().map(() => Array(map[0].length).fill(UNEXPLORED));
	
}

function findChurchLocation() {
	// Use true_map for resource finding
	var self = this;
	// Do big bfs
	var bigBfs = new Bfs(this.controller.true_map, this.castlePositions, totalMoves);
	var bigStop = bigBfs.resolve(function(location) {
		return self.isValidChurchLocation(location);
	});
	if (bigStop === undefined) {
		return undefined;
	}
	var traced = Util.trace(bigBfs, bigStop);
	if (!traced.equals(Vector.ofRobotPosition(this.controller.me))) {
		this.controller.log("Deferring creation of church pilgrim to castle at " + traced);
		return null; // lol there has to be a better way
	}
	var bestChurchLocation = undefined;
	var bestNumResources = 0;
	var bestResourceDistance = 0;
	var smallBfs = new Bfs(this.controller.true_map, bigStop, totalMoves);
	smallBfs.resolve(function(location) { // Stop Condition
		// Count the number of resources within responsible distance
		var numResources = 0;
		var resourceDistance = 0;
		for (var i = -responsibleDistanceRadius; i <= responsibleDistanceRadius; i++) {
			for (var j = -responsibleDistanceRadius; j <= responsibleDistanceRadius; j++) {
				if (i * i + j * j > responsibleDistance) {
					continue;
				}
				var v = new Vector(location.x + i, location.y + j);
				if (!Util.outOfBounds(v)) {
					if (Util.hasResource(v)) {
						numResources++;
						resourceDistance += i * i + j * j;
					}
				}
			}
		}
		// Compare with bestChurchLocation
		if (numResources > bestNumResources) {
			bestChurchLocation = location;
			bestNumResources = numResources;
			bestResourceDistance = resourceDistance;
		} else if (numResources === bestNumResources && resourceDistance < bestResourceDistance) {
			bestChurchLocation = location;
			bestNumResources = numResources;
			bestResourceDistance = resourceDistance;
		}
		return false; // Never stop until exhausted all unignored tiles
	}, function(location) { // Ignore Condition
		return !self.isValidChurchLocation(location);
	});
	return bestChurchLocation;
}

function isValidChurchLocation(location) {
	// Ensure not on top of resource
	if (Util.hasResource(location)) {
		return false;
	}
	// Ensure not too close to other structures
	for (var i = 0; i < this.structurePositions.length; i++) {
		var position = this.structurePositions[i];
		if (location.getDistanceSquared(position) <= responsibleDistanceDoubled) {
			return false;
		}
	}
	// Ensure not near enemy castle predictions
	for (var i = 0; i < this.enemyCastlePredictions.length; i++) {
		var position = this.enemyCastlePredictions[i];
		if (location.getDistanceSquared(position) <= responsibleDistanceDoubled) {
			return false;
		}
	}
	// Check if there resources around the responsibleDistance
	return hasResourceOrder(location);
}


function hasResourceOrder(position) {
	var start = Util.getAdjacentPassable(position);
	var bfs = new Bfs(this.controller.true_map, start, totalMoves);
	return bfs.resolve(function(location) { // Stop condition
		// Stop condition is guaranteed to be evaluated only once per square
		return Util.hasResource(location);
	}, function(location) { // Ignore condition
		return position.getDistanceSquared(location) > responsibleDistance;
	}) !== undefined;
}
