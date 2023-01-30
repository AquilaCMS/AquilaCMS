/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {adminAuth}       = require('../middleware/authentication');
const ServiceShortcodes = require('../services/shortcodes');

module.exports = function (app) {
    app.get('/v2/shortcodes', adminAuth, getShortcodes);
};

/**
 * Return shortcodes
 */
async function getShortcodes(req, res, next) {
    try {
        const result = await ServiceShortcodes.getShortcodes();
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
