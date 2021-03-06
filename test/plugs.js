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
	fs.writeFileSync(powerPlugsFile, JSON.stringify(powerPlugs, null, 2));
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
			hwId: sysinfo.deviceId,
			name: sysinfo.alias,
			ip: plug.host
		};
		// console.log()
		// log.info(`>> NEW_PLUG_DISCOVERED >>`)
		// console.log('=================================')
		// console.log(sysinfo)
		// console.log('=================================')
		// console.log()
		powerPlugs[_plug.hwId] = _plug;
		savePlugs();
	} catch (err) { log.err(err); }
});

const MIN_POWER_12 = 1280;
const MAX_POWER_12 = 1360;

const MIN_POWER_6 = 680;
const MAX_POWER_6 = 760;

const SHUTDOWN_TIMEOUT = 95 * 1000;

const NAMES_POWER_6 = [
	'Etherminer3',
	'Ethermine3'
]

const NAMES_POWER_12 = [
	'Etherminer1',
	'Ethemine1',
	'Etherminer2',
	'Ethemine2'
]

async function doMonitorCycle() {
	const keys = Object.keys(powerPlugs);
	for (let i=0; i<keys.length; i++) {
		const plug = powerPlugs[keys[i]];

		//if (plug.name !== 'Etherminer1') continue

		let _minPower = null
		let _maxPower = null

		if (NAMES_POWER_6.includes(plug.name)) {
			log.info(`using *_POWER_6 (name=${plug.name})`)
			_minPower = MIN_POWER_6
			_maxPower = MAX_POWER_6
			log.info('_minPower ==> ' + _minPower)
			log.info('_maxPower ==> ' + _maxPower)
			console.log()
		}

		if (NAMES_POWER_12.includes(plug.name)) {
			log.info(`using *_POWER_12 (name=${plug.name})`)
			_minPower = MIN_POWER_12
			_maxPower = MAX_POWER_12
			console.log()
		}

		if (!_minPower || !_maxPower) {
			log.info(`_minPower or _maxPower is null - ${plug.name}, continue...`)
			console.log()
		    await plugApi.setPowerState(false);
		    await setTimeoutPromise(2000);
		    continue;
		}

		const plugApi = client.getPlug({host: plug.ip});
		const stats = await plugApi.emeter.getRealtime();
		
        console.log()
        log.info(`CURRENT_POWER ==> ${plug.name}: ${stats.power}w`)
        console.log()

        const now = Date.now()

		// ==============================
		if (stats.power > _maxPower) {
		// ==============================
			log.info(`SHUTDOWN TRIGGERED ==> stats.power > _maxPower - ${plug.name} - ${new Date().toLocaleString()}, continue...`)
			console.log()
		    await plugApi.setPowerState(false);
		    await setTimeoutPromise(2000);
		    continue;
        }

        if (stats.power < 60) {
        	// computer is likely just booting up...
			delete plug.state;
			continue;
		}
		
		if (plug.state) {
			
			//console.log(`stats.power: ${stats.power} | _minPower: ${_minPower}`)
			// ===============================
			if (stats.power < _minPower) {
			// ===============================

				if (now - plug.state.lastTimeAboveMinWatts > SHUTDOWN_TIMEOUT) {

					log.info(`== SHUTDOWN_TIMEOUT TRIGGERED ==> ${plug.name} - ${new Date().toLocaleString()}`);
					console.log();
					await plugApi.setPowerState(false);
					await setTimeoutPromise(2000);
					await plugApi.setPowerState(true);
					delete plug.state;

				} else {
					plug.state.watts = stats.power
				}

			} 
			else {
				plug.state = {
					watts: stats.power,
					lastTimeAboveMinWatts: now
				}
			}

		} else {
			plug.state = {
				watts: stats.power,
				lastTimeAboveMinWatts: now
			}
		}
		
		log.info('== PLUG UPDATED ==');
		console.log(JSON.stringify(plug, null, 2));
		console.log();
	}
}

const MONITOR_INTERVAL = 30; // seconds

(async () => {
	while (true) {
		try {
			await doMonitorCycle();
		}
		catch (err) { log.err(err); console.log(); }
		log.info(`sleeping for ${MONITOR_INTERVAL} seconds...`);
		console.log();
		await setTimeoutPromise(MONITOR_INTERVAL * 1000);
	}
})().catch(err => log.err(err));
