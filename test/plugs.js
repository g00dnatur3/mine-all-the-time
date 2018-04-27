const { Client } = require('tplink-smarthome-api'),
      fs = require('fs'),
      path = require('path'),
      util = require('util'),
      setTimeoutPromise = util.promisify(setTimeout),
      log = require('../src/log')();

const client = new Client();

const powerPlugsFile = path.resolve(__dirname, 'powerPlugs.json');

const powerPlugs = loadPlugs();

log.info('== LOADED POWER PLUGS ==');
console.log(JSON.stringify(powerPlugs, null, 2));
console.log();

function savePlugs() {
	log.info(`saving plugs to -> ${powerPlugsFile}`);
	console.log();
	fs.writeFileSync(powerPlugsFile, JSON.stringify(powerPlugs));
}

function loadPlugs() {
	if (fs.existsSync(powerPlugsFile)) {
		log.info(`loading plugs from -> ${powerPlugsFile}`);
		try {
			const plugs = require(powerPlugsFile);
			Object.keys(plugs).forEach(key => delete plugs[key].state);
			return plugs;
		}
		catch (err) {
			log.err('!! FAILED TO LOAD POWER PLUGS')
			log.err(err)
			console.log();
		}
	}
	return {};
}

// Look for devices register and turn them on
client.startDiscovery().on('plug-new', async (plug) => {
	try {
		await plug.setPowerState(true);
		const sysinfo = await plug.getSysInfo();
		const _plug = {
			hwId: sysinfo.hwId,
			name: sysinfo.alias,
			ip: plug.host
		};
		powerPlugs[_plug.hwId] = _plug;
		savePlugs();	
	} catch (err) { log.err(err); }
});

const MIN_WATTS = 600;

// if the power is below MIN_WATTS for a period longer than SHUTDOWN_TIMEOUT
// then we shut off the power, assume miner crashed
const SHUTDOWN_TIMEOUT = 120 * 1000;

// monitor power consumption is not lower than 600W for more than 2mins
async function doMonitorCycle() {
	const keys = Object.keys(powerPlugs);
	for (let i=0; i<keys.length; i++) {
		const plug = powerPlugs[keys[i]];
		const plugApi = client.getPlug({host: plug.ip});
		const stats = await plugApi.emeter.getRealtime();
		if (stats.power < 40) continue; // do not manage wattage less than 40
		if (plug.state) {
			const now = Date.now();
			if (stats.power < MIN_WATTS) {
				if (now - plug.state.lastTimeAboveMinWatts > SHUTDOWN_TIMEOUT) {
					log.info('== SHUTDOWN_TIMEOUT TRIGGERED ==');
					console.log();
					await plugApi.setPowerState(false);
					await plugApi.setPowerState(true);
					delete plug.state;
				}
				plug.state.watts = stats.power
			} else {
				plug.state = {
					watts: stats.power,
					lastTimeAboveMinWatts: Date.now()
				}
			}
		} else {
			plug.state = {
				watts: stats.power,
				lastTimeAboveMinWatts: Date.now()
			}
		}
		log.info('== PLUG UPDATED ==');
		console.log(JSON.stringify(plug, null, 2));
		console.log();
	}
}

const MONITOR_INTERVAL = 20; // seconds

(async () => {
	while (true) {
		await doMonitorCycle();
		log.info(`sleeping for ${MONITOR_INTERVAL} seconds...`);
		console.log();
		await setTimeoutPromise(MONITOR_INTERVAL * 1000);
	}
})().catch(err => log.err(err));
