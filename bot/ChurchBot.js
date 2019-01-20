import {SPECS} from 'battlecode'
import * as Util from './Util';
import {Vector, totalMoves, totalMoveCosts} from './Library';
import {Dijkstras} from './Dijkstras'

// Castles & Churches must not have overlapping responsible tiles
const responsibleDistance = 5; // Must be less than church's vision radius to detect dead pilgrims & defenders

// Use r.turn to differentiate castle vs other units?
// castle_talk among castles for the first few turns - 8 bits
const CASTLE_IDENTIFIER_BITSHIFT = 0; // Differentiate Castle and other units
const CHURCH_IDENTIFIER_BITSHIFT = 1; // Differentiate Church and other units
const CASTLE_LOCATION_BITSHIFT = 2;
const CASTLE_LOCATION_BITMASK = 0b111111; // 6 bits (2^6 = 64) per x or y
// castle_talk among castles after the first few turns

const CASTLE_PROGRESS_BITSHIFT = 2;
const CASTLE_PROGRESS_BITS = 6;
const CASTLE_PROGRESS_BITMASK = Math.pow(2, CASTLE_PROGRESS_BITS) - 1;
const CASTLE_PROGRESS_SCALE = Math.pow(2, CASTLE_PROGRESS_BITS);

const CASTLE_BUILDCHURCH_BITSHIFT = 1;

