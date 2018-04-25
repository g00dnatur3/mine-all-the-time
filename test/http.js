const request = require('request-promise-native');

module.exports = {

	doGET: (url) => {
        return request({
            method: 'GET',
            uri: url,
            json: true,
            resolveWithFullResponse: true
        });
	},

	doPOST: (url, body) => {
        return request({
            method: 'POST',
            uri: url,
            body: body,
            json: true,
            resolveWithFullResponse: true
        });
	}

}