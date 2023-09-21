const fs = require('fs');

exports.execute = (sourcePath, module) => {
    const items = fs.readdirSync(sourcePath)
    const measurements = items.filter(item => item.match(module.measurementPattern))
        .map(item => identifyMeasurements(sourcePath + "/" + item, module))
        .flat(1)
    return measurements
}

const identifyMeasurements = (source, module) => {
    const isFile = fs.lstatSync(source).isFile()
    if (!isFile)
        throw 'The source is not a file'

    // Read the csv file
    const data = fs.readFileSync(source, {encoding: 'utf-8'})
    const dataLines = data.split(module.dataLineSeparator || '\n')

    const startIndex = findPlateInformationStartIndex(dataLines, module.startLinePlateInfoPattern)
    if (startIndex < 0) return []

    const endIndex = findPlateInformationEndIndex(dataLines, startIndex, module.endLinePlateInfoPattern)

    const [plateInfoHeaders, ...plateInfoData] = dataLines.slice(startIndex + 1, endIndex).filter(pid => pid !== '')
    const plateBarcodes = plateInfoData.map(plateInfo => {
        const [plateNr, repeat, barcode, ...other] = plateInfo.split(module.columnSeparator || ',');
        return barcode;
    });

    const barcodePattern = new RegExp(module.barcodePattern);
    const measurements = plateBarcodes.filter(pb => barcodePattern.test(pb)).map(pb => {
        return {
            "name": source.split('/').pop(),
            "source": source,
            "barcode": pb
        }
    })
    return measurements
}

function findPlateInformationStartIndex(dataLines, startLinePattern) {
    for (let i = 0; i < dataLines.length; i++) {
        if (dataLines[i].startsWith(startLinePattern)) {
            return i;
        }
    }
    return -1
}

const findPlateInformationEndIndex = (dataLines, startIndex, endLinePattern) => {
    for (let i = startIndex; i < dataLines.length; i++) {
        if (dataLines[i] === "" || dataLines[i].match(endLinePattern)) {
            return i
        }
    }
    return -1
}
