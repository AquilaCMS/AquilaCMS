/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const moment           = require('moment');
const path             = require('path');
const {aquilaEvents}   = require('aql-utils');
const {
    Orders,
    Cart,
    Languages,
    Products,
    PaymentMethods,
    Territory,
    Bills,
    Promo
}                      = require('../orm/models');
const QueryBuilder     = require('../utils/QueryBuilder');
const NSErrors         = require('../utils/errors/NSErrors');
const utils            = require('../utils');
const ServiceMail      = require('./mail');
const ServicePromo     = require('./promo');
const ServiceCart      = require('./cart');
const ServicesProducts = require('./products');
const restrictedFields = [];
const defaultFields    = ['*'];
const queryBuilder     = new QueryBuilder(Orders, restrictedFields, defaultFields);

const orderStatuses = {
    PAYMENT_PENDING              : 'PAYMENT_PENDING',
    PAYMENT_RECEIPT_PENDING      : 'PAYMENT_RECEIPT_PENDING',
    PAYMENT_CONFIRMATION_PENDING : 'PAYMENT_CONFIRMATION_PENDING',
    PAYMENT_FAILED               : 'PAYMENT_FAILED',
    PAID                         : 'PAID',
    PROCESSING                   : 'PROCESSING',
    PROCESSED                    : 'PROCESSED',
    DELIVERY_PROGRESS            : 'DELIVERY_PROGRESS',
    DELIVERY_PARTIAL_PROGRESS    : 'DELIVERY_PARTIAL_PROGRESS',
    FINISHED                     : 'FINISHED',
    CANCELED                     : 'CANCELED',
    ASK_CANCEL                   : 'ASK_CANCEL',
    RETURNED                     : 'RETURNED'
};

aquilaEvents.on('aqUpdateStatusOrder', async (fields, orderId, stringDate = undefined) => {
    if (orderId) {
        if (fields && (fields.status || (fields.$set && fields.$set.status))) {
            const _order = await Orders.findOne({_id: orderId, historyStatus: {$exists: true}});
            if (!_order) {
                await Orders.updateOne({_id: orderId}, {$set: {historyStatus: []}});
            }
            const historyStatus = {status: fields.status || fields.$set.status};
            if (stringDate && typeof stringDate === 'string') {
                historyStatus.date = new Date(stringDate.slice(0, 4), stringDate.slice(4, 6), stringDate.slice(6, 8));
            }
            await Orders.findOneAndUpdate({_id: orderId}, {$push: {historyStatus}}, {upsert: true, new: true});
        }
        await Orders.updateOne({_id: orderId, status: orderStatuses.DELIVERY_PROGRESS}, {$set: {'items.$[].status': orderStatuses.DELIVERY_PROGRESS}});
    }
});

const getOrders = async (PostBody) => {
    const result = await queryBuilder.find(PostBody);
    return result;
};

const getOrder = async (PostBody) => queryBuilder.findOne(PostBody);

const saveOrder = async (order) => Orders.updateOne({_id: order._id.toString()}, {$set: order});

const getOrderById = async (id, PostBody = null) => {
    let pBody = PostBody;
    if (pBody !== null) {
        pBody.filter._id = id;
    } else {
        pBody = {filter: {_id: id}};
    }
    return queryBuilder.findOne(pBody);
};

const setOrder = async (order) => {
    if (!order) {
        throw NSErrors.OrderNotFound;
    }
    return Orders.updateOne({_id: order._id}, {$set: order});
};

