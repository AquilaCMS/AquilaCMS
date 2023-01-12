/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2022 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {adminAuthRight}    = require('../middleware/authentication');
const ServicesAdminRights = require('../services/adminRights');

module.exports = function (app) {
    app.post('/v2/adminRights', adminAuthRight('admin'), getAdminRights);
};

async function getAdminRights(req, res, next) {
    try {
        const result = await ServicesAdminRights.getAdminRights(req.body.PostBody);
        return res.json(result);
    } catch (error) {
        next(error);
    }
}
