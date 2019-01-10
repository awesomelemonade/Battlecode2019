export class Vector {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}
	add(vector) {
		return new Vector(this.x + vector.x, this.y + vector.y);
	}
	hash() {
		return this.x * 9999 + this.y;
	}
}
