/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const path                                            = require('path');
const {aquilaEvents}                                  = require('aql-utils');
const {Cart, Orders, PaymentMethods, Promo, Products} = require('../orm/models');
const NSErrors                                        = require('../utils/errors/NSErrors');
const QueryBuilder                                    = require('../utils/QueryBuilder');
const ServiceOrders                                   = require('./orders');
const ServiceMail                                     = require('./mail');
const ServicesProducts                                = require('./products');
const modulesUtils                                    = require('../utils/modules');

const restrictedFields = [];
const defaultFields    = ['_id', 'active', 'isDeferred', 'sort', 'code', 'translation', 'inCartVisible'];
const queryBuilder     = new QueryBuilder(PaymentMethods, restrictedFields, defaultFields);

const getOrdersPayments = async (postBody) => {
    postBody.limit = postBody.limit || 12;
    if (!postBody.page) {
        postBody.page = 1;
    }

    if (postBody.filter && postBody.filter['payment.operationDate']) {
        for (const operator of Object.keys(postBody.filter['payment.operationDate'])) {
            if (['$gte', '$lte', '$lt', '$gt'].indexOf(operator) !== -1) {
                postBody.filter['payment.operationDate'][operator] = new Date(postBody.filter['payment.operationDate'][operator]);
            }
        }
    }

    const allPayments = await Orders.aggregate([{
        $match : postBody.filter
    }, {
        $project : {
            _id      : 1,
            number   : 1,
            customer : 1,
            payment  : 1
        }
    }, {
        $unwind : {path: '$payment'}
    }, {$match: postBody.filter}, { // postBody.match
        $sort : postBody.sort
    }, {
        $skip : (postBody.page - 1) * postBody.limit
    }, {
        $limit : postBody.limit
    }]);

    const tCount = await Orders.aggregate([{
        $match : postBody.filter
    }, {
        $unwind : {path: '$payment'}
    }, {$match: postBody.filter}, { // postBody.match
        $count : 'count'
    }]);
    let count    = 0;
    if (tCount.length) {
        count = tCount[0].count;
    }

    return {datas: allPayments, count};
};

/**
 * @description return payment methods
 */
const getPaymentMethods = async (PostBody) => queryBuilder.find(PostBody);

/**
 * @description return payment methods
 */
const getPaymentMethod = async (PostBody) => queryBuilder.findOne(PostBody);

/**
 * @description save payment method
 */

const savePaymentMethod = async (pm) => {
    if (pm._id) {
        await PaymentMethods.updateOne({_id: pm._id}, {$set: pm});
        return pm;
    }
    return PaymentMethods.ceate(pm);
};

const deletePaymentMethod = async (_id) => PaymentMethods.findOneAndDelete({_id});

