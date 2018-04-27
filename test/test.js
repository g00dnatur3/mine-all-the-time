
//const http = require('./http');
//
//(async () => {
//	
//
//	
//})().catch(err => console.log(err))

const { Client } = require('tplink-smarthome-api');

const client = new Client();

//const plug = client.getDevice({host: '10.0.1.2'}).then((device)=>{
//  device.getSysInfo().then(console.log);
//  device.setPowerState(true);
//});

// Look for devices, log to console, and turn them on
//client.startDiscovery().on('device-new', (device) => {
//
//	console.log(device.emter)
//  
//});

//client.getPlug({host: '192.168.1.118'}).then((plug) => {
//	console.log(plug)
//});

//console.log(
//		client.getPlug({host: '192.168.1.118'}).emeter.get_realtime
//		)

console.log(

		client.getPlug({host: '192.168.1.118'}).emeter.getRealtime().then(blah => {
			console.log(blah)
		})
		
)
