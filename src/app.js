const log = require('./log')(),
      utils = require('./utils'),
      path = require('path'),
      { spawn } = require('child_process'),
      { execSync } = require('child_process'),
      runCmd = require('./run-cmd'),
      util = require('util'),
      argv = require('yargs').argv

const miners = {
    dstm: path.resolve(__dirname, '../miners/dstm/zm'),
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

async function startMinning() {
    const cmd = miners[argv.miner],
          server = 'us1-zcash.flypool.org',
          user = `t1UbXqBkGTsx5QZW9bvafRYj4navLTVtZPm.${argv.worker}`,
          pass = '1600',
          port = 3333;
    let args = `--server ${server} --user ${user} --pass ${pass} --port ${port}`
    if (argv.miner === 'ewbf') {
        args = args.concat(' --fee 0');
    }
    await runCmd(cmd, args);
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