const setStatus = async (_id, status, sendMail = true) => {
    if (!status) {
        console.error('Bad status', _id);
        return;
    }
    const order = await Orders.findOneAndUpdate({_id}, {$set: {status}}, {new: true});
    if (order.status !== orderStatuses.PAYMENT_PENDING && order.status !== orderStatuses.CANCELED && order.status !== orderStatuses.PAYMENT_CONFIRMATION_PENDING) {
        // The cart is deleted unless the order is pending payment or cancelled
        await Orders.updateOne({_id}, {$set: {cartId: null}});
        await Cart.deleteOne({_id: order.cartId});
    }
    if (status === orderStatuses.PAID && global.envConfig.stockOrder.automaticBilling) {
        await require('./bills').orderToBill(order._id.toString());
    }
    if (([orderStatuses.ASK_CANCEL]).includes(order.status) && sendMail) {
        ServiceMail.sendMailOrderRequestCancel(_id).catch((err) => {
            console.error(err);
        });
    }
    if (![orderStatuses.PAYMENT_CONFIRMATION_PENDING, orderStatuses.PAYMENT_RECEIPT_PENDING, orderStatuses.PAID].includes(order.status) && sendMail) {
        ServiceMail.sendMailOrderStatusEdit(_id).catch((err) => {
            console.error(err);
        });
    }
};

const cancelOrder = async (orderId) => {
    const order = await Orders.findOne({
        _id    : orderId,
        status : {
            $in : [
                orderStatuses.PAYMENT_PENDING,
                orderStatuses.PAYMENT_RECEIPT_PENDING,
                orderStatuses.PAYMENT_CONFIRMATION_PENDING,
                orderStatuses.PAID,
                orderStatuses.PROCESSING,
                orderStatuses.PROCESSED,
                orderStatuses.DELIVERY_PROGRESS,
                orderStatuses.DELIVERY_PARTIAL_PROGRESS,
                orderStatuses.FINISHED,
                orderStatuses.RETURNED,
                orderStatuses.ASK_CANCEL
            ]
        }
    });
    if (!order) {
        throw NSErrors.OrderNotCancelable;
    }
    await setStatus(orderId, orderStatuses.CANCELED, order.status !== orderStatuses.PAYMENT_PENDING);

    if (global.envConfig.stockOrder.bookingStock !== 'none') {
        aquilaEvents.emit('aqCancelOrder', order);
    }
};

const cancelOrders = () => {
    const dateAgo = new Date();
    dateAgo.setHours(dateAgo.getHours() - global.envConfig.stockOrder.pendingOrderCancelTimeout);

    return Orders.find({
        createdAt : {$lt: dateAgo},
        status    : {
            $in : [
                orderStatuses.PAYMENT_PENDING,
                orderStatuses.PAYMENT_RECEIPT_PENDING
            ]
        }})
        .select('_id')
        .then(function (_orders) {
            return _orders.forEach(async (_order) => {
                await cancelOrder(_order._id);
            });
        });
};

