/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2022 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

/**
 * translate a Mongo document
 * @param {object} doc - Mongo document to translate
 * @param {string} lang - language code
 * @returns {object} - returns the translated object
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
            // if the field is translation
            if (docKeys[i] === 'translation') {
                doc = assignTranslation(doc, lang);
            } else
            // if the field is an object
            if (doc[docKeys[i]] && (typeof doc[docKeys[i]] !== 'string') && doc[docKeys[i]].length) {
                for (let j = 0; j < doc[docKeys[i]].length; j++) {
                    if (typeof doc[docKeys[i]][j] === 'object') {
                        doc[docKeys[i]][j] = deepTranslation(doc[docKeys[i]][j], lang);
                    }
                }
            } else
            // if we find an array, we browse the elements of the array
            if (doc[docKeys[i]] && typeof doc[docKeys[i]] === 'object') {
                doc[docKeys[i]] = deepTranslation(doc[docKeys[i]], lang);
            }
        }
    }
    return doc;
};

/**
 * assign the translation to the object and remove the translation property
 * @param {Object} json - document
 * @param {string} lang - language code
 * @returns {Object} - returns the translated object
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
        errors.push(`translations.${lang}.${key}, is not a string`);
    }
    return errors;
};

function checkCustomFields(customObject, parent, fields) {
    const errorsType = {
        string : 'a string'
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
                // TODO P4 "Error management": put the code system
                errors.push(`${(parent ? `${parent}.` : '') + fields[j].key}, is not ${errorsType[fields[j].type]}`);
            }
        }
    }

    return errors;
}

module.exports = {
    translateDocument,
    checkTranslations,
    checkCustomFields
};