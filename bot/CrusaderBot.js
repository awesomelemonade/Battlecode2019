

export function crusaderTurn(robot) {
    robot.log("A Crusader Turn");
    const choices = [[0,-1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
    const choice = choices[Math.floor(Math.random()*choices.length)]
    return robot.move(...choice);
}
