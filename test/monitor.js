const fing = require('./fing'),
      http = require('./http'),
      log = require('../src/log')();

const defaultConfig = require('./config');
	
const port = 3000;

// we use a map to avoid duplicate, ip->node_object
const miningNodes = {}

async function discoverMiningNodes() {
	const nodes = await fing.discover();
	for (let i=0; i<nodes.length; i++) {
		const node = nodes[i]
		const url = `http://${node.ip}:${port}/hello`;
		try {
			log.info(`saying hello to node -> ${node.ip}`);
			const res = await http.doGET(url);
			log.info(`got response from node -> ${node.ip}`);
			const miningNode = Object.assign(node, defaultConfig, res.body);
			miningNodes[node.ip] = miningNode;
		} catch(err) {
			if (!err.name || err.name !== 'RequestError') log.err(err);
		}
		console.log();
	}
}

async function processNode(node) {
	const beginShutdown = node.shutdown.split('-')[0];
	const endShutdown = node.shutdown.split('-')[1];
	const currentHour = new Date().getHours();
	if (currentHour >= beginShutdown && currentHour < endShutdown) {
		// SEND REQUEST TO SHUT OFF COMPUTER
		console.log('== POWER-OFF-NODE VIA HTTP -> ' + node.ip);
	}
	else {
		// SEND WOL MAGIC PACKET TO TURN ON COMPUTER
		console.log('== POWER-ON-NODE VIA WOL -> ' + node.ip);
	}
}

(async () => {
	
	await discoverMiningNodes()
	
	for (ip in miningNodes) {
		processNode(miningNodes[ip]);
	}

})().catch(err => console.log(err))

//class Monitor {
//	constructor() {
//		//
//	}
//	start() {
//		
//	}
//	stop() {
//		
//	}
//}
//
//const mon = new Monitor()