const fing = require('./fing'),
      http = require('./http'),
      fs = require('fs'),
      path = require('path'),
      util = require('util'),
      setTimeoutPromise = util.promisify(setTimeout),
      log = require('../src/log')();

const defaultConfig = require('./config');

const miningNodesFile = path.resolve(__dirname, 'miningNodes.json');
	
const port = 3000;

const miningNodes = loadMiningNodes();

log.info('== LOADED MINING NODES ==')
console.log(JSON.stringify(miningNodes, null, 2));
console.log();

function saveNodes() {
	log.info(`saving nodes to -> ${miningNodesFile}`);
	console.log();
	fs.writeFileSync(miningNodesFile, JSON.stringify(miningNodes));
}

function loadMiningNodes() {
	if (fs.existsSync(miningNodesFile)) {
		log.info(`loading nodes from -> ${miningNodesFile}`);
		try {
			const _nodes = require(miningNodesFile);
			Object.keys(_nodes).forEach(key => {
				_nodes[key].online = false;
			});
			return _nodes;	
		}
		catch (err) {
			log.err('!! FAILED TO LOAD MINING NODES')
			log.err(err)
			console.log();
		}
	}
	return {};
}


function setMiningNodesOffline() {
	for (ip in miningNodes) {
		miningNodes[ip].online = false;
	}
}

async function discoverMiningNodes() {
	// assume nodes go offline all the time
	setMiningNodesOffline();
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
			miningNodes[node.ip].online = true;
		} catch(err) {
			if (!err.name || err.name !== 'RequestError') log.err(err);
		}
		console.log();
	}
	saveNodes();
}

async function processNode(node) {
	
	log.info('== PROCESS_NODE ==> ' + node.ip);
	console.log();
	
	const dayOfWeek = new Date().getDay();
	log.info('dayOfWeek -> ' + dayOfWeek);
	console.log();
	
	if (dayOfWeek === 0 || dayOfWeek === 6) {
		log.info('== ITS THE WEEKEND BABY, MINE ALL THE TIME ==');
		console.log();
		if (node.online === false) {
			// SEND WOL MAGIC PACKET TO TURN ON COMPUTER
			log.info('== SENDING WAKE-UP (WOL) TO NODE => ' + node.mac);
			console.log()
			try {
				await fing.wakeUp(node.mac);
			} catch (err) { log.err(err); }
		}
		return;
	}
	
	const beginShutdown = node.shutdown.split('-')[0];
	const endShutdown = node.shutdown.split('-')[1];
	const currentHour = new Date().getHours();
	
	log.info('currentHour -> ' + currentHour);
	log.info('beginShutdown -> ' + beginShutdown);
	log.info('endShutdown -> ' + endShutdown);
	console.log()
	
	if (currentHour >= beginShutdown && currentHour < endShutdown) {
		// SEND REQUEST TO SHUT OFF COMPUTER
		log.info('== SENDING SHUTDOWN REQUEST TO NODE -> ' + node.ip);
		console.log();
		try {
			await http.doPOST(`http://${node.ip}:${port}/shutdown`)
		} catch(err) { log.err(err); console.log(); }
	}
	else if (node.online === false) {
		// SEND WOL MAGIC PACKET TO TURN ON COMPUTER
		log.info('== SENDING WAKE-UP (WOL) TO NODE => ' + node.mac);
		console.log()
		try {
			await fing.wakeUp(node.mac);
		} catch (err) { log.err(err); }
	}
}

const MONITOR_INTERVAL = 90; // seconds

async function doMonitorCycle() {
	console.log(Array(80).join('-'));
	console.log();
	log.info('== START MONITOR_CYCLE ==> ' + new Date());
	console.log();
	await discoverMiningNodes();
	log.info('== CURRENT MINING NODES ==> ' + new Date());
	console.log(miningNodes);
	console.log();
	for (ip in miningNodes) {
		await processNode(miningNodes[ip]);
	}
	log.info('== END MONITOR_CYCLE ==> ' + new Date());
	console.log();
}

(async () => {
	while (true) {
		await doMonitorCycle();
		log.info(`sleeping for ${MONITOR_INTERVAL} seconds...`);
		console.log();
		await setTimeoutPromise(MONITOR_INTERVAL * 1000);
	}
})().catch(err => log.err(err));
