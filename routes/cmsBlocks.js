const ServiceCmsBlock             = require('../services/cmsBlocks');
const {authentication, adminAuth} = require('../middleware/authentication');

module.exports = function (app) {
    app.post('/v2/cmsBlocks', getCMSBlocks);
    app.post('/v2/cmsBlock', getCMSBlock);
    app.post('/v2/cmsBlock/:code', getCMSBlockById);
    app.put('/v2/cmsBlock', authentication, adminAuth, setCMSBlock);
    app.delete('/v2/cmsBlock/:code', authentication, adminAuth, deleteCMSBlock);
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
// Get the CMSBlock for code "mycode" with the default fields for default language :
{PostBody:{filter:{code: "mycode"}}}
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
