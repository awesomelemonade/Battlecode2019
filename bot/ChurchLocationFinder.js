import {Bfs} from './Bfs'
import * as Util from './Util'
import {Vector, totalMoves, totalMoveCosts} from './Library'

var UNEXPLORED = -1;

const responsibleDistance = 5; // Must be less than church's vision radius to detect dead pilgrims & defenders
const responsibleDistanceDoubled = Math.pow(2 * Math.sqrt(responsibleDistance), 2);

var controller;
var castlePositions;
var enemyCastlePredictions;
var structurePositions;
var map;
var validChurchLocation;
var numResources;
var resourceDistance;
var resolved;

// TODO: handle updating structurePositions

export function resolve(c, localCastlePositions, localEnemyCastlePredictions, localStructurePositions) {
	controller = c;
	castlePositions = localCastlePositions;
	enemyCastlePredictions = localEnemyCastlePredictions;
	structurePositions = localStructurePositions;
	map = controller.true_map;
	resolved = new Array(map.length).fill().map(() => Array(map[0].length).fill(false));
	validChurchLocation = new Array(map.length).fill().map(() => Array(map[0].length).fill(false));
	numResources = new Array(map.length).fill().map(() => Array(map[0].length).fill(UNEXPLORED));
	resourceDistance = new Array(map.length).fill().map(() => Array(map[0].length).fill(UNEXPLORED));
}

function resolveLocation(location) {
	if (resolved[location.x][location.y]) {
		return;
	}
	var info = getChurchLocationInfo(location);
	validChurchLocation[location.x][location.y] = info.valid;
	if (validChurchLocation[location.x][location.y]) {
		numResources[location.x][location.y] = info.numResources;
		resourceDistance[location.x][location.y] = info.resourceDistance;
	}
	resolved[location.x][location.y] = true;
}

export function findChurchLocation() {
	// Use true_map for resource finding
	// Do big bfs
	var bigBfs = new Bfs(controller.true_map, castlePositions, totalMoves);
	var bigStop = bigBfs.resolve(function(location) {
		resolveLocation(location);
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
		resolveLocation(location);
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
		resolveLocation(location);
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
	var start = Util.getAdjacentPassableTrueMap(location);
	var bfs = new Bfs(controller.true_map, start, totalMoves, totalMoveCosts);
	var numResources = 0;
	var resourceDistance = 0;
	bfs.resolve(function(position) { // Stop condition
		// Stop condition is guaranteed to be evaluated only once per square
		if (Util.hasResource(position)) {
			numResources++;
			resourceDistance += location.getDistanceSquared(position);
		}
		return false; // Never trigger the stop condition
	}, function(position) { // Ignore condition
		return location.getDistanceSquared(position) > responsibleDistance;
	});
	if (numResources === 0) {
		return {valid: false};
	}
	return {valid: true, numResources: numResources, resourceDistance: resourceDistance};
}
