const { Client } = require('tplink-smarthome-api'),
      fs = require('fs'),
      path = require('path'),
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
	plug.setPowerState(true);
	const sysinfo = await plug.getSysInfo();
	const _plug = {
		hwId: sysinfo.hwId,
		name: sysinfo.alias,
		ip: plug.host
	};
	powerPlugs[_plug.hwId] = _plug;
	savePlugs();
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
		
		const stats = await client.getPlug({host: plug.ip}).emeter.getRealtime();
		
//		const state = { watts: stats.power };
//		
//		if (state.watts > MIN_WATTS) {
//			state.lastTimeAboveMinWatts = Date.now();
//		}
//		
//		if (plug.state) {
//			
//			
//			
//		} else {
//			plug.state = state
//			state.lastTimeAboveMinWatts = Date.now();
//		}
//		

		if (plug.state) {
			
			const now = Date.now();
			
			if (stats.power < MIN_WATTS) {
				
				if (now - plug.state.lastTimeAboveMinWatts > SHUTDOWN_TIMEOUT) {
					log.info('== SHUTDOWN_TIMEOUT TRIGGERED ==');
					console.log();
				}
				
					
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
		
	}
}

setTimeout(function() {
	
	doMonitorCycle().then(() => {
		
	});

	
}, 5000);


//client.getPlug({host: '192.168.1.118'}).then((plug) => {
//	console.log(plug)
//});

//console.log(
//		client.getPlug({host: '192.168.1.118'}).emeter.get_realtime
//		)


		
//		console.log(client.getPlug({host: '192.168.1.118'}))

//		client.getPlug({host: '192.168.1.118'}).emeter.getRealtime().then(blah => {
//			console.log(blah)
//		})
		