const rma = async (orderId, returnData, lang) => {
    const upd = {rma: returnData};

    if (returnData.refund > 0 && returnData.mode !== '') {
        let name            = returnData.mode.toLowerCase(); // if not in PaymentsMethods, we take the name here
        const paymentMethod = await PaymentMethods.findOne({code: name});
        if (paymentMethod && paymentMethod.isDeferred) {
            returnData.isDeferred = paymentMethod.isDeferred;
            if (paymentMethod.translation && paymentMethod.translation[lang]) {
                name = paymentMethod.translation[lang].name || name;
            }
        }
        upd.payment = {
            type          : 'DEBIT',
            status        : 'DONE',
            operationDate : Date.now(),
            mode          : returnData.mode,
            transactionId : '',
            amount        : returnData.refund,
            comment       : returnData.comment,
            name
        };
    }

    let _order = await Orders.findOneAndUpdate({_id: orderId}, {$push: upd}, {new: true}).populate('customer.id');

    const returnPrds = {};
    for (let i = 0; i < _order.rma.length; i++) {
        for (let j = 0; j < _order.rma[i].products.length; j++) {
            const rmaProduct = _order.rma[i].products[j];
            if (returnPrds[rmaProduct.product_id] === undefined) {
                returnPrds[rmaProduct.product_id] = 0;
            }
            if (rmaProduct.qty_returned) {
                returnPrds[rmaProduct.product_id] += rmaProduct.qty_returned;
            }

            // Check if we manage the stock
            if (global.envConfig.stockOrder.bookingStock !== 'none' && returnData.in_stock) {
                const _product = await Products.findOne({_id: rmaProduct.product_id});
                if (_product.type === 'simple') {
                    // The quantity is incremented
                    await ServicesProducts.updateStock(_product._id, rmaProduct.qty_returned, 0, rmaProduct.selected_variant);
                } else if (_product.type === 'bundle') {
                    for (let i = 0; i < rmaProduct.selections.length; i++) {
                        const selectionProducts = rmaProduct.selections[i].products;
                        // Increase the quantity of each product of each section
                        for (let j = 0; j < selectionProducts.length; j++) {
                            const selectionProduct = await Products.findById(selectionProducts[j]);
                            if (selectionProduct.type === 'simple') {
                                await ServicesProducts.updateStock(selectionProduct._id, rmaProduct.qty_returned, 0);
                            }
                        }
                    }
                }
            }
        }
    }

    _order = setItemStatus(_order, returnPrds, 'RETURNED', 'RETURNED_PARTIAL');

    const historyStatus  = {};
    historyStatus.date   = new Date();
    historyStatus.status = orderStatuses.RETURNED;
    _order.historyStatus.push(historyStatus);
    _order.status = orderStatuses.RETURNED;

    await _order.save();

    const data = {
        order_id    : orderId,
        montant     : -(returnData.refund),
        withTaxes   : true,
        client      : _order.customer.id,
        nom         : _order.addresses.billing.lastname,
        prenom      : _order.addresses.billing.firstname,
        societe     : _order.addresses.billing.companyName,
        coordonnees : `${_order.addresses.billing.line1 + (_order.addresses.billing.line2
            ? ` ${_order.addresses.billing.line2}`
            : '')}, ${_order.addresses.billing.zipcode} ${_order.addresses.billing.city + (_order.addresses.billing.country
            ? `, ${_order.addresses.billing.country}`
            : '')}`,
        email       : _order.customer.email,
        paymentDate : new Date(),
        isPaid      : true,
        lang        : _order.lang,
        items       : [],
        address     : {
            firstname      : _order.addresses.billing.firstname,
            lastname       : _order.addresses.billing.lastname,
            companyName    : _order.addresses.billing.companyName,
            phone          : _order.addresses.billing.phone,
            phone_mobile   : _order.addresses.billing.phone_mobile,
            line1          : _order.addresses.billing.line1,
            line2          : _order.addresses.billing.line2,
            zipcode        : _order.addresses.billing.zipcode,
            city           : _order.addresses.billing.city,
            isoCountryCode : _order.addresses.billing.isoCountryCode,
            country        : _order.addresses.billing.country
        },
        delivery : {},
        promos   : {},
        taxes    : {
            tax   : returnData.tax,
            value : (returnData.refund * returnData.tax / 100)
        },
        checksum      : undefined,
        priceSubTotal : {ati: returnData.refund, et: returnData.refund - (returnData.refund * returnData.tax / 100)},
        avoir         : true,
        facture       : 'unset'
    };

    data.items = _order.items.filter((item) => returnData.products.find((prd) => prd.product_id === item.id.toString()));

    for (let i = 0; i < data.items.length; i++) {
        data.items[i] = {
            ...(data.items[i].toObject()),
            quantity : returnData.products.find((prd) => prd.product_id === data.items[i].id.toString()).qty_returned
        };
    }

    await Bills.create(data);

    if (returnData.sendMail && _order.customer.id) {
        const articles = [];
        const datas    = {
            number    : _order.number,
            firstname : _order.customer.id.firstname,
            lastname  : _order.customer.id.lastname,
            fullname  : _order.customer.fullname
        };

        for (let i = 0; i < returnData.products.length; i++) {
            const returnedPrd = await Products.findOne({_id: returnData.products[i].product_id});
            articles.push(`${returnedPrd.translation[_order.lang].name} (${returnData.products[i].qty_returned})`);
        }

        datas.articles = articles.join(', ');

        await ServiceMail.sendGeneric('rmaOrder', _order.customer.email, {...datas, refund: returnData.refund, date: data.paymentDate});
    }
    return _order;
};

