import PriorityQueue from './PriorityQueue'
import {Vector} from './Library'

export class Dijkstras {
	var terrainMap;
	var queue;
	var explored;
	var moves;
	var moveCosts;
	var dist; // 2d grid cost in fuel
	var prev; // 2d grid pointing to the prev square
	const UNCALCULATED = -1;
	const QUEUED = -2;
	constructor(terrainMap, start, moves, moveCosts) {
		this.terrainMap = terrainMap;
		this.queue = new PriorityQueue(comparator);
		this.explored = {};
		this.moves = moves;
		this.moveCosts = moveCosts;
		this.dist = Array(terrainMap.length).fill().map(() => Array(terrainMap[0].length).fill(UNCALCULATED));
		this.prev = Array(terrainMap.length).fill().map(() => Array(terrainMap[0].length).fill(null));
		this.queue.push(start, 0);
		this.explored[start.hash()] = true;
	}
	resolve() {
		var explored = {}
		while (!queue.isEmpty()) {
			Vector popped = queue.pop();
			var currentCost = cost[popped.x][popped.y];
			for (var i = 0; i < moves.length; i++) {
				var offset = moves[i];
				var moveCost = currentCost + moveCosts[i];
				var toExplore = popped.add(offset);
				if (explored[toExplore.hash()]) {
					if (moveCost < queue.getScore(toExplore)) {
						dist[toExplore.x][toExplore.y] = moveCost;
						prev[toExplore.x][toExplore.y] = popped;
						queue.decreaseScore(toExplore, moveCost);
					}
				} else {
					dist[toExplore.x][toExplore.y] = moveCost;
					prev[toExplore.x][toExplore.y] = popped;
					queue.push(toExplore, moveCost);
				}
			}
		}
	}
}
