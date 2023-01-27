/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const ServiceComponent = require('../services/component');

module.exports = function (app) {
    app.post('/v2/component/:componentName/:code', getComponent);
};

/**
 * POST /api/v2/component/{componentName}/{code}
 * @summary Get component's values
 */
async function getComponent(req, res, next) {
    try {
        const {componentName, code} = req.params;
        const result                = await ServiceComponent.getComponent(componentName, code, req.info, req.body);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
