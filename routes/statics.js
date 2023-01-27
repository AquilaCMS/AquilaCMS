/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const URL                  = require('url');
const {adminAuthRight}     = require('../middleware/authentication');
const {securityForceActif} = require('../middleware/security');
const {StaticsPreview}     = require('../orm/models');
const ServiceStatic        = require('../services/statics');
const ServiceStaticPreview = require('../services/preview');
const {isAdmin}            = require('../utils/utils');
const {autoFillCode}       = require('../middleware/autoFillCode');

module.exports = function (app) {
    app.post('/v2/statics', securityForceActif(['active']), getStatics);
    app.post('/v2/static', securityForceActif(['active']), getStatic);
    app.post('/v2/static/preview', adminAuthRight('staticPage'), previewStatic);
    app.post('/v2/static/:id', getStaticById);
    app.put('/v2/static', adminAuthRight('staticPage'), autoFillCode, setStatic);
    app.delete('/v2/static/:id', adminAuthRight('staticPage'), deleteStatic);
};

/**
 * POST /api/v2/statics
 * @summary Static (pages) listing
 *
 * @apiSuccess {Array}  datas           Array of static pages
 * @apiSuccess {String} datas.code      Code of the page
 * @apiSuccess {Object} datas.slug      Slug information
 * @apiSuccess {String} datas.slug.fr   Slug fr
 * @apiSuccess {String} datas.slug.en   Slug en
 * @apiSuccess {Number} datas.content   Content of the page (from translation[lang] fields)
 * @apiSuccess {String} datas.metaDesc  MetaDesc of the page (from translation[lang] fields)
 * @apiSuccess {String} datas.title     Title of the page (from translation[lang] fields)
 */
async function getStatics(req, res, next) {
    try {
        const {PostBody} = req.body;
        const result     = await ServiceStatic.getStatics(PostBody);
        if (!isAdmin(req.info)) {
            // we loop on the results
            for (let i = 0; i < result.datas.length; i++) {
                const page = result.datas[i];
                if (page && page.translation) {
                    // we loop on the languages contained
                    for (let k = 0; k < Object.keys(page.translation).length; k++) {
                        const langKey = Object.keys(page.translation)[k];
                        delete page.translation[langKey].variables;
                        delete page.translation[langKey].html;
                    }
                }
            }
        }
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * POST /api/v2/static
 * @tags Static
 * @summary Static (page) details
 *
 * @apiSuccess {String}   code        Code of the page
 * @apiSuccess {Object}   slug        Slug information
 * @apiSuccess {String}   slug.fr     Slug fr
 * @apiSuccess {String}   slug.en     Slug en
 * @apiSuccess {Number}   content     Content of the page (from translation[lang] fields)
 * @apiSuccess {String}   metaDesc    MetaDesc of the page (from translation[lang] fields)
 * @apiSuccess {String}   title       Title of the page (from translation[lang] fields)
 */
async function getStatic(req, res, next) {
    try {
        let result      = {};
        const {preview} = req.query;
        const postBody  = req.body.PostBody;
        if (preview) {
            result = await ServiceStaticPreview.getStaticPreviewById(preview);
        } else {
            result = await ServiceStatic.getStatic(postBody);
        }
        if (!isAdmin(req.info) && result && result.translation) {
            // we loop on the languages contained
            for (let k = 0; k < Object.keys(result.translation).length; k++) {
                const langKey = Object.keys(result.translation)[k];
                delete result.translation[langKey].variables;
                delete result.translation[langKey].html;
            }
        }
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Function returning a static page according to its id (unused)
 */
async function getStaticById(req, res, next) {
    try {
        const result = await ServiceStatic.getStaticById(req.params.id, req.body.PostBody);
        if (!isAdmin(req.info) && result.translation) {
            // we loop on the languages contained
            for (let k = 0; k < Object.keys(result.translation).length; k++) {
                const langKey = Object.keys(result.translation)[k];
                delete result.translation[langKey].variables;
                delete result.translation[langKey].html;
            }
        }
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * PUT /api/v2/static
 * @summary Create/update static (page)
 */
async function setStatic(req, res, next) {
    try {
        if (req.body._id) {
            await ServiceStatic.setStatic(req.body);
        } else {
            await ServiceStatic.createStatic(req.body);
        }
        await ServiceStaticPreview.deletePreview(req.body.code);

        res.end();
    } catch (error) {
        return next(error);
    }
}

/**
 * DELETE /api/v2/static/{id}
 * @summary Delete static (page)
 */
async function deleteStatic(req, res, next) {
    try {
        const result = await ServiceStatic.deleteStatic(req.params.id);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 *
 */
async function previewStatic(req, res, next) {
    try {
        let preview      = {};
        const oldPreview = await StaticsPreview.findOne({code: req.body.code});

        if (oldPreview) {
            delete req.body._id;
            preview = await StaticsPreview.findOneAndUpdate({code: req.body.code}, req.body, {new: true});
        } else {
            const newPreview = new StaticsPreview(req.body);
            preview          = await newPreview.save();
        }
        const _config = (await require('../orm/models/configuration').find({}))[0];
        if (req.body.lang) {
            return res.json({url: URL.resolve(_config.environment.appUrl, `/${req.body.lang}/${preview.translation[req.body.lang].slug}?preview=${preview._id}`)});
        }
        const lang = await require('../orm/models/languages').findOne({defaultLanguage: true});
        return res.json({url: URL.resolve(_config.environment.appUrl, `/${preview.translation[lang ? lang.code : Object.keys(preview.translation)[0]].slug}?preview=${preview._id}`)});
    } catch (err) {
        next(err);
    }
}
