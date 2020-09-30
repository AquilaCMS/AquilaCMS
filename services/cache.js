const glob           = require('glob');
const fs             = require('fs');
const {deleteFolder} = require('../utils/medias');
const utilsModules   = require('../utils/modules');

const flush = () => {
    global.cache.flush();
    return 'Cache flushed';
};

/**
 * @param subfolder : ex: "/medias"
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
    const _path       = require('../utils/server').getUploadDirectory();
    const cacheFolder = `${_path}/cache/`;
    let fileName      = '';
    let filePathCache = '';

    switch (type) {
    // si une image produit est supprimée
    case 'products':
        fileName      = `${datas.code}_${datas._id}`;
        filePathCache = `${cacheFolder}products/${getChar(datas.code, 0)}/${getChar(datas.code, 1)}/${fileName}*`;
        deleteFileCache(filePathCache);
        break;
        // si un media est requêté
    case 'medias':
        fileName      = datas.filename;
        filePathCache = `${cacheFolder}medias/${fileName}*`;
        deleteFileCache(filePathCache);
        break;
    case 'slider':
    case 'gallery':
    case 'blog':
    case 'picto':
    case 'category':
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
                await fs.unlinkSync(files[i]);
                console.log(`image deleted => ${filePathCache}`);
            }
        }
    });
}

const cacheSetting = () => {
    const CacheService = require('../utils/CacheService');
    const cacheTTL     = global.envConfig.cacheTTL ? global.envConfig.cacheTTL : 0;
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
 * @param {string} string input string to get char
 * @param {number} index index of char to find in string
 */
const getChar = (string, index) => {
    if (string[index]) {
        // NE PAS REMPLACER LE == par un === !!!!!
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