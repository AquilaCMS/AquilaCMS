const {ThemeConfig, Configuration} = require("../orm/models");
const QueryBuilder                 = require('../utils/QueryBuilder');

const restrictedFields             = [];
const defaultFields                = ["_id", "name", "config"];
const queryBuilder                 = new QueryBuilder(ThemeConfig, restrictedFields, defaultFields);

/**
 * @description Permet de récupérer la configuration du thème courant
 * @return Retourne la configuration du thème
 */
exports.getThemeConfig = async function (PostBody) {
    const config    = await Configuration.findOne({});
    PostBody.filter = {name: config.environment.currentTheme};
    return queryBuilder.findOne(PostBody);
};

/**
 * @description Permet de récupérer la configuration du thème courant (une clé en particulier)
 * @return Retourne valeur de la key
 * @param key (string) key à récupérer
 */
exports.getThemeConfigByKey = async function (key) {
    const config      = await Configuration.findOne({});
    const themeConfig = await ThemeConfig.findOne({name: config.environment.currentTheme});
    return themeConfig ? {datas: themeConfig.config[key]} : null;
};

/**
 * @description Permet de définir la configuration d'un thème
 * @return Retourne la nouvelle configuration du thème
 * @param body {object} la nouvelle configuration du thème
 */
exports.setThemeConfig = async function (body) {
    const config         = await Configuration.findOne({});
    const nameTheme      = config.environment.currentTheme;
    delete body.lang;
    const oldConfig      = await ThemeConfig.findOne({name: nameTheme});
    const keys           = Object.keys(oldConfig.config);
    const objectFiltered = {};
    for (let i = 0; i < keys.length; i++) {
        objectFiltered[keys[i]] = body.config[keys[i]];
    }
    const translation = {translation: body.config};
    const newConfig = await ThemeConfig.findOneAndUpdate({name: nameTheme}, {$set: {config: translation}}, {new: true});
    return {datas: newConfig.config};
};