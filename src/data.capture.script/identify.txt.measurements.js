const fs = require('fs');

exports.execute = (sourcePath, module) => {
    const isMeasurement = sourcePath.match(module.measurementPattern);
    if (isMeasurement) {
        return identifyMeasurements(sourcePath, module)
    } else {
        const items = fs.readdirSync(sourcePath)
        const measurements = items.filter(item => item.match(module.measurementPattern))
            .map(item => identifyMeasurements(sourcePath + "/" + item, module))
            .flat(1)
        return measurements
    }
}

const identifyMeasurements = (source, module) => {
    const isDir = fs.lstatSync(source).isDirectory()
    if (!isDir)
        throw 'The source is not a directory'

    const measurements = [{
        "name": source.split('/').pop(),
        "source": source,
        "barcode": source.match(module.barcodePattern)[0]
    }]
    return measurements
}
