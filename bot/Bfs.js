import {Vector} from './Library'
import {outOfBounds} from './Util'

const IGNORED = -2;
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
				this.queue.push(start[i]);
				this.dist[start[i].x][start[i].y] = 0;
				this.prev[start[i].x][start[i].y] = start[i];
			}
		} else {
			this.queue.push(start);
			this.dist[start.x][start.y] = 0;
			this.prev[start.x][start.y] = start;
		}
	}
	resolve(stopCondition = (vector) => false, ignoreCondition = (condition) => false) {
		while (this.queue.length !== 0) {
			var popped = this.queue.shift();
			var currentCost = this.dist[popped.x][popped.y];
			if (stopCondition(popped, currentCost)) {
				return popped;
			}
			for (var i = 0; i < this.moves.length; i++) {
				var offset = this.moves[i];
				var toExplore = popped.add(offset);
				if (outOfBounds(toExplore) || (this.terrainMap[toExplore.x][toExplore.y] === false)) {
					continue;
				}
				if (this.dist[toExplore.x][toExplore.y] === UNEXPLORED) {
					if (ignoreCondition(toExplore)) {
						this.dist[toExplore.x][toExplore.y] = IGNORED;
					} else {
						this.dist[toExplore.x][toExplore.y] = currentCost + 1;
						this.prev[toExplore.x][toExplore.y] = popped;
						this.queue.push(toExplore);
					}
				}
			}
		}
	}
}
