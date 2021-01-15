/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {authentication, adminAuth} = require('../middleware/authentication');
const ServiceSystem               = require('../services/system');

module.exports = function (app) {
    app.get('/v2/system/log/file', authentication, adminAuth, getLogsContent);
    app.get('/v2/system/next/get', authentication, adminAuth, getNextVersion);
    app.post('/v2/system/next/change', authentication, adminAuth, changeNextVersion);
};

const getLogsContent = async (req, res, next) => {
    try {
        const {name:fileName} = req.query;
        return res.json(await ServiceSystem.getLogsContent(fileName));
    } catch (err) {
        return next(err);
    }
};

/**
 * GET /api/config/next
 * @tags Configuration
 */
const getNextVersion = async (req, res, next) => {
    try {
        const datas = await ServiceSystem.getNextVersionService();
        return res.json({datas});
    } catch (err) {
        return next(err);
    }
};

/**
 * POST /api/config/next
 * @tags Configuration
 */
const changeNextVersion = async (req, res, next) => {
    try {
        await ServiceSystem.changeNextVersionService(req.body);
        res.end();
    } catch (err) {
        return next(err);
    }
};