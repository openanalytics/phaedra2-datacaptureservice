const util = require('node:util');
const exec = util.promisify(require('node:child_process').exec);

const identifyCmd = process.env.IM_IDENTIFY_EXEC;

exports.identify = async (filePath) => {
    let output = await exec(identifyCmd + ' ' + filePath);
    let pattern = /.* \w+ (\d+)x(\d+) .* (\d+)\-bit .*/i;
    let matchInfo = pattern.exec(output.stdout);
    if (!matchInfo) throw "Failed to identify image " + filePath;

    output = await exec(identifyCmd + ' -format "%k" ' + filePath);

    return {
        width: matchInfo[1],
        height: matchInfo[2],
        depth: matchInfo[3],
        colors: parseInt(output.stdout)
    };
};