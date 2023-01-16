/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2022 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const path                 = require('path');
const moment               = require('moment');
const fs                   = require('../utils/fsp');
const {getUploadDirectory} = require('../utils/server');

/**
 * remove all temporary files that are older of more that 1 day
 */
const removeTempFile = async () => {
    const tempFolder = path.resolve(getUploadDirectory(), 'temp');
    const files      = await fs.readdir(tempFolder);
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