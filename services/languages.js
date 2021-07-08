/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const path         = require('path');
const fs           = require('../utils/fsp');
const {Languages}  = require('../orm/models');
const NSErrors     = require('../utils/errors/NSErrors');
const QueryBuilder = require('../utils/QueryBuilder');

const restrictedFields = [];
const defaultFields    = ['code', 'name', 'defaultLanguage', 'status', 'img'];
const queryBuilder     = new QueryBuilder(Languages, restrictedFields, defaultFields);

const getLanguages = async (PostBody) => {
    return queryBuilder.find(PostBody);
};

const getLang = async (PostBody) => {
    return queryBuilder.findOne(PostBody);
};

const saveLang = async (lang) => {
    let result = {};

    if (lang.defaultLanguage) { // Remove other default language
        lang.status = 'visible'; // The default language need to be visible
        await Languages.updateOne({defaultLanguage: true}, {$set: {defaultLanguage: false}});
    }

    if (lang._id) {
        result = await Languages.findOneAndUpdate({_id: lang._id}, lang);
    } else {
        result = await Languages.create(lang);
    }

    await createDynamicLangFile();
    return result;
};

const removeLang = async (_id) => {
    const deletedLang = await Languages.findOneAndDelete({_id});
    await createDynamicLangFile();
    return deletedLang;
};

/**
 * @description Return the default lang code
 * @param {string} language - Requested language
 */
const getDefaultLang = (language) => {
    // If the language requested is the default one, we will recover the "real" default language
    if (language === undefined || language === null || language === '') return global.defaultLang;
    return language;
};

/**
 * @description Save the content in the translations file
 * @param translateName : Name of the translate file to edit
 * @param translateValue : Content to write to file
 */
const translateSet = async (translateName, translateValue, lang) => {
    const translatePath = await getTranslatePath(lang);
    await fs.mkdir(translatePath, {recursive: true});
    try {
        await fs.writeFile(`${translatePath}/${translateName}.json`, translateValue);
    } catch (err) {
        throw NSErrors.TranslationError;
    }
};

/**
 * @description Get the contents of the translation file
 */
const translateGet = async (filePath, lang) => {
    try {
        const themePath = await getTranslatePath(lang);
        return fs.readFile(`${themePath}/${filePath}.json`, 'utf8');
    } catch (error) {
        throw NSErrors.TranslationError;
    }
};

/**
 * @description Get the list of translate files
 */
const translateList = async () => {
    try {
        const lang          = 'fr';
        const translateList = [];
        const translatePath = await getTranslatePath(lang);

        for (const file of await fs.readdir(translatePath)) {
            if (file.endsWith('.json')) {
                translateList.push(file.substring(0, file.lastIndexOf('.json')));
            }
        }

        return translateList;
    } catch (error) {
        throw NSErrors.TranslationError;
    }
};

/**
 *
 */
async function getTranslatePath(lang) {
    return `./themes/${global.envConfig.environment.currentTheme}/assets/i18n/${lang}`;
}

/**
 * Create languages in file "config/dynamic_langs.js"
 */
const createDynamicLangFile = async () => {
    const _languages  = await Languages.find({status: 'visible'}).select({code: 1, defaultLanguage: 1, _id: 0});
    const contentFile = `module.exports = [${_languages}];`;

    // Create file
    await fs.writeFile(path.join(global.envConfig.environment.currentTheme, '/dynamic_langs.js'), contentFile, (err) => {
        if (err) {
            throw "Error writing file 'dynamic_langs.js'";
        }
    });
};

module.exports = {
    getLanguages,
    getLang,
    saveLang,
    removeLang,
    getDefaultLang,
    translateSet,
    translateGet,
    translateList,
    createDynamicLangFile
};