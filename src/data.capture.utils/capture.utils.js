/*
 * Phaedra II
 * 
 * Copyright (C) 2016-2025 Open Analytics
 * 
 * ===========================================================================
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the Apache License as published by
 * The Apache Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * Apache License for more details.
 * 
 * You should have received a copy of the Apache License
 * along with this program.  If not, see <http://www.apache.org/licenses/>
 */
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
