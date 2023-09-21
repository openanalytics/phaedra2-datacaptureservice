'use strict';

const fs = require('fs');
const path = require('path');
const captureUtils = require('../data.capture.utils/capture.utils');

exports.parse = (measurement, module) => {
    let isDir = fs.lstatSync(measurement.source).isDirectory();
    if (!isDir)
        throw "The source is not a directory!";

    let dataLineSeparator = module.dataLineSeparator || /\r?\n/;
    let columnSeparator = module.columnSeparator || /\t/;

    let wellDataFiles = fs.readdirSync(measurement.source, {withFileTypes: true})
        .filter((file) => file.isFile())
        .filter((file) => file.name.match(module.filePattern))
        .map((file) => measurement.source + "/" + file.name)
        .sort((f1, f2) => f1.localeCompare(f2, 'en', {numeric: true}));
    console.log("Well data files found: " + wellDataFiles.length);

    measurement.welldata = {};
    measurement.wellColumns = null;
    let [maxRowNr, maxColNr] = [0, 0];
    let maxNr = 0;

    wellDataFiles.forEach((dataFile) => {
        console.log("Read data file: " + dataFile);
        const data = fs.readFileSync(dataFile, {encoding: "utf-8"});
        const [headers, dataLine] = data.split(dataLineSeparator);
        const [wellNrColumn, ...measColumns] = headers.split(columnSeparator);
        const [wellNrValue, ...measValues] = dataLine.split(columnSeparator);

        if (Number.isInteger(wellNrValue)) {
            maxNr = Number.parseInt(wellNrValue);
        } else {
            let [row, col] = [wellNrValue.charCodeAt(0) - 'A'.charCodeAt(0), Number.parseInt(wellNrValue.substring(1))];
            [maxRowNr, maxColNr] = [Math.max(maxRowNr, row), Math.max(maxColNr, col)];
        }

        if (measColumns.length === measValues.length) {
            measurement.wellColumns = measColumns;
             for (let i = 0; i < measColumns.length; i++) {
                if (!measurement.welldata[measColumns[i]]) {
                    measurement.welldata[measColumns[i]] = [];
                }
                measurement.welldata[measColumns[i]].push(Number.parseFloat(measValues[i]));
            }
        }
    });

    if (maxNr === 0) maxNr = maxRowNr * maxColNr;
    let [rows, coloumns] = captureUtils.calculatePlateSize(wellDataFiles.length, maxColNr, true);

    measurement = {...measurement, rows: rows, columns: coloumns};
    return measurement
};
