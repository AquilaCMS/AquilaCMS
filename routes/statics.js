const URL                         = require('url');
const {authentication, adminAuth} = require('../middleware/authentication');
const {securityForceActif}        = require('../middleware/security');
const {StaticsPreview}            = require('../orm/models');
const ServiceStatic               = require('../services/statics');
const ServiceStaticPreview        = require('../services/preview');

module.exports = function (app) {
    app.post('/v2/statics', securityForceActif(['active']), getStatics);
    app.post('/v2/static', securityForceActif(['active']), getStatic);
    app.post('/v2/static/preview', authentication, adminAuth, previewStatic);
    app.post('/v2/static/:id', getStaticById);
    app.put('/v2/static', authentication, adminAuth, setStatic);
    app.delete('/v2/static/:id', authentication, adminAuth, deleteStatic);
};

/**
 * @api {post} /v2/statics Get pages
 * @apiName getStatics
 * @apiGroup Static
 * @apiVersion 2.0.0
 * @apiDescription Get static pages
 * @apiParam {String} lang Get the translation in the right language
 * @apiUse param_PostBody
 * @apiParamExample {js} Example usage:
Get the french pages for slug "mon_slug" with the default fields except one field "metadesc" :
{"lang":"fr","PostBody":{"limit":1,"filter":{"translation.fr.slug":"mon_slug"},"structure":{"translation.fr.metaDesc":0}}}
 * @apiSuccess {Array}  datas           Array of static pages
 * @apiSuccess {String} datas.code      Code of the page
 * @apiSuccess {Object} datas.slug      Slug information
 * @apiSuccess {String} datas.slug.fr   Slug fr
 * @apiSuccess {String} datas.slug.en   Slug en
 * @apiSuccess {Number} datas.content   Content of the page (from translation[lang] fields)
 * @apiSuccess {String} datas.metaDesc  MetaDesc of the page (from translation[lang] fields)
 * @apiSuccess {String} datas.title     Title of the page (from translation[lang] fields)
 * @apiUse ErrorPostBody
 */
async function getStatics(req, res, next) {
    try {
        const {PostBody} = req.body;
        const result     = await ServiceStatic.getStatics(PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * @api {post} /v2/static Get page
 * @apiName getStatic
 * @apiGroup Static
 * @apiVersion 2.0.0
 * @apiDescription Get one static page
 * @apiParam {String} lang Get the translation in the right language
 * @apiUse param_PostBody
 * @apiParamExample {js} Example usage:
Get the page for code "mycode" with the default fields for default language :
{"PostBody":{"filter":{"code":"mycode"}}}
 * @apiSuccess {String}   code        Code of the page
 * @apiSuccess {Object}   slug        Slug information
 * @apiSuccess {String}   slug.fr     Slug fr
 * @apiSuccess {String}   slug.en     Slug en
 * @apiSuccess {Number}   content     Content of the page (from translation[lang] fields)
 * @apiSuccess {String}   metaDesc    MetaDesc of the page (from translation[lang] fields)
 * @apiSuccess {String}   title       Title of the page (from translation[lang] fields)
 * @apiUse ErrorPostBody
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
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Fonction retournant une page statique en fonction de son id
 */
async function getStaticById(req, res, next) {
    console.warn('Unused route ?? : /v2/static/:id');

    try {
        const result = await ServiceStatic.getStaticById(req.params.id, req.body.PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * @api {put} /v2/static Set page
 * @apiName setStatic
 * @apiGroup Static
 * @apiVersion 2.0.0
 * @apiDescription Create/update static page
 * @apiParam {String} code Internal code for this page
 * @apiParam {String} type "Page" TODO
 * @apiParam {Object} [translation] Translation informations
 * @apiParam {Object} [translation.lang] Translation informations for this language (ie fr or en)
 * @apiParam {String} [translation.lang.content] Content
 * @apiParam {String} [translation.lang.title] Title
 * @apiParam {String} [translation.lang.metaDesc] MetaDescription
 * @apiParam {String} [translation.lang.slug] Slug
 */
async function setStatic(req, res, next) {
    try {
        if (req.body._id) {
            await ServiceStatic.setStatic(req);
        } else {
            await ServiceStatic.createStatic(req);
        }

        await ServiceStaticPreview.deletePreview(req.body.code);

        res.end();
    } catch (error) {
        return next(error);
    }
}

/**
 * @api {delete} /v2/static/:_id Delete page
 * @apiName deleteStatic
 * @apiGroup Static
 * @apiVersion 2.0.0
 * @apiDescription Delete static page
 * @apiParam {String} _id Internal _id for this page
 * @apiUse static_not_found
 */
async function deleteStatic(req, res, next) {
    try {
        const result = await ServiceStatic.deleteStatic(req);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 */
async function previewStatic(req, res, next) {
    try {
        let preview = {};
        if (await StaticsPreview.findOne({code: req.body.code})) {
            preview = await StaticsPreview.findOneAndUpdate({code: req.body.code}, req.body, {new: true});
        } else {
            const newPreview = new StaticsPreview(req.body);
            preview          = await newPreview.save();
        }
        const _config = (await require('../orm/models/configuration').find({}))[0];
        if (req.body.lang) {
            console.log(URL.resolve(_config.environment.appUrl, `/${req.body.lang}/${preview.translation[req.body.lang].slug}`));
            return res.json({url: URL.resolve(_config.environment.appUrl, `/${req.body.lang}/${preview.translation[req.body.lang].slug}?preview=${preview._id}`)});
        }
        const lang = await require('../orm/models/languages').findOne({defaultLanguage: true});
        console.log(URL.resolve(_config.environment.appUrl, `/${preview.translation[lang ? lang.code : Object.keys(preview.translation)[0]].slug}`));
        return res.json({url: URL.resolve(_config.environment.appUrl, `/${preview.translation[lang ? lang.code : Object.keys(preview.translation)[0]].slug}?preview=${preview._id}`)});
    } catch (err) {
        next(err);
    }
}
