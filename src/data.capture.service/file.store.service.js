const { FileStore } = require('../data.capture.dao/versioned.file.store')

const scriptFS = new FileStore('capture-scripts');
const configFS = new FileStore('capture-configs');

exports.getScriptStore = () => {
    return scriptFS;
}

exports.getConfigStore = () => {
    return configFS;
}