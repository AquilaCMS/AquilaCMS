/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2022 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const glob           = require('glob');
const path           = require('path');
const fs             = require('../utils/fsp');
const {deleteFolder} = require('../utils/medias');
const utilsModules   = require('../utils/modules');

const flush = async () => {
    global.cache.flush();
    return 'Cache flushed';
};

/**
 * @param subfolder : ie: "/medias"
 */
const cleanCache = async (subfolder = undefined) => {
    let cacheFolder = 'cache';
    if (subfolder) {
        cacheFolder += subfolder;
    }

    await deleteFolder(cacheFolder);
    console.log('TCL: services -> utils -> cleanCache ok');
};

const deleteCacheImage = (type, datas) => {
    const cacheFolder = path.join(require('../utils/server').getUploadDirectory(), 'cache');
    let fileName      = '';
    let filePathCache = '';

    switch (type) {
    // if a product image is deleted
    case 'products':
        fileName      = `${datas.code}_${datas._id}`;
        filePathCache = `${cacheFolder}products/${getChar(datas.code, 0)}/${getChar(datas.code, 1)}/${fileName}*`;
        deleteFileCache(filePathCache);
        break;
        // if a media is requested
    case 'medias':
        fileName      = datas.filename;
        filePathCache = `${cacheFolder}medias/${fileName}*`;
        deleteFileCache(filePathCache);
        break;
    case 'category':
        const extension = datas.extension || path.extname(datas.filename);
        fileName        = path.basename(datas.filename, extension);
        filePathCache   = `${cacheFolder}category/${fileName}*`;
        deleteFileCache(filePathCache);
        break;
    case 'slider':
    case 'gallery':
    case 'blog':
    case 'picto':
        fileName      = datas.filename;
        filePathCache = `${cacheFolder}${type}/${fileName}*`;
        deleteFileCache(filePathCache);
        break;
    default:
        break;
    }
};

function deleteFileCache(filePathCache) {
    glob(filePathCache, async (err, files) => {
        if (err) {
            console.error(err);
        } else {
            for (let i = 0; i < files.length; i++) {
                await fs.unlink(files[i]);
                console.log(`image deleted => ${filePathCache}`);
            }
        }
    });
}

const cacheSetting = () => {
    const CacheService = require('../utils/CacheService');
    const cacheTTL     = global.envConfig.environment.cacheTTL ? global.envConfig.environment.cacheTTL : 0;
    utilsModules.modulesLoadFunctions('useCacheModule', {cacheTTL}, () => {
        global.cache = new CacheService(cacheTTL);
    });
};

/**
 * Returns char at `index` or `_`
 * ```js
 *  getChar('hello', 1)
 *  // returns e
 * ```
 * @param {any} string input string to get char
 * @param {number} index index of char to find in string
 */
const getChar = (string, index) => {
    if (string[index]) {
        // WARNING : DON'T REPLACE THE == by a ===
        // eslint-disable-next-line
        if (Number(string[index]).toString() === "NaN" || Number(string[index]) == string[index]) {
            return string[index];
        }
    }
    return '_';
};

module.exports = {
    flush,
    cleanCache,
    deleteCacheImage,
    cacheSetting,
    getChar
};