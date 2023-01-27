/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const ServiceCmsBlock             = require('../services/cmsBlocks');
const {adminAuthRight}            = require('../middleware/authentication');
const {setupTranslationIfMissing} = require('../middleware/server');
const {securityForceActif}        = require('../middleware/security');
const {isAdmin}                   = require('../utils/utils');
const {autoFillCode}              = require('../middleware/autoFillCode');

module.exports = function (app) {
    app.post('/v2/cmsBlocks', securityForceActif(['active']), setupTranslationIfMissing, getCMSBlocks);
    app.post('/v2/cmsBlock', securityForceActif(['active']), setupTranslationIfMissing, getCMSBlock);
    app.post('/v2/cmsBlock/:id', securityForceActif(['active']), setupTranslationIfMissing, getCMSBlockById);
    app.put('/v2/cmsBlock', adminAuthRight('cmsblocks'), autoFillCode, setCMSBlock);
    app.delete('/v2/cmsBlock/:code', adminAuthRight('cmsblocks'), deleteCMSBlock);
};

/**
 * POST /api/v2/cmsBlocks
 * @summary List of CMSBlocks
 * @apiSuccess {Array}  datas           Array of CMSBlocks
 * @apiSuccess {String} datas.code      Code of the CMSBlock
 * @apiSuccess {Number} datas.content   HTML content of the CMSBlock (from translation[lang] fields)
 */
async function getCMSBlocks(req, res, next) {
    try {
        const {PostBody} = req.body;
        const result     = await ServiceCmsBlock.getCMSBlocks(PostBody);
        if (!isAdmin(req.info)) {
            // loop on result
            for (let i = 0; i < result.datas.length; i++) {
                const block = result.datas[i];
                if (block.translation) {
                    // loop on the languages contained
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
 */
async function getCMSBlock(req, res, next) {
    try {
        const result = await ServiceCmsBlock.getCMSBlock(req.body.PostBody);
        if (!isAdmin(req.info) && result.translation) {
            // loop on the languages contained
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
 * POST /v2/cmsBlock/{id}
 * @summary Get one CMSBlock by id
 */
async function getCMSBlockById(req, res, next) {
    try {
        const result = await ServiceCmsBlock.getCMSBlockById(req.params.id, req.body.PostBody);
        if (!isAdmin(req.info) && result.translation) {
            // loop on the languages contained
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
 * PUT /v2/cmsBlock
 * @summary Set CMSBlock
 */
async function setCMSBlock(req, res, next) {
    try {
        const result = await ServiceCmsBlock.setCMSBlock(req.body);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * DELETE /v2/cmsBlock/:code
 * @summary Delete CMSBlock
 */
async function deleteCMSBlock(req, res, next) {
    try {
        const result = await ServiceCmsBlock.deleteCMSBlock(req.params.code);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
