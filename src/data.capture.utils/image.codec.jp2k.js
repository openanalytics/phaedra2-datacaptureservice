const util = require('node:util');
const exec = util.promisify(require('node:child_process').exec);

const imagingLib = process.env.PH2_IMAGING_LIB;

const defaultConfig = {
    reversible: false,
    psnr: 70
};

exports.encode = async (inPath, outPath, config) => {
    if (!config) config = defaultConfig;

    let cmd = "java -jar " + imagingLib
        + " encode -i " + inPath + " -o " + outPath
        + " -reversible " + (config.reversible || defaultConfig.reversible)
        + (config.depth ? (" -depth " + config.depth) : "");
    
    try {
        const { stdout } = await exec(cmd);
        console.log(stdout);
    } catch (err){ 
        console.log(err.stderr.toString());
    }
};