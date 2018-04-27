const request = require('request-promise-native');

module.exports = {

	doGET: (url) => {
        return request({
            method: 'GET',
            uri: url,
            json: true,
            resolveWithFullResponse: true,
            timeout: 5000
        });
	},

	doPOST: (url, body) => {
        return request({
            method: 'POST',
            uri: url,
            body: body,
            json: true,
            resolveWithFullResponse: true,
            timeout: 5000
        });
	}

}