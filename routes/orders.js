/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {Cart, Orders, PaymentMethods} = require('../orm/models');
const orderService                   = require('../services/orders');
const ServiceOrder                   = require('../services/orders');
const ServiceAuth                    = require('../services/auth');
const {middlewareServer}             = require('../middleware');
const {authentication, adminAuth}    = require('../middleware/authentication');
const NSErrors                       = require('../utils/errors/NSErrors');
const {isAdmin}                      = require('../utils/utils');

module.exports = function (app) {
    app.post('/v2/orders', getOrders);
    app.post('/v2/order', getOrder);
    app.post('/v2/order/rma', authentication, adminAuth, rma);
    app.post('/v2/order/infoPayment', authentication, adminAuth, infoPayment);
    app.post('/v2/order/duplicateItemsFromOrderToCart', authentication, duplicateItemsFromOrderToCart);
    app.post('/v2/order/addpkg', authentication, adminAuth, addPackage);
    app.post('/v2/order/delpkg', authentication, adminAuth, delPackage);
    app.put('/v2/order/updateStatus', authentication, adminAuth, updateStatus);
    app.post('/v2/order/pay/:orderNumber/:lang?', authentication, payOrder);
    app.put('/v2/order/updatePayment', authentication, adminAuth, updatePayment);
    app.post('/v2/order/:id', getOrderById);
    app.put('/v2/order/cancel/:id', authentication, adminAuth, cancelOrder);
    app.put('/v2/order/requestCancel/:id', authentication, cancelOrderRequest);
    app.put('/v2/order', setOrder);

    // Deprecated
    app.post('/orders/pay/:orderNumber/:lang?', middlewareServer.deprecatedRoute, authentication, payOrder);
};

/**
 * Function returning a list of commands
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 */
async function getOrders(req, res, next) {
    try {
        const PostBodyVerified = await ServiceAuth.validateUserIsAllowed(req.info, req.body.PostBody, 'customer.id');
        if (!isAdmin(req.info)) {
            PostBodyVerified.filter.status = {$nin: ['PAYMENT_FAILED']};
        }
        const result = await ServiceOrder.getOrders(PostBodyVerified);
        return res.json(result);
    } catch (error) {
        next(error);
    }
}

/**
 * Function to add or update an order
 */
async function setOrder(req, res, next) {
    // We update the order
    try {
        if (req.body.order._id) {
            const order  = req.body.order;
            const result = await ServiceOrder.setOrder(order);
            return res.json(result);
        }
    } catch (error) {
        return next(error);
    }
}

async function getOrder(req, res, next) {
    try {
        const PostBodyVerified = await ServiceAuth.validateUserIsAllowed(req.info, req.body.PostBody, 'customer.id');
        const result           = await ServiceOrder.getOrder(PostBodyVerified);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Return an Order by it's id
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 */
async function getOrderById(req, res, next) {
    try {
        const PostBodyVerified = await ServiceAuth.validateUserIsAllowed(req.info, req.body.PostBody, 'customer.id');
        const result           = await ServiceOrder.getOrderById(req.params.id, PostBodyVerified);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * RMA means Return Material Authorization
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 */
async function rma(req, res, next) {
    try {
        await orderService.rma(req.body.order, req.body.return);
        res.end();
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
async function infoPayment(req, res, next) {
    try {
        await orderService.infoPayment(req.body.order, req.body.params, req.body.sendMail);
        res.end();
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
async function duplicateItemsFromOrderToCart(req, res, next) {
    try {
        req.body.query = await ServiceAuth.validateUserIsAllowedWithoutPostBody(
            req.info,
            {_id: req.body.idOrder || null},
            'customer.id'
        );
        return res.json(await orderService.duplicateItemsFromOrderToCart(req));
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
async function addPackage(req, res, next) {
    try {
        await orderService.addPackage(req.body.order, req.body.package);
        res.end();
    } catch (err) {
        return next(err);
    }
}

async function delPackage(req, res, next) {
    try {
        res.json(await orderService.delPackage(req.body.order, req.body.package));
    } catch (err) {
        return next(err);
    }
}

/**
 * Allows you to update the status of an order if this modification can be done manually
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 */
async function updateStatus(req, res, next) {
    try {
        await ServiceOrder.updateStatus(req.body, req.params);
        return res.end();
    } catch (err) {
        next(err);
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
        return res.json(await ServiceOrder.updatePayment(req.body));
    } catch (e) {
        next(e);
    }
}

async function cancelOrder(req, res, next) {
    try {
        const result = await orderService.cancelOrder(req.params.id || req.body.id);
        if (result) {
            return res.status(403).json(result);
        }
        res.end();
    } catch (err) {
        return next(err);
    }
}

async function cancelOrderRequest(req, res, next) {
    try {
        const result = await orderService.cancelOrderRequest(req.params.id || req.body.id, req.info);
        if (result) {
            return res.json({code: 'ORDER_ASK_CANCEL_SUCCESS'});
        }

        res.end();
    } catch (err) {
        return next(err);
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
async function payOrder(req, res, next) {
    const order = await Orders.findOne({number: req.params.orderNumber, status: 'PAYMENT_PENDING', 'customer.id': req.info._id});
    if (!order) {
        return next(NSErrors.OrderNotFound);
    }
    const query  = {...req.body.filterPayment}; // this line bypass this old line => query.$or = [{all_points_of_sale: true}, {points_of_sale: order.point_of_sale}];
    query.active = true;
    // If the order is associated with a point of sale, then we retrieve the payment methods of this point of sale
    // Otherwise, we recover all the active payment methods
    try {
        const paymentMethods = await PaymentMethods.find(query);
        // We check that the desired payment method is available
        const method = paymentMethods.find((method) => method.code === req.body.paymentMethod);
        if (!method) {
            return next(NSErrors.PaymentModeNotAvailable);
        }

        await orderService.paymentSuccess({
            number        : req.params.orderNumber,
            status        : 'PAYMENT_PENDING',
            'customer.id' : req.info._id
        }, {
            $set : {
                status  : 'PAYMENT_RECEIPT_PENDING',
                payment : [createPayment(order, method)]
            }
        });

        if (method.isDeferred) {
            await Cart.deleteOne({_id: order.cartId});
        }

        return res.json(await Orders.findOne({_id: order._id}));
    } catch (err) {
        return next(err);
    }
}

/**
 *
 * @param {*} order
 * @param {*} method
 * @deprecated
 */
function createPayment(order, method) {
    return {
        type          : 'CREDIT',
        operationDate : Date.now(),
        status        : 'TODO',
        mode          : method.code.toUpperCase(),
        amount        : order.priceTotal.ati
    };
}