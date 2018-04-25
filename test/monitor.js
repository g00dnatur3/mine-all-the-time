const fing = require('./fing');

const DEFAULT_SHUTDOWN = '16-21'
	
async function doInterval() {
	
	const nodes = await fing.discover();
	
}

class Monitor {
	constructor() {
		//
	}
	start() {
		
	}
	stop() {
		
	}
}

const mon = new Monitor()