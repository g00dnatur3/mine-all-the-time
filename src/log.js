const util = require('util');
const clc = require('cli-color');
const argv = require('yargs').argv;
const path = require('path');

// do not move this function to anther file, it will break functionality
function getCallerFile() {
    let originalFunc = Error.prepareStackTrace;
    let callerfile;
    try {
        const err = new Error();
        Error.prepareStackTrace = function (err, stack) { return stack; };
        const currentfile = err.stack.shift().getFileName();
        while (err.stack.length) {
            callerfile = err.stack.shift().getFileName();
            if(currentfile !== callerfile) break;
        }
    } catch (e) {}
    Error.prepareStackTrace = originalFunc;
    return callerfile;
}

const IS_DEBUG = argv.debug,

      TAG = "MATT",

      DEBUG = clc.blue("[DEBUG]"),

      INFO = clc.green("[INFO]"),

      WARN = clc.xterm(208)("[WARN]"),

      ERR = clc.red("[ERROR]");

module.exports = (tag) => {

    if (!tag) tag = TAG + '.' + path.basename(getCallerFile()).replace('.js', '');
    else tag = TAG + '.' + tag;

    return {

        output: console,

        debug(msg) {
            if (!IS_DEBUG) return;
            this.output.log(util.format("%s [%s] %s", DEBUG, tag, msg));
        },

        info(msg) {
            this.output.log(util.format("%s [%s] %s", INFO, tag, msg));
        },

        warn(msg) {
            this.output.warn(util.format("%s [%s] %s", WARN, tag, msg));
        },

        err(msg) {
            this.output.error(util.format("%s [%s] %s", ERR, tag, msg));
        }

    }
}