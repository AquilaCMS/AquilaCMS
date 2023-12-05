/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {adminAuth}        = require('../middleware/authentication');
const serviceThemeConfig = require('../services/themeConfig');

// ThemeConfig.json file at the root of the themes

module.exports = function (app) {
    app.post('/v2/themeConfig', getThemeConfig);
    app.get('/v2/themeConfig/:key', getThemeConfigByKey);
    app.put('/v2/themeConfig', adminAuth, setThemeConfig);
};

/**
 * POST /api/v2/themeConfig
 * @summary Get the configutation of the current theme
 */
async function getThemeConfig(req, res, next) {
    try {
        let themeConf = await serviceThemeConfig.getThemeConfig(req.body.PostBody);
        if (!themeConf) {
            themeConf = {config: {}};
        }
        res.json(themeConf);
    } catch (error) {
        return next(error);
    }
}

/**
 * GET /api/v2/themeConfig/:key
 * @summary Get ThemeConfig by Key
 */
async function getThemeConfigByKey(req, res, next) {
    try {
        res.json(await serviceThemeConfig.getThemeConfigByKey(req.params.key));
    } catch (error) {
        return next(error);
    }
}

/**
 * PUT /api/v2/themeConfig
 * @summary Set ThemeConfig
 */
async function setThemeConfig(req, res, next) {
    try {
        res.json(await serviceThemeConfig.setThemeConfig(req.body));
    } catch (error) {
        return next(error);
    }
}
