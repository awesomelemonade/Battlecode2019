import {Bfs} from './Bfs'
import * as Util from './Util'
import {Vector, totalMoves, totalMoveCosts} from './Library'

var UNEXPLORED = -1;

const responsibleDistanceRadius = 2;
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
var potential;

var initialized = false;
var adjacentMoves = [new Vector(0, 1), new Vector(1, 0), new Vector(0, -1), new Vector(-1, 0), new Vector(-1, 1), new Vector(1, -1), new Vector(-1, -1), new Vector(1, 1)]

export function resolve(c, localCastlePositions, localEnemyCastlePredictions, localStructurePositions) {
	controller = c;
	castlePositions = localCastlePositions;
	enemyCastlePredictions = localEnemyCastlePredictions;
	structurePositions = localStructurePositions;
	map = controller.true_map;
	resolved = new Array(map.length).fill().map(() => Array(map[0].length).fill(false));
	potential = new Array(map.length).fill().map(() => Array(map[0].length).fill(false));
	validChurchLocation = new Array(map.length).fill().map(() => Array(map[0].length).fill(false));
	numResources = new Array(map.length).fill().map(() => Array(map[0].length).fill(UNEXPLORED));
	resourceDistance = new Array(map.length).fill().map(() => Array(map[0].length).fill(UNEXPLORED));
	initialized = true;
	var resources = []
	for (var i = 0; i < map.length; i++) {
		for (var j = 0; j < map[0].length; j++) {
			var location = new Vector(i, j);
			if (Util.hasResource(location)) {
				resources.push(location);
			}
		}
	}
	var count = 0;
	var bfs = new Bfs(controller.true_map, resources, adjacentMoves);
	bfs.resolve(function(vector, cost) {
		potential[vector.x][vector.y] = true;
		count++;
		return cost > responsibleDistanceRadius;
	});
	controller.log("ChurchLocationFinder resolve(): resources.length=" + resources.length + ", count=" + count);
}

function resolveLocation(location) {
	if (resolved[location.x][location.y]) {
		return;
	}
	if (!potential[location.x][location.y]) {
		resolved[location.x][location.y] = true;
		validChurchLocation[location.x][location.y] = false;
		return;
	}
	getChurchLocationInfo(location);
	resolved[location.x][location.y] = true;
}

export function updateStructurePosition(structurePosition) {
	if (!initialized) {
		return;
	}
	for (var i = -responsibleDistanceRadius * 2; i <= responsibleDistanceRadius * 2; i++) {
		for (var j = -responsibleDistanceRadius * 2; j <= responsibleDistanceRadius * 2; j++) {
			if (i * i + j * j > responsibleDistanceDoubled) {
				continue;
			}
			var location = structurePosition.add(new Vector(i, j));
			if (!Util.outOfBounds(location)) {
				resolved[location.x][location.y] = true;
				validChurchLocation[location.x][location.y] = false;
			}
		}
	}
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
		validChurchLocation[location.x][location.y] = false;
		return;
	}
	// Ensure not too close to other structures
	for (var i = 0; i < structurePositions.length; i++) {
		var position = structurePositions[i];
		if (location.getDistanceSquared(position) <= responsibleDistanceDoubled) {
			validChurchLocation[location.x][location.y] = false;
			return;
		}
	}
	// Ensure not near enemy castle predictions
	for (var i = 0; i < enemyCastlePredictions.length; i++) {
		var position = enemyCastlePredictions[i];
		if (location.getDistanceSquared(position) <= responsibleDistanceDoubled) {
			validChurchLocation[location.x][location.y] = false;
			return;
		}
	}
	// Check if there resources around the responsibleDistance
	var start = Util.getAdjacentPassableTrueMap(location);
	var bfs = new Bfs(controller.true_map, start, totalMoves);
	var currentNumResources = 0;
	var currentResourceDistance = 0;
	bfs.resolve(function(position) { // Stop condition
		// Stop condition is guaranteed to be evaluated only once per square
		if (Util.hasResource(position)) {
			currentNumResources++;
			currentResourceDistance += location.getDistanceSquared(position);
		}
		return false; // Never trigger the stop condition
	}, function(position) { // Ignore condition
		return location.getDistanceSquared(position) > responsibleDistance;
	});
	if (currentNumResources === 0) {
		validChurchLocation[location.x][location.y] = false;
		return;
	}
	validChurchLocation[location.x][location.y] = true;
	numResources[location.x][location.y] = currentNumResources;
	resourceDistance[location.x][location.y] = currentResourceDistance;
}
