/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {securityForceActif} = require('../middleware/security');
const {adminAuthRight}     = require('../middleware/authentication');
const ServicePayment       = require('../services/payments');
const {autoFillCode}       = require('../middleware/autoFillCode');

module.exports = function (app) {
    app.post('/v2/paymentMethods', securityForceActif(['active']), getPaymentMethods);
    app.post('/v2/paymentMethod', securityForceActif(['active']), getPaymentMethod);
    app.put('/v2/paymentMethod', adminAuthRight('paymentMethods'), autoFillCode, savePaymentMethod);
    app.post('/v2/payments/order', adminAuthRight('payments'), getOrdersPayments);
    app.post('/v2/payment/info', adminAuthRight('payments'), infoPayment);
    app.put('/v2/payment/update', adminAuthRight('payments'), updatePayment);
    app.post('/v2/payment/order/:orderNumber/:lang?', orderPayment); // middleware adminAuthRight removed
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

/**
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 */
async function infoPayment(req, res, next) {
    try {
        const order = await ServicePayment.infoPayment(req.body.order, req.body.params, req.body.sendMail, req.body.lang);
        res.json(order);
    } catch (err) {
        return next(err);
    }
}

/**
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 */
async function updatePayment(req, res, next) {
    try {
        return res.json(await ServicePayment.updatePayment(req.body));
    } catch (e) {
        next(e);
    }
}

/**
 * Create a payment and return a form for front-end redirection
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 */
async function orderPayment(req, res, next) {
    try {
        return res.send(await ServicePayment.orderPayment(req));
    } catch (e) {
        next(e);
    }
}