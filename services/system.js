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
        let fileContent = '';
        await fs.readFile(filePath, 'utf8', function (error, data) {
            if (error) {
                console.log(error);
                return {fileData: 'None'};
            }
            fileContent = data;
        });
        return {fileData: fileContent};
    }
    return {fileData: 'None'};
};

module.exports = {
    getFile,
    setFilesInAquila
};