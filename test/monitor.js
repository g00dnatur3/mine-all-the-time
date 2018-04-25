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

(async () => {
	
	//await http.doGET('http://'+)
	
	await doInterval()
	
	console.log('end')
	
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