const path = require('path');
const moment = require('moment');
const fs = require('../utils/fsp');
const {getUploadDirectory} = require('../utils/server');

/**
 * remove all temporary files that are older of more that 1 day
 */
const removeTempFile = async () => {
    const tempFolder = path.resolve(getUploadDirectory(), 'temp');
    const files = await fs.readdir(tempFolder);
    for (const file of files) {
        const fileStat = await fs.stat(path.resolve(tempFolder, file));
        if (fileStat.isFile()) {
            if (moment(fileStat.mtime).add(1, 'day') < Date.now()) {
                try {
                    await fs.unlink(path.resolve(tempFolder, file));
                } catch (err) {
                    console.error(err);
                }
            }
        }
    }
};

module.exports = {
    removeTempFile
};