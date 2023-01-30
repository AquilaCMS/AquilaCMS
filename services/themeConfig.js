/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
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
 * @description Get the configuration of the current theme
 * @return Returns the theme configuration
 */
const getThemeConfig = async (PostBody) => {
    if (!PostBody) throw NSErrors.PostBodyUndefined;

    const config    = await Configuration.findOne({});
    PostBody.filter = {name: config.environment.currentTheme};
    return queryBuilder.findOne(PostBody);
};

/**
 * @description Get the configuration of the current theme (a particular key)
 * @return Return value of the key
 * @param key (string) key to recover
 */
const getThemeConfigByKey = async (key) => {
    const config      = await Configuration.findOne({});
    const themeConfig = await ThemeConfig.findOne({name: config.environment.currentTheme});
    return themeConfig ? {datas: themeConfig.config[key]} : null;
};

/**
 * @description Allows you to define the configuration of a theme
 * @return Returns the new theme configuration
 * @param body {object} the new theme configuration
 */
const setThemeConfig = async (body) => {
    const nameTheme = global.aquila.envConfig.environment.currentTheme;
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