/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {authentication, adminAuth} = require('../middleware/authentication');
const trademarkServices           = require('../services/trademarks');

module.exports = function (app) {
    app.post('/v2/trademarks', getTrademarks);
    app.post('/v2/trademark', getTrademark);
    app.post('/v2/trademark/:id', getTrademarkById);
    app.put('/v2/trademark', authentication, adminAuth, setTrademark);
    app.delete('/v2/trademark/:id', authentication, adminAuth, deleteTrademark);
};

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
        const result = await trademarkServices.saveTrademark(req);
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
        const result = await trademarkServices.deleteTrademark(req);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
