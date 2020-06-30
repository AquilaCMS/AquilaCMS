const fs               = require('fs');
const {Languages}      = require('../orm/models');
const NSErrors         = require("../utils/errors/NSErrors");
const QueryBuilder     = require('../utils/QueryBuilder');

const restrictedFields = [];
const defaultFields    = ["code", "name", "defaultLanguage", "status"];
const queryBuilder     = new QueryBuilder(Languages, restrictedFields, defaultFields);

exports.getLanguages = async function (PostBody) {
    return queryBuilder.find(PostBody);
};

exports.getLang = async function (PostBody) {
    return queryBuilder.findOne(PostBody);
};

exports.saveLang = async function (lang) {
    let result = {};

    if (lang.defaultLanguage) { // Remove other default language
        lang.status = "visible"; // The default language need to be visible
        await Languages.updateOne({defaultLanguage: true}, {defaultLanguage: false});
    }

    if (lang._id) {
        result = await Languages.findOneAndUpdate({_id: lang._id}, lang);
    } else {
        result = await Languages.create(lang);
    }

    await this.createDynamicLangFile();
    return result;
};

exports.removeLang = async function (_id) {
    const deletedLang = await Languages.findOneAndDelete({_id});
    await this.createDynamicLangFile();
    return deletedLang;
};

/**
 * @description Renvoi le code lang par défaut
 * @param {string} language - Langue demandée (df par défaut)
 */
exports.getDefaultLang = function (language) {
    // Si la langue demandé est celle par défault, on va récupérer la "vrai" langue par défaut
    if (language === undefined || language === null || language === "") return global.defaultLang;
    return language;
};

/**
 * @description Enregistre le contenu dans le fichier des traductions
 * @param translateName : Nom du fichier de translate a editer
 * @param translateValue : Contenu à écrire dans le fichier
 */
exports.translateSet = async function (translateName, translateValue, lang) {
    const translatePath  = await getTranslatePath(lang);
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
exports.translateGet = async function (filePath, lang) {
    try {
        const themePath = await getTranslatePath(lang);
        return await fs.readFileSync(`${themePath}/${filePath}.json`, "UTF-8");
    } catch (error) {
        throw NSErrors.TranslationError;
    }
};

/**
 * @description Récupère la liste des fichier de translate
 */
exports.translateList = async function () {
    try {
        const lang = "fr";
        const translateList   = [];
        const translatePath  = await getTranslatePath(lang);

        fs.readdirSync(translatePath).forEach((file) => {
            if (file.endsWith(".json")) {
                translateList.push(file.substring(0, file.lastIndexOf(".json")));
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
exports.createDynamicLangFile = async () => {
    const _languages  = await Languages.find({status: "visible"}).select({code: 1, defaultLanguage: 1, _id: 0});
    const contentFile = `module.exports = [${_languages}];`;

    // Create file
    fs.writeFileSync('./config/dynamic_langs.js', contentFile);
};