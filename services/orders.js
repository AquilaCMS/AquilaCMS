/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const moment           = require('moment');
const {
    Orders,
    Cart,
    Languages,
    Products,
    PaymentMethods,
    Territory,
    Bills
}                      = require('../orm/models');
const QueryBuilder     = require('../utils/QueryBuilder');
const aquilaEvents     = require('../utils/aquilaEvents');
const NSErrors         = require('../utils/errors/NSErrors');
const utils            = require('../utils');
const ServiceMail      = require('./mail');
const ServiceAuth      = require('./auth');
const ServicePromo     = require('./promo');
const ServiceCart      = require('./cart');
const ServicesProducts = require('./products');
const restrictedFields = [];
const defaultFields    = ['*'];
const queryBuilder     = new QueryBuilder(Orders, restrictedFields, defaultFields);

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
        await Orders.updateOne({_id: orderId, status: 'DELIVERY_PROGRESS'}, {$set: {'items.$[].status': 'DELIVERY_PROGRESS'}});
    }
});

const getOrders = async (PostBody) => {
    const result = await queryBuilder.find(PostBody);
    return result;
};

const getOrder = async (PostBody) => {
    return queryBuilder.findOne(PostBody);
};

const saveOrder = async (order) => {
    return Orders.updateOne({_id: order._id.toString()}, {$set: order});
};

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
    if (order.status !== 'PAYMENT_PENDING' && order.status !== 'CANCELED' && order.status !== 'PAYMENT_CONFIRMATION_PENDING') {
        // On supprime le panier sauf si la commande est en attente de paiement ou annulée
        await Orders.updateOne({_id}, {$set: {cartId: null}});
        await Cart.deleteOne({_id: order.cartId});
    }
    if (status === 'PAID' && global.envConfig.stockOrder.automaticBilling) {
        await require('./bills').orderToBill(order._id.toString());
    }
    if ((['ASK_CANCEL']).includes(order.status) && sendMail) {
        try {
            await ServiceMail.sendMailOrderRequestCancel(_id);
        } catch (error) {
            console.error(error);
        }
    }
    if (!['PAYMENT_CONFIRMATION_PENDING', 'PAYMENT_RECEIPT_PENDING', 'PAID'].includes(order.status) && sendMail) {
        try {
            await ServiceMail.sendMailOrderStatusEdit(_id);
        } catch (error) {
            console.error(error);
        }
    }
};

