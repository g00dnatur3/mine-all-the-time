const fing = require('./fing'),
      http = require('./http'),
      fs = require('fs'),
      path = require('path'),
      exitHook = require('exit-hook'),
      log = require('../src/log')();

const defaultConfig = require('./config');

const miningNodesFile = path.resolve(__dirname, 'miningNodes.json');
	
const port = 3000;

const miningNodes = loadMiningNodes();
log.info('== LOADED MINING NODES ==')
console.log(JSON.stringify(miningNodes, null, 2));

exitHook(() => {
	log.info('exitHook');
	log.info(`saving nodes to -> ${miningNodesFile}`);
	fs.writeFileSync(miningNodesFile, JSON.stringify(miningNodes));
});

function loadMiningNodes() {
	if (fs.existsSync(miningNodesFile)) {
		log.info(`loading nodes from -> ${miningNodesFile}`);
		return require(miningNodesFile);
	} else {
		return {};
	}
}

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
		log.info('== POWER-OFF-NODE VIA HTTP -> ' + node.ip);
		try {
			await http.doPOST(`http://${node.ip}:${port}/shutdown`)
		} catch(err) { log.err(err); }
	}
	else {
		// SEND WOL MAGIC PACKET TO TURN ON COMPUTER
		log.info('== POWER-ON-NODE VIA WOL -> ' + node.ip);
		try {
			await fing.wakeUp(node.mac);
		} catch (err) { log.err(err); }
	}
}

(async () => {
	
//	await discoverMiningNodes()
//	
//	for (ip in miningNodes) {
//		processNode(miningNodes[ip]);
//	}

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