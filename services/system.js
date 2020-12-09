const path = require('path');
const fs   = require('../utils/fsp');

const setFilesInAquila = async (name) => {
    const filePath = path.resolve(global.appRoot, name);
    if (!await fs.access(filePath)) {
        await fs.writeFile(filePath, '');
    }
};

const getFileContent = async (name) => {
    const filePath = path.resolve(global.appRoot, name);
    if (await fs.access(filePath)) {
        let fileContent = '';
        try {
            fileContent = await fs.readFile(filePath, 'utf8');
            return {fileData: fileContent};
        } catch (err) {
            return {fileData: 'None'};
        }
    }
    return {fileData: 'None'};
};

module.exports = {
    getFileContent,
    setFilesInAquila
};