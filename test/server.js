const fs = require('fs'),
	  util = require('util'),
	  express = require('express'),
      powerOff = require('power-off'),
	  config = require('./config');
		  
const app = express()

app.get('/hello', (req, res) => {
	res.send(JSON.stringify(config));
});

app.post('/shutdown', function(req, res) {
	powerOff(function(err, stderr, stdout) {
		if (err) {
		  util.log(err);
		  res.status(500).json({ error: 'Can\'t run power-off' });
		} else {
		  res.end();
		}
	});
});

//iwconfig | grep "ESSID"
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