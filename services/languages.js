/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const path          = require('path');
const {fs}          = require('aql-utils');
const ServiceConfig = require('./config');
const {Languages}   = require('../orm/models');
const NSErrors      = require('../utils/errors/NSErrors');
const QueryBuilder  = require('../utils/QueryBuilder');

const restrictedFields = [];
const defaultFields    = ['code', 'name', 'defaultLanguage', 'status', 'img'];
const queryBuilder     = new QueryBuilder(Languages, restrictedFields, defaultFields);

const warningMsg = 'you must rebuild the theme and restart the server to apply the change.';

const getLanguages = async (PostBody) => queryBuilder.find(PostBody, true);

const getLang = async (PostBody) => queryBuilder.findOne(PostBody, true);

const saveLang = async (lang) => {
    let result = {};

    if (lang.defaultLanguage) { // Remove other default language
        lang.status               = 'visible'; // The default language need to be visible
        global.aquila.defaultLang = lang.code;
        await Languages.updateOne({defaultLanguage: true}, {$set: {defaultLanguage: false}});
    }

    if (lang._id) {
        result = await Languages.findOneAndUpdate({_id: lang._id}, lang);
    } else {
        result = await Languages.create(lang);
    }

    await require('./themes').languageManagement();
    if (lang._id) {
        console.log(`Language '${result.name}' updated, ${warningMsg}`);
    } else if (result.status === 'visible') {
        console.log(`Language '${result.name}' created, ${warningMsg}`);
    }
    return result;
};

const removeLang = async (_id) => {
    const deletedLang = await Languages.findOneAndDelete({_id});

    await require('./themes').languageManagement();
    if (deletedLang.status === 'visible') {
        console.log(`Language '${deletedLang.name}' deleted, ${warningMsg}`);
    }
    return deletedLang;
};

/**
 * @description Return the default lang code
 * @param {string} language - Requested language
 */
const getDefaultLang = async (language) => {
    if (language) {
        // Check if language exists
        const lang = await Languages.find({code: language}).lean();
        if (lang) return language;
    }
    return global.aquila.defaultLang;
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
        const lang          = await getDefaultLang();
        const translateList = [];
        const translatePath = await getTranslatePath(lang);
        await getListOfAllTranslationFiles(translatePath, translateList);

        return translateList.map((translate) => translate.replace(`${translatePath}\\`, '').replace(/\\/g, '/'));
    } catch (error) {
        throw NSErrors.TranslationError;
    }
};

const getListOfAllTranslationFiles = async (dir, translateList) => {
    try {
        const files = await fs.readdir(dir);

        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat     = await fs.stat(filePath);

            if (stat.isFile() && path.extname(filePath) === '.json') {
                translateList.push(filePath.substring(0, filePath.lastIndexOf('.json')));
            } else if (stat.isDirectory()) {
                await getListOfAllTranslationFiles(filePath, translateList);
            }
        }
    } catch (err) {
        console.error('Could not list the directory.', err);
    }
};

/**
 *
 */
async function getTranslatePath(lang) {
    const newPath = path.join(global.aquila.appRoot, 'themes', global.aquila.envConfig.environment.currentTheme, 'locales', lang);
    if (await fs.existsSync(newPath)) {
        return newPath;
    }
    return path.join(global.aquila.appRoot, 'themes', global.aquila.envConfig.environment.currentTheme, 'assets', 'i18n', lang);
}

/**
 * Create languages in file "dynamic_langs.js" in the root's theme (for reactjs)
 */
const createDynamicLangFile = async (selectedTheme = global.aquila.envConfig.environment.currentTheme) => {
    try {
        const _languages  = await Languages.find({status: 'visible'}).select({code: 1, defaultLanguage: 1, _id: 0});
        const contentFile = `module.exports = [${_languages}];`;
        const linkToFile  = path.join(global.aquila.appRoot, 'themes', selectedTheme, 'dynamic_langs.js');
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