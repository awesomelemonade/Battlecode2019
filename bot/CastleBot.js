import {SPECS} from 'battlecode'
import * as Util from './Util';
import {Vector, totalMoves, totalMoveCosts} from './Library';
import {Dijkstras} from './Dijkstras'

// Castles & Churches must not have overlapping responsible tiles
const responsibleDistance = 5; // Must be less than church's vision radius to detect dead pilgrims & defenders

// Use r.turn to differentiate castle vs other units?
// castle_talk among castles for the first few turns - 8 bits
const CASTLE_IDENTIFIER_BITSHIFT = 0; // Differentiate Castle and other units
const CASTLE_UNUSED_BITSHIFT = 1; // Previously: Temporary leader identification system
const CASTLE_LOCATION_BITSHIFT = 2;
const CASTLE_LOCATION_BITMASK = 0b111111; // 6 bits (2^6 = 64) per x or y
// castle_talk among castles after the first few turns

const CASTLE_SPAWN_BITSHIFT = 1;
const CASTLE_SPAWNTYPE_BITSHIFT = 2;
const CASTLE_SPAWNTYPE_BITMASK = 0b11; // Pilgrims, Crusaders, Prophets, Preachers

export class CastleBot {
	constructor(controller) {
		this.controller = controller;
		// Init
		this.init();
	}
	init() {
		// Castle variables
		this.castlePositions = [];
		this.structurePositions = [];
		this.enemyCastlePredictions = [];
		this.xBuffers = {};
		// Church variables (Castle = church + extra)
		this.resourceOrder = [];
		this.retrieveId = false; // Used to keep track of pilgrim/defender ids
		// This following system limits 1 pilgrim and 1 defender per resource
		this.pilgrims = []; // Stores id or -1, indices correspond with resourceOrder
		this.defenders = []; // Stores id or -1, indices correspond with resourceOrder
		this.pilgrimsAlive = 0;
		this.defendersAlive = 0;
		// Calculate resourceOrder - resourceOrder should not change after construction
		var castlePosition = Vector.ofRobotPosition(this.controller.me);
		this.addCastlePosition(castlePosition);
		this.resourceOrder = this.getResourceOrder(castlePosition);
		for (var i = 0; i < this.resourceOrder.length; i++) {
			this.pilgrims.push(-1);
			this.defenders.push(-1);
		}
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
	spawnPilgrimForChurch(churchLocation) {
		// Check costs of pilgrim
		if (!Util.isAffordable(SPECS.PILGRIM)) {
			return false;
		}
		if (this.controller.map[churchLocation.x][churchLocation.y] === false) {
			// churchLocation is not passable/occupiable
			return false;
		}
		// Calculate which adjacent tile to build the pilgrim using Dijkstras
		var castlePosition = Vector.ofRobotPosition(this.controller.me);
		var start = Util.getAdjacentPassable(castlePosition);
		var dijkstras = new Dijkstras(this.controller.map, start, totalMoves, totalMoveCosts);
		var stop = dijkstras.resolve(function(location) {
			return location.equals(churchLocation);
		});
		if (stop === undefined) {
			// Dijkstras did not find churchLocation
			return false;
		}
		var traced = Util.trace(dijkstras, churchLocation);
		var offset = traced.subtract(castlePosition);
		// Build the unit
		this.action = this.controller.buildUnit(SPECS.PILGRIM, offset.x, offset.y);
		// Signal to pilgrim the target church location - TODO: PilgrimBot has to differentiate building church and harvesting
		this.controller.signal((Util.encodePosition(resourcePosition) << 1) + 1, offset.x * offset.x + offset.y * offset.y);
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
	spawnLatticeProphet() {
		// Check costs of prophet
		if (!Util.isAffordable(SPECS.PROPHET)) {
			return false;
		}
		var randomEnemyCastlePosition = this.enemyCastlePredictions[Math.floor(Math.random() * this.enemyCastlePredictions.length)];
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
	castleAttack() {
		var ret = Util.getAttackMove();
		if (ret === undefined) {
			return false;
		} else {
			this.action = ret;
			return true;
		}
	}
	turn() {
		this.action = undefined;
		// Figure out which pilgrims and defenders died and remove from this.pilgrims and this.defenders
		// TODO - need to have retrieval id system or an alternative
		// removeDeadRobots(this.pilgrims);
		// removeDeadRobots(this.defenders);
		// Castle talk for castle locations
		if (this.controller.me.turn <= 3) {
			if (this.controller.me.turn <= 2) {
				// castle talk for castle positions
				var signal = 0;
				
				// Identify as Castle
				signal |= (1 << CASTLE_IDENTIFIER_BITSHIFT);
				
				// Broadcast x or y position
				if (this.controller.me.turn === 1) {
					signal |= ((this.controller.me.x & CASTLE_LOCATION_BITMASK) << CASTLE_LOCATION_BITSHIFT);
				} else if (this.controller.me.turn === 2) {
					signal |= ((this.controller.me.y & CASTLE_LOCATION_BITMASK) << CASTLE_LOCATION_BITSHIFT);
				}
				this.controller.castleTalk(signal);
			}
			var robots = this.controller.getVisibleRobots();
			// Retrieve castle positions
			for (var i = 0; i < robots.length; i++) {
				if (robots[i].team === this.controller.me.team && robots[i].id !== this.controller.me.id) {
					var robotIsCastle = ((robots[i].castle_talk >>> CASTLE_IDENTIFIER_BITSHIFT) & 1) === 1;
					var robotUnusedBit = ((robots[i].castle_talk >>> CASTLE_UNUSED_BITSHIFT) & 1) === 1;
					var value = (robots[i].castle_talk >>> CASTLE_LOCATION_BITSHIFT) & CASTLE_LOCATION_BITMASK;
					if (robotIsCastle) {
						if (robots[i].turn === 1) {
							this.xBuffers[robots[i].id] = value;
						} else if (robots[i].turn === 2) {
							var newCastlePosition = new Vector(this.xBuffers[robots[i].id], value);
							this.addCastlePosition(newCastlePosition);
						}
					}
				}
			}
		}
		// Figure out actions
		if (!this.castleAttack()) { // Try castle attacking
			// Do normal stuff
			if (this.controller.me.turn <= 2) { // Force pilgrim spawning for the first n turns where n >= 2
				// spawn pilgrims for resourceOrder
				this.spawnPilgrimForHarvesting();
			} else {
				// TODO: Check progress of other castles/churches - see if we have enough funds to create units for this structure
				// doChurchPilgrimAndDefenderBuilding;
				if (this.defendersAlive < this.pilgrimsAlive) {
					this.spawnLatticeProphet();
				} else {
					if (!this.spawnPilgrimForHarvesting()) {
						this.spawnLatticeProphet();
					}
				}
				if (this.action !== undefined) { // Check if we have spawned a defender or pilgrim
					// TODO: When to build attacker vs when to setup church vs do nothing
					// TODO: Should churches be able to setup a pilgrim to build churches
					// castle talk "progress" in creating pilgrims/defenders
					// retrieve castle talks from all units to calculate totalProgress
					// TODO: Figure out the way to decide "itIsThisCastleThatShouldBuildTheChurch"
					// if (totalProgress > arbitraryThreshold && itIsThisCastleThatShouldBuildTheChurch) {
					// 		queue a castle talk for a church to be built
					//		spawn a pilgrim
					//		send a signal to the pilgrim to build a church
					// }
					// for (go through the queue) {
					// 		execute castleTalk
					// }
				}
			}
		}
		return this.action;
	}
	addChurchPosition(churchPosition) {
		this.structurePositions.push(churchPosition);
	}
	addCastlePosition(castlePosition) {
		this.castlePositions.push(castlePosition);
		this.structurePositions.push(castlePosition);
		this.addEnemyPrediction(castlePosition);
	}
	addEnemyPrediction(position) {
		if (this.controller.isHorizontallySymmetric) {
			this.enemyCastlePredictions.push(Util.flipPositionForHorizontallySymmetric(position));
		}
		if (this.controller.isVerticallySymmetric) {
			this.enemyCastlePredictions.push(Util.flipPositionForVerticallySymmetric(position));
		}
	}
}


function encodeCastleSpawnType(unit) {
	if (unit === SPECS.PILGRIM) {
		return 0;
	} else if (unit === SPECS.CRUSADER) {
		return 1;
	} else if (unit === SPECS.PROPHET) {
		return 2;
	} else if (unit === SEPCS.PREACHER) {
		return 3;
	} else {
		return -1;
	}
}
function decodeCastleSpawnType(code) {
	if (code === 0) {
		return SPECS.PILGRIM;
	} else if (code === 1) {
		return SPECS.CRUSADER;
	} else if (code === 2) {
		return SPECS.PROPHET;
	} else if (code === 3) {
		return SPECS.PREACHER;
	} else {
		return -1;
	}
}

export function castleTurn(r) {
	controller = r;
	action = undefined;
	if (!initialized) {
		initialize(r);
	}
	handleCastleTalk(r);
	if (castlePositionsInitialized) {
		if (unitsBuilt % 2 == 0 && unitsBuilt % 5 != 4) {
			if (!spawnPilgrim(r)) {
				spawnProphet(r);
			}
		} else {
			spawnProphet(r);
		}
		if (action === undefined) {
			if (controller.fuel > 10000) {
				var randomEnemyCastle = enemyPredictions[Math.floor(Math.random() * enemyPredictions.length)]; // Select a random enemy castle
				controller.signal(Util.encodePosition(randomEnemyCastle), 5000);
			}
		}
	} else {
		spawnPilgrim(r);
	}
	return action;
}
