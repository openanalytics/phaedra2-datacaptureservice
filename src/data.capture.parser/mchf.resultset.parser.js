const fs = require('fs/promises');
const parser = require('csv-parse/sync');
const path = require('path');
const { performance } = require('perf_hooks');

const { calculatePlateSize, getWellNr, getWellPosition } = require('../data.capture.utils/capture.utils');
const FileGroupLocator = require('../data.capture.utils/file.group.locator');

const namePattern = /Well(.*)_WellLevel\.txt/i;
const columnDelimiter = '\t';

exports.parse = async (sourcePath, cfg) => {
    try {
        const locator = FileGroupLocator.init();
        await locator.scanPath(sourcePath);
        let matchCount = locator.applyPattern(namePattern, { idGroups: [1] });
        if (matchCount === 0) throw `No matching data files found in ${sourcePath}`

        const measurement = {};
        measurement.name = path.basename(sourcePath);
        measurement.barcode = path.basename(sourcePath);
        measurement.welldata = {};
        measurement.wellColumns = [];

        let [maxRowNr, maxColNr] = [0, 0];
        locator.matches.forEach(match => {
            const [row, col] = getWellPosition(match.wellID);
            [maxRowNr, maxColNr] = [Math.max(maxRowNr, row), Math.max(maxColNr, col)];
        });

        let [rowCount, columnCount] = calculatePlateSize(matchCount, maxColNr, true);
        measurement.rows = rowCount;
        measurement.columns = columnCount;

        console.log('Determined plate dimensions: ' + rowCount + 'x' + columnCount);
        console.log('Parsing ' + matchCount + ' data files...');
        const startTime = performance.now();

        // Parse each valid data file.
        const tmpDir = await fs.mkdtemp("welldata-");
        await Promise.all(locator.matches.map(async match => {
            const wellNr = getWellNr(match.wellID, columnCount);
            let inputPath = await locator.getMatchAsFile(match, tmpDir);
            await parseWellLevelFile(inputPath, measurement, wellNr);
            if (locator.isS3Path) fs.unlink(inputPath);
        }));
        await fs.rmdir(tmpDir);

        const duration = (performance.now() - startTime) / 1000;
        console.log('Parse completed in ' + duration.toFixed(2) + 'sec, ' + measurement.wellColumns.length + ' columns parsed.');

        return [ measurement ];
    } catch (err) {
        console.log(err);
    }
}

// const findDataFolder = async (sourcePath) => {
//     // Assuming that sourcePath points to the barcode folder, then the first subfolder is a UUID
//     let files = await fs.readdir(sourcePath);
//     if (files.length === 0) throw 'No data: source path is empty';

//     let uuidPath = sourcePath + '/' + files[0];
//     if (files.length === 1 && fs.lstatSync(uuidPath).isDirectory()) {
//         // The second subfolder is the 'custom_output' folder
//         let subPath = sourcePath + '/' + files[0] + '/custom_output';
//         files = await fs.readdir(subPath);
//         if (files.length === 0) throw 'No data: custom_output is empty';

//         // The third subfolder is the measurement timestamp folder
//         subPath += '/' + files[0];
//         files = await fs.readdir(subPath);

//         // The fourth and final subfolder is the barcode + measurement ID folder
//         return subPath + '/' + files[0];
//     } else {
//         return sourcePath;
//     }
// }

const parseWellLevelFile = async (filePath, measurement, wellNr) => {
    const contents = await fs.readFile(filePath, 'utf8');

    // Parse the data file
    const rows = parser.parse(contents, { delimiter: columnDelimiter });
    const headers = rows[0];
    const data = rows[1];

    if (headers.length > 0) measurement.wellColumns = headers;

    for (let i=0; i<headers.length; i++) {
        const colName = headers[i];
        const colValue = Number.parseFloat(data[i]);

        if (!measurement.welldata[colName]) {
            measurement.welldata[colName] = new Array(measurement.rows * measurement.columns);
            measurement.welldata[colName].fill(NaN);
        }
        measurement.welldata[colName][wellNr - 1] = colValue;
    }
}
