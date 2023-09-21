'use strict';

const fs = require('fs');
const path = require('path');
const captureUtils = require('../data.capture.utils/capture.utils');

exports.parse = (measurement, module) => {
    let isDir = fs.lstatSync(measurement.source).isDirectory();
    if (!isDir) throw "The source is not a directory!";

    let dataLineSeparator = module.dataLineSeparator || /\r?\n/;
    let columnSeparator = module.columnSeparator || /\t/;

    let subWellDataFiles = fs.readdirSync(measurement.source, {withFileTypes: true})
        .filter((file) => file.isFile())
        .filter((file) => file.name.match(module.filePattern))
        .map((file) => measurement.source + "/" + file.name)
        .sort((f1, f2) => f1.localeCompare(f2, 'en', {numeric: true}))
    console.log("Sub-well data files found: " + subWellDataFiles);

    measurement.subWellColumns = null;
    measurement.subWellData = null;
    let [maxRowNr, maxColNr] = [0, 0];
    let maxNr = subWellDataFiles.length;
    measurement.subWellData = [];

    subWellDataFiles.forEach((dataFile) => {
        console.log("Read data file: " + dataFile);
        const data = fs.readFileSync(dataFile, {encoding: "utf-8"});
        const [headers, ...dataLines] = data.split(dataLineSeparator);

        const columns = headers.split(columnSeparator).map(item => item.trim())
        let subwelldata = {}
        columns.forEach(column => {
            subwelldata[column] = []
        })

        dataLines.forEach(dataLine =>{
            const dataValues = dataLine.split(columnSeparator)
            if (columns.length === dataValues.length) {
                for (let i = 0; i < columns.length; i++) {
                    subwelldata[columns[i]].push(dataValues[i]);
                }
            }
        })

        measurement.subWellColumns = columns
        measurement.subWellData.push({
            measId: null,
            well: dataFile.match(/[A-Z]+[0-9]+/g)[0],
            data: subwelldata
        })
    });

    if (maxNr === 0) maxNr = maxRowNr * maxColNr;
    let [rows, columns] = captureUtils.calculatePlateSize(maxNr, maxColNr, true);
    measurement = {...measurement, rows: rows, columns: columns};

    let result = [measurement]
    return result;
};