export class ChurchBot {
	constructor(controller) {
		this.controller = controller;
		// Init
		this.init();
	}
	init() {
		// Church variables
		this.resourceOrder = [];
		this.progress = 0;
		this.progresses = {};
		this.retrieveId = false; // Used to keep track of pilgrim/defender ids
		// This following system limits 1 pilgrim and 1 defender per resource
		this.pilgrims = []; // Stores id or -1, indices correspond with resourceOrder
		this.defenders = []; // Stores id or -1, indices correspond with resourceOrder
		this.pilgrimsAlive = 0;
		this.defendersAlive = 0;
		// Calculate resourceOrder - resourceOrder should not change after construction
		var churchPosition = Vector.ofRobotPosition(this.controller.me);
		this.resourceOrder = this.getResourceOrder(churchPosition);
		for (var i = 0; i < this.resourceOrder.length; i++) {
			this.pilgrims.push(-1);
			this.defenders.push(-1);
		}
		// Find and communicate to the pilgrim that built this church its target resource
		var robots = this.controller.getVisibleRobots();
		for (var i = 0; i < robots.length; i++) {
			var robot = robots[i];
			if (robot.team === this.controller.me.team && robot.unit === SPECS.PILGRIM) {
				var distX = robot.x - this.controller.me.x;
				var distY = robot.y - this.controller.me.y;
				var distSquared = distX * distX + distY * distY;
				if (distSquared <= 2) {
					var pilgrimPosition = Vector.ofRobotPosition(robot);
					// Find nearest resource to pilgrim
					var index = this.findNearestResourceIndex(pilgrimPosition);
					var resourcePosition = this.resourceOrder[index];
					// Signal to pilgrim the target
					this.controller.signal(Util.encodePosition(resourcePosition), distSquared);
					// Temporary set pilgrims array to arbitrary id
					this.pilgrims[index] = 1234;
					// Set retrieval of id for next turn
					// Problem: The built robot gets to move before castle can retrieve id
					/*this.retrieveId = true;
					this.retrieveArray = this.pilgrims;
					this.retrieveIndex = index;
					this.retrieveOffset = offset;*/
					this.pilgrimsAlive++;
					break;
				}
			}
		}
	}
	findNearestResourceIndex(pilgrimPosition) {
		var bestIndex = -1;
		var bestDistance = 99999;
		for (var i = 0; i < this.pilgrims.length; i++) {
			if (this.pilgrims[i] === -1) {
				var resourcePosition = this.resourceOrder[i];
				var distance = pilgrimPosition.getDistanceSquared(resourcePosition);
				if (bestIndex === -1 || distance < bestDistance) {
					bestIndex = i;
					bestDistance = distance;
				}
			}
		}
		return bestIndex;
	}
	getResourceOrder(position) {
		var start = Util.getAdjacentPassable(position);
		var dijkstras = new Dijkstras(this.controller.true_map, start, totalMoves, totalMoveCosts);
		var karboniteOrder = [];
		var fuelOrder = [];
		var resourceOrder = [];
		dijkstras.resolve(function(location) { // Stop condition
			// Stop condition is guaranteed to be evaluated only once per square
			if (Util.hasKarbonite(location)) {
				karboniteOrder.push(location);
			}
			if (Util.hasFuel(location)) {
				fuelOrder.push(location);
			}
			return false; // Never trigger the stop condition
		}, function(location) { // Ignore condition
			return position.getDistanceSquared(location) > responsibleDistance;
		});
		// Interleave karbonite and fuel order
		for (var i = 0; i < Math.min(karboniteOrder.length, fuelOrder.length); i++) {
			resourceOrder.push(karboniteOrder[i]);
			resourceOrder.push(fuelOrder[i]);
		}
		// Push remaining resources into resourceOrder
		for (var i = Math.min(karboniteOrder.length, fuelOrder.length); i < Math.max(karboniteOrder.length, fuelOrder.length); i++) {
			var temp = karboniteOrder.length > fuelOrder.length ? karboniteOrder : fuelOrder;
			resourceOrder.push(temp[i]);
		}
		return resourceOrder;
	}
	spawnPilgrimForHarvesting() {
		// Check costs of pilgrim
		if (!Util.isAffordable(SPECS.PILGRIM)) {
			return false;
		}
		// Find the first index where its value is -1 in this.pilgrims
		var index = Util.findIndex(this.pilgrims, -1);
		if (index === -1) { // Exhausted all resources this church is assigned to
			return false;
		}
		var resourcePosition = this.resourceOrder[index];
		if (this.controller.map[resourcePosition.x][resourcePosition.y] === false) {
			// resourcePosition is not passable/occupiable
			return false;
		}
		// Calculate which adjacent tile to build the pilgrim using Dijkstras
		var castlePosition = Vector.ofRobotPosition(this.controller.me);
		var start = Util.getAdjacentPassable(castlePosition);
		var dijkstras = new Dijkstras(this.controller.map, start, totalMoves, totalMoveCosts);
		var stop = dijkstras.resolve(function(location) {
			return location.equals(resourcePosition);
		});
		if (stop === undefined) {
			// Dijkstras did not find resourcePosition
			return false;
		}
		var traced = Util.trace(dijkstras, resourcePosition);
		var offset = traced.subtract(castlePosition);
		// Build the unit
		this.action = this.controller.buildUnit(SPECS.PILGRIM, offset.x, offset.y);
		// Signal to pilgrim the target
		this.controller.signal((Util.encodePosition(resourcePosition) << 1), offset.x * offset.x + offset.y * offset.y);
		// Temporary set pilgrims array to arbitrary id
		this.pilgrims[index] = 1234;
		// Set retrieval of id for next turn
		// Problem: The built robot gets to move before castle can retrieve id
		/*this.retrieveId = true;
		this.retrieveArray = this.pilgrims;
		this.retrieveIndex = index;
		this.retrieveOffset = offset;*/
		this.pilgrimsAlive++;
		return true;
	}
	spawnDefender() {
		// Check costs of prophet
		if (!Util.isAffordable(SPECS.PROPHET)) {
			return false;
		}
		// Find the first index where its value is -1 in this.pilgrims
		var index = Util.findIndex(this.defenders, -1);
		if (index === -1) { // Exhausted all resources this church is assigned to
			return false;
		}
		var resourcePosition = this.resourceOrder[index];
		// Calculate which adjacent tile to build the prophet using Dijkstras
		var castlePosition = Vector.ofRobotPosition(this.controller.me);
		var start = Util.getAdjacentPassable(castlePosition);
		var dijkstras = new Dijkstras(this.controller.map, start, totalMoves, totalMoveCosts);
		var stop = dijkstras.resolve((vector) => (vector.getDistanceSquared(resourcePosition) < 9 && (!Util.hasResource(vector)) && (!Util.isNextToCastleOrChurch(vector))));
		if (stop === undefined) {
			// Dijkstras did not find a valid prophet location
			return false;
		}
		var traced = Util.trace(dijkstras, stop);
		var offset = traced.subtract(castlePosition);
		// Build the unit
		this.action = this.controller.buildUnit(SPECS.PROPHET, offset.x, offset.y);
		// Signal to prophet
		this.controller.signal(Util.encodePosition(resourcePosition), offset.x * offset.x + offset.y * offset.y);
		this.defendersAlive++;
		return true;
	}
	randomPassableVector() {
		var x = Math.floor(Math.random() * this.controller.map.length);
		var y = Math.floor(Math.random() * this.controller.map[0].length);
		while (this.controller.map[x][y] === false) {
			x = Math.floor(Math.random() * this.controller.map.length);
			y = Math.floor(Math.random() * this.controller.map[0].length);
		}
		return new Vector(x, y);
	}
	spawnLatticeProphet() {
		// Check costs of prophet
		if (!Util.isAffordable(SPECS.PROPHET)) {
			return false;
		}
		var randomEnemyCastlePosition = this.randomPassableVector();
		// Calculate which adjacent tile to build the prophet using Dijkstras
		var castlePosition = Vector.ofRobotPosition(this.controller.me);
		var start = Util.getAdjacentPassable(castlePosition);
		var dijkstras = new Dijkstras(this.controller.map, start, totalMoves, totalMoveCosts);
		var stop = dijkstras.resolve(function(location) { // Stop Condition
			return (location.x + location.y) % 2 === 0 && (!Util.isNextToCastleOrChurch(location)) && (!Util.hasResource(location));
		}, function(location) { // Ignore Condition
			return location.getDistanceSquared(castlePosition) > 81; // 81 = prophet range + 1 tile out (adjacent spawning)
		});
		this.defendersAlive++; // TODO: temporary
		if (stop === undefined) {
			// Dijkstras did not find a valid prophet location
			// Send towards randomEnemyCastlePosition
			var dijkstras2 = new Dijkstras(this.controller.map, start, totalMoves, totalMoveCosts);
			var stop2 = dijkstras2.resolve((vector) => vector.equals(randomEnemyCastlePosition));
			var traced = Util.trace(dijkstras2, stop2);
			var offset = traced.subtract(castlePosition);
			// Build the unit
			this.action = this.controller.buildUnit(SPECS.PROPHET, offset.x, offset.y);
			// Signal to prophet
			this.controller.signal(Util.encodePosition(randomEnemyCastlePosition), offset.x * offset.x + offset.y * offset.y);
			return true;
		} else {
			var traced = Util.trace(dijkstras, stop);
			var offset = traced.subtract(castlePosition);
			// Build the unit
			this.action = this.controller.buildUnit(SPECS.PROPHET, offset.x, offset.y);
			// Signal to prophet
			this.controller.signal(Util.encodePosition(randomEnemyCastlePosition), offset.x * offset.x + offset.y * offset.y);
			return true;
		}
	}
	removeDeadRobots(robots) {
		for (var i = 0; i < this.robots.length; i++) {
			var robotId = this.robots[i];
			if (robotId === -1) {
				continue;
			}
			var robot = this.controller.getRobot(robotId);
			if (robot === null || (!this.controller.isVisible(robot))) {
				// Robot is dead
				this.robots[i] = -1;
			}
		}
	}
	turn() {
		this.action = undefined;
		// Figure out which pilgrims and defenders died and remove from this.pilgrims and this.defenders
		// TODO - need to have retrieval id system or an alternative
		// removeDeadRobots(this.pilgrims);
		// removeDeadRobots(this.defenders);
		// Figure out actions
		if (this.controller.me.turn > 1) { // Skip first turn due to signalling of pilgrim that made the church
			if (this.defendersAlive < this.pilgrimsAlive && this.pilgrimsAlive > (this.resourceOrder.length / 2)) {
				this.spawnLatticeProphet();
			} else {
				if (!this.spawnPilgrimForHarvesting()) {
					if (this.defendersAlive < this.pilgrimsAlive || (this.controller.karbonite > 2000 && this.controller.fuel > 5000)) {
						this.spawnLatticeProphet();
					}
				}
			}
		}
		// Update our own progress variable
		this.progress = Math.min(this.pilgrimsAlive, this.resourceOrder.length);
		var scaledProgress = Math.floor(this.progress / this.resourceOrder.length * CASTLE_PROGRESS_SCALE);
		// Castle talk to castles
		var signal = 0;
		// Identify as Church
		signal |= (1 << CHURCH_IDENTIFIER_BITSHIFT);
		// Broadcast progress
		signal |= ((scaledProgress & CASTLE_PROGRESS_BITMASK) << CASTLE_PROGRESS_BITSHIFT);
		// Send castle talk
		this.controller.castleTalk(signal);
		return this.action;
	}
}
