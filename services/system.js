const path = require('path');
const fs   = require('../utils/fsp');

const setFilesInAquila = async (body) => {
    const filePath = path.resolve(global.appRoot, body.name);
    if (!await fs.access(filePath)) {
        await fs.writeFile(filePath, '');
    }
};

const getFile = async (query) => {
    const filePath = path.resolve(global.appRoot, query.name);
    if (await fs.access(filePath)) {
        const file = await fs.readFile(filePath);
        return {fileData: file};
    }
    return {fileData: 'None'};
};

module.exports = {
    getFile,
    setFilesInAquila
};