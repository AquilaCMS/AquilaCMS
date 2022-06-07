/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2022 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const modules = require('../services/modules');

module.exports = (adminFront) => {
    adminFront.get('/', getAdminHomepage);
    adminFront.get('/login', renderLogin);
};

const getAdminHomepage = async (req, res, next) => {
    try {
        const {appUrl, adminPrefix} = await require('../utils/server').getAppUrl(req);
        if (!appUrl || !adminPrefix) return res.status(404).end();
        const tabM = await modules.loadAdminModules();
        return res.render('layout', {appUrl, adminPrefix, tabM});
    } catch (err) {
        return next(err);
    }
};

const renderLogin = async (req, res, next) => {
    try {
        const {appUrl, adminPrefix} = await require('../utils/server').getAppUrl(req);
        if (!appUrl || !adminPrefix) return res.status(404).end();
        return res.render('login', {appUrl, adminPrefix});
    } catch (err) {
        return next(err);
    }
};
