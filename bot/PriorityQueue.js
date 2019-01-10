const top = 0;
const parent = i => ((i + 1) >>> 1) - 1;
const left = i => (i << 1) + 1;
const right = i => (i + 1) << 1;

export class PriorityQueue {
	constructor() {
		this._heap = [];
		this._scores = {};
		this._map = {};
	}
	size() {
		return this._heap.length;
	}
	isEmpty() {
		return this.size() === 0;
	}
	peek() {
		return this._heap[top];
	}
	push(value, score) {
		this._map[value.hash()] = this.size();
		this._scores[value] = score;
		this._heap.push(value);
		this._siftUp(this.size() - 1);
		return this.size();
	}
	pop() {
		const poppedValue = this.peek();
		const bottom = this.size() - 1;
		if (bottom > top) {
			this._swap(top, bottom);
		}
		this._heap.pop();
		this._siftDown(top);
		return poppedValue;
	}
	getScore(value) {
		return this._scores[value];
	}
	decreaseScore(value, score) {
		this._scores[value] = score;
		const index = this._map[value.hash()];
		this._siftUp(index);
	}
	_less(i, j) {
		return this._scores[this._heap[i]] < this._scores[this._heap[j]];
	}
	_swap(i, j) {
		[this._heap[i], this._heap[j]] = [this._heap[j], this._heap[i]];
		this._map[this._heap[i].hash()] = i;
		this._map[this._heap[j].hash()] = j;
	}
	_siftUp(node) {
		while (node > top && this._less(node, parent(node))) {
			this._swap(node, parent(node));
			node = parent(node);
		}
	}
	_siftDown(node) {
		while (
			(left(node) < this.size() && this._less(left(node), node)) ||
			(right(node) < this.size() && this._less(right(node), node))
		) {
			let maxChild = (right(node) < this.size() && this._less(right(node), left(node))) ? right(node) : left(node);
			this._swap(node, maxChild);
			node = maxChild;
		}
	}
}
