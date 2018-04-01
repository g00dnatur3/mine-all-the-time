const log = require('./log')();
const util = require('util');
const { execSync } = require('child_process');

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

function killAllProcessesWithNameSync(names) {
	const killall = name => {
		try {
			var result = execSync('ps -A | grep ' + name).toString();
			result.split('\n').forEach(function(line) {
				line = line.trim();
				var pid = line.substring(0, line.indexOf(' '));
				if (pid.length > 0) {
					log.info('[killAllWithName] killing -9 ' + name + ', pid: ' + pid);
					execSync('sudo kill -9 ' + pid);
				}
			})
		} catch (err) {
			err = err.toString();
			if (err.indexOf('Command failed') === -1) {
				console.log(err);
			} else {
				//here if no processes with name
			}
		}
	}
	if (typeof names === 'string') {
		killall(names);
	} else {
		names.forEach(function(name) {
			killall(name);
		});
	}
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

	killAllProcessesWithNameSync: killAllProcessesWithNameSync,

	injectOptionalOpts: injectOptionalOpts,

	deepClone: obj => JSON.parse(JSON.stringify(obj)),

	log: require('./log')
}