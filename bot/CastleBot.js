import {SPECS} from 'battlecode'
import * as Util from './Util';

var initialized = false;
var step = -1;


function initialize(robot) {
    // Figure out best castle to start with
    
}

export function castleTurn(robot) {
    if (!initialized) {
        initialize();
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
