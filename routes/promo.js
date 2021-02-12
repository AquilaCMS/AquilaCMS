/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {authentication, adminAuth} = require('../middleware/authentication');
const ServicePromo                = require('../services/promo');

module.exports = function (app) {
    app.get('/v2/promo/check/code/:code/:cartId/:lang?', checkCodePromoByCode);
    app.post('/v2/promos',          authentication, adminAuth, getPromos);
    app.post('/v2/promo',           authentication, adminAuth, getPromo);
    app.post('/v2/promo/:_id',      authentication, adminAuth, getPromoById);
    app.put('/v2/promo/:_id/clone', authentication, adminAuth, clonePromo);
    app.put('/v2/promo',            authentication, adminAuth, setPromo);
    app.delete('/v2/promo/:_id',    authentication, adminAuth, deletePromo);
    app.delete('/v2/promo/:promoId/code/:codeId',    authentication, adminAuth, deletePromoCode);
};

 /**
 * GET /api/v2/promo/check/code/{code}/{cartId}/{lang}
 * @tags Discount
 * @summary Validate discount code and return the new cart
 * @param {string} code.path.required - Discount code
 * @param {string} cartId.path.required - Cart id
 * @param {string} lang.path - lang
 * @return {cartSchema} 200 - success
 */
async function checkCodePromoByCode(req, res, next) {
    try {
        const result = await ServicePromo.checkForApplyPromo(req.info, req.params.cartId, req.params.lang, req.params.code);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Fonction retournant des promos
 */
async function getPromos(req, res, next) {
    try {
        const result = await ServicePromo.getPromos(req.body.PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Fonction retournant une promo en fonction de son PostBody
 */
async function getPromo(req, res, next) {
    try {
        const result = await ServicePromo.getPromo(req.body.PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Fonction retournant une promo en fonction de son _id
 */
async function getPromoById(req, res, next) {
    try {
        const result = await ServicePromo.getPromoById(req.params._id);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Fonction permettant de supprimer une promo
 */
async function setPromo(req, res, next) {
    try {
        const result = await ServicePromo.setPromo(req.body, req.body._id);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Fonction permettant de cloner une promo
 */
async function clonePromo(req, res, next) {
    try {
        const clone_id = await ServicePromo.clonePromo(req.body._id);
        return res.json({clone_id});
    } catch (error) {
        return next(error);
    }
}

/**
 * Fonction permettant de supprimer une promo
 */
async function deletePromo(req, res, next) {
    try {
        const result = await ServicePromo.deletePromoById(req.params._id);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Fonction permettant de supprimer un code d'une promo
 */
async function deletePromoCode(req, res, next) {
    try {
        const result = await ServicePromo.deletePromoCodeById(req.params.promoId, req.params.codeId);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
