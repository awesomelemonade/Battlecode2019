import {SPECS} from 'battlecode'
import {Vector} from './Library';
import * as Util from './Util';

export class WrappedController {
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
		this.pilgrims = {};
	}
	turn() {
		for (var i = 0; i < this.turnProperties.length; i++) {
			this[this.turnProperties[i]] = this.robot[this.turnProperties[i]];
		}
		var transposedRobotMap = this.getVisibleRobotMap();
		this.robot_map = transposedRobotMap[0].map((col, i) => transposedRobotMap.map(row => row[i]));
		var self = this;
		Object.keys(this.castles).forEach(function(castleId) {
			castleId = parseInt(castleId);
			var castle = self.castles[castleId];
			if (self.robot_map[castle.x][castle.y] !== -1 && self.robot_map[castle.x][castle.y] !== castleId) {
				delete self.castles[castleId];
				self.map[castle.x][castle.y] = true;
			}
		});
		Object.keys(this.churches).forEach(function(churchId) {
			churchId = parseInt(churchId);
			var church = self.churches[churchId];
			if (self.robot_map[church.x][church.y] !== -1 && self.robot_map[church.x][church.y] !== churchId) {
				delete self.churches[churchId];
				self.map[church.x][church.y] = true;
			}
		});
		Object.keys(this.pilgrims).forEach(function(pilgrimId) {
			pilgrimId = parseInt(pilgrimId);
			var pilgrim = self.pilgrims[pilgrimId];
			if (self.robot_map[pilgrim.x][pilgrim.y] !== pilgrimId) {
				delete self.pilgrims[pilgrimId];
				self.map[pilgrim.x][pilgrim.y] = true;
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
					if (r.unit === SPECS.PILGRIM) {
						if (this.pilgrims[r.id] === undefined) {
							this.pilgrims[r.id] = Vector.ofRobotPosition(r);
						} else {
							var prev = this.pilgrims[r.id];
							var current = Vector.ofRobotPosition(r);
							if (current.equals(prev)) { // If the pilgrim stayed still
								this.map[current.x][current.y] = false;
							} else { // If the pilgrim moved
								if (this.map[prev.x][prev.y] === false) {
									this.map[prev.x][prev.y] = true;
								}
								this.pilgrims[r.id] = current;
							}
						}
					}
				}
			}
		}
	}
}
