/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const serviceAdminInformation = require('../services/admin');
const {adminAuth}             = require('../middleware/authentication');
const modules                 = require('../services/modules');

module.exports = (router, adminFront) => {
    router.get('/v2/adminInformation', adminAuth, getAdminInformation);
    router.delete('/v2/adminInformation/:code', adminAuth, deleteAdminInformation);

    // BackOffice
    adminFront.get('/', getAdminHomepage);
    adminFront.get('/login', renderLogin);
};

// GET /api/v2/adminInformation
// @tags Admin
// @summary Get admin information
async function getAdminInformation(req, res, next) {
    try {
        const result = await serviceAdminInformation.getAdminInformation();
        return res.status(200).json(result);
    } catch (error) {
        return next(error);
    }
}

// GET /api/v2/adminInformation/{code}
// @tags Admin
// @summary Delete admin information
function deleteAdminInformation(req, res, next) {
    try {
        serviceAdminInformation.deleteAdminInformation(req.params.code);
        res.status(200).end();
    } catch (error) {
        return next(error);
    }
}

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