const successfulPayment = async (query, updateObject, paymentCode = '') => {
    console.log('service order successfulPayment()');

    try {
        let filterCode = paymentCode;
        if (filterCode === '') {
            if (updateObject.$set) {
                filterCode = updateObject.$set.payment[0].mode;
            } else if (updateObject.$push) {
                filterCode = updateObject.$push.payment.mode;
            } else if (updateObject.payment) {
                filterCode = updateObject.payment[0].mode;
            } else {
                console.error('successfulPayment() : no payment in object');
                return;
            }
        }
        filterCode = filterCode.toLocaleLowerCase();

        const paymentMethod = await PaymentMethods.findOne({code: filterCode});
        const _order        = await Orders.findOneAndUpdate(query, updateObject, {new: true});
        if (!_order) {
            throw new Error('La commande est introuvable ou n\'est pas en attente de paiement.'); // TODO translate that
        }
        // Immediate payment method (e.g. credit card)
        if (!paymentMethod.isDeferred) {
            await ServiceOrders.setStatus(_order._id, ServiceOrders.orderStatuses.PAID);
        }
        try {
            await ServiceMail.sendMailOrderToClient(_order._id);
        } catch (e) {
            console.error(e);
        }
        try {
            await ServiceMail.sendMailOrderToCompany(_order._id);
        } catch (e) {
            console.error(e);
        }
        // We check that the products of the basket are well orderable
        const {bookingStock} = global.aquila.envConfig.stockOrder;
        if (bookingStock === 'payment') {
            for (let i = 0; i < _order.items.length; i++) {
                const orderItem = _order.items[i];
                const _product  = await Products.findOne({_id: orderItem.id});
                if (_product.type === 'simple') {
                    if ((_product.stock.orderable) === false) {
                        throw NSErrors.ProductNotOrderable;
                    }
                    // we book the stock
                    await ServicesProducts.updateStock(_product._id, -orderItem.quantity, undefined, orderItem.selected_variant);
                } else if (_product.type === 'bundle') {
                    for (let j = 0; j < orderItem.selections.length; j++) {
                        const section = orderItem.selections[j];
                        for (let k = 0; k < section.products.length; k++) {
                            const productId        = section.products[k];
                            const _product_section = await Products.findOne({_id: productId.id});
                            if (_product_section.type === 'simple') {
                                if ((_product_section.stock.orderable) === false) {
                                    throw NSErrors.ProductNotOrderable;
                                }
                                await ServicesProducts.updateStock(_product_section._id, -orderItem.quantity);
                            }
                        }
                    }
                }
            }
        }
        // increase sales number
        for (const item of _order.items) {
            if (item.type === 'simple') {
                // we book the stock
                await Products.updateOne({_id: item.id}, {$inc: {'stats.sells': item.quantity}});
            } else if (item.type === 'bundle') {
                for (let j = 0; j < item.selections.length; j++) {
                    const section = item.selections[j];
                    for (let k = 0; k < section.products.length; k++) {
                        const productId        = section.products[k];
                        const _product_section = await Products.findOne({_id: productId.id});
                        if (_product_section.type === 'simple') {
                            await Products.updateOne({_id: _product_section._id}, {$inc: {'stats.sells': item.quantity}});
                        }
                    }
                }
            }
        }
        // If the order has a discount of type "promo code"
        if (_order.promos && _order.promos.length && _order.promos[0].promoCodeId) {
            try {
            // then we increase the number of uses of this promo
                await Promo.updateOne({'codes._id': _order.promos[0].promoCodeId}, {
                    $inc : {'codes.$.used': 1}
                });
                // then we must also update the number of unique users who have used this "promo code"
                const result = await Orders.distinct('customer.id', {
                    'promos.promoCodeId' : _order.promos[0].promoCodeId
                });
                await Promo.updateOne({'codes._id': _order.promos[0].promoCodeId}, {
                    $set : {'codes.$.client_used': result.length}
                });
            // TODO P6 : Decrease the stock of the product offered
            // if (_cart.promos[0].gifts.length)
            } catch (err) {
                console.error(err);
            }
        }
        aquilaEvents.emit('aqPaymentReturn', _order._id);
        return _order;
    } catch (err) {
        console.error('La commande est introuvable:', err);
        throw err;
    }
};

const failedPayment = async (query, update) => {
    if (update.status) { delete update.status; }
    if (update.$set) {
        update.$set.status = ServiceOrders.orderStatuses.PAYMENT_FAILED;
    } else {
        update.$set = {status: ServiceOrders.orderStatuses.PAYMENT_FAILED};
    }
    return Orders.findOneAndUpdate(query, update, {new: true});
};

const infoPayment = async (orderId, returnData, sendMail, lang) => {
    const paymentMethod = await PaymentMethods.findOne({code: returnData.mode.toLowerCase()});
    if (paymentMethod.isDeferred) {
        returnData.isDeferred = paymentMethod.isDeferred;
    }
    returnData.name          = paymentMethod.translation[lang]?.name;
    returnData.operationDate = Date.now();
    if (returnData.type === 'CREDIT') {
        await ServiceOrders.setStatus(orderId, ServiceOrders.orderStatuses.PAID);
    }
    const _order = await Orders.findOneAndUpdate({_id: orderId}, {$push: {payment: returnData}}, {new: true});

    if (sendMail) {
        if (returnData.type === 'DEBIT') {
            const datas = {
                ..._order,
                articles  : '',
                firstname : _order.customer.fullname.split(' ')[0],
                lastname  : _order.customer.fullname.split(' ')[1],
                fullname  : _order.customer.fullname,
                number    : _order.number
            };
            await ServiceMail.sendGeneric('rmaOrder', _order.customer.email, {...datas, refund: returnData.amount, date: returnData.operationDate});
        } else {
            ServiceMail.sendMailOrderToClient(_order._id).catch((err) => {
                console.error(err);
            });
        }
    }
    aquilaEvents.emit('aqPaymentReturn', _order._id);
    return _order;
};

