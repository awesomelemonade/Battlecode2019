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
