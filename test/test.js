
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

const plugs = {}

// Look for devices, log to console, and turn them on
client.startDiscovery().on('plug-new', async (plug) => {

	const sysinfo = await plug.getSysInfo();
	
//	plug.setPowerState(true);

	console.log(plug)
	
	const _plug = {
		hwId: sysinfo.hwId,
		name: sysinfo.alias,
		ip: plug.host
	};
	
	plugs[_plug.hwId] = _plug;
	
	
	
  
});

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
		

