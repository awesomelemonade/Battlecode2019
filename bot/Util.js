import * as Library from './Library';

const X_SHIFT = 6;
const BITMASK = 0b111111;

export function encodePosition(position) {
	// position.x and position.y should have domain [0, 63]: 2^6-1
	return ((position.x & BITMASK) << X_SHIFT) | (position.y & BITMASK);
}

export function decodePosition(encodedPosition) {
	return new Library.Vector((encodedPosition >>> X_SHIFT) & BITMASK, encodedPosition & BITMASK);
}

// Pass in boolean array
export function isHorizontallySymmetric(array) {
	for (var x = 0; x < array.length; x++) {
		for (var y = 0; y < array[0].length / 2; y++) {
			if (array[x][y] !== array[x][array[0].length - y - 1]) {
				return false;
			}
		}
	}
	return true;
}

// Pass in boolean array
export function isVerticallySymmetric(array) {
	for (var x = 0; x < array.length / 2; x++) {
		for (var y = 0; y < array[0].length; y++) {
			if (array[x][y] !== array[array.length - x - 1][y]) {
				return false;
			}
		}
	}
	return true;
}