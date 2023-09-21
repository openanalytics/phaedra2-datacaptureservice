const utils = require('.//capture.utils');
const s3 = require('.//s3.api');
const fs = require('fs/promises');
const path = require('path');

const isS3Path = p => (p || "").toLowerCase().startsWith("s3://");

exports.init = () => {
    let locator = {
        fileList: [],
        matches: []
    };
    locator.addFile = (f) => locator.fileList.push(f);
    locator.addFiles = (files) => locator.fileList.push(...files);
    locator.scanPath = async (dir) => {
        locator.isS3Path = isS3Path(dir);
        if (locator.isS3Path) {
            let keys = await s3.list(dir);
            locator.fileList.push(...keys);
        } else {
            let files = await fs.readdir(dir);
            locator.fileList.push(...files.map(f => path.join(dir, f)));
        }
    };
    locator.applyPattern = (pattern, groupConfig, plateColumns) => {
        locator.matches = [];

        locator.fileList.forEach(f => {
            const matchInfo = pattern.exec(path.basename(f));
            if (!matchInfo) return;

            const match = {
                path: f
            };

            if (groupConfig.idGroups.length === 1) {
                match.wellID = matchInfo[groupConfig.idGroups[0]];
                // wellID could be numeric (a wellNr) or alphanumeric (e.g. 'B12')
                match.wellNr = parseInt(match.wellID);
                if (isNaN(match.wellNr)) match.wellNr = utils.getWellNr(match.wellID, plateColumns);
            } else if (groupConfig.idGroups.length === 2) {
                let rowNr = parseInt(matchInfo[groupConfig.idGroups[0]]);
                let colNr = parseInt(matchInfo[groupConfig.idGroups[1]]);
                match.wellNr = (rowNr - 1) * plateColumns + colNr;
                match.wellID = match.wellNr;
            }
            if (groupConfig.fieldGroup) match.fieldNr = parseInt(matchInfo[groupConfig.fieldGroup]);
            else match.fieldNr = 1;
            if (groupConfig.channelGroup) match.channelId = matchInfo[groupConfig.channelGroup];

            locator.matches.push(match);
        });

        locator.channelIds = locator.matches.map(m => m.channelId).filter((v, i, a) => a.indexOf(v) === i);
        locator.fieldNrs = locator.matches.map(m => m.fieldNr).filter((v, i, a) => a.indexOf(v) === i);
        locator.wellNrs = locator.matches.map(m => m.wellNr).filter((v, i, a) => a.indexOf(v) === i);

        return locator.matches.length;
    };
    locator.getMatchAsFile = async (match, tmpDir) => {
        if (locator.isS3Path) {
            let destination = tmpDir + "/" + path.basename(match.path);
            await s3.download(match.path, destination);
            return destination;
        } else {
            return match.path;
        }
    }
    locator.getFirstMatch = (channelId) => {
        return locator.matches.find(m => m.channelId === channelId);
    };
    return locator;
}
