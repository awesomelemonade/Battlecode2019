import {BCAbstractRobot, SPECS} from 'battlecode';

import {castleTurn} from './bot/CastleBot';
import {pilgrimTurn} from './bot/PilgrimBot';
import {crusaderTurn} from './bot/CrusaderBot';
import {churchTurn} from './bot/ChurchBot';

class MyRobot extends BCAbstractRobot {
    constructor() {
        super();
        this.bots = {};
        this.bots[SPECS.CASTLE] = castleTurn;
        this.bots[SPECS.CHURCH] = churchTurn;
        this.bots[SPECS.PILGRIM] = pilgrimTurn;
        this.bots[SPECS.CRUSADER] = crusaderTurn;
    }
    turn() {
        for (var property in this.bots) {
            if (this.bots.hasOwnProperty(property) && this.me.unit.toString() === property) {
                return this.bots[property](this); // Call the turn
            }
        }
    }
}

var robot = new MyRobot();
