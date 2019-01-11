import {PriorityQueue} from './PriorityQueue'
import {Vector} from './Library'

const UNEXPLORED = -1;
export class Dijkstras {
	constructor(terrainMap, start, moves, moveCosts) {
		this.terrainMap = terrainMap;
		this.queue = new PriorityQueue();
		this.moves = moves;
		this.moveCosts = moveCosts;
		this.dist = Array(terrainMap.length).fill().map(() => Array(terrainMap[0].length).fill(UNEXPLORED));
		this.prev = Array(terrainMap.length).fill().map(() => Array(terrainMap[0].length).fill(null));
		this.queue.push(start, 0);
		this.dist[start.x][start.y] = 0;
		this.prev[start.x][start.y] = new Vector(0, 0);
	}
	resolve(stopCondition = (vector) => false) {
		while (!this.queue.isEmpty()) {
			var popped = this.queue.pop();
			if (stopCondition(popped)) {
				return popped;
			}
			var currentCost = this.dist[popped.x][popped.y];
			for (var i = 0; i < this.moves.length; i++) {
				var offset = this.moves[i];
				var moveCost = currentCost + this.moveCosts[i];
				var toExplore = popped.add(offset);
				if (this.outOfBounds(toExplore) || this.terrainMap[toExplore.x][toExplore.y] == false) {
					continue;
				}
				if (this.dist[toExplore.x][toExplore.y] == UNEXPLORED) {
					this.dist[toExplore.x][toExplore.y] = moveCost;
					this.prev[toExplore.x][toExplore.y] = popped;
					this.queue.push(toExplore, moveCost);
				} else {
					if (moveCost < this.dist[toExplore.x][toExplore.y]) {
						this.dist[toExplore.x][toExplore.y] = moveCost;
						this.prev[toExplore.x][toExplore.y] = popped;
						this.queue.decreaseScore(toExplore, moveCost);
					}
				}
			}
		}
	}
	outOfBounds(vector) {
		return vector.x < 0 || vector.x >= this.terrainMap.length || vector.y < 0 || vector.y >= this.terrainMap[0].length;
	}
}