const updatePayment = async (body) => {
    let msg = {status: true};
    if (body.field !== '') {
        try {
            const updOrder = await Orders.findOneAndUpdate({
                _id : body._id
            }, {
                $set : {
                    [`payment.$[item].${body.field}`] : body.value
                }
            }, {
                new          : true,
                arrayFilters : [{'item._id': body.paymentId}]
            });
            if (!updOrder) msg = {status: false};
            return msg;
        } catch (error) {
            return {status: false};
        }
    } else {
        return {status: false};
    }
};

async function orderPayment(req) {
    await modulesUtils.modulesLoadFunctions('orderPayment', {orderNumber: req.params.orderNumber}, async () => {});
    try {
        const query  = {...req.body.filterPayment};
        query.active = true;
        // If the order is associated with a point of sale, then we retrieve the payment methods of this point of sale
        // Otherwise, we recover all the active payment methods
        const paymentMethods = await PaymentMethods.find(query);
        // We check that the desired payment method is available
        const method = paymentMethods.find((method) => method.code === req.body.paymentMethod);
        if (!method) {
            throw NSErrors.PaymentModeNotAvailable;
        }
        if (method.isDeferred) {
            return await deferredPayment(req, method);
        }
        return await immediateCashPayment(req, method);
    } catch (err) {
        return err;
    }
}

async function deferredPayment(req, method) {
    try {
        const order = await Orders.findOne({number: req.params.orderNumber, status: ServiceOrders.orderStatuses.PAYMENT_PENDING, 'customer.id': req.info._id});
        if (!order) {
            throw NSErrors.OrderNotFound;
        }
        await successfulPayment({
            number        : req.params.orderNumber,
            status        : 'PAYMENT_PENDING',
            'customer.id' : req.info._id
        }, {
            $set : {
                status  : 'PAYMENT_RECEIPT_PENDING',
                payment : [createDeferredPayment(order, method, req.params.lang)]
            }
        });
        await Cart.deleteOne({_id: order.cartId});
        let action;
        if (req.body.returnURL) {
            action = req.body.returnURL;
        } else {
            if (req.params.lang) {
                action = `/${req.params.lang}/cart/success`;
            } else {
                action = '/cart/success';
            }
        }
        return `<form method='POST' id='paymentid' action='${action}'></form>`;
    } catch (err) {
        return err;
    }
}

function createDeferredPayment(order, method, lang) {
    return {
        type          : 'CREDIT',
        operationDate : Date.now(),
        status        : 'TODO',
        mode          : method.code.toUpperCase(),
        amount        : order.priceTotal.ati,
        isDeferred    : method.isDeferred,
        name          : method.translation[lang].name
    };
}

async function immediateCashPayment(req, method) {
    try {
        const modulePath     = path.join(global.aquila.appRoot, `modules/${method.moduleFolderName}`);
        const paymentService = require(`${modulePath}/services/${method.paymentServiceFileName ? method.paymentServiceFileName : req.body.paymentMethod}`);
        // We set the same value in several places to fit all modules
        req.query.orderId      = req.params.orderNumber;
        req.params.paymentCode = req.body.paymentMethod;
        const form             = await paymentService.getPaymentForm(req);
        return form;
    } catch (e) {
        console.error(e);
        if (e.status === 404) return {status: 404, code: e.code, message: 'Error with the payment method configuration'};
        return e;
    }
}

// delete failed payment from orders older than nbDaysToDeleteOlderFailedPayment days
async function deleteFailedPayment() {
    console.log('==> Start removing failed payment from orders <==');
    const dateToDelete = new Date();
    dateToDelete.setDate(dateToDelete.getDate() - (global.aquila.envConfig.stockOrder.nbDaysToDeleteOlderFailedPayment || 30));
    const orders = await Orders.find({
        payment : {
            $elemMatch : {
                status       : 'FAILED',
                creationDate : {$lte: dateToDelete}
            }
        }
    });
    for (const order of orders) {
        order.payment = order.payment.filter((payment) => (payment.status !== 'FAILED' || (new Date(payment.creationDate) > dateToDelete)));
        await order.save();
    }
    console.log('==> End removing failed payment from orders <==');
}

module.exports = {
    getOrdersPayments,
    getPaymentMethods,
    getPaymentMethod,
    savePaymentMethod,
    deletePaymentMethod,
    successfulPayment,
    failedPayment,
    infoPayment,
    updatePayment,
    orderPayment,
    deleteFailedPayment
};