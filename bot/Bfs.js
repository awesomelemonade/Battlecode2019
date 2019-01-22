import {PriorityQueue} from './PriorityQueue'
import {Vector} from './Library'
import {outOfBounds} from './Util'

const UNEXPLORED = -1;
export class Bfs {
	constructor(terrainMap, start, moves) {
		this.terrainMap = terrainMap;
		this.queue = []; // JavaScript FIFO
		this.moves = moves;
		this.dist = Array(terrainMap.length).fill().map(() => Array(terrainMap[0].length).fill(UNEXPLORED));
		this.prev = Array(terrainMap.length).fill().map(() => Array(terrainMap[0].length).fill(null));
		if (Array.isArray(start)) {
			for (var i = 0; i < start.length; i++) {
				this.queue.push(start[i], 0);
				this.dist[start[i].x][start[i].y] = 0;
				this.prev[start[i].x][start[i].y] = start[i]
			}
		} else {
			this.queue.push(start, 0);
			this.dist[start.x][start.y] = 0;
			this.prev[start.x][start.y] = start;
		}
	}
	resolve(stopCondition = (vector) => false, ignoreCondition = (condition) => false) {
		while (!this.queue.isEmpty()) {
			var popped = this.queue.shift();
			if (stopCondition(popped)) {
				return popped;
			}
			var currentCost = this.dist[popped.x][popped.y];
			for (var i = 0; i < this.moves.length; i++) {
				var offset = this.moves[i];
				var toExplore = popped.add(offset);
				if (outOfBounds(toExplore) || (this.terrainMap[toExplore.x][toExplore.y] === false)) {
					continue;
				}
				if (this.dist[toExplore.x][toExplore.y] == UNEXPLORED) {
					if (ignoreCondition(toExplore)) {
						continue;
					}
					this.dist[toExplore.x][toExplore.y] = currentCost + 1;
					this.prev[toExplore.x][toExplore.y] = popped;
					this.queue.push(toExplore);
				}
			}
		}
	}
}
