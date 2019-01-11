import {BCAbstractRobot, SPECS} from 'battlecode';

import {castleTurn} from './bot/CastleBot';
import {churchTurn} from './bot/ChurchBot';
import {pilgrimTurn} from './bot/PilgrimBot';
import {crusaderTurn} from './bot/CrusaderBot';
import {prophetTurn} from './bot/ProphetBot';
import {preacherTurn} from './bot/PreacherBot';


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
		this.robot = robot;
		this.castles = {};
		this.churches = {};
	}
	turn() {
		for (var i = 0; i < this.turnProperties.length; i++) {
			this[this.turnProperties[i]] = this.robot[this.turnProperties[i]];
		}
		var transposedRobotMap = this.getVisibleRobotMap();
		this.robot_map = transposedRobotMap[0]((col, i) => transposedRobotMap.map(row => row[i]));
		var self = this;
		Object.keys(this.castles).forEach(function(castleId) {
			var castle = self.castles[castleId];
			if (self.robot_map[churhc.x][church.y] !== -1 && self.robot_map[castle.x][castle.y] !== castleId) {
				delete self.castles[castleId];
				this.map[castle.x][castle.y] = true;
			}
		});
		Object.keys(this.churches).forEach(function(churchId) {
			var church = self.churches[churchId];
			if (self.robot_map[church.x][church.y] !== -1 && self.robot_map[church.x][church.y] !== churchId) {
				delete self.churches[churchId];
				this.map[church.x][church.y] = true;
			}
		});
		var visibleRobots = this.getVisibleRobots();
		for (var i = 0; i < visibleRobots.length; i++) {
			var r = visibleRobots[i];
			if (this.isVisible(r)) {
				if (r.team === this.me.team) {
					if (this.castles[r.id] === undefined && r.unit === SPECS.CASTLE) {
						this.castles[r.id] = Vector.ofRobotPosition(r);
						this.map[r.x][r.y] = false;
					}
					if (this.churches[r.id] === undefined && r.unit === SPECS.CHURCH) {
						this.churches[r.id] = Vector.ofRobotPosition(r);
						this.map[r.x][r.y] = false;
					}
				}
			}
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
