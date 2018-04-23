const util = require('util');
const exec = util.promisify(require('child_process').exec);

async function createIpToMacAddressMapping() {
	function parseOutMapping(data) {
		const lines = data.trim().split('\n')
		return lines.reduce((result, line) => {
			line = line.substring(10);
			let idx = line.indexOf(' ');
			const ip = line.substring(0, idx);
			const mac = line.substring(idx).replace(/[^\w]/g,'');
			result[ip] = mac;
			return result;
		}, {});	
	}
	const result = await exec('sudo fing --rounds 1 | grep "^|  UP"')
	return parseOutMapping(result.stdout)
}

(async () => {
	const ipToMac = await createIpToMacAddressMapping()
	console.log(ipToMac);
})().catch(err => console.log(err));