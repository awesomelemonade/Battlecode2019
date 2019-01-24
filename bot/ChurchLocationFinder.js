import * as Util from './Util'
import {Vector, totalMoves, totalMoveCosts} from './Library'

var UNEXPLORED = -1;

var controller;
var castlePositions;
var enemyCastlePredictions;
var map;
var validChurchLocation;
var numResources;
var resourceDistance;

// TODO: handle updating structurePositions

export function resolve(c, localCastlePositions, localEnemyCastlePredictions) {
	controller = c;
	castlePositions = localCastlePositions;
	enemyCastlePredictions = localEnemyCastlePredictions;
	map = controller.true_map;
	validChurchLocation = new Array(map.length).fill().map(() => Array(map[0].length).fill(false));
	numResources = new Array(map.length).fill().map(() => Array(map[0].length).fill(UNEXPLORED));
	resourceDistance = new Array(map.length).fill().map(() => Array(map[0].length).fill(UNEXPLORED));
	for (var i = 0; i < map.length; i++) {
		for (var j = 0; j < map[0].length; j++) {
			var location = new Vector(i, j);
			var info = getChurchLocationInfo(location);
			validChurchLocation[i][j] = info.valid;
			if (validChurchLocation[i][j]) {
				numResources[i][j] = info.numResources;
				resourceDistance[i][j] = info.resourceDistance;
			}
		}
	}
}

function findChurchLocation() {
	// Use true_map for resource finding
	// Do big bfs
	var bigBfs = new Bfs(controller.true_map, castlePositions, totalMoves);
	var bigStop = bigBfs.resolve(function(location) {
		return validChurchLocation[location.x][location.y];
	});
	if (bigStop === undefined) {
		return undefined;
	}
	var traced = Util.trace(bigBfs, bigStop);
	if (!traced.equals(Vector.ofRobotPosition(controller.me))) {
		controller.log("Deferring creation of church pilgrim to castle at " + traced);
		return null; // lol there has to be a better way
	}
	var bestChurchLocation = undefined;
	var bestNumResources = 0;
	var bestResourceDistance = 0;
	var smallBfs = new Bfs(controller.true_map, bigStop, totalMoves);
	smallBfs.resolve(function(location) { // Stop Condition
		// Count the number of resources within responsible distance
		var currentNumResources = numResources[location.x][location.y];
		var currentResourceDistance = resourceDistance[location.x][location.y];
		// Compare with bestChurchLocation
		if (currentNumResources > bestNumResources) {
			bestChurchLocation = location;
			bestNumResources = currentNumResources;
			bestResourceDistance = currentResourceDistance;
		} else if (currentNumResources === bestNumResources && currentResourceDistance < bestResourceDistance) {
			bestChurchLocation = location;
			bestNumResources = currentNumResources;
			bestResourceDistance = currentResourceDistance;
		}
		return false; // Never stop until exhausted all unignored tiles
	}, function(location) { // Ignore Condition
		return !validChurchLocation[location.x][location.y];
	});
	return bestChurchLocation;
}

function getChurchLocationInfo(location) {
	// Ensure not on top of resource
	if (Util.hasResource(location)) {
		return {valid: false};
	}
	// Ensure not too close to other structures
	for (var i = 0; i < structurePositions.length; i++) {
		var position = structurePositions[i];
		if (location.getDistanceSquared(position) <= responsibleDistanceDoubled) {
			return {valid: false};
		}
	}
	// Ensure not near enemy castle predictions
	for (var i = 0; i < enemyCastlePredictions.length; i++) {
		var position = enemyCastlePredictions[i];
		if (location.getDistanceSquared(position) <= responsibleDistanceDoubled) {
			return {valid: false};
		}
	}
	// Check if there resources around the responsibleDistance
	var start = Util.getAdjacentPassable(position);
	var bfs = new Bfs(controller.true_map, start, totalMoves, totalMoveCosts);
	var numResources = 0;
	var resourceDistance = 0;
	bfs.resolve(function(location) { // Stop condition
		// Stop condition is guaranteed to be evaluated only once per square
		if (Util.hasResource(location)) {
			numResources++;
			resourceDistance += position.getDistanceSquared(location);
		}
		return false; // Never trigger the stop condition
	}, function(location) { // Ignore condition
		return position.getDistanceSquared(location) > responsibleDistance;
	});
	return {valid: true, numResources: numResources, resourceDistance: resourceDistance};
}