/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {adminAuth}          = require('../middleware/authentication');
const {autoFillCode}       = require('../middleware/autoFillCode');
const {securityForceActif} = require('../middleware/security');
const trademarkServices    = require('../services/trademarks');

/* eslint-disable no-use-before-define */
module.exports = function (app) {
    app.post('/v2/trademarks', securityForceActif(['active']), getTrademarks);
    app.post('/v2/trademark', securityForceActif(['active']), getTrademark);
    app.post('/v2/trademark/:id', adminAuth, getTrademarkById);
    app.put('/v2/trademark', adminAuth, autoFillCode, setTrademark);
    app.delete('/v2/trademark/:id', adminAuth, deleteTrademark);
};
/* eslint-enable no-use-before-define */

/**
 * Function returning a trademark listing
 */
async function getTrademarks(req, res, next) {
    try {
        const result = await trademarkServices.getTrademarks(req.body.PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Function returning a trademark listing
 */
async function getTrademark(req, res, next) {
    try {
        const result = await trademarkServices.getTrademark(req.body.PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
/**
 * Function returning a trademark
 */
async function getTrademarkById(req, res, next) {
    try {
        const result = await trademarkServices.getTrademarkById(req.params.id, req.body.PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
/**
 * Function to add or update a trademark
 */
async function setTrademark(req, res, next) {
    try {
        const result = await trademarkServices.saveTrademark(req.body);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
/**
 * Function deleting a trademark
 */
async function deleteTrademark(req, res, next) {
    // We remove the trademark from the products
    try {
        const result = await trademarkServices.deleteTrademark(req.params.id);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
