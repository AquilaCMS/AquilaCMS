const {
    Languages,
    Products,
    Categories,
    Statics,
    Attributes,
    CmsBlocks,
    Configuration
}                                 = require("../orm/models");
const {authentication, adminAuth} = require("../middleware/authentication");
const {securityForceFilter}       = require('../middleware/security');
const {middlewareServer}          = require('../middleware');
const servicesLanguages           = require("../services/languages");
const utils                       = require('../utils/utils');
const NSErrors                    = require("../utils/errors/NSErrors");

module.exports = function (app) {
    app.post('/v2/languages', securityForceFilter([{status: "visible"}]), listLangs);
    app.post('/v2/language', getLang);
    app.put('/v2/language', authentication, adminAuth, saveLang);
    app.delete('/v2/language/:id', authentication, adminAuth, removeLang);
    app.get("/V2/translate", translateList);
    app.get("/V2/translate/:lang/:currentTranslate", translateGet);
    app.post("/V2/translate/:lang/:currentTranslate", translateSet);

    // Deprecated
    app.get("/languages", middlewareServer.deprecatedRoute, list);
    app.delete("/languages/:id", middlewareServer.deprecatedRoute, remove);
    app.post("/languages", middlewareServer.deprecatedRoute, save);
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
    if (condition.status === "active") {
        condition.status = {$ne: "removing"};
    }
    try {
        const result = await Languages.find(condition).sort({position: 1});
        res.status(200).json(result);
    } catch (err) {
        return next(err);
    }
}

/**
 * @deprecated
 * @param {Express.Request} req req
 * @param {Express.Response} res res
 * @param {Function} next next
 */
const remove = async (req, res, next) => {
    let lang;
    try {
        lang = await Languages.findOneAndUpdate({code: req.params.id}, {status: "removing"}, {new: true});
    } catch (err) {
        return next(err);
    }

    if (!lang) {
        return res.status(304).end();
    }

    await utils.deleteFile(`${lang.img}`);
    const removePromises = [];
    const models         = [Products, Categories, Statics, Attributes, CmsBlocks, Configuration];
    for (let i = 0; i < models.length; i++) {
        let params  = {};
        const unset = {};

        if (models[i].collection.collectionName === "products") {
            const paramsAttrs                                              = {attributes: {$elemMatch: {}}};
            const unsetAttrs                                               = {};
            paramsAttrs.attributes.$elemMatch[`.translation.${lang.code}`] = {$ne: null};
            unsetAttrs[`attributes.$.translation.${lang.code}`]            = 1;
            removePromises.push(models[i].updateMany(paramsAttrs, {$unset: unsetAttrs}));
        }

        if (models[i].collection.collectionName === "configurations") {
            params                                                             = {"stockOrder.values": {$elemMatch: {}}};
            params["stockOrder.values"].$elemMatch[`translation.${lang.code}`] = {$ne: null};
            unset[`stockOrder.values.$.translation.${lang.code}`]              = 1;
        } else {
            params[`translation.${lang.code}`] = {$ne: null};
            unset[`translation.${lang.code}`]  = 1;
        }

        removePromises.push(models[i].updateMany(params, {$unset: unset}));
    }
    try {
        await Promise.all(removePromises);
        try {
            await Languages.deleteOne({code: req.params.id});
            servicesLanguages.createDynamicLangFile();
            return res.status(200).end();
            // return servicesLanguages.updateIndex(req.params.id)
            //     .then(function () {
            //         res.status(200).end();
            //     });
        } catch (err) {
            console.error(err);
            return next({
                code         : "translation_delete_error",
                status       : 500,
                translations : {
                    fr : `Toutes les traductions dans la langue ${lang.name} ont été supprimées.
                     Mais une erreur est survenue lors de la suppression de la langue elle-même.`,
                    en : `All translations in ${lang.name} has been deleted. But an error occurred during language deleting.`
                }
            });
        }
    } catch (err) {
        console.error(err);
        return next(NSErrors.TranslateDeleteError);
    }
};

/**
 * @deprecated
 * @param {Express.Request} req req
 * @param {Express.Response} res res
 * @param {Function} next next
 */
async function save(req, res, next) {
    try {
        const lang = req.body;
        if (lang.defaultLanguage) {
            lang.status = "visible";
        }
        if (lang.defaultLanguage) {
            await Languages.updateOne({defaultLanguage: true}, {defaultLanguage: false});
        }
        if (!lang._id) {
            await Languages.create(lang);
            // await statics.updateOne({code: "home"}, {$set: {[`translation.${lang.code}`]: {slug: "home"}}});
        } else {
            await Languages.updateOne({_id: lang._id}, lang);
        }
        // await servicesLanguages.updateIndex();
        await servicesLanguages.createDynamicLangFile();
        return res.status(200).end();
    } catch (err) {
        return next(err);
    }
}