const paymentSuccess = async (query, updateObject) => {
    console.log('service order paymentSuccess()');

    try {
        const _order = await Orders.findOneAndUpdate(query, updateObject, {new: true});
        if (!_order) {
            throw new Error('La commande est introuvable ou n\'est pas en attente de paiement.');
        }
        const paymentMethod = await PaymentMethods.findOne({code: _order.payment[0].mode.toLowerCase()});
        // Mode de paiement immédiat (ex: carte bancaire)
        if (!paymentMethod.isDeferred) {
            await setStatus(_order._id, 'PAID');
            try {
                await ServiceMail.sendMailOrderToCompany(_order._id);
            } catch (e) {
                console.error(e);
            }
            try {
                await ServiceMail.sendMailOrderToClient(_order._id);
            } catch (e) {
                console.error(e);
            }
        }
        // On verifie que les produits du panier soient bien commandable
        const {bookingStock} = global.envConfig.stockOrder;
        if (bookingStock === 'payment') {
            for (let i = 0; i < _order.items.length; i++) {
                const orderItem = _order.items[i];
                const _product  = await Products.findOne({_id: orderItem.id});
                if (_product.kind === 'SimpleProduct') {
                    if ((_product.stock.orderable) === false) {
                        throw NSErrors.ProductNotOrderable;
                    }
                    // on reserve le stock
                    await ServicesProducts.updateStock(_product._id, -orderItem.quantity);
                } else if (_product.kind === 'BundleProduct') {
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
        aquilaEvents.emit('aqPaymentReturn', _order._id);
        return _order;
    } catch (err) {
        console.error('La commande est introuvable:');
        console.error('query:', JSON.stringify(query, null, 4));
        console.error('err: ', err);
        throw err;
    }
};

const paymentFail = async (query, update) => {
    if (update.status) { delete update.status; }
    if (update.$set && update.$set.status) {
        update.$set.status = 'PAYMENT_FAILED';
    } else {
        update.$set = {status: 'PAYMENT_FAILED'};
    }
    return Orders.findOneAndUpdate(query, update);
};

const cancelOrder = async (orderId) => {
    const order = await Orders.findOne({
        _id    : orderId,
        status : {
            $in : [
                'PAYMENT_PENDING',
                'PAYMENT_RECEIPT_PENDING',
                'PAYMENT_CONFIRMATION_PENDING',
                'PAID',
                'PROCESSING',
                'PROCESSED',
                'DELIVERY_PROGRESS',
                'DELIVERY_PARTIAL_PROGRESS',
                'FINISHED',
                'RETURNED',
                'ASK_CANCEL'
            ]
        }
    });
    if (!order) {
        throw NSErrors.OrderNotCancelable;
    }
    await setStatus(orderId, 'CANCELED', order.status !== 'PAYMENT_PENDING');

    if (global.envConfig.stockOrder.bookingStock !== 'none') {
        aquilaEvents.emit('aqCancelOrder', order);
    }
};

const cancelOrders = () => {
    const dateAgo = new Date();
    dateAgo.setHours(dateAgo.getHours() - global.envConfig.stockOrder.pendingOrderCancelTimeout);

    return Orders.find({status: 'PAYMENT_PENDING', createdAt: {$lt: dateAgo}})
        .select('_id')
        .then(function (_orders) {
            return _orders.forEach(async (_order) => {
                await cancelOrder(_order._id);
            });
        });
};

const rma = async (orderId, returnData) => {
    const upd = {rma: returnData};

    if (returnData.refund > 0 && returnData.mode !== '') {
        upd.payment = {
            type          : 'DEBIT',
            status        : 'DONE',
            operationDate : Date.now(),
            mode          : returnData.mode,
            transactionId : '',
            amount        : returnData.refund,
            comment       : returnData.comment
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

            returnPrds[rmaProduct.product_id] += rmaProduct.qty_returned;

            // on check si on gere le stock
            if (global.envConfig.stockOrder.bookingStock !== 'none' && returnData.in_stock) {
                const _product = await Products.findOne({_id: rmaProduct.product_id});
                if (_product.type === 'simple') {
                    // On incremente la quantité
                    await ServicesProducts.updateStock(_product._id, rmaProduct.qty_returned, 0);
                } else if (_product.type === 'bundle') {
                    for (let i = 0; i < rmaProduct.selections.length; i++) {
                        const selectionProducts = rmaProduct.selections[i].products;
                        // on incremente la quantité de chaque produit de chaque section
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
    historyStatus.status = 'RETURNED';
    _order.historyStatus.push(historyStatus);
    _order.status = 'RETURNED';

    await _order.save();

    const data = {
        order_id    : orderId,
        montant     : -(returnData.refund),
        withTaxes   : true,
        client      : _order.customer.id,
        nom         : _order.addresses.billing.lastname,
        prenom      : _order.addresses.billing.firstname,
        societe     : _order.addresses.billing.companyName,
        coordonnees : `${_order.addresses.billing.line1 + (_order.addresses.billing.line2 ? ` ${_order.addresses.billing.line2}` : '')}, ${_order.addresses.billing.zipcode} ${_order.addresses.billing.city + (_order.addresses.billing.country ? `, ${_order.addresses.billing.country}` : '')}`,
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
        data.items[i] = {...(data.items[i].toObject()), quantity: returnData.products.find((prd) => prd.product_id === data.items[i].id.toString()).qty_returned};
    }

    await Bills.create(data);

    if (returnData.sendMail) {
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
};

const infoPayment = async (orderId, returnData, sendMail) => {
    returnData.operationDate = Date.now();
    await setStatus(orderId, 'PAID');
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
         * NS PAS DELETE LA CODE COMMENTÉ EN DESSOUS
         */
        try {
            await ServiceMail.sendMailOrderToClient(_order._id);
        } catch (error) {
            console.error(error);
        }
    }
    aquilaEvents.emit('aqPaymentReturn', _order._id);
};

const duplicateItemsFromOrderToCart = async (req) => {
    const orderId = req.body.idOrder || null;
    let cartId    = req.body.idCart || null;
    let products  = [];
    // Si on envoi un id de commande, on récupère les items de cette commande, sinon on récupère les products envoyés directement (ex: foodOption)
    if (orderId) {
        const _order = await Orders.findOne({_id: orderId});
        products     = _order.items;
    } else {
        // Exemple :
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
        products = req.body.products;
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
    await ServiceCart.linkCustomerToCart(_cart, req);
    for (let i = 0; i < products.length; i++) {
        _cart                   = await Cart.findOne({_id: cartId, status: 'IN_PROGRESS'});
        const productThatExists = await Products.findOne({_id: products[i].id, active: true, _visible: true});
        // On teste que le produit existe, est visible et est actif
        if (productThatExists && productThatExists.bundle_sections && productThatExists.bundle_sections.length > 0) {
            // Code pour les menus
            const item = {id: productThatExists._id, quantity: products[i].quantity, weight: productThatExists.weight, selections: []};
            // On parcours les sections
            for (let j = 0; j < products[i].selections.length; j++) {
                item.selections.push({
                    products           : [],
                    bundle_section_ref : products[i].selections[j].bundle_section_ref
                });
                // Puis les produits des sections
                for (let k = 0; k < products[i].selections[j].products.length; k++) {
                    // On vérifie que le produit existe, est visible et est actif
                    const prd = await Products.findOne({_id: products[i].selections[j].products[k], active: true, _visible: true, 'stock.orderable': true});
                    if (prd) {
                        item.selections[j].products.push(products[i].selections[j].products[k]);
                    } else {
                        // Sinon on met en erreur et on passe au produit suivant (on n'ajoute pas le menu)
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
                let user   = null;
                if (req.headers && req.headers.authorization) {
                    user = await ServiceAuth.getDecodedToken(req.headers.authorization);
                }
                _cart = await productThatExists.addToCart(_cart, item, user ? user.info : {}, _lang.code);
                itemsPushed++;
                _cart = await ServicePromo.checkForApplyPromo(user, _cart, _lang.code);
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
            // Code pour les produits normaux
            const item  = {id: productThatExists._id, quantity: quantityToAdd, weight: productThatExists.weight};
            const _lang = await Languages.findOne({defaultLanguage: true});
            if (productThatExists.translation[_lang.code]) {
                item.name = productThatExists.translation[_lang.code].name;
            }
            item.code  = productThatExists.code;
            item.image = require('../utils/medias').getProductImageUrl(productThatExists);
            let user   = null;
            if (req.headers && req.headers.authorization) {
                user = await ServiceAuth.getDecodedToken(req.headers.authorization);
            }
            _cart = await productThatExists.addToCart(_cart, item, user ? user.info : {}, _lang.code);
            itemsPushed++;
            _cart = await ServicePromo.checkForApplyPromo(user, _cart, _lang.code);
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
    let status = 'DELIVERY_PROGRESS';
    if (pkgData.status && pkgData.status === 'partial') {
        status = 'DELIVERY_PARTIAL_PROGRESS';
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
            // on check si on gere le stock
            if (global.envConfig.stockOrder.bookingStock !== 'none') {
                const _product = await Products.findOne({_id: pkgProduct.product_id});
                if (_product.type === 'simple') {
                    // On decremente la quantité
                    await ServicesProducts.updateStock(_product._id, 0, -pkgProduct.qty_shipped);
                } else if (_product.type === 'bundle') {
                    for (let i = 0; i < pkgProduct.selections.length; i++) {
                        const selectionProducts = pkgProduct.selections[i].products;
                        // on decremente la quantité de chaque produit de chaque section
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

    const dateDelivery = moment().add(_order.delivery.dateDelivery.delayDelivery, _order.delivery.dateDelivery.unitDelivery).add(_order.delivery.dateDelivery.delayPreparation, _order.delivery.dateDelivery.unitPreparation).format('DD/MM/YYYY');
    try {
        await ServiceMail.sendGeneric('orderSent', _order.customer.email, {
            number          : _order.number,
            name            : _order.delivery.name,
            fullname        : _order.customer.fullname,
            company         : _order.addresses.delivery.companyName && _order.addresses.delivery.idMondialRelay ? `${_order.delivery.name}: ${_order.addresses.delivery.companyName}` : '',
            trackingUrl     : pkgData.tracking,
            date            : dateDelivery,
            transporterName : _order.delivery.name,
            companyName     : _order.addresses.delivery.companyName && _order.addresses.delivery.idMondialRelay ? `${_order.delivery.name}: ${_order.addresses.delivery.companyName}` : '', // Legacy
            address         : `${_order.addresses.delivery.line1 + (_order.addresses.delivery.line2 ? ` ${_order.addresses.delivery.line2}` : '')}, ${_order.addresses.delivery.zipcode} ${_order.addresses.delivery.city + (country ? `, ${country}` : '')}`
        });
    } catch (error) {
        console.error(error);
    }
};

const delPackage = async (orderId, pkgId) => {
    await utils.modules.modulesLoadFunctions('deleteParcel', {orderId, pkgId});
    return Orders.findOneAndUpdate({_id: orderId}, {$pull: {'delivery.package': {_id: pkgId}}}, {new: true}).populate('items.id');
};

const updatePayment = async (body) => {
    const findCondition = {
        _id           : body._id,
        'payment._id' : body.paymentId
    };
    let msg             = {status: true};
    if (body.field !== '') {
        const updateValue                      = {};
        updateValue[`payment.$.${body.field}`] = body.value;
        try {
            const updOrder = await Orders.findOneAndUpdate(findCondition, {$set: updateValue}, {new: true});
            if (!updOrder) msg = {status: false};
            return msg;
        } catch (error) {
            return {status: false};
        }
    } else {
        return {status: false};
    }
};

const updateStatus = async (body, params) => {
    const order = await Orders.findOne({$or: [{_id: params.id}, {_id: body.id}]});
    if (!order) {
        throw NSErrors.OrderNotFound;
    }
    const noAccess = ['PAYMENT_CONFIRMATION_PENDING', 'PAID', 'BILLED', 'DELIVERY_PROGRESS', 'DELIVERY_PARTIAL_PROGRESS', 'RETURNED'];
    if (!noAccess.includes(body.status) && body.status !== order.status && order.status !== 'CANCELED') {
        await setStatus(order._id, body.status);
        return;
    }
    throw NSErrors.StatusUpdateError;
};

const cancelOrderRequest = async (_id, authorizationToken) => {
    const user  = await ServiceAuth.getDecodedToken(authorizationToken);
    const order = await Orders.findOne({_id, 'customer.email': user.info.email});
    if (order) {
        await setStatus(_id, 'ASK_CANCEL');
        return order.status = 'ASK_CANCEL';
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

module.exports = {
    getOrders,
    getOrder,
    saveOrder,
    getOrderById,
    setOrder,
    setStatus,
    paymentSuccess,
    paymentFail,
    cancelOrder,
    cancelOrders,
    rma,
    infoPayment,
    duplicateItemsFromOrderToCart,
    addPackage,
    delPackage,
    updatePayment,
    updateStatus,
    cancelOrderRequest
};