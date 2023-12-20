/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */
const {adminAuthRight}      = require('../middleware/authentication');
const {securityForceFilter} = require('../middleware/security');
const servicesLanguages     = require('../services/languages');

module.exports = function (app) {
    app.post('/v2/languages', securityForceFilter([{status: 'visible'}]), listLangs);
    app.post('/v2/language', getLang);
    app.put('/v2/language', adminAuthRight('languages'), saveLang);
    app.delete('/v2/language/:id', adminAuthRight('languages'), removeLang);
    app.get('/V2/translate', translateList);
    app.get('/V2/translate/:lang/:currentTranslate', translateGet);
    app.post('/V2/translate/:lang/:currentTranslate', adminAuthRight('translate'), translateSet);
};

/**
 * POST /api/v2/languages
 * @summary Language list
 */
async function listLangs(req, res, next) {
    try {
        const {PostBody} = req.body;
        const result     = await servicesLanguages.getLanguages(PostBody);
        return res.json(result);
    } catch (e) {
        next(e);
    }
}

async function getLang(req, res, next) {
    try {
        const result = await servicesLanguages.getLang(req.body.PostBody);
        return res.json(result);
    } catch (e) {
        next(e);
    }
}

async function saveLang(req, res, next) {
    try {
        const result = await servicesLanguages.saveLang(req.body.lang);
        return res.json(result);
    } catch (e) {
        next(e);
    }
}

async function removeLang(req, res, next) {
    try {
        const result = await servicesLanguages.removeLang(req.params.id);
        return res.json(result);
    } catch (e) {
        next(e);
    }
}

/**
 * @description Retrieves translation files
 */
async function translateList(req, res, next) {
    try {
        const listing = await servicesLanguages.translateList();
        return res.send(listing);
    } catch (err) {
        return next(err);
    }
}

/**
 * @description Retrieve the particular translation file
 */
async function translateGet(req, res, next) {
    try {
        const thisContent = await servicesLanguages.translateGet(req.params.currentTranslate, req.params.lang);
        return res.send(thisContent);
    } catch (err) {
        return next(err);
    }
}

async function translateSet(req, res, next) {
    try {
        await servicesLanguages.translateSet(req.params.currentTranslate, req.body.datas, req.params.lang);
        return res.status(200).json();
    } catch (error) {
        return next(error);
    }
}
