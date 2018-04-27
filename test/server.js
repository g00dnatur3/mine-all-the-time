const fs = require('fs'),
	  util = require('util'),
	  express = require('express'),
      _powerOff = require('power-off'),
	  config = require('./config'),
	  log = require('../src/log')();
		  
const app = express();

const isWin = process.platform === 'win32';

app.get('/hello', (req, res) => {
	log.info('== HELLO REQUESTED ==');
	console.log();
	res.send(JSON.stringify(config));
});

function powerOff() {
	log.info('== POWER OFF ==');
	console.log();
	return new Promise((resolve, reject) => {
		_powerOff(function(err, stderr, stdout) {
			if (err) reject(err);
			else resolve();
		});
	})
}

app.post('/shutdown', async (req, res) => {
	log.info('== SHUTDOWN REQUESTED ==');
	console.log();
	try {
		// ONLY SHUTDOWN IF NOT CONNTECTED VIA WIFI
		const wifiExists = hasWifi();
		log.info(`wifiExists -> ${wifiExists}`);
		console.log();
		if (!wifiExists) {
			await powerOff();
		}
		res.status(200).send();
	} catch (err) { log.err(err) }
});

async function hasWifi() {
	const util = require('util')
	exec = util.promisify(require('child_process').exec)
	let wifi = false;
	try {
		if (isWin) {
			const result = await exec('netsh wlan show interfaces');
			const noWifiText = 'no wireless interface on the system';
			if (result.stdout.indexOf(noWifiText) === -1) wifi = true;
		} else {
			const result = await exec('sudo iwconfig | grep "ESSID"');
			if (result.stdout) wifi = true;
		}
	} catch (err) { log.err(`== NORMAL ERROR IF NO WIFI ==> ${err}`)}
	return wifi
}

app.listen(3000, () => console.log('control-server listening on port 3000'))