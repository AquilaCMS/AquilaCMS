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

const attributeCorrectNewTypeName = (type) => {
    switch (type) {
    case 'Champ texte':
        return 'textfield';
    case 'Zone de texte':
        return 'textarea';
    case 'Date':
        return 'date';
    case 'Booléen (oui/non)':
        return 'bool';
    case 'Liste déroulante':
        return 'list';
    case 'Sélection multiple':
        return 'multiselect';
    case 'Intervalle':
        return 'interval';
    case 'Image':
        return 'image';
    case 'Vidéo':
        return 'video';
    case 'Fichier PDF':
        return 'doc/pdf';
    case 'Nombre':
        return 'number';
    case 'Couleur':
        return 'color';
    default:
        return type;
    }
};

const attributeCorrectOldTypeName = (type) => {
    switch (type) {
    case 'textfield':
        return 'Champ texte';
    case 'textarea':
        return 'Zone de texte';
    case 'date':
        return 'Date';
    case 'bool':
        return 'Booléen (oui/non)';
    case 'list':
        return 'Liste déroulante';
    case 'multiselect':
        return 'Sélection multiple';
    case 'interval':
        return 'Intervalle';
    case 'image':
        return 'Image';
    case 'video':
        return 'Vidéo';
    case 'doc/pdf':
        return 'Fichier PDF';
    case 'number':
        return 'Nombre';
    case 'color':
        return 'Couleur';
    default:
        return type;
    }
};

const checkModuleRegistryKey = async (moduleName) => {
    try {
        let registryFile = path.resolve(global.appRoot, 'modules', moduleName, 'licence.json');
        const aquilaVersion = JSON.parse(await fs.readFile(path.resolve(global.appRoot, 'package.json'))).version;
        registryFile = JSON.parse((await fs.readFile(registryFile)));
        if (fs.existsSync(registryFile)) {
            const result = await axios.post('https://shop.aquila-cms.com/api/v1/register', {
                registryKey : registryFile.code,
                aquilaVersion
            });
            if (!result.data.data) return true;
            return true;
        }
        const result = await axios.post('https://shop.aquila-cms.com/api/v1/register/check', {
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
        const configuration = await Configuration.findOne({});
        const aquilaVersion = JSON.parse(await fs.readFile(path.resolve(global.appRoot, 'package.json'))).version;
        if (!configuration.licence || !configuration.licence.registryKey) {
            configuration.licence = {
                registryKey : uuidv4(),
                lastCheck   : require('moment')().toISOString()
            };
            const firstAdmin = await Users.findOne({isAdmin: true}, {_id: 1, isAdmin: 1, email: 1, firstname: 1, lastname: 1, fullname: 1});
            await axios.post('https://shop.aquila-cms.com/api/v1/register', {
                registryKey : configuration.licence.registryKey,
                aquilaVersion,
                user        : firstAdmin
            });
        } else {
            if (require('moment')().toISOString() >= require('moment')(configuration.licence.lastCheck).add(7, 'days').toISOString()) {
                configuration.licence = {
                    lastCheck : require('moment')().toISOString()
                };
                await axios.post('https://shop.aquila-cms.com/api/v1/register/check', {
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
    const file = fs.createWriteStream(dest);
    const downloadDep = url.includes('https://') ? require('https') : require('http');
    return new Promise((resolve, reject) => {
        downloadDep.get(url, (res) => {
            if (res.statusCode !== 200) {
                return reject('File is not found');
            }
            const len = parseInt(res.headers['content-length'], 10);
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
    attributeCorrectNewTypeName,
    attributeCorrectOldTypeName,
    checkModuleRegistryKey,
    checkOrCreateAquilaRegistryKey
};
