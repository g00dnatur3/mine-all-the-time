const log = require('./log')(),
      utils = require('./utils'),
      path = require('path'),
      { spawn } = require('child_process'),
      { execSync } = require('child_process'),
      runCmd = require('./run-cmd'),
      util = require('util'),
      argv = require('yargs').argv


const walletId = 't1KNQeq8pAUQi3aSJfbGGg9MaGXRU7SiT73';

const miners = {
    dstm: path.resolve(__dirname, '../miners/dstm_0.5.7/zm'),
    ewbf: path.resolve(__dirname, '../miners/ewbf/miner')
}

function checkRequiredArgs() {
    if (!argv.worker) throw '--worker arg required';
    if (!argv.miner) throw '--miner arg required';
    if (!argv.powerLimit) throw '--power-limit arg required';
    if (!miners[argv.miner]) {
        const supported = Object.keys(miners).join(', ');
        throw `--miner invalid, supported miners --> ${supported}`
    }
}

function getPowerLimit(cmd) {
    let val = execSync(cmd);
    val = val.toString().trim().split(':')[1].replace('W', '').trim();
    return parseInt(val);
}

function minPowerLimit(gpu) {
    return getPowerLimit(`nvidia-smi -i ${gpu} -q | grep -E "^\\s*Min Power Limit"`);
}

function gpuCount() {
    return execSync('nvidia-smi -L').toString().split('\n').length-1;
}

async function setOverclock(gpu) {
    await runCmd('nvidia-settings', `-a [GPU:${gpu}]/GPUGraphicsClockOffset[3]=80`);
    await runCmd('nvidia-settings', `-a [gpu:${gpu}]/GPUMemoryTransferRateOffset[3]=800`);
}

async function setPowerLimit(gpu) {
    const min = minPowerLimit(gpu);
    let target = (argv.powerLimit/100) * (min*2);
    if (target < min) {
        log.warn(`cannot set gpu ${gpu} power below min(${target}), setting to min instead.`);
        target = min;
    }
    await runCmd('sudo', `nvidia-smi -i ${gpu} -pl ${target}`);
}

const restartNetwork = (() => {
  const TWO_MIN = 60 * 1000 * 2;
  let lastReset = null;
  const reset = () => {
    log.info('!!! RESTARTING NETWORK !!!');
    lastReset = Date.now();
    runCmd('sudo', '/etc/init.d/network-manager restart');
  }
  return function() {
    if (!lastReset) reset();
    else if (Date.now() - lastReset > TWO_MIN) reset();
  }
})();

async function startMinning() {
    const cmd = miners[argv.miner],
          server = 'us1-zcash.flypool.org',
          user = `${walletId}`,
          pass = '2000',
          port = 3333;
    let args = `--server ${server} --user ${user} --pass ${pass} --port ${port}`
    if (argv.miner === 'ewbf') {
        args = args.concat(' --fee 0');
    }
    if (argv.miner === 'dstm') {
      const cwd = path.dirname(miners[argv.miner]);
      utils.killAllProcessesWithNameSync('myshare');
      runCmd('sudo', `${cwd}/myshare ${walletId}`, {cwd: cwd});
    }

    let prevData = null

    const onStderr = data => {
      let _data;
      if (prevData) _data = prevData + data;
      else _data = data.toString();
      // we check a a buffer of twos, just incase the
      // what we are seaching for spans two buffs
      prevData = data;
      if (_data.indexOf('Network is unreachable') !== -1) {
        restartNetwork();
      }
      if (_data.indexOf('ssl timeout r:2') !== -1) {
        restartNetwork();
      }
      if (_data.indexOf('send timeout') !== -1) {
        restartNetwork();
      }
    }

    runCmd(cmd, args, {onStderr: onStderr})
    .then(exitCode => {
      setTimeout(startMinning, 10000);
    });
}

(async () => {

    checkRequiredArgs();

    const count = gpuCount();

    for (let i=0; i<count; i++) {
        await setPowerLimit(i);
        await setOverclock(i);
    }

    await startMinning();

})().catch(err => log.err(err));
