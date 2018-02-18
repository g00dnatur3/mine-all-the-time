const clc = require('cli-color');
const log = require('../src/log')(clc.bold('RUN_CMD'));
const { spawn } = require('child_process');

// example:
// fixes ['"echo', 'hello"'] to be ["echo hello"]
function prepareArgs(ARGS) {
	
	ARGS = ARGS.split(/\s+/);

	const _args = [];
	let lookingForEnding = null;
	let argStr = '';

	ARGS.forEach(arg => {
		if (!lookingForEnding) {
			if (arg.startsWith("'") && !arg.endsWith("'")) {
				lookingForEnding = "'";
				argStr += ` ${arg.substring(1)}`;
			}
			else if (arg.startsWith('"') && !arg.endsWith('"')) {
				lookingForEnding = '"';
				argStr += ` ${arg.substring(1)}`;
			}
			else {
				_args.push(arg);
			}
		}
		else {
			argStr += ` ${arg}`;
			if (arg.endsWith(lookingForEnding)) {
				argStr = argStr.trim();
				argStr = argStr.substring(0, argStr.length-1);
				_args.push(argStr);
				lookingForEnding = null;
				argStr = '';
			}
		}
	});
	
	return _args;
}

module.exports = (CMD, ARGS) => {

	if (ARGS) ARGS = prepareArgs(ARGS);
	else ARGS = [];
	
	log.info(`${CMD} ${ARGS.join(' ')}`);

	return new Promise((resolve, reject) => {
		const child = spawn(CMD, ARGS,{stdio: ['inherit', 'inherit', 'pipe']});
		child.stderr.on('data', data => log.warn(data.toString()));
		child.on('error', err => log.err(err));
		child.on('exit', code => {
			log.info(`exit code: ${code}`);
			resolve(code);
		});
	});
}