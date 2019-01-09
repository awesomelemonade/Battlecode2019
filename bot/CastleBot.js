import {SPECS} from 'battlecode'
import * as Util from './Util';

var initialized = false;
var isLeader = false;
var step = -1;

const LEADER_SIGNAL = 1;

function initialize(robot) {
    // Check if leader castle is already claimed
    var hasLeader = false;
    var robots = robot.getVisibleRobots();
    
    for (var i = 0; i < robots.length; i++) {
        if (robots[i].castle_talk === LEADER_SIGNAL) {
            hasLeader = true;
            break;
        }
    }
    
    // Claim leader if no leader
    if (!hasLeader) {
        isLeader = true;
        robot.castleTalk(LEADER_SIGNAL);
    }
    
    // TODO: Figure out best castle to start with
}

export function castleTurn(robot) {
    if (!initialized) {
        initialize(robot);
        initialized = true;
    }
    step++;
    robot.log("A Castle Turn");
    if (step % 10 === 0) {
        robot.log("Building a crusader at " + (robot.me.x+1) + ", " + (robot.me.y+1));
        return robot.buildUnit(SPECS.CRUSADER, 1, 1);
    } else {
        return // this.log("Castle health: " + this.me.health);
    }
}
