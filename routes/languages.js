const {Languages}                 = require('../orm/models');
const {authentication, adminAuth} = require('../middleware/authentication');
const {securityForceFilter}       = require('../middleware/security');
const {middlewareServer}          = require('../middleware');
const servicesLanguages           = require('../services/languages');

module.exports = function (app) {
    app.post('/v2/languages', securityForceFilter([{status: 'visible'}]), listLangs);
    app.post('/v2/language', getLang);
    app.put('/v2/language', authentication, adminAuth, saveLang);
    app.delete('/v2/language/:id', authentication, adminAuth, removeLang);
    app.get('/V2/translate', translateList);
    app.get('/V2/translate/:lang/:currentTranslate', translateGet);
    app.post('/V2/translate/:lang/:currentTranslate', translateSet);

    // Deprecated
    app.get('/languages', middlewareServer.deprecatedRoute, list);
};

async function listLangs(req, res, next) {
    try {
        const {PostBody} = req.body;
        const result   = await servicesLanguages.getLanguages(PostBody);
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
 * @description Récupère des fichiers de traduction
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
 * @description Récupère le fichier de traduction particulier
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

//= ====================================================================
//= ========================== Deprecated ==============================
//= ====================================================================

/**
 * @deprecated
 * @param {Express.Request} req req
 * @param {Express.Response} res res
 * @param {Function} next next
 */
async function list(req, res, next) {
    const condition = req.query;
    if (condition.status === 'active') {
        condition.status = {$ne: 'removing'};
    }
    try {
        const result = await Languages.find(condition).sort({position: 1});
        res.status(200).json(result);
    } catch (err) {
        return next(err);
    }
}
