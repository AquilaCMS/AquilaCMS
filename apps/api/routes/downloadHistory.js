/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const SercivesDownloadHistory = require('../services/downloadHistory');
const {adminAuth}             = require('../middleware/authentication');

module.exports = function (app) {
    app.post('/v2/downloadHistory', adminAuth, getHistory);
    app.put('/v2/downloadHistory', adminAuth, addToHistory);
};

/**
 * Retrieving the history of recorded downloads (or filtering via the PostBody)
 */
async function getHistory(req, res, next) {
    try {
        return res.json(await SercivesDownloadHistory.getHistory(req.body.PostBody));
    } catch (error) {
        return next(error);
    }
}

async function addToHistory(req, res, next) {
    try {
        return res.json(await SercivesDownloadHistory.addToHistory(req.body.user, req.body.product));
    } catch (error) {
        return next(error);
    }
}