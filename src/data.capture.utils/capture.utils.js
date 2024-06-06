'use strict';

const multer = require('multer')
const fs = require('fs')
const path = require('path')

exports.getUploadConfig = () => {
    const storage = multer.diskStorage({
        destination: (req, file, callback) => {
            const uploadDir = path.join("/usr/app/uploads", req.query.destinationDir)
            fs.mkdirSync(uploadDir, {recursive: true})
            callback(null, uploadDir)
        },
        filename: (req, file, callback) => {
            callback(null, file.originalname)
        }
    })

    return multer({storage: storage}).any()
}
