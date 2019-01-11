import {BCAbstractRobot, SPECS} from 'battlecode';

import {castleTurn} from './bot/CastleBot';
import {pilgrimTurn} from './bot/PilgrimBot';
import {crusaderTurn} from './bot/CrusaderBot';
import {churchTurn} from './bot/ChurchBot';


class WrappedController {
	constructor(robot) {
		var properties = ["move", "mine", "give", "attack", "buildUnit", "proposeTrade", "signal", "castleTalk", "log", "getVisibleRobots", "getVisibleRobotMap", "getRobot", "isVisible", "isRadioing"];
		for (var i = 0; i < properties.length; i++) {
			this[properties[i]] = robot[properties[i]].bind(robot);
		}
		this.turnProperties = ["me", "karbonite", "fuel", "last_offer"];
		this.map = robot.map[0].map((col, i) => robot.map.map(row => row[i]));
		this.karbonite_map = robot.karbonite_map[0].map((col, i) => robot.karbonite_map.map(row => row[i]));
		this.fuel_map = robot.fuel_map[0].map((col, i) => robot.fuel_map.map(row => row[i]));
	}
	turn() {
		for (var i = 0; i < this.turnProperties.length; i++) {
			this[this.turnProperties[i]] = robot[this.turnProperties[i]];
		}
	}
}

class MyRobot extends BCAbstractRobot {
	constructor() {
		super();
		this.bots = {};
		this.bots[SPECS.CASTLE] = castleTurn;
		this.bots[SPECS.CHURCH] = churchTurn;
		this.bots[SPECS.PILGRIM] = pilgrimTurn;
		this.bots[SPECS.CRUSADER] = crusaderTurn;
		this.initialized = false;
	}
	turn() {
		if (!this.initialized) {
			this.controller = new WrappedController(this);
			this.initialized = true;
		}
		this.controller.turn();
		// Execute turn
		for (var property in this.bots) {
			if (this.bots.hasOwnProperty(property) && this.me.unit.toString() === property) {
				return this.bots[property](this.controller); // Call the turn
			}
		}
	}
}

var robot = new MyRobot();
