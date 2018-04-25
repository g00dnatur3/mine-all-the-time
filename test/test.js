
const http = require('./http');

(async () => {
	
	const res = await http.doGET('http://www.google.com')
	
	console.log(res)
	
})().catch(err => console.log(err))