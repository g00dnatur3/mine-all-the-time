const fing = require('./fing'),
      http = require('./http'),
      fs = require('fs'),
      path = require('path'),
      exitHook = require('exit-hook'),
      util = require('util'),
      exec = util.promisify(require('child_process').exec),
      log = require('../src/log')();

const defaultConfig = require('./config');

const miningNodesFile = path.resolve(__dirname, 'miningNodes.json');
	
const port = 3000;

const miningNodes = loadMiningNodes();

log.info('== LOADED MINING NODES ==')
console.log(JSON.stringify(miningNodes, null, 2));
console.log();

exitHook(() => {
	log.info('exitHook');
	saveNodes();
});

function saveNodes() {
	log.info(`saving nodes to -> ${miningNodesFile}`);
	fs.writeFileSync(miningNodesFile, JSON.stringify(miningNodes));
}

function loadMiningNodes() {
	if (fs.existsSync(miningNodesFile)) {
		log.info(`loading nodes from -> ${miningNodesFile}`);
		return require(miningNodesFile);
	} else {
		return {};
	}
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
}

async function processNode(node) {
	const beginShutdown = node.shutdown.split('-')[0];
	const endShutdown = node.shutdown.split('-')[1];
	const currentHour = new Date().getHours();
	if (currentHour >= beginShutdown && currentHour < endShutdown) {
		// SEND REQUEST TO SHUT OFF COMPUTER
		log.info('== SENDING SHUTDOWN REQUEST TO NODE -> ' + node.ip);
		console.log()
		try {
			await http.doPOST(`http://${node.ip}:${port}/shutdown`)
		} catch(err) { log.err(err); }
	}
	else {
		// SEND WOL MAGIC PACKET TO TURN ON COMPUTER
		log.info('== SENDING WAKE-UP (WOL) TO NODE => ' + node.mac);
		console.log()
		try {
			await fing.wakeUp(node.mac);
		} catch (err) { log.err(err); }
	}
}

const MONITOR_INTERVAL = 120;

async function doMonitorCycleLoop() {
	log.info('== START MONITOR_CYCLE ==> ' + new Date())
	console.log();
	await discoverMiningNodes()
	log.info('== CURRENT MINING NODES ==> ' + new Date())
	console.log(miningNodes)
	console.log()
	for (ip in miningNodes) {
		await processNode(miningNodes[ip]);
	}
	log.info('== END MONITOR_CYCLE ==> ' + new Date())
	console.log()
	//setTimeout(doMonitorCycleLoop, MONITOR_INTERVAL)
	log.info(`sleeping for ${MONITOR_INTERVAL} seconds`);
	await exec(`sleep ${MONITOR_INTERVAL}`);
	await doMonitorCycleLoop();
}

doMonitorCycleLoop()
