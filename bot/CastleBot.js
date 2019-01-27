import {SPECS} from 'battlecode'
import * as Util from './Util';
import {Vector, totalMoves, totalMoveCosts} from './Library';
import {Dijkstras} from './Dijkstras'
import {Bfs} from './Bfs'
import * as ChurchLocationFinder from './ChurchLocationFinder'

// Castles & Churches must not have overlapping responsible tiles
const responsibleDistanceRadius = 2;
const responsibleDistance = 5; // Must be less than church's vision radius to detect dead pilgrims & defenders
const responsibleDistanceDoubled = Math.pow(2 * Math.sqrt(responsibleDistance), 2);

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

const SQUAD_IDENTIFIER_BITSHIFT = 2;
const SQUAD_DONE_BITSHIFT = 3;
const SQUAD_INFO_BITSHIFT = 4;
const SQUAD_INFO_BITMASK = 0b1111; // 4 bits
const SQUAD_INFO_NUM_BITS = 4;

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
		this.numChurchesBuilding = 0; // Total churches queued
		this.buildingChurchCastleTalkQueue = [];
		this.churchesBuilt = false;
		this.churchInit = false;
		this.squadInfo = {};
		this.signalQueue = [];
		this.signalled = false;
		// Church variables (Castle = church + extra)
		this.resourceOrder = [];
		this.progress = 0;
		this.progresses = {};
		this.retrieveIndex = -1; // Used to keep track of pilgrim/defender ids
		this.retrieveArray = undefined;
		this.retrieveUnit = undefined;
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
		var start = Util.getAdjacentPassableTrueMap(position);
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
		this.signalled = true;
		// Set retrieval of id for next turn
		this.retrieveIndex = index;
		this.retrieveArray = this.pilgrims;
		this.retrieveUnit = SPECS.PILGRIM;
		this.pilgrimsAlive++;
		return true;
	}
	spawnPilgrimForChurch(churchLocation) {
		// Check costs of pilgrim
		if (!Util.isAffordable(SPECS.PILGRIM)) {
			return false;
		}
		if (this.controller.map[churchLocation.x][churchLocation.y] === false) {
			// We need this condition to ensure dijkstras does not look the whole map
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
		this.controller.signal((Util.encodePosition(churchLocation) << 1) + 1, offset.x * offset.x + offset.y * offset.y);
		this.signalled = true;
		// Add to castle talk queue
		this.buildingChurchCastleTalkQueue.push(churchLocation.x);
		this.buildingChurchCastleTalkQueue.push(churchLocation.y);
		// Increment numChurchesBuilding
		this.numChurchesBuilding++;
		// Add Church
		this.addChurchPosition(churchLocation);
		// Return success
		return true;
	}
	findChurchLocation() {
		if (!this.churchInit) {
			ChurchLocationFinder.resolve(this.controller, this.castlePositions, this.enemyCastlePredictions, this.structurePositions);
			this.churchInit = true;
		}
		return ChurchLocationFinder.findChurchLocation();
	}
	spawnLatticeProphet() {
		// Check costs of prophet
		if (!Util.isAffordable(SPECS.PROPHET)) {
			return false;
		}
		var self = this;
		var randomEnemyCastlePosition = this.enemyCastlePredictions[Math.floor(Math.random() * this.enemyCastlePredictions.length)];
		// Calculate which adjacent tile to build the prophet using Dijkstras
		var castlePosition = Vector.ofRobotPosition(this.controller.me);
		var start = Util.getAdjacentPassable(castlePosition);
		var dijkstras = new Dijkstras(this.controller.map, start, totalMoves, totalMoveCosts);
		var stop = dijkstras.resolve(function(location) { // Stop Condition
			return (((self.controller.me.turn) < 750) ? ((location.x + location.y) % 2 === 0) : ((location.x + location.y) % 2 === 0 || location.y % 2 === 0)) 
					&& (!Util.isNextToCastleOrChurch(location)) && (!Util.hasResource(location));
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
			this.signalled = true;
			return true;
		} else {
			var traced = Util.trace(dijkstras, stop);
			var offset = traced.subtract(castlePosition);
			// Build the unit
			this.action = this.controller.buildUnit(SPECS.PROPHET, offset.x, offset.y);
			// Signal to prophet
			this.controller.signal(Util.encodePosition(randomEnemyCastlePosition), offset.x * offset.x + offset.y * offset.y);
			this.signalled = true;
			return true;
		}
	}
	spawnCrusader() {
		// Check costs of prophet
		if (!Util.isAffordable(SPECS.PROPHET)) {
			return false;
		}
		var self = this;
		// Calculate which adjacent tile to build the crusader using Bfs
		var castlePosition = Vector.ofRobotPosition(this.controller.me);
		var start = Util.getAdjacentPassable(castlePosition);
		var bfs = new Bfs(this.controller.map, start, totalMoves, totalMoveCosts);
		var stop = bfs.resolve(function(location) { // Stop Condition
			for (var i = 0; i < self.enemyCastlePredictions.length; i++) {
				if (self.enemyCastlePredictions[i].equals(location)) {
					return true;
				}
			}
			return false;
		});
		if (stop === undefined) {
			this.controller.log("Cannot find enemy castle prediction for spawning crusader");
			return false;
		} else {
			var traced = Util.trace(bfs, stop);
			var offset = traced.subtract(castlePosition);
			// Build the unit
			this.action = this.controller.buildUnit(SPECS.CRUSADER, offset.x, offset.y);
			// Signal to crusader
			this.controller.signal(Util.encodePosition(stop), offset.x * offset.x + offset.y * offset.y);
			this.signalled = true;
			return true;
		}
	}
	removeDeadRobots(robots) {
		var counter = 0;
		for (var i = 0; i < robots.length; i++) {
			var robotId = robots[i];
			if (robotId === -1) {
				continue;
			}
			var robot = this.controller.getRobot(robotId);
			if (robot === null || (!this.controller.isVisible(robot))) {
				// Robot is dead
				robots[i] = -1;
				counter++;
			}
		}
		return counter;
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
	shouldBuildUnits() {
		var myScaledProgress = Math.floor(this.progress / this.resourceOrder.length * CASTLE_PROGRESS_SCALE);
		var numLower = 0;
		var otherProgresses = Object.values(this.progresses);
		for (var i = 0; i < otherProgresses.length; i++) {
			if (otherProgresses[i] < myScaledProgress) {
				numLower++;
			}
		}
		return numLower < Math.min(this.controller.karbonite / 10, this.controller.fuel / 50);
	}
	isAffordable(unitType) {
		return this.controller.karbonite >= SPECS.UNITS[SPECS.CHURCH].CONSTRUCTION_KARBONITE * this.numChurchesBuilding +
						SPECS.UNITS[unitType].CONSTRUCTION_KARBONITE &&
				this.controller.fuel >= SPECS.UNITS[SPECS.CHURCH].CONSTRUCTION_FUEL * this.numChurchesBuilding + 
						SPECS.UNITS[unitType].CONSTRUCTION_FUEL;
	}
	shouldDefend() {
		var ourScore = 0;
		var enemyScore = 0;
		var robots = this.controller.getVisibleRobots();
		for (var i = 0; i < robots.length; i++) {
			var robot = robots[i];
			if (!this.controller.isVisible(robot)){
				continue;
			}
			if (robot.team === this.controller.me.team) {
				if (robot.unit !== SPECS.PILGRIM && robot.unit !== SPECS.CHURCH && robot.unit !== SPECS.CASTLE){
					ourScore += SPECS.UNITS[robot.unit].STARTING_HP;
				}
			} else {
				enemyScore += SPECS.UNITS[robot.unit].STARTING_HP;
			}
		}
		if (enemyScore === 0 && this.pilgrims[0] === -1) {
			// We need karbonite pilgrims!
			return false;
		}
		if (ourScore <= 40 && this.controller.me.health < SPECS.UNITS[SPECS.CASTLE].STARTING_HP) {
			return true;
		}
		if (ourScore <= 80 && this.controller.me.health < SPECS.UNITS[SPECS.CASTLE].STARTING_HP * 2 / 3) {
			return true;
		}
		if (ourScore <= 120 && this.controller.me.health < SPECS.UNITS[SPECS.CASTLE].STARTING_HP / 3) {
			return true;
		}
		return ourScore < enemyScore * 4;
	}
	turn() {
		var self = this;
		this.action = undefined;
		this.signalled = false;
		// Retrieval id system
		if (this.retrieveIndex !== -1) {
			// Find unit
			var robot = Util.findRobot(function(robot) {
				return robot.team === self.controller.me.team && robot.turn === 1 && robot.unit === self.retrieveUnit;
			});
			if (robot === null) {
				this.controller.log("Unable to retrieve id of robot?");
			} else {
				this.retrieveArray[this.retrieveIndex] = robot.id;
				this.retrieveIndex = -1;
			}
		}
		// Figure out which pilgrims and defenders died and remove from this.pilgrims and this.defenders
		this.pilgrimsAlive -= this.removeDeadRobots(this.pilgrims);
		// this.defendersAlive -= this.removeDeadRobots(this.defenders);
		var robots = this.controller.getVisibleRobots();
		// Retrieve castle positions
		this.progresses = {}; // Empty out progresses - conveniently handles castles/churches that have died
		var churchInfoTransmitting = false; // Do not build church if we're in the process of transmitting church information
		for (var i = 0; i < robots.length; i++) {
			// Only read our own castle talks excluding our own
			if (robots[i].team === this.controller.me.team && robots[i].id !== this.controller.me.id) {
				var robotIsCastle = ((robots[i].castle_talk >>> CASTLE_IDENTIFIER_BITSHIFT) & 1) === 1;
				if (robotIsCastle) {
					var value = (robots[i].castle_talk >>> CASTLE_LOCATION_BITSHIFT) & CASTLE_LOCATION_BITMASK;
					if (robots[i].turn === 1) {
						this.xBuffers[robots[i].id] = value;
					} else if (robots[i].turn === 2) {
						var newCastlePosition = new Vector(this.xBuffers[robots[i].id], value);
						this.addCastlePosition(newCastlePosition);
						this.xBuffers[robots[i].id] = undefined;
					} else {
						// Retrieve whether castle is building church
						var buildChurch = ((robots[i].castle_talk >>> CASTLE_BUILDCHURCH_BITSHIFT) & 1) === 1;
						if (buildChurch) {
							if (this.xBuffers[robots[i].id] === undefined) {
								this.xBuffers[robots[i].id] = value;
								churchInfoTransmitting = true;
							} else {
								var churchPosition = new Vector(this.xBuffers[robots[i].id], value);
								this.addChurchPosition(churchPosition);
								this.xBuffers[robots[i].id] = undefined;
								this.numChurchesBuilding++;
							}
						} else {
							// Retrieve progresses
							var robotProgress = ((robots[i].castle_talk >>> CASTLE_PROGRESS_BITSHIFT) & CASTLE_PROGRESS_BITMASK);
							this.progresses[robots[i].id] = robotProgress;
						}
					}
				} else {
					var robotIsChurch = ((robots[i].castle_talk >>> CHURCH_IDENTIFIER_BITSHIFT) & 1) === 1;
					if (robotIsChurch) {
						// Decrement numChurchesBuilding
						if (robots[i].turn === 1) {
							this.numChurchesBuilding--;
						}
						// Retrieve progresses
						var robotProgress = ((robots[i].castle_talk >>> CASTLE_PROGRESS_BITSHIFT) & CASTLE_PROGRESS_BITMASK);
						this.progresses[robots[i].id] = robotProgress;
					} else {
						var robotIsSquad = ((robots[i].castle_talk >>> SQUAD_IDENTIFIER_BITSHIFT) & 1) === 1;
						if (robotIsSquad) {
							var done = ((robots[i].castle_talk >>> SQUAD_DONE_BITSHIFT) & 1) === 1;
							var info = ((robots[i].castle_talk >>> SQUAD_INFO_BITSHIFT) & SQUAD_INFO_BITMASK);
							if (this.squadInfo[robots[i].id] === undefined) {
								// Initialize squad info
								this.squadInfo[robots[i].id] = 0;
							}
							// Append to squad info
							this.squadInfo[robots[i].id] = (this.squadInfo[robots[i].id] << SQUAD_INFO_NUM_BITS) | info;
							if (done) {
								// Evaluate total signal
								var signal = this.squadInfo[robots[i].id];
								var x = (signal >>> 6) & 0b111111;
								var y = signal & 0b111111;
								this.controller.log("Received that enemy castle[" + x + ", " + y + "] was killed - signal=" + signal);
								// Search in enemyCastlePredictions
								var index = -1;
								for (var j = 0; j < this.enemyCastlePredictions.length; j++) {
									var prediction = this.enemyCastlePredictions[j];
									if (prediction.x === x && prediction.y === y) {
										index = j;
										break;
									}
								}
								// Remove from enemyCastlePredictions (if exists)
								if (index !== -1) {
									this.enemyCastlePredictions.splice(index, 1);
									// All castles will probably end up sending 1 large signal
									// Pick an arbitrary castle prediction
									var randomEnemyCastlePosition = this.enemyCastlePredictions[Math.floor(Math.random() * this.enemyCastlePredictions.length)];
									// Send signal with large radius
									this.controller.log("Broadcasting bigly: " + randomEnemyCastlePosition);
									this.signalQueue.push({signal: Util.encodePosition(randomEnemyCastlePosition), radius: 6889}); // r ^ 2 = 83 * 83
								}
								// Reset squad info
								this.squadInfo[robots[i].id] = undefined;
							}
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
				if (this.shouldDefend()) {
					// Castles can defend themselves
					this.spawnLatticeProphet();
				} else {
					if (this.shouldBuildUnits()) {
						if (!this.spawnPilgrimForHarvesting()) {
							// TODO: when to build pilgrim for church, save for church, or spawn lattice prophet
							// If already spawned for church
							// Save for church
							if (churchInfoTransmitting) {
								/*if (((this.controller.karbonite > 500 && this.controller.fuel > 1250) || this.controller.me.turn > 500) && this.isAffordable(SPECS.PROPHET)) {
									this.spawnLatticeProphet();
								}*/
							} else {
								var churchLocation = this.churchesBuilt ? undefined : this.findChurchLocation();
								if (churchLocation === undefined) {
									// No more church locations - reserve karbonite/fuel for defending
									if (((this.controller.karbonite > 500 && this.controller.fuel > 1250 && this.defendersAlive < this.pilgrimsAlive * ((this.controller.me.turn - 100) / 100))
											|| this.controller.me.turn > 600) && this.isAffordable(SPECS.PROPHET)) {
										this.spawnLatticeProphet();
									} else {
										if (this.controller.karbonite > 250 && this.controller.fuel > 5000) {
											this.spawnCrusader();
										}
									}
									this.churchesBuilt = true;
								} else {
									if (churchLocation !== null) {
										// Subtract 1 because one can gain karbonite while getting to church location
										if(this.controller.karbonite >= SPECS.UNITS[SPECS.CHURCH].CONSTRUCTION_KARBONITE * (this.numChurchesBuilding - 1) +
														SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_KARBONITE &&
												this.controller.fuel >= SPECS.UNITS[SPECS.CHURCH].CONSTRUCTION_FUEL * (this.numChurchesBuilding - 1) + 
														SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_FUEL) {
											this.spawnPilgrimForChurch(churchLocation);
										}
									}
								}
							}
						}
					}
				}
			}
		}
		// Update our own progress variable
		this.progress = Math.min(this.pilgrimsAlive, this.resourceOrder.length);
		var scaledProgress = Math.floor(this.progress / this.resourceOrder.length * CASTLE_PROGRESS_SCALE);
		// Castle talk for castle locations
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
			// Send castle talk
			this.controller.castleTalk(signal);
		} else {
			// castle talk for castle positions
			var signal = 0;
			// Identify as Castle
			signal |= (1 << CASTLE_IDENTIFIER_BITSHIFT);
			// Checks if we have any churches to castle talk
			if (this.buildingChurchCastleTalkQueue.length > 0) {
				signal |= (1 << CASTLE_BUILDCHURCH_BITSHIFT);
				// array.shift() is similar to queue.poll() in Java
				signal |= ((this.buildingChurchCastleTalkQueue.shift() & CASTLE_LOCATION_BITMASK) << CASTLE_LOCATION_BITSHIFT);
			} else {
				// Broadcast progress
				signal |= ((scaledProgress & CASTLE_PROGRESS_BITMASK) << CASTLE_PROGRESS_BITSHIFT);
			}
			// Send castle talk
			this.controller.castleTalk(signal);
		}
		// Execute signal queue
		if ((!this.signalled) && this.signalQueue.length > 0) {
			var signalInfo = this.signalQueue.shift();
			this.controller.signal(signalInfo.signal, signalInfo.radius);
		}
		return this.action;
	}
	addChurchPosition(churchPosition) {
		this.structurePositions.push(churchPosition);
		ChurchLocationFinder.updateStructurePosition(churchPosition);
	}
	addCastlePosition(castlePosition) {
		this.castlePositions.push(castlePosition);
		this.castlePositions.sort(function(a, b) {
			return a.hash() - b.hash();
		});
		this.controller.log("Castle Positions: " + this.castlePositions);
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
