import {SPECS} from 'battlecode'

var step = -1;

export function castleTurn(robot) {
    step++;
    robot.log("A Castle Turn");
    if (step % 10 === 0) {
        robot.log("Building a crusader at " + (robot.me.x+1) + ", " + (robot.me.y+1));
        return robot.buildUnit(SPECS.CRUSADER, 1, 1);
    } else {
        return // this.log("Castle health: " + this.me.health);
    }
}
