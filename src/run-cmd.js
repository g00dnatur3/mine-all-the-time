const clc = require('cli-color');
const log = require('../src/log')(clc.bold('RUN_CMD'));
const { spawn } = require('child_process');

// example:
// fixes ['"echo', 'hello"'] to be ["echo hello"]
function prepareArgs(ARGS) {
	
	ARGS = ARGS.split(/\s+/);

	const _args = [];
	let quotes = null;
	let argStr = '';

	ARGS.forEach(arg => {
		if (!quotes) {
			if (arg.startsWith("'") && !arg.endsWith("'")) {
				quotes = "'";
				argStr += ` ${arg.substring(1)}`;
			}
			else if (arg.startsWith('"') && !arg.endsWith('"')) {
				quotes = '"';
				argStr += ` ${arg.substring(1)}`;
			}
			else {
				_args.push(arg);
			}
		}
		else {
			argStr += ` ${arg}`;
			if (arg.endsWith(quotes)) {
				argStr = argStr.trim();
				argStr = argStr.substring(0, argStr.length-1);
				_args.push(argStr);
				quotes = null;
				argStr = '';
			}
		}
	});
	
	return _args;
}

module.exports = (CMD, ARGS=null, opts={onStderr: null, onStdout: null}) => {

	if (ARGS) ARGS = prepareArgs(ARGS);
	else ARGS = [];
	
	log.info(`${CMD} ${ARGS.join(' ')}`);
	
	const stdio = (!opts.onStdout) ? ['inherit', 'inherit', 'pipe'] : ['inherit', 'pipe', 'pipe'];
	opts = Object.assign(opts, {stdio: stdio});

	return new Promise((resolve, reject) => {
		const child = spawn(CMD, ARGS, opts);
		if (opts.onStdout) {
			child.stdout.on('data', data => {
				data = data.toString(), log.info(data);
				if (opts.onStdout) opts.onStdout(data);
			});
		}
		child.stderr.on('data', data => {
			data = data.toString(), log.warn(data);
			if (opts.onStderr) opts.onStderr(data);
		});
		child.on('error', err => log.err(err));
		child.on('exit', code => {
			console.log();
			const maxLength = 80;
			const _cmd = `${CMD} ${ARGS.join(' ')}`.substring(0,maxLength);
			let dotdotdot = _cmd.length === maxLength ? '...' : '';
			log.info(`${clc.bold('EXIT_CODE: '+code)}, CMD: ${_cmd + dotdotdot}`);
			resolve(code);
		});
	});
}