const duplicateItemsFromOrderToCart = async (postBody, userInfo) => {
    const orderId = postBody.idOrder || null;
    let cartId    = postBody.idCart || null;
    let products  = [];
    // If we send an order id, we get the items of this order, otherwise we get the products sent directly (ex: foodOption)
    if (orderId) {
        const _order = await Orders.findOne({_id: orderId});
        products     = _order.items;
    } else {
        // Sample :
        // products = [{id: "59f1f626aaa3a904c3a15b7f", quantity: 2}, {id         : "59f1f627aaa3a904c3a15bff",
        //     quantity   : 1,
        //     selections : [
        //         {
        //             products : [
        //                 "59f1f626aaa3a904c3a15b7e"
        //             ],
        //             bundle_section_ref : "Entrée"
        //         },
        //         {
        //             products : [
        //                 "5a0d704471a210016c623e5e"
        //             ],
        //             bundle_section_ref : "Plat du menu"
        //         }
        //     ]}];
        products = postBody.products;
    }
    let _cart = await Cart.findOne({_id: cartId, status: 'IN_PROGRESS'});
    if (!_cart) {
        const params = {status: 'IN_PROGRESS'};
        _cart        = await Cart.create(params);
        cartId       = _cart._id;
    }
    let isErrorOccured      = false;
    let isErrorOccuredIndex = 0;
    let itemsPushed         = 0;
    await ServiceCart.linkCustomerToCart(_cart, userInfo);
    for (let i = 0; i < products.length; i++) {
        _cart                   = await Cart.findOne({_id: cartId, status: 'IN_PROGRESS'});
        const productThatExists = await Products.findOne({_id: products[i].id, active: true, _visible: true});
        // Test that the product exists, is visible and is active
        if (productThatExists && productThatExists.bundle_sections && productThatExists.bundle_sections.length > 0) {
            // Code for menus
            const item = {
                id         : productThatExists._id,
                quantity   : products[i].quantity,
                weight     : productThatExists.weight,
                selections : []
            };
            // We browse the sections
            for (let j = 0; j < products[i].selections.length; j++) {
                item.selections.push({
                    products           : [],
                    bundle_section_ref : products[i].selections[j].bundle_section_ref
                });
                // Then the products of the sections
                for (let k = 0; k < products[i].selections[j].products.length; k++) {
                    // Checks that the product exists, is visible and is active
                    const prd = await Products.findOne({
                        _id               : products[i].selections[j].products[k],
                        active            : true,
                        _visible          : true,
                        'stock.orderable' : true
                    });
                    if (prd) {
                        item.selections[j].products.push(products[i].selections[j].products[k]);
                    } else {
                        // Else put in error and we go to the next product (we don't add the menu)
                        isErrorOccured      = true;
                        isErrorOccuredIndex = j;
                        break;
                    }
                }
                if (j === isErrorOccuredIndex && isErrorOccured) {
                    break;
                }
            }
            if (!isErrorOccured && item.selections.length > 0) {
                const _lang = await Languages.findOne({defaultLanguage: true});
                if (productThatExists.translation[_lang.code]) {
                    item.name = productThatExists.translation[_lang.code].name;
                }
                item.code  = productThatExists.code;
                item.image = require('../utils/medias').getProductImageUrl(productThatExists);
                _cart      = await productThatExists.addToCart(_cart, item, userInfo, _lang.code);
                itemsPushed++;
                _cart = await ServicePromo.checkForApplyPromo(userInfo, _cart, _lang.code);
                await _cart.save();
            }
        } else if (productThatExists && productThatExists.stock && productThatExists.stock.orderable) {
            let quantityToAdd = products[i].quantity;
            for (let j = 0; j < _cart.items.length; j++) {
                const item = _cart.items[j];
                if (productThatExists._id.toString() === item.id.toString()) {
                    quantityToAdd += item.quantity;
                    _cart.items.splice(_cart.items.findIndex((it) => it.id.toString() === productThatExists._id.toString()), 1);
                    await _cart.save();
                }
            }
            // Code for normal products
            const item  = {id: productThatExists._id, quantity: quantityToAdd, weight: productThatExists.weight};
            const _lang = await Languages.findOne({defaultLanguage: true});
            if (productThatExists.translation[_lang.code]) {
                item.name = productThatExists.translation[_lang.code].name;
            }
            item.code  = productThatExists.code;
            item.image = require('../utils/medias').getProductImageUrl(productThatExists);
            _cart      = await productThatExists.addToCart(_cart, item, userInfo, _lang.code);
            itemsPushed++;
            _cart = await ServicePromo.checkForApplyPromo(userInfo, _cart, _lang.code);
            await _cart.save();
        } else {
            isErrorOccured = true;
        }
    }
    await _cart.save();
    const cartReturn = await Cart.findOne({_id: _cart._id, status: 'IN_PROGRESS'});
    if (itemsPushed > 0) {
        if (isErrorOccured) {
            return {code: 'ORDER_DUPLICATED_WITH_ERRORS', data: cartReturn};
        }
        return {code: 'ORDER_DUPLICATED', data: cartReturn};
    }
    return {code: 'ORDER_NOT_DUPLICATED', data: cartReturn};
};

