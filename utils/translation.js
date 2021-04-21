/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const path              = require('path');
const fileSystemBackend = require('i18next-fs-backend');

const initI18n = async (i18nInstance, ns) => {
    const {Languages} = require('../orm/models');
    const langs       = (await Languages.find({}, {code: 1, _id: 0})).map((elem) => elem.code);
    i18nInstance.use(fileSystemBackend).init({
        languages   : langs,
        preload     : langs,
        fallbackLng : langs,
        load        : 'all',
        ns,
        fallbackNS  : 'common',
        defaultNS   : 'common',
        react       : {
            wait : false
        },
        backend : {
            loadPath : path.join(
                global.appRoot,
                `/themes/${global.envConfig.environment.currentTheme}/assets/i18n/{{lng}}/{{ns}}.json`
            )
        }
    });
};

/**
 * traduit un document mongo
 * @param {object} doc - document mongo à traduire
 * @param {string} lang - code de la langue
 * @returns {object} - retourne l'objet traduit
 */
function translateDocument(doc, lang) {
    if (doc._doc) {
        doc = doc.toObject();
    }
    doc = deepTranslation(doc, lang);
    return doc;
}

const deepTranslation = (doc, lang) => {
    if (!doc) return doc;
    if (doc._doc) doc = doc.toObject();
    const docKeys = Object.keys(doc);
    for (let i = 0; i < docKeys.length; i++) {
        if (!(['__v', '_bsontype']).includes(docKeys[i])) {
            if (Object.prototype.toString.call(docKeys[i]) === '[object Map]') {
                doc[docKeys[i]] = Object.fromEntries(doc[docKeys[i]]);
            }
            // si le champs est translation
            if (docKeys[i] === 'translation') {
                doc = assignTranslation(doc, lang);
            // si on trouve un tableaux, on parcours les elements du tableau
            } else if (doc[docKeys[i]] && typeof doc[docKeys[i]] !== 'string' && doc[docKeys[i]].length) {
                for (let j = 0; j < doc[docKeys[i]].length; j++) {
                    if (typeof doc[docKeys[i]][j] === 'object') {
                        doc[docKeys[i]][j] = deepTranslation(doc[docKeys[i]][j], lang);
                    }
                }
            // si le champs est un object
            } else if (doc[docKeys[i]] && typeof doc[docKeys[i]] === 'object') {
                doc[docKeys[i]] = deepTranslation(doc[docKeys[i]], lang);
            }
        }
    }
    return doc;
};

/**
 * assigne la traduction à l'object et supprime la propriété translation
 * @param {Object} json - document
 * @param {string} lang - code de la langue
 * @returns {Object} - retourne l'objet traduit
 */
const assignTranslation = (json, lang) => {
    let result = json;
    if (json.toObject !== undefined) {
        result = json.toObject();
    }
    if (result.translation) {
        if (result.translation[lang] && result.translation[lang].slug) {
            const translationKeys = Object.keys(result.translation);
            result.slug           = {};
            for (let i = 0; i < translationKeys.length; i++) {
                result.slug[translationKeys[i]] = result.translation[translationKeys[i]].slug;
                delete result.translation[translationKeys[i]].slug;
            }
        }
        result = Object.assign(result, result.translation[lang]);
        delete result.translation;
    }
    return result;
};

const checkTranslations = (value, key, errors, lang) => {
    if (typeof key === 'string' && value !== undefined && typeof value !== 'string') {
        errors.push(`translations.${lang}.${key}, n'est pas une chaine de caractère`);
    }
    return errors;
};

function checkCustomFields(customObject, parent, fields) {
    const errorsType = {
        string : 'une chaine de caractère'
    };
    const errors     = [];
    const customKeys = Object.keys(customObject);

    for (let i = 0; i < customKeys.length; i++) {
        for (let j = 0; j < fields.length; j++) {
            if (fields[j].type === undefined) {
                fields[j].type = 'string';
            }

            if (
                (customKeys[i] === fields[j].key)
                && (customObject[customKeys[i]] !== undefined)
                // eslint-disable-next-line valid-typeof
                && ((typeof customObject[customKeys[i]]) !== fields[j].type.toString())
            ) {
                // TODO P4 "Gestion erreur": mettre le système de code
                errors.push(`${(parent ? `${parent}.` : '') + fields[j].key}, n'est pas ${errorsType[fields[j].type]}`);
            }
        }
    }

    return errors;
}

module.exports = {
    initI18n,
    translateDocument,
    checkTranslations,
    checkCustomFields
};