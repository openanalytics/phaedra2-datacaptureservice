'use strict';

const multer = require('multer')
const fs = require('fs')
const path = require('path')

/**
 * Calculate a square-ish plate size for the given number of wells.
 *
 * @param wellCount The number of wells that should fit in the plate.
 * @param minColumns Optional, the minimum nr of columns.
 * @param useStandardSize Optional, if true a standard plate size (96, 384, 1536) will be used.
 */
exports.calculatePlateSize = (wellCount, minColumns, useStandardSize) => {
    if (!minColumns) minColumns = 1;
    if (useStandardSize) {
        if (wellCount <= 96 && minColumns <= 12) return [ 8, 12 ];
        if (wellCount <= 384 && minColumns <= 24) return [ 16, 24 ];
        return [ 32, 48 ];
    }
    let sqrt = Math.sqrt(wellCount);
    let columns = Math.max(minColumns, Math.ceil(sqrt));
    let rows = Math.ceil(wellCount/columns);
    return [rows, columns];
};

/**
 * From an array of column names, attempt to find the column describing the well nr.
 * If no match is found, returns null.
 *
 * @param columnNames The names to choose from.
 * @returns The matching name, or null if no match is found.
 */
exports.guessWellColumn = (columnNames) => {
    if (columnNames === null) return null;
    let pattern = /(well|area)[ _\\-]*(id|nr|number|code)?/i;
    for (let i in columnNames) {
        if (columnNames[i].match(pattern)) return columnNames[i];
    }
    return null;
}

/**
 * From an alphanumeric well ID, obtain the row number and column number.
 *
 * @param wellID The well ID, e.g. 'B32'.
 * @returns An array containing the row and column numbers.
 */
exports.getWellPosition = (wellID) => {
    return [ this.getWellRowNr(wellID), this.getWellColNr(wellID) ];
}

/**
 * From an alphanumeric well ID, obtain the row number.
 *
 * @param wellID The well ID, e.g. 'B32'.
 * @returns The row number.
 */
exports.getWellRowNr = (wellID) => {
    const pattern = /([a-zA-Z]+)[ _-]*(\d+)/;
    const match = pattern.exec(wellID);
    if (match) {
        const rowString = match[1];
		const len = rowString.length;
		let rowNr = 0;
		for (let index=0; index<len; index++) {
			rowNr += (rowString.charCodeAt(index) - 64) * Math.pow(26, (len-index)-1);
		}
        return rowNr;
    }
}

/**
 * From an alphanumeric well ID, obtain the column number.
 *
 * @param wellID The well ID, e.g. 'B32'.
 * @returns The column number.
 */
exports.getWellColNr = (wellID) => {
    const pattern = /([a-zA-Z]+)[ _-]*(\d+)/;
    const match = pattern.exec(wellID);
    if (match) return parseInt(match[2]);
}

/**
 * From an alphanumeric well ID, obtain the well number.
 *
 * @param wellID The well ID, e.g. 'B32'.
 * @param columnCount The column count of the plate, e.g. 24.
 * @returns The well number.
 */
exports.getWellNr = (wellID, columnCount) => {
    const rowNr = this.getWellRowNr(wellID);
    const colNr = this.getWellColNr(wellID);
    return (rowNr - 1) * columnCount + colNr;
}

/**
 * From a row and col position, obtain the well number.
 *
 * @param well position The well ID, e.g. '[1, 4]', [3, 5].
 * @param columnCount The column count of the plate, e.g. 24.
 * @returns The well number.
 */
exports.getWellNrByPos = (rowNr, colNr, columnCount) => {
    return (rowNr - 1) * columnCount + (colNr - 1);
}

exports.getUploadConfig = () => {
    const storage = multer.diskStorage({
        destination: (req, file, callback) => {
            const uploadDir = path.join(this.getDefaultSourcePath(), req.query.destinationDir)
            fs.mkdirSync(uploadDir, {recursive: true})
            callback(null, uploadDir)
        },
        filename: (req, file, callback) => {
            callback(null, file.originalname)
        }
    })

    return multer({storage: storage}).any()
}