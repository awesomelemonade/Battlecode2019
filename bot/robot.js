import {BCAbstractRobot, SPECS} from 'battlecode';

import {WrappedController} from './bot/WrappedController';
import {setUtilController} from './bot/Util';

import {CastleBot} from './bot/CastleBot';
import {ChurchBot} from './bot/ChurchBot';
import {PilgrimBot} from './bot/PilgrimBot';
import {CrusaderBot} from './bot/CrusaderBot';
import {ProphetBot} from './bot/LatticeProphetBot';
import {PreacherBot} from './bot/PreacherBot';

class MyRobot extends BCAbstractRobot {
	constructor() {
		super();
		this.bots = {};
		this.bots[SPECS.CASTLE] = CastleBot;
		this.bots[SPECS.CHURCH] = ChurchBot;
		this.bots[SPECS.PILGRIM] = PilgrimBot;
		this.bots[SPECS.CRUSADER] = CrusaderBot;
		this.bots[SPECS.PROPHET] = ProphetBot;
		this.bots[SPECS.PREACHER] = PreacherBot;
		this.initialized = false;
		this.timeBuffer = 10;
	}
	init() {
		// Create controller
		this.controller = new WrappedController(this);
		this.controller.turn(); // Prepare controller for init of bots
		// Set Util's controller
		setUtilController(this.controller);
		// Figure out unit type to set this.botTurn
		for (var property in this.bots) {
			if (this.bots.hasOwnProperty(property) && this.me.unit.toString() === property) {
				this.bot = new this.bots[property](this.controller);
				break;
			}
		}
		this.initialized = true;
	}
	turn() {
		if (!this.initialized) {
			this.init();
		}
		this.controller.turn(); // Preparation of controller
		if (this.controller.me.time < this.timeBuffer) {
			// We have no time!
			this.controller.log("Skipped [" + this.controller.me.x + ", " + this.controller.me.y + "]" + ": " + this.controller.me.time + "ms/" + this.timeBuffer + "ms");
			return undefined;
		}
		var beforeTime = new Date().getTime();
		var action = this.bot.turn(); // Execute Turn
		var time = ((new Date().getTime()) - beforeTime);
		if (this.controller.me.time - time < this.timeBuffer) {
			// We probably timed out
			this.controller.log("Probably will time out: " + time + "ms/" + this.controller.me.time + "ms");
		}
		// Set time buffer
		this.timeBuffer = 10 + time;
		return action;
	}
}

var robot = new MyRobot();
