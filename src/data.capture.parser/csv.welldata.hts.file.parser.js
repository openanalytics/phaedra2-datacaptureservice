'use strict';

const fs = require('fs');
const path = require('path');
const captureUtils = require('../data.capture.utils/capture.utils');

exports.parse = (measurement, dcConfig) => {
    const isFile = fs.lstatSync(measurement.source).isFile();
    if (!isFile)
        throw 'The source is not a file';

    return parseWellData(measurement, dcConfig)
};

const parseWellData = (measurement, dcConfig) => {
    console.log('Parsing data for barcode: ' + measurement.barcode);

    const data = fs.readFileSync(measurement.source, {encoding: 'utf-8'});
    const dataLines = data.split(dcConfig.dataLineSeparator || '\n');
    const wellDataHeaderIndex = findWellDataInfoIndex(dataLines, dcConfig);

    const wellDataHeadersLine = dataLines[wellDataHeaderIndex]
    const wellDataLines = dataLines.filter((wdl, index) => wdl.includes(measurement.barcode) && index > wellDataHeaderIndex);

    // measurement.wellColumns = null;
    measurement.welldata = {};
    let [maxRowNr, maxColNr] = [0, 0];
    let maxNr = 0;

    let [plateSeqColumn, barcodeColumn, wellNrColumn, ...measColumns] = wellDataHeadersLine.split(dcConfig.columnSeparator || ',');
    measColumns = addIndexMeasColumns(measColumns);
    measurement["wellColumns"] = measColumns;

    for (let j = 0; j < wellDataLines.length; j++) {
        const dataLine = wellDataLines[j];
        // console.log("Read data line: " + dataLine);
        if (isEndOfFile(dataLine, dcConfig)) return;
        let [plateSeqValue, barcodeValue, wellNrValue, ...measValues] = dataLine.split(dcConfig.columnSeparator || ',');

        if (Number.isInteger(wellNrValue)) {
            maxNr = Number.parseInt(wellNrValue);
        } else {
            let [row, col] = [wellNrValue.charCodeAt(0) - 'A'.charCodeAt(0), Number.parseInt(wellNrValue.substring(1))];
            [maxRowNr, maxColNr] = [Math.max(maxRowNr, row), Math.max(maxColNr, col)];
        }

        if (measColumns.length === measValues.length) {
            for (let i = 0; i < measColumns.length; i++) {
                if (!measurement.welldata[measColumns[i]]) {
                    measurement.welldata[measColumns[i]] = new Array(wellDataLines.length);
                }

                if (!isNaN(parseFloat(measValues[i])) && !isNaN(measValues[i] - 0)) {
                    measurement.welldata[measColumns[i]][j] = parseFloat(measValues[i]);
                } else {
                    measurement.welldata[measColumns[i]][j] = String(measValues[i]);
                }
            }
        }
    }

    if (maxNr === 0) maxNr = maxRowNr * maxColNr;
    const [rows, columns] = captureUtils.calculatePlateSize(maxNr, maxColNr, true);
    measurement = {...measurement, rows: rows, columns: columns};
    return measurement;
}

function findWellDataInfoIndex(dataLines, dcConfig) {
    console.log('Nr of lines in the data file: ' + dataLines.length);
    if (dataLines !== undefined && dataLines.length > 0) {
        for (let i = 0; i < dataLines.length; i++) {
            if (dataLines[i].startsWith(dcConfig.startLinePattern)) {
                return i;
            }
        }
    }
    return -1;
}

function isEndOfFile(dataLine, dcConfig) {
    return dataLine === undefined || dataLine.search(dcConfig.endLinePattern) > -1;
}

function addIndexMeasColumns(measColumns) {
    let indexedMeasColumns = [];
    for (let i = 0; i < measColumns.length; i++) {
        let index = 1;
        for (let j = 0; j < indexedMeasColumns.length; j++) {
            let indexed = index > 1 ? measColumns[i] + index : measColumns[i];
            if (indexedMeasColumns.indexOf(indexed) > -1) {
                index++;
                indexed = measColumns[i] + index;
            }
        }
        let temp = index > 1 ? measColumns[i] + index : measColumns[i];
        indexedMeasColumns.push(temp);
    }
    return indexedMeasColumns;
}
