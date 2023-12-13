'use strict';

const fs = require('fs');
const crypto = require('crypto');
const nPath = require('path');
const s3 = require('./s3.api');

exports.listContents = async (path) => {
    if (exports.isS3Path(path)) {
        let contents = await s3.list(path);
        return contents;
    } else {
        let contents = fs.readdirSync(path).map(f => `${path}${path.endsWith('/') ? '':'/'}${f}`);
        return contents;
    }
}

exports.getAsString = async (path) => {
    let data = null;
    if (exports.isS3Path(path)) {
        data = await s3.getBytes(path);
        data = await data.transformToString();
    } else {
        data = fs.readFileSync(path, "utf-8");
    }
    return data;
}

exports.getAsFile = async (path, tmpDir) => {
    if (exports.isS3Path(path)) {
        const dlPath = `${tmpDir}/dl-${crypto.randomUUID()}-${nPath.basename(path)}`;
        await s3.download(path, dlPath);
        return dlPath;
    } else {
        return path;
    }
}

exports.isS3Path = (path) => {
    return path.toLowerCase().startsWith("s3://");
}