
exports.execute = async (measurement, module) => {
    const parserId = module.parserId;
    if (!parserId)
        throw 'Cannot parse well data: no parserId specified';

    const parser = require(`../data.capture.parser/${parserId}`);
    return await parser.parse(measurement, module);
}
