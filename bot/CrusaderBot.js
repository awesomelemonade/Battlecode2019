

export class CrusaderBot {
	constructor(controller) {
		this.controller = controller;
		init();
	}
	function init() {
		
	}
	function turn() {
		this.controller.log("A Crusader Turn");
		const choices = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
		const choice = choices[Math.floor(Math.random() * choices.length)]
		return this.controller.move(...choice);
	}
}

