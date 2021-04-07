/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {ThemeConfig, Configuration} = require('../orm/models');
const QueryBuilder                 = require('../utils/QueryBuilder');
const NSErrors                     = require('../utils/errors/NSErrors');

const restrictedFields = ['group', 'description', 'name'];
const defaultFields    = ['_id', 'name', 'config'];
const queryBuilder     = new QueryBuilder(ThemeConfig, restrictedFields, defaultFields);

/**
 * @description Permet de récupérer la configuration du thème courant
 * @return Retourne la configuration du thème
 */
const getThemeConfig = async (PostBody) => {
    if (!PostBody) throw NSErrors.PostBodyUndefined;

    const config    = await Configuration.findOne({});
    PostBody.filter = {name: config.environment.currentTheme};
    return queryBuilder.findOne(PostBody);
};

/**
 * @description Permet de récupérer la configuration du thème courant (une clé en particulier)
 * @return Retourne valeur de la key
 * @param key (string) key à récupérer
 */
const getThemeConfigByKey = async (key) => {
    const config      = await Configuration.findOne({});
    const themeConfig = await ThemeConfig.findOne({name: config.environment.currentTheme});
    return themeConfig ? {datas: themeConfig.config[key]} : null;
};

/**
 * @description Permet de définir la configuration d'un thème
 * @return Retourne la nouvelle configuration du thème
 * @param body {object} la nouvelle configuration du thème
 */
const setThemeConfig = async (body) => {
    const nameTheme = global.envConfig.environment.currentTheme;
    delete body.lang;
    for (const [key, values] of Object.entries(body.config)) {
        body.config[key] = {values};
    }
    const oldConfig = await ThemeConfig.findOne({name: nameTheme});
    if (oldConfig && oldConfig.config) {
        const newConfig = await ThemeConfig.findOneAndUpdate(
            {name: nameTheme},
            {$set: {config: {translation: body.config}}},
            {new: true}
        );
        return {datas: newConfig.config};
    }
    return {datas: {}};
};

module.exports = {
    getThemeConfig,
    getThemeConfigByKey,
    setThemeConfig
};