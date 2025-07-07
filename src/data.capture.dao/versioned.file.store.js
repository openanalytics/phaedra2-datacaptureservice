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
const db = require('./db.accessor');

class FileStore {
    
    constructor(storeId) {
        this.storeId = storeId;
    }

    async loadFile(id) {
        const record = await db.queryOne('select * from datacapture.file_store where store_id = $1 and id = $2', [ this.storeId, id ]);
        return record ? new StoredFile(record) : null;
    }

    async loadFileByName(name) {
        const record = await db.queryOne('select * from datacapture.file_store where store_id = $1 and name = $2', [ this.storeId, name ]);
        return record ? new StoredFile(record) : null;
    }

    async saveFile(file) {
        if (file.id) {
            const existingRecord = await this.loadFile(file.id);
            if (!existingRecord) throw `File not found with id ${file.id}`;
            const mergedRecord = { ...existingRecord, ...file };
            const record = await db.queryOne('update datacapture.file_store'
                + ' set name = $3, version = $4, description = $5, value = $6, updated_on = $7, updated_by = $8'
                + ' where store_id = $1 and id = $2 returning *',
                [ this.storeId, file.id, mergedRecord.name, mergedRecord.version + 1, mergedRecord.description, mergedRecord.value, new Date(), mergedRecord.updatedBy ]);
            return new StoredFile(record);
        } else {
            const record = await db.queryOne('insert into datacapture.file_store'
                + ' (store_id, name, version, description, value, created_on, created_by)'
                + ' values ($1, $2, $3, $4, $5, $6, $7) returning *',
                [ this.storeId, file.name, 1, file.description, file.value, new Date(), file.createdBy ]);
            return new StoredFile(record);
        }
    }

    async deleteFile(id) {
        db.queryOne('delete from datacapture.file_store where store_id = $1 and id = $2', [ this.storeId, id ]);
    }

    async getAllFiles() {
        const records = await db.queryAll('select * from datacapture.file_store where store_id = $1', [ this.storeId ]);
        return records.map(record => new StoredFile(record));
    }
}

class StoredFile {

    id;
    name;
    version = 1;
    description;
    value;
    createdOn;
    createdBy;
    updatedOn;
    updatedBy;

    constructor(fields) {
        if (!fields) return;
        Object.assign(this, fields);
        this.createdOn = fields.created_on;
        this.createdBy = fields.created_by;
        this.updatedOn = fields.updated_on;
        this.updatedBy = fields.updated_by;
        delete this.created_on;
        delete this.created_by;
        delete this.updated_on;
        delete this.updated_by;
        delete this.store_id;
    }
}

module.exports = {
    FileStore,
    StoredFile
}