const addPackage = async (orderId, pkgData) => {
    moment.locale(global.defaultLang);
    let status = orderStatuses.DELIVERY_PROGRESS;
    if (pkgData.status && pkgData.status === 'partial') {
        status = orderStatuses.DELIVERY_PARTIAL_PROGRESS;
    }
    const ord = await Orders.findOne({_id: orderId});
    if (ord && ord.delivery && ord.delivery.url) {
        pkgData.tracking = ord.delivery.url.replace('{{number}}', pkgData.tracking);
    }

    await setStatus(orderId, status, false);
    let _order = await Orders.findOneAndUpdate(
        {_id: orderId},
        {$push: {'delivery.package': pkgData}},
        {new: true}
    ).populate('delivery.method');

    const packages = {};
    for (let i = 0; i < _order.delivery.package.length; i++) {
        const pkg = _order.delivery.package[i];
        for (let j = 0; j < pkg.products.length; j++) {
            const pkgProduct = pkg.products[j];
            if (packages[pkgProduct.product_id] === undefined) {
                packages[pkgProduct.product_id] = 0;
            }

            packages[pkgProduct.product_id] += pkgProduct.qty_shipped;
            // Check if we manage the stock
            if (global.envConfig.stockOrder.bookingStock !== 'none') {
                const _product = await Products.findOne({_id: pkgProduct.product_id});
                if (_product.type === 'simple') {
                    // Decrement the quantity
                    await ServicesProducts.updateStock(_product._id, 0, -pkgProduct.qty_shipped, pkgProduct.selected_variant);
                } else if (_product.type === 'bundle') {
                    for (let i = 0; i < pkgProduct.selections.length; i++) {
                        const selectionProducts = pkgProduct.selections[i].products;
                        // Subtract the quantity of each product from each section
                        for (let j = 0; j < selectionProducts.length; j++) {
                            const selectionProduct = await Products.findById(selectionProducts[j]);
                            if (selectionProduct.type === 'simple') {
                                await ServicesProducts.updateStock(selectionProduct._id, 0, -pkgProduct.qty_shipped);
                            }
                        }
                    }
                }
            }
        }
    }

    _order = setItemStatus(_order, packages, 'DELIVERY_PROGRESS', 'DELIVERY_PARTIAL_PROGRESS');
    await utils.modules.modulesLoadFunctions('addParcel', {order: _order});
    await _order.save();

    const _country = Territory.findOne({code: _order.addresses.delivery.isoCountryCode});
    let country    = '';
    if (_country && _country.name) {
        country = _country.name;
    } else if (_order.addresses.delivery.country) {
        country = _order.addresses.delivery.country;
    }

    const dateDelivery = moment()
        .add(_order.delivery.dateDelivery.delayDelivery, _order.delivery.dateDelivery.unitDelivery)
        .add(_order.delivery.dateDelivery.delayPreparation, _order.delivery.dateDelivery.unitPreparation)
        .format('DD/MM/YYYY');
    try {
        await ServiceMail.sendGeneric('orderSent', _order.customer.email, {
            number   : _order.number,
            name     : _order.delivery.name,
            fullname : _order.customer.fullname,
            company  : _order.addresses.delivery.companyName
                && _order.addresses.delivery.idMondialRelay
                ? `${_order.delivery.name}: ${_order.addresses.delivery.companyName}`
                : '',
            trackingUrl     : pkgData.tracking,
            date            : dateDelivery,
            transporterName : _order.delivery.name,
            companyName     : _order.addresses.delivery.companyName
                && _order.addresses.delivery.idMondialRelay
                ? `${_order.delivery.name}: ${_order.addresses.delivery.companyName}`
                : '', // Legacy
            address : `${_order.addresses.delivery.line1 + (_order.addresses.delivery.line2
                ? ` ${_order.addresses.delivery.line2}`
                : '')}, ${_order.addresses.delivery.zipcode} ${_order.addresses.delivery.city + (country
                ? `, ${country}`
                : '')}`
        });
    } catch (error) {
        console.error(error);
    }
};

