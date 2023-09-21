'use strict';

const fs = require('fs');
const path = require('path');
const captureUtils = require('../data.capture.utils/capture.utils');

exports.parse = (sourcePath, dcConfig) => {
    const isFile = fs.lstatSync(sourcePath).isFile();
    if (!isFile)
        throw 'The source is not a file';

    // Read the csv file
    const data = fs.readFileSync(sourcePath, {encoding: 'utf-8'});
    // Extract the plate barcode from the csv file
    let measurements = [];

    const headers = findHeaderLine(data, dcConfig)
    if (headers) {
        const wellData = findWellData(data, dcConfig)
        const plates = extractPlateBarcodes(wellData, headers, dcConfig)

        for (let i = 0; i < plates.length; i++) {
            const measurement = createMeasurement(plates[i], headers, wellData, dcConfig)
            measurement["name"] = path.dirname(sourcePath) + '/' + path.basename(sourcePath, '.csv');
            measurements.push(measurement);
        }
    }
    return measurements;
};

const findHeaderLine = (data, dcConfig) => {
    const dataLines = data.split(dcConfig.wellData.dataLineSeparator);
    const headerLine = dataLines.find((dl) => { return dl.startsWith(dcConfig.wellData.headerLinePattern) ? dl : null })
    return headerLine ? headerLine.split(dcConfig.wellData.columnSeparator) : null
}

const findWellData = (data, dcConfig) => {
    const allDataLines = data.split(dcConfig.wellData.dataLineSeparator)
    const wellDataLines = allDataLines.filter((dl) => !dl.startsWith(dcConfig.wellData.headerLinePattern))
    return wellDataLines
}

const extractPlateBarcodes = (wellData, headers, dcConfig) => {
    const plateBarcodeIndex = headers.indexOf(dcConfig.barcodeColumnPattern)
    const plateBarcodes = wellData.map((wdl) => wdl.split(dcConfig.wellData.columnSeparator)[plateBarcodeIndex])
    return plateBarcodes.filter((p, i, a) => p !== "" && a.indexOf(p) === i)
}

function createMeasurement(plateBarcode, headers, wellData, dcConfig) {
    let measurement = {};
    measurement["barcode"] = plateBarcode;

    const plateBarcodeIndex = headers.indexOf(dcConfig.barcodeColumnPattern)
    const plateDataLines = wellData.map((wdl) => wdl.split(dcConfig.wellData.columnSeparator))
        .filter((wdl) => wdl[plateBarcodeIndex] === plateBarcode)

    const wellRowIndex = headers.indexOf(dcConfig.wellData.wellRowPattern)
    const wellColIndex = headers.indexOf(dcConfig.wellData.wellColumnPattern)
    measurement.wellColumns = headers.filter((h) => h !== dcConfig.barcodeColumnPattern && h !== dcConfig.wellData.wellRowPattern && h !== dcConfig.wellData.wellColumnPattern);

    measurement.welldata = {};
    let [maxRowNr, maxColNr] = [0, 0];

    for (let p = 0; p < plateDataLines.length; p++) {
        const rowNr = parseInt(plateDataLines[p][wellRowIndex]);
        const colNr = parseInt(plateDataLines[p][wellColIndex]);
        [maxRowNr, maxColNr] = [maxRowNr < rowNr ? rowNr : maxRowNr, maxColNr < colNr ? colNr : maxColNr]

        const measValues = plateDataLines[p].filter((v, i) => i !== plateBarcodeIndex && i !== wellRowIndex && i !== wellColIndex);
        if (measValues.length === measurement.wellColumns.length) {
            for (let m in measurement.wellColumns) {
                if (!measurement.welldata[measurement.wellColumns[m]]) {
                    measurement.welldata[measurement.wellColumns[m]] = new Array(plateDataLines.length);
                }

                if (!isNaN(parseFloat(measValues[m])) && !isNaN(measValues[m] - 0)) {
                    measurement.welldata[measurement.wellColumns[m]][p] = parseFloat(measValues[m]);
                } else {
                    measurement.welldata[measurement.wellColumns[m]][p] = String(measValues[m]);
                }
            }
        }
    }
    console.log("Created measurement for plate" + plateBarcode + ":");
    console.log(JSON.stringify(measurement.welldata))

    const maxNr = maxRowNr * maxColNr;
    const [rows, coloumns] = captureUtils.calculatePlateSize(maxNr, maxColNr, true);
    measurement = {...measurement, rows: rows, columns: coloumns};
    return measurement;
}
