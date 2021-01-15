/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const ServiceCmsBlock             = require('../services/cmsBlocks');
const {authentication, adminAuth} = require('../middleware/authentication');
const {getDecodedToken}           = require('../services/auth');

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
        if (!req.headers.authorization || !getDecodedToken(req.headers.authorization).info.isAdmin) {
            // on boucle sur les resultats
            for (let i = 0; i < result.datas.length; i++) {
                const block = result.datas[i];
                if (block.translation) {
                    // on boucle sur les langues contenue
                    for (let k = 0; k < Object.keys(block.translation).length; k++) {
                        const langKey = Object.keys(block.translation)[k];
                        delete block.translation[langKey].variables;
                        delete block.translation[langKey].html;
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
        if ((!req.headers.autorization || !getDecodedToken(req.headers.authorization).info.isAdmin) && result.translation) {
            // on boucle sur les langues contenue
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

async function getCMSBlockById(req, res, next) {
    try {
        const result = await ServiceCmsBlock.getCMSBlockById(req.params.code, req.body.PostBody);
        if ((!req.headers.autorization || !getDecodedToken(req.headers.authorization).info.isAdmin) && result.translation) {
            // on boucle sur les langues contenue
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
