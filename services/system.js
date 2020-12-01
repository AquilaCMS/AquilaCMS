const path            = require('path');
const fs              = require('../utils/fsp');
const {Configuration} = require('../orm/models');

const getConfigFile = async () => {
    const config = await Configuration.findOne({});
    const result = {
        linkToLog   : config.logFile,
        linkToError : config.errorFile
    };
    return result;
};

const setConfigFile = async (body) => {
    await Configuration.updateOne({}, body);
};

const getFile = async (body) => {
    const filePath = path.resolve(global.appRoot, body.name);
    if (await fs.access(filePath)) {
        const file = await fs.readFile(filePath);
        return {fileData: file};
    }
    return {fileData: ''};
};

module.exports = {
    getFile,
    setConfigFile,
    getConfigFile
};