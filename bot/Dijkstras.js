import PriorityQueue from './PriorityQueue'
import {Vector} from './Library'

class Dijkstras {
	var terrainMap;
	var PriorityQueue queue;
	var cost; // 2d grid cost in fuel
	var path; // 2d grid pointing to the next square
	const UNCALCULATED = -1;
	const QUEUED = -2;
	constructor(terrainMap, start) {
		this.terrainMap = terrainMap;
		this.queue = new PriorityQueue(comparator);
		this.cost = Array(terrainMap.length).fill().map(() => Array(terrainMap[0].length).fill(UNCALCULATED));
		this.path = Array(terrainMap.length).fill().map(() => Array(terrainMap[0].length).fill(null));
		this.queue.push(start);
		this.cost[start.x][start.y] = 0;
	}
	resolve() {
		while (!queue.isEmpty()) {
			Vector polled = queue.
			
		}
		
	}
}