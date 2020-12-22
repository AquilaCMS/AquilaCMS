/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {securityForceActif}        = require('../middleware/security');
const {authentication, adminAuth} = require('../middleware/authentication');
const ServicePayment              = require('../services/payments');

module.exports = function (app) {
    app.post('/v2/paymentMethods', securityForceActif(['active']), getPaymentMethods);
    app.post('/v2/paymentMethod', securityForceActif(['active']), getPaymentMethod);
    app.put('/v2/paymentMethod', authentication, adminAuth, savePaymentMethod);
    app.post('/v2/payments/order', getOrdersPayments);
};

async function getOrdersPayments(req, res, next) {
    try {
        res.json(await ServicePayment.getOrdersPayments(req.body.PostBody));
    } catch (err) {
        return next(err);
    }
}

async function getPaymentMethods(req, res, next) {
    try {
        const {PostBody} = req.body;
        const result     = await ServicePayment.getPaymentMethods(PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

async function getPaymentMethod(req, res, next) {
    try {
        const {PostBody} = req.body;
        const result     = await ServicePayment.getPaymentMethod(PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

async function savePaymentMethod(req, res, next) {
    try {
        const result = await ServicePayment.savePaymentMethod(req.body);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
