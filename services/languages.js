/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2022 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const path          = require('path');
const fs            = require('../utils/fsp');
const ServiceConfig = require('./config');
const {Languages}   = require('../orm/models');
const NSErrors      = require('../utils/errors/NSErrors');
const QueryBuilder  = require('../utils/QueryBuilder');

const restrictedFields = [];
const defaultFields    = ['code', 'name', 'defaultLanguage', 'status', 'img'];
const queryBuilder     = new QueryBuilder(Languages, restrictedFields, defaultFields);

const getLanguages = async (PostBody) => queryBuilder.find(PostBody, true);

const getLang = async (PostBody) => queryBuilder.findOne(PostBody, true);

const saveLang = async (lang) => {
    let result = {};

    if (lang.defaultLanguage) { // Remove other default language
        lang.status        = 'visible'; // The default language need to be visible
        global.defaultLang = lang.code;
        await Languages.updateOne({defaultLanguage: true}, {$set: {defaultLanguage: false}});
    }

    if (lang._id) {
        result = await Languages.findOneAndUpdate({_id: lang._id}, lang);
    } else {
        result = await Languages.create(lang);
    }

    await require('./themes').languageManagement();
    return result;
};

const removeLang = async (_id) => {
    const deletedLang = await Languages.findOneAndDelete({_id});

    await require('./themes').languageManagement();
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
        const pathName = path.join(translatePath, `${translateName}.json`);
        await fs.writeFile(pathName, translateValue);
    } catch (err) {
        throw NSErrors.TranslationError;
    }
};

/**
 * @description Get the contents of the translation file
 */
const translateGet = async (filePath, lang) => {
    const {createSchema} = require('genson-js');
    try {
        const themePath = await getTranslatePath(lang);
        const pathName  = path.resolve(themePath, `${filePath}.json`);
        const temp      = fs.readFileSync(pathName, 'utf8');
        const tradObj   = {};
        tradObj.data    = temp;
        tradObj.schema  = createSchema(JSON.parse(temp));

        return tradObj;
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
        const listDir       = await fs.readdir(translatePath);
        for (const file of listDir) {
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
    return path.join(global.appRoot, 'themes', global.envConfig.environment.currentTheme, 'assets', 'i18n', lang);
}

/**
 * Create languages in file "dynamic_langs.js" in the root's theme (for reactjs)
 */
const createDynamicLangFile = async (selectedTheme = global.envConfig.environment.currentTheme) => {
    try {
        const _languages  = await Languages.find({status: 'visible'}).select({code: 1, defaultLanguage: 1, _id: 0});
        const contentFile = `module.exports = [${_languages}];`;
        const linkToFile  = path.join(global.appRoot, 'themes', selectedTheme, 'dynamic_langs.js');
        if (await fs.existsSync(linkToFile)) {
            const originalContentFile = await fs.readFile(linkToFile);

            if (originalContentFile.toString() !== contentFile) {
                console.log('dynamic_lang file changes');
                await ServiceConfig.needRebuildAndRestart(true, true);
            }
        } else {
            await ServiceConfig.needRebuildAndRestart(true, true);
        }

        await fs.writeFile(linkToFile, contentFile);
    } catch (e) {
        console.error(e);
        throw 'Error writing file "dynamic_langs.js"';
    }
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