const delPackage = async (orderId, pkgId) => {
    await utils.modules.modulesLoadFunctions('deleteParcel', {orderId, pkgId});
    // we populate with item.selections.products (useful in the front for bundle)
    return Orders.findOneAndUpdate({_id: orderId}, {$pull: {'delivery.package': {_id: pkgId}}}, {new: true}).populate('items.id').populate('items.selections.products');
};

const updateStatus = async (body, params) => {
    const order = await Orders.findOne({$or: [{_id: params.id}, {_id: body.id}]});
    if (!order) {
        throw NSErrors.OrderNotFound;
    }
    const noAccess = [orderStatuses.PAYMENT_CONFIRMATION_PENDING, orderStatuses.PAID, orderStatuses.BILLED, orderStatuses.DELIVERY_PROGRESS, orderStatuses.DELIVERY_PARTIAL_PROGRESS, orderStatuses.RETURNED];
    if (!noAccess.includes(body.status) && body.status !== order.status && order.status !== orderStatuses.CANCELED) {
        await setStatus(order._id, body.status);
        return;
    }
    throw NSErrors.StatusUpdateError;
};

const cancelOrderRequest = async (_id, user) => {
    const order = await Orders.findOne({_id, 'customer.email': user.email});
    if (order) {
        await setStatus(_id, orderStatuses.ASK_CANCEL);
        return order.status = orderStatuses.ASK_CANCEL;
    }
    throw NSErrors.AccessUnauthorized;
};

function setItemStatus(order, packages, status1, status2) {
    for (let i = 0; i < order.items.length; i++) {
        if (order.items[i].quantity === packages[order.items[i].id]) {
            order.items[i].status = status1;
        } else if (packages[order.items[i].id] !== 0) {
            order.items[i].status = status2;
        }
    }
    return order;
}

