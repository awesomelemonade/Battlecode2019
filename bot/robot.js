import {BCAbstractRobot, SPECS} from 'battlecode';

import {WrappedController} from './bot/WrappedController';

import {castleTurn} from './bot/CastleBot';
import {churchTurn} from './bot/ChurchBot';
import {pilgrimTurn} from './bot/PilgrimBot';
import {crusaderTurn} from './bot/CrusaderBot';
import {prophetTurn} from './bot/ProphetBot';
import {preacherTurn} from './bot/PreacherBot';

class MyRobot extends BCAbstractRobot {
	constructor() {
		super();
		this.bots = {};
		this.bots[SPECS.CASTLE] = castleTurn;
		this.bots[SPECS.CHURCH] = churchTurn;
		this.bots[SPECS.PILGRIM] = pilgrimTurn;
		this.bots[SPECS.CRUSADER] = crusaderTurn;
		this.bots[SPECS.PROPHET] = prophetTurn;
		this.bots[SPECS.PREACHER] = preacherTurn;
		this.initialized = false;
	}
	init() {
		// Create controller
		this.controller = new WrappedController(this);
		// Figure out unit type to set this.botTurn
		for (var property in this.bots) {
			if (this.bots.hasOwnProperty(property) && this.me.unit.toString() === property) {
				this.botTurn = this.bots[property]; // Set this.botTurn
				break;
			}
		}
	}
	turn() {
		if (!this.initialized) {
			this.init();
			this.initialized = true;
		}
		this.controller.turn(); // Preparation of controller
		this.botTurn(this.controller); // Execute Turn
	}
}

var robot = new MyRobot();
