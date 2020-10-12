const path                        = require('path');
const {securityForceActif}        = require('../middleware/security');
const {authentication, adminAuth} = require('../middleware/authentication');
const ServicePayment              = require('../services/payments');
const {Orders}                    = require('../orm/models');

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
