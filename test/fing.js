const util = require('util'),
      exec = util.promisify(require('child_process').exec),
      ip = require('ip'),
      log = require('../src/log')();

const myIp = ip.address();

async function discover() {
	log.info('discover online nodes...');
	function parseOutMapping(data) {
		const lines = data.trim().split('\n')
		return lines.reduce((result, line) => {
			line = line.substring(10);
			let idx = line.indexOf(' ');
			const ip = line.substring(0, idx);
			if (ip !== myIp) {
				const mac = line.substring(idx).replace(/[^\w]/g,'');
				result.push({ip, mac});
			}
			return result;
		}, []);	
	}
	const result = await exec('sudo fing --rounds 1 | grep "^|  UP"');
	return parseOutMapping(result.stdout);
}

//(async () => {
//	const ipToMac = await createIpToMacAddressMapping()
//	console.log(ipToMac);
//})().catch(err => console.log(err));

async function wakeUp(mac) {
	await exec(`sudo fing -w ${mac}`)
}

module.exports = {
	discover,
	wakeUp
}