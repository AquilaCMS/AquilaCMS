const {CmsBlocks}                 = require('../orm/models');
const ServiceCmsBlock             = require('../services/cmsBlocks');
const {authentication, adminAuth} = require("../middleware/authentication");
const {middlewareServer}          = require('../middleware');
const NSErrors                    = require("../utils/errors/NSErrors");
const utils                       = require('../utils/utils');

module.exports = function (app) {
    app.post('/v2/cmsBlocks', getCMSBlocks);
    app.post("/v2/cmsBlock", getCMSBlock);
    app.post('/v2/cmsBlock/:code', getCMSBlockById);
    app.put("/v2/cmsBlock", authentication, adminAuth, setCMSBlock);
    app.delete('/v2/cmsBlock/:code', authentication, adminAuth, deleteCMSBlock);

    // Deprecated
    app.get('/cmsBlocks', middlewareServer.deprecatedRoute, authentication, adminAuth, list);
    app.get('/cmsBlocks/:code', middlewareServer.deprecatedRoute, detail);
    app.post('/cmsBlocks', middlewareServer.deprecatedRoute, authentication, adminAuth, save);
    app.delete('/cmsBlocks/:code', middlewareServer.deprecatedRoute, authentication, adminAuth, remove);
};

/**
 * @api {post} /v2/cmsBlocks Get CMSBlocks
 * @apiName getCMSBlocks
 * @apiGroup CMSBlock
 * @apiVersion 2.0.0
 * @apiDescription Get CMSBlocks
 * @apiParam {String} lang Get the translation in the right language
 * @apiUse param_PostBody
 * @apiParamExample {js} Example usage:
Get all CMSBlocks with the default fields for default language :
{"PostBody":{"filter":{}}}
 * @apiSuccess {Array}  datas           Array of CMSBlocks
 * @apiSuccess {String} datas.code      Code of the CMSBlock
 * @apiSuccess {Number} datas.content   HTML content of the CMSBlock (from translation[lang] fields)
 * @apiUse ErrorPostBody
 */
async function getCMSBlocks(req, res, next) {
    try {
        const result = await ServiceCmsBlock.getCMSBlocks(req.body.PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * @api {post} /v2/cmsBlock Get CMSBlock
 * @apiName getCMSBlock
 * @apiGroup CMSBlock
 * @apiVersion 2.0.0
 * @apiDescription Get one CMSBlock
 * @apiParam {String} lang Get the translation in the right language
 * @apiUse param_PostBody
 * @apiParamExample {js} Example usage:
Get the CMSBlock for code "mycode" with the default fields for default language :
{"PostBody":{"filter":{"code":"mycode"}}}
 * @apiSuccess {String}   code          Code of the CMSBlock
 * @apiSuccess {Number}   content       HTML content of the CMSBlock (from translation[lang] fields)
 * @apiUse ErrorPostBody
 */
async function getCMSBlock(req, res, next) {
    try {
        const result = await ServiceCmsBlock.getCMSBlock(req.body.PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

async function getCMSBlockById(req, res, next) {
    try {
        const result = await ServiceCmsBlock.getCMSBlockById(req.params.code, req.body.PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

async function setCMSBlock(req, res, next) {
    try {
        const result = await ServiceCmsBlock.setCMSBlock(req.body);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

async function deleteCMSBlock(req, res, next) {
    try {
        const result = await ServiceCmsBlock.deleteCMSBlock(req.params.code);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

//= ====================================================================
//= ========================== Deprecated ==============================
//= ====================================================================

/**
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 * @deprecated
 */
const list = async (req, res, next) => {
    let _cmsBlocks;
    try {
        _cmsBlocks = await CmsBlocks.find();
        return res.json(_cmsBlocks);
    } catch (err) {
        return next(err);
    }
};

/**
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 * @deprecated
 */
const detail = async (req, res, next) => {
    try {
        const _cmsBlock = await CmsBlocks.findOne({code: req.params.code});
        if (!_cmsBlock) return res.json(NSErrors.CmsBlockNotFound);
        return res.json(_cmsBlock);
    } catch (err) {
        return next(err);
    }
};

/**
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 * @deprecated
 */
const save = async (req, res, next) => {
    try {
        if (req.body._id) {
            await CmsBlocks.updateOne({_id: req.body._id}, req.body);
            return res.end();
        }
        req.body.code = utils.slugify(req.body.code);
        return res.json(await CmsBlocks.create(req.body));
    } catch (err) {
        return next(err);
    }
};

/**
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 * @deprecated
 */
const remove = async (req, res, next) => {
    try {
        await CmsBlocks.deleteOne({code: req.params.code});
        return res.status(200).end();
    } catch (err) {
        return next(err);
    }
};