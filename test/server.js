const fs = require('fs'),
	  util = require('util'),
	  express = require('express'),
      _powerOff = require('power-off'),
	  config = require('./config'),
	  log = require('../src/log')();
		  
const app = express()

app.get('/hello', (req, res) => {
	res.send(JSON.stringify(config));
});

function powerOff() {
	return new Promise((resolve, reject) => {
		_powerOff(function(err, stderr, stdout) {
			if (err) reject(err);
			else resolve();
		});
	})
}

app.post('/shutdown', async (req, res) => {
	try {
		// ONLY SHUTDOWN IF NOT CONNTECTED VIA WIFI
		const wifiExists = hasWifi();
		if (!wifiExists) await powerOff();
	} catch (err) { log.err(err) }
});

async function hasWifi() {
	const util = require('util')
	exec = util.promisify(require('child_process').exec)
	let wifi = false;
	try {
		const result = await exec('sudo iwconfig | grep "ESSID"');
		if (result.stdout) wifi = true;
	} catch (err) { log.err(`== NORMAL ERROR IF NO WIFI ==> ${err}`)}
	return wifi
}

app.listen(3000, () => console.log('control-server listening on port 3000'))