/* THESE SERVICES HAVE BEEN MOVED TO payments.js */
/* THIS SERVICE HAS BEEN MOVED TO payments.js */
const paymentSuccess = async (query, updateObject, paymentCode = '') => {
    console.log('Deprecated service : please use successfulPayment function in payments.js service');
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
            throw new Error('La commande est introuvable ou n\'est pas en attente de paiement.'); // TODO Englais
        }
        // Immediate payment method (e.g. credit card)
        if (!paymentMethod.isDeferred) {
            await setStatus(_order._id, orderStatuses.PAID);
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
        const {bookingStock} = global.envConfig.stockOrder;
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

/* THIS SERVICE HAS BEEN MOVED TO payments.js */
const paymentFail = async (query, update) => {
    console.log('Deprecated service : please use failedPayment function in payments.js service');
    if (update.status) { delete update.status; }
    if (update.$set) {
        update.$set.status = orderStatuses.PAYMENT_FAILED;
    } else {
        update.$set = {status: orderStatuses.PAYMENT_FAILED};
    }
    return Orders.findOneAndUpdate(query, update, {new: true});
};

/* THIS SERVICE HAS BEEN MOVED TO payments.js */
const infoPayment = async (orderId, returnData, sendMail, lang) => {
    console.log('Deprecated service : please use infoPayment function in payments.js service');
    const paymentMethod = await PaymentMethods.findOne({code: returnData.mode.toLowerCase()});
    if (paymentMethod.isDeferred) {
        returnData.isDeferred = paymentMethod.isDeferred;
    }
    returnData.name          = paymentMethod.translation[lang]?.name;
    returnData.operationDate = Date.now();
    if (returnData.type === 'CREDIT') {
        await setStatus(orderId, orderStatuses.PAID);
    }
    const _order = await Orders.findOneAndUpdate({_id: orderId}, {$push: {payment: returnData}}, {new: true});

    if (sendMail) {
        // const orderdata = [];
        // const datas = {
        //     number : _order.number
        // };

        // for(let i = 0; i < returnData.products.length; i++) {
        //     orderdata.push(`${returnData.products[i].product_code} (${returnData.products[i].qty_returned})`);
        // }

        // datas.orderdata = orderdata.join(", ");
        /**
         * DO NOT DELETE THE COMMENTED CODE ABOVE
         */
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

/* THIS SERVICE HAS BEEN MOVED TO payments.js */
const updatePayment = async (body) => {
    console.log('Deprecated service : please use updatePayment function in payments.js service');
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

/* THIS SERVICE HAS BEEN MOVED TO payments.js */
async function payOrder(req) {
    console.log('Deprecated service : please use orderPayment function in payments.js service');
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

/* THIS SERVICE HAS BEEN MOVED TO payments.js */
async function deferredPayment(req, method) {
    try {
        const order = await Orders.findOne({number: req.params.orderNumber, status: orderStatuses.PAYMENT_PENDING, 'customer.id': req.info._id});
        if (!order) {
            throw NSErrors.OrderNotFound;
        }
        await paymentSuccess({
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

/* THIS SERVICE HAS BEEN MOVED TO payments.js */
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

/* THIS SERVICE HAS BEEN MOVED TO payments.js */
async function immediateCashPayment(req, method) {
    try {
        const modulePath     = path.join(global.appRoot, `modules/${method.moduleFolderName}`);
        const paymentService = require(`${modulePath}/services/${req.body.paymentMethod}`);
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

/* THIS SERVICE HAS BEEN MOVED TO payments.js */
// delete failed payment from orders older than nbDaysToDeleteOlderFailedPayment days
async function deleteFailedPayment() {
    console.log('Deprecated service : please use deleteFailedPayment function in payments.js service');
    console.log('==> Start removing failed payment from orders <==');
    try {
        const dateToDelete = new Date();
        dateToDelete.setDate(dateToDelete.getDate() - (global.envConfig.stockOrder.nbDaysToDeleteOlderFailedPayment || 30));
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
    } catch (e) {
        console.error(e);
    }
}

module.exports = {
    getOrders,
    getOrder,
    saveOrder,
    getOrderById,
    setOrder,
    setStatus,
    cancelOrder,
    cancelOrders,
    rma,
    duplicateItemsFromOrderToCart,
    addPackage,
    delPackage,
    updateStatus,
    cancelOrderRequest,
    payOrder,
    paymentSuccess,
    paymentFail,
    infoPayment,
    updatePayment,
    deleteFailedPayment,
    orderStatuses
};