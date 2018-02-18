const log = require('./log')();
const util = require('util');
const exec = util.promisify(require('child_process').exec);

// the fastest and most accurate getType I have come accross...
if (!Object.getType) {
	Object.getType = (function(global) {
		const cache = {};
		return function getType(obj) {
	    	var key;
	    	return obj === null ? 'null' // null
	        	: obj === global ? 'global' // window in browser or global in nodejs
	        	: (key = typeof obj) !== 'object' ? key // basic: string, boolean, number, undefined, function
	        	: obj.nodeType ? 'object' // DOM element
	        	: cache[key = Object.prototype.toString.call(obj)] // cached. date, regexp, error, object, array, math
	        	|| (cache[key] = key.slice(8, -1).toLowerCase()); // get XXXX from [object XXXX], and cache it
		};
	}(this));
}

const logAndThrow = (_log, err) => {
	if (!_log) _log = log;
	_log.err(err);
	throw err;
}

const _logAndThrow = logAndThrow.bind(null, log);

const injectOptionalOpts = (OPTIONAL_OPTS, opts) => {
	// inject defaults for optional opts if not found
	for (name in OPTIONAL_OPTS) {
		if (!opts[name]) opts[name] = OPTIONAL_OPTS[name]; // default val
		else {
			const expectType = Object.getType(OPTIONAL_OPTS[name]);
			const actualType = Object.getType(opts[name]);
			if (actualType !== expectType) {
				const err = `optional opt: ${name}, must be of type: ${expectType}, got: ${actualType}`;
				_logAndThrow(err);
			}
		}
	}
}

const checkRequiredOpts = (REQUIRED_OPTS, opts) => {
	const missing = [];
	// CHECK
	REQUIRED_OPTS.forEach(opt => {
		const name = opt.split(':')[0];
		const type = opt.split(':')[1];
		if (opts[name] === undefined || opts[name] === null) {
			missing.push(opt);
		} else {
			const givenType = Object.getType(opts[name]);
			if (givenType !== type) {
				const err = `required opt: ${name}, must be of type: ${type}, got: ${givenType}`;
				_logAndThrow(err);
			}
		}
	});
	if (missing.length > 0) {
		_logAndThrow('missing required opts: ' + missing.join(','));
	}
}

const killProcess = (process, name) => {
	return new Promise((resolve, reject) => {
		if (!name) name = process.pid;
		let isExited = false;
		process.once('exit', () => {
			isExited = true;
			log.info(`${name} process exited`);
			resolve();
		});
		// try for graceful exit
		process.kill('SIGINT');
		// give ten seconds for graceful exit
		// if not exited, sigkill it
		setTimeout(() => {
			if (!isExited) {
				log.warn(`${name} process did not exit yet, sending SIGKILL`);
				process.kill('SIGKILL');
			}
		}, 10000);
	})
}

const httpError = (status, msg) => {
	const err = new Error(msg);
	err.status = status;
	return err;
}

module.exports = {

	logAndThrow: arg => {
		if (Object.getType(arg) === 'string') {
			// arg is an err, give warning of improper usage
			log.warn('logAndThrow - pass in your log and i will return a function binded to your log');
			logAndThrow(null, arg);
		}
		else {
			// arg must be a log if not a string
			return logAndThrow.bind(null, arg);
		}
	},

	checkRequiredOpts: checkRequiredOpts,

	killProcess: killProcess,

	injectOptionalOpts: injectOptionalOpts,

	httpError: httpError,

	exec: exec,

	deepClone: obj => JSON.parse(JSON.stringify(obj)),

	log: require('./log')
}