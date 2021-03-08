/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const fs           = require('fs');
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
 * @description Renvoi le code lang par défaut
 * @param {string} language - Langue demandée (df par défaut)
 */
const getDefaultLang = (language) => {
    // Si la langue demandé est celle par défault, on va récupérer la "vrai" langue par défaut
    if (language === undefined || language === null || language === '') return global.defaultLang;
    return language;
};

/**
 * @description Enregistre le contenu dans le fichier des traductions
 * @param translateName : Nom du fichier de translate a editer
 * @param translateValue : Contenu à écrire dans le fichier
 */
const translateSet = async (translateName, translateValue, lang) => {
    const translatePath = await getTranslatePath(lang);
    if (!fs.existsSync(translatePath)) {
        fs.mkdirSync(translatePath);
    }

    fs.writeFile(`${translatePath}/${translateName}.json`, translateValue, (err) => {
        if (err) {throw NSErrors.TranslationError;}
    });
};

/**
 * @description Récupère le contenue du fichier de traduction
 */
const translateGet = async (filePath, lang) => {
    try {
        const themePath = await getTranslatePath(lang);
        return await fs.readFileSync(`${themePath}/${filePath}.json`, 'UTF-8');
    } catch (error) {
        throw NSErrors.TranslationError;
    }
};

/**
 * @description Récupère la liste des fichier de translate
 */
const translateList = async () => {
    try {
        const lang          = 'fr';
        const translateList = [];
        const translatePath = await getTranslatePath(lang);

        fs.readdirSync(translatePath).forEach((file) => {
            if (file.endsWith('.json')) {
                translateList.push(file.substring(0, file.lastIndexOf('.json')));
            }
        });

        return translateList;
    } catch (error) {
        throw NSErrors.TranslationError;
    }
};

/**
 * Create languages in file "config/dynamic_langs.js"
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
    await fs.writeFile('./config/dynamic_langs.js', contentFile, (err) => {
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