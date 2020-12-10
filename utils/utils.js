/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2020 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */
const axios          = require('axios');
const path           = require('path');
const Json2csvParser = require('json2csv').Parser;
const {v4: uuidv4}   = require('uuid');
const mongoose       = require('mongoose');
const fs             = require('./fsp');

const checkModuleRegistryKey = async (moduleName) => {
    try {
        let registryFile    = path.resolve(global.appRoot, 'modules', moduleName, 'licence.json');
        const aquilaVersion = JSON.parse(await fs.readFile(path.resolve(global.appRoot, 'package.json'))).version;
        registryFile        = JSON.parse((await fs.readFile(registryFile)));
        if (fs.existsSync(registryFile)) {
            const result = await axios.post('https://stats.aquila-cms.com/api/v1/register', {
                registryKey : registryFile.code,
                aquilaVersion
            });
            if (!result.data.data) return true;
            return true;
        }
        const result = await axios.post('https://stats.aquila-cms.com/api/v1/register/check', {
            registryKey : registryFile.code,
            aquilaVersion
        });
        if (!result.data.data) return true;
        return true;
    } catch (err) {
        return true;
    }
};

const checkOrCreateAquilaRegistryKey = async () => {
    try {
        const {Configuration, Users} = require('../orm/models');
        const configuration          = await Configuration.findOne({});
        const aquilaVersion          = JSON.parse(await fs.readFile(path.resolve(global.appRoot, 'package.json'))).version;
        if (!configuration.licence || !configuration.licence.registryKey) {
            configuration.licence = {
                registryKey : uuidv4(),
                lastCheck   : require('moment')().toISOString()
            };
            const firstAdmin      = await Users.findOne({isAdmin: true}, {_id: 1, isAdmin: 1, email: 1, firstname: 1, lastname: 1, fullname: 1});
            await axios.post('https://stats.aquila-cms.com/api/v1/register', {
                registryKey : configuration.licence.registryKey,
                aquilaVersion,
                user        : firstAdmin
            });
        } else {
            if (require('moment')().toISOString() >= require('moment')(configuration.licence.lastCheck).add(7, 'days').toISOString()) {
                configuration.licence.lastCheck = require('moment')().toISOString();
                await axios.post('https://stats.aquila-cms.com/api/v1/register/check', {
                    registryKey : configuration.licence.registryKey,
                    aquilaVersion,
                    lastCheck   : configuration.licence.lastCheck
                });
            }
        }
        await configuration.save();
    } catch (err) {
        console.error('Unable to join the Aquila-CMS license server');
    }
};

const json2csv = async (data, fields, folderPath, filename) => {
    await fs.mkdir(path.resolve(folderPath), {recursive: true});
    const json2csvParser = new Json2csvParser({fields});
    return {
        csv        : json2csvParser.parse(data),
        file       : filename,
        exportPath : folderPath
    };
};

/**
 * Detect if array contain duplicated values
 * @param {Array} a array to check duplicate
 * @returns {Boolean} Contains duplicated
 */
const detectDuplicateInArray = (a) => {
    for (let i = 0; i <= a.length; i++) {
        for (let j = i; j <= a.length; j++) {
            if (i !== j && a[i] && a[j] && a[i].toString() === a[j].toString()) {
                return true;
            }
        }
    }
    return false;
};

const downloadFile = async (url, dest) => {
    // on creer les dossier
    fs.mkdirSync(dest.replace(path.basename(dest), ''), {recursive: true});
    const file        = fs.createWriteStream(dest);
    const downloadDep = url.includes('https://') ? require('https') : require('http');
    return new Promise((resolve, reject) => {
        downloadDep.get(url, (res) => {
            if (res.statusCode !== 200) {
                return reject('File is not found');
            }
            const len      = parseInt(res.headers['content-length'], 10);
            let downloaded = 0;
            res.pipe(file);
            res.on('data', (chunk) => {
                downloaded += chunk.length;
                console.log(`Downloading ${(100.0 * downloaded / len).toFixed(2)}% ${downloaded} bytes\r`);
            }).on('end', () => {
                file.end();
                resolve(null);
            }).on('error', (err) => {
                reject(err.message);
            });
        }).on('error', (err) => {
            fs.unlink(dest);
            reject(err.message);
        });
    });
};

