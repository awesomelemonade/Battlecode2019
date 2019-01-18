import {SPECS} from 'battlecode'
import {Vector, totalMoves, totalMoveCosts} from './Library';
import {Dijkstras} from './Dijkstras'
import * as Util from './Util';

// Castles & Churches must not have overlapping responsible tiles
const responsibleDistance = 5; // Must be less than church's vision radius to detect dead pilgrims & defenders

export class ChurchBot {
	constructor(controller) {
		this.controller = controller;
		this.resourceOrder = [];
		this.init();
	}
	init() {
		this.resourceOrder = [];
		// This following system limits 1 pilgrim and 1 defender per resource
		this.pilgrims = []; // Stores id or -1, indices correspond with resourceOrder
		this.defenders = []; // Stores id or -1, indices correspond with resourceOrder
		this.pilgrimsAlive = 0;
		this.defendersAlive = 0;
		// Calculate resourceOrder - resourceOrder should not change after construction
		
		// Find and communicate to the pilgrim that built this church its target resource
		
	}
	spawnPilgrim() {
		// Check costs of pilgrim
		if (!isAffordable(SPECS.PILGRIM)) {
			return false;
		}
		// Find the first index where its value is -1 in this.pilgrims
		var index = Util.findIndex(this.pilgrims, -1);
		if (index === -1) { // Exhausted all resources this church is assigned to
			return false;
		}
		// Calculate which adjacent tile to build the pilgrim using Dijkstras
		
		// Build the unit
		
		// Signal to pilgrim the target
		
		return true;
	}
	spawnDefender() {
		// TODO: Where to put defender relative to church/resource?
		// Check costs of defender
		
		// Signal the defender the target
	}
	turn() {
		controller.log("A Church Turn");
		// Detect dead pilgrims & defenders using vision_radius
		
		// Try spawning pilgrim or defender
		
		// Detect signal from castle to create extra attackers
		
		// Castle talk progress of the settlement process
		
	}
}
