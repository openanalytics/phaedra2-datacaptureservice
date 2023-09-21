'use strict'

const fs = require('fs');
const {XMLParser, XMLValidator} = require('fast-xml-parser');
const {calculatePlateSize, getWellNrByPos} = require("../data.capture.utils/capture.utils");

const options = { ignoreAttributes : false };

exports.parse = (sourcePath, dcConfig) => {
        const isDir = fs.lstatSync(sourcePath).isDirectory();
        if (!isDir)
                throw 'The source is not a directory';

        let measurements = [];

        // Find all evaluations
        const evaluations = findEvaluations(sourcePath)
        if (evaluations) {
                for (let e in evaluations) {
                        measurements.push(createMeasurement(evaluations[e], sourcePath, dcConfig));
                }
        }

        return measurements;
}

function findEvaluations(sourcePath) {
        const filesInDir = fs.readdirSync(sourcePath);
        return filesInDir.filter(f => f.startsWith('Evaluation'));
}



function createMeasurement(evaluation, sourcePath, dcConfig) {
        let measurement = {};

        const wellInfoPath =  sourcePath + '/' + evaluation + '/PlateResults.xml';
        const data = fs.readFileSync(wellInfoPath, { encoding: 'utf-8' });

        const parser = new XMLParser(options);
        const output = parser.parse(data);

        measurement['name'] = output.AnalysisResults.PlateName;
        measurement['barcode'] = output.AnalysisResults.PlateName;

        const analysisParameters = output.AnalysisResults.ParameterAnnotations.Parameter;
        const analysisResults = output.AnalysisResults.Results;

        const maxRows = Math.max.apply(Math, analysisResults.map(item => item['@_Row']));
        const maxCols = Math.max.apply(Math, analysisResults.map(item => item['@_Col']));
        const plateDims = calculatePlateSize(maxRows * maxCols, maxCols, true);

        measurement['rows'] = plateDims[0];
        measurement['columns'] = plateDims[1];

        const wellColumns = extractWellColumns(analysisParameters, analysisResults);
        measurement['wellColumns'] = Object.keys(wellColumns);
        measurement['welldata'] = extractWellData(wellColumns, plateDims);

        return measurement;
}

function extractWellColumns(analysisParameters, analysisResults) {
        let wellColumns = {};
        for (let i in analysisResults) {
                const row = analysisResults[i]['@_Row'];
                const col = analysisResults[i]['@_Col'];
                const result = analysisResults[i].Result;
                for (let j in result) {
                        const parID = result[j]['@_parID'];
                        const values = result[j].value;

                        let wellColumn = '';
                        if (Array.isArray(values)) {
                                for (let k in values) {
                                        wellColumn = analysisParameters.find(item => item['@_id'] === parID)['@_name'] + ' - ' +  values[k]['@_kind'];
                                        wellColumns[wellColumn] ? wellColumns[wellColumn].push({row: row, col: col, value: values[k]['#text']}) : wellColumns[wellColumn] = [{row: row, col: col, value: values[k]['#text']}];
                                }
                        } else {
                                wellColumn = analysisParameters.find(item => item['@_id'] === parID)['@_name'] + ' - ' +  values['@_kind'];
                                wellColumns[wellColumn] ? wellColumns[wellColumn].push({row: row, col: col, value: values['#text']}) : wellColumns[wellColumn] = [{row: row, col: col, value: values['#text']}];
                        }
                }
        }
        return wellColumns;
}

function extractWellData(wellColumns, plateSize) {
        let wellData = {};
        for (const wellColumn in wellColumns) {
                wellData[wellColumn] = new Array(plateSize[0] * plateSize[1]).fill(null);
                for (let i in wellColumns[wellColumn]) {
                        const index = getWellNrByPos(wellColumns[wellColumn][i].row, wellColumns[wellColumn][i].col, plateSize[1]);
                        wellData[wellColumn][index] = wellColumns[wellColumn][i].value;
                }
        }
        return wellData;
}