const slugify = (text) => {
    return require('slug')(text, {lower: true});
};

// Returns ET price
// VAT is 20 if if is 20%
const toET = (ATIPrice, VAT) => {
    if ((ATIPrice !== undefined) && (VAT !== undefined)) {
        if (VAT === 0) {
            return ATIPrice;
        }

        return Math.round(ATIPrice * 100 * 100 / (100 + VAT)) / 100;
    }

    return undefined;
};

const getObjFromDotStr = (obj, str) => {
    return str.split('.').reduce((o, i) => {
        if (!o[i]) return '';
        if (o[i] instanceof mongoose.Types.ObjectId) {
            return (o[i]).toString();
        }
        return o[i];
    }, obj);
};

/* temp : determiner les routes non utilisés */
// eslint-disable-next-line no-unused-vars
const tmp_use_route = async (api, fct) => {
    // Delete this function as soon as possible
    console.error(`/!\\ Si vous voyez ce message, merci de supprimer l'appel à tmp_use_route() dans la foncion ${api} / ${fct}`);
};
/* End temp : determiner les routes non utilisés */

/**
 * Check if two objects or arrays are equal
 * (c) 2017 Chris Ferdinandi, MIT License, https://gomakethings.com
 * @param  {object|Array} value The first object or array to compare
 * @param  {object|Array} other The second object or array to compare
 * @return {Boolean}            Returns true if they're equal
 */
const isEqual = (value, other) => {
    // Get the value type
    const type = Object.prototype.toString.call(value);
    // If the two objects are not the same type, return false
    if (type !== Object.prototype.toString.call(other)) return false;

    // If items are not an object or array, return false
    if (['[object Array]', '[object Object]'].indexOf(type) < 0) return false;

    // Compare the length of the length of the two items
    const valueLen = type === '[object Array]' ? value.length : Object.keys(value).length;
    const otherLen = type === '[object Array]' ? other.length : Object.keys(other).length;
    if (valueLen !== otherLen) return false;

    // Compare properties
    if (type === '[object Array]') {
        for (let i = 0; i < valueLen; i++) {
            if (compare(value[i], other[i]) === false) return false;
        }
    } else {
        for (const key in value) {
            if (value.hasOwnProperty(key)) {
                if (compare(value[key], other[key]) === false) return false;
            }
        }
    }

    // If nothing failed, return true
    return true;
};

// Compare two items
let compare = (item1, item2) => {
// Get the object type
    const itemType = Object.prototype.toString.call(item1);
    // If an object or array, compare recursively
    if (['[object Array]', '[object Object]'].indexOf(itemType) >= 0) {
        if (!isEqual(item1, item2)) return false;
    // Otherwise, do a simple comparison
    } else {
        // If the two items are not the same type, return false
        if (itemType !== Object.prototype.toString.call(item2)) return false;
        // Else if it's a function, convert to a string and compare
        // Otherwise, just compare
        if (itemType === '[object Function]') {
            if (item1.toString() !== item2.toString()) return false;
        } else {
            if (item1 !== item2) return false;
        }
    }
};

const IsJsonString = (str) => {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
};

/**
 * find object property by string
 * @example
 * const obj = {p1: {p2: "test"}}
 * const value = objectPropertybyString(obj, "p1.p2")
 * console.log(value) // "test"
 *
 * @param {object} o object to find value from s
 * @param {string} s property to find value from
 * @return {any} return the value of the property found
 */
const objectPropertybyString = (o, s) => {
    s            = s.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
    s            = s.replace(/^\./, ''); // strip a leading dot
    const a      = s.split('.');
    let notFound = false;
    for (let i = 0, n = a.length; i < n; ++i) {
        const k = a[i];
        if (k in o) {
            o = o[k];
        } else {
            notFound = true;
        }
    }
    return notFound ? undefined : o;
};

module.exports = {
    // utils/datas
    downloadFile,
    json2csv,
    // utils/helpers
    getObjFromDotStr,
    detectDuplicateInArray,
    // services/seo ou utils/utils : Strings for slugs
    slugify,
    // utils/utils : Dev info
    tmp_use_route,
    // utils/utils : Taxes
    toET,
    // utils/utils : Retrocompatibilité
    checkModuleRegistryKey,
    checkOrCreateAquilaRegistryKey,
    isEqual,
    IsJsonString,
    objectPropertybyString
};
