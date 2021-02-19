/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const moment            = require('moment');
const mongoose          = require('mongoose');
const {
    Cart,
    Orders,
    Products,
    Promo,
    Languages
}                       = require('../orm/models');
const aquilaEvents      = require('../utils/aquilaEvents');
const QueryBuilder      = require('../utils/QueryBuilder');
const NSErrors          = require('../utils/errors/NSErrors');
const servicesLanguages = require('./languages');
const ServicePromo      = require('./promo');
const ServiceShipment   = require('./shipment');
const ServicesProducts  = require('./products');
const servicesTerritory = require('./territory');

const restrictedFields = [];
const defaultFields    = ['_id', 'delivery', 'status', 'items', 'promos', 'orderReceipt'];
const queryBuilder     = new QueryBuilder(Cart, restrictedFields, defaultFields);

const getCarts = async (PostBody) => {
    return queryBuilder.find(PostBody);
};

/**
 * Get cart(s) for this client
 */
const getCartforClient = async (idclient) => {
    return Cart.find({'customer.id': mongoose.Types.ObjectId(idclient)});
};

const getCartById = async (id, PostBody = null, user = null, lang = null, req = null) => {
    if (PostBody && PostBody.structure) {
        // obligé d'avoir tous les champs pour les règles de promo
        const structure = PostBody.structure;
        delete PostBody.structure;
        if (structure.score) {
            PostBody.structure = {score: structure.score};
        }
        queryBuilder.defaultFields = ['*'];
    }
    let cart = await queryBuilder.findById(id, PostBody);

    if (cart) {
        const productsCatalog = await ServicePromo.checkPromoCatalog(cart.items.map((i) => i.id), user, lang, false);
        if (productsCatalog) {
            for (let i = 0, leni = cart.items.length; i < leni; i++) {
                cart = await ServicePromo.applyPromoToCartProducts(productsCatalog, cart, i);
            }
            cart = await ServicePromo.checkQuantityBreakPromo(cart, user, lang, false);
            await cart.save();
        }
        if (user && !user.isAdmin) {
            cart = await linkCustomerToCart(cart, req);
        }
    }
    return cart;
};

/**
 * Met a jour l'addresse de livraison et/ou de facturation d'un panier
 * @param {*} cartId id du cart
 * @param {*} addresses adresse de livraison et/ou de facturation
 */
const setCartAddresses = async (cartId, addresses) => {
    const addressesType = [{type: 'delivery', name: 'livraison'}, {type: 'billing', name: 'facturation'}];
    const update        = {};
    let err;
    let addressType;
    let updAddress;
    for (let i = 0; i < addressesType.length; i++) {
        addressType = addressesType[i];
        updAddress  = addresses[addressType.type];
        if (updAddress) {
            update[`addresses.${addressType.type}`] = updAddress;
        }
    }
    if (err) throw err;
    let resp;
    try {
        resp = await Cart.findOneAndUpdate({_id: cartId}, {$set: {...update}}, {new: true});
        if (!resp) {
            const newCart = await Cart.create(update);
            return {code: 'CART_CREATED', data: {cart: newCart}};
        }
        return {code: 'CART_UPDATED', data: {cart: resp}};
    } catch (err) {
        console.log(err);
        throw err;
    }
};

const setComment = async (cartId, comment) => {
    const resp = await Cart.findOneAndUpdate({_id: cartId}, {comment}, {new: true});
    return {code: 'CART_UPDATE_COMMENT_SUCCESS', data: {cart: resp}};
};

const deleteCartItem = async (cartId, itemId) => {
    let cart = await Cart.findOne({_id: cartId});
    if (!cart) throw NSErrors.CartNotFound;
    cart = await Cart.findOne({_id: cartId, status: 'IN_PROGRESS'});
    if (!cart) throw NSErrors.CartInactive;
    const itemIndex = cart.items.findIndex((item) => item._id.toString() === itemId);
    if (itemIndex > -1) {
        if (global.envConfig.stockOrder.bookingStock === 'panier') {
            const ServicesProducts = require('./products');
            const cartItem         = cart.items[itemIndex];
            if (cartItem.type === 'simple') {
                await ServicesProducts.updateStock(cartItem.id._id, cartItem.quantity);
            } else if (cartItem.type === 'bundle') {
                for (let i = 0; i < cartItem.selections.length; i++) {
                    const selectionProducts = cartItem.selections[i].products;
                    // on check que chaque produit soit commandable
                    for (let j = 0; j < selectionProducts.length; j++) {
                        const selectionProduct = await Products.findById(selectionProducts[j]);
                        if (selectionProduct.type === 'simple') {
                            await ServicesProducts.updateStock(selectionProduct._id, cartItem.quantity);
                        }
                    }
                }
            }
        }
        cart = await Cart.findOneAndUpdate(
            {_id: cartId, status: 'IN_PROGRESS'},
            {$pull: {items: {_id: itemId}}},
            {new: true}
        );
    } else {
        throw NSErrors.CartItemNotFound;
    }

    ServicePromo.calculDiscount(cart);
    await cart.save();
    return {code: 'CART_ITEM_DELETED', data: {cart}};
};

const addItem = async (req) => {
    let cart = await Cart.findOne({_id: req.body.cartId, status: 'IN_PROGRESS'}).populate('items.id');
    if (!cart) {
        cart = await Cart.create({status: 'IN_PROGRESS'});
    }
    const _product = await Products.findOne({_id: req.body.item.id});
    await linkCustomerToCart(cart, req);
    if (!_product) {
        return {code: 'NOTFOUND_PRODUCT', message: 'Le produit est indisponible.'}; // res status 400
    }
    const _lang = await Languages.findOne({defaultLanguage: true});
    if (cart.items && cart.items.length) {
        // const index = cart.items.findIndex((item) => item.id._id.toString() === _product._id.toString());
        const indexes = cart.items.toObject()
            .map((val, index) => ({val, index}))
            .filter(({val}) => val.id._id.toString() === _product._id.toString())
            .map(({index}) => index);
        for (const index of indexes) {
            if (
                cart.items[index].type === 'bundle'
                && JSON.stringify(cart.items[index].selections.toObject().map((elem) => {
                    return {bundle_section_ref: elem.bundle_section_ref, products: [elem.products[0]._id.toString()]};
                })) !== JSON.stringify(req.body.item.selections)
            // eslint-disable-next-line no-empty
            ) {
                continue;
            } else {
                req.body.item._id       = cart.items[index]._id.toString();
                req.body.item.quantity += cart.items[index].quantity;
                delete req.body.item.id;
                delete req.body.item.weight;
                return updateQty(req);
            }
        }
    }
    if (_product.translation[_lang.code]) {
        req.body.item.name = _product.translation[_lang.code].name;
    }
    req.body.item.code  = _product.code;
    req.body.item.image = require('../utils/medias').getProductImageUrl(_product);
    const idGift        = mongoose.Types.ObjectId();
    if (req.body.item.parent) {
        req.body.item._id = idGift;
    }

    const item = {...req.body.item, weight: _product.weight, price: _product.price};
    if (_product.type !== 'virtual') item.stock = _product.stock;
    const data = await _product.addToCart(cart, item, req.info, _lang.code);
    if (data && data.code) {
        return {code: data.code, data: {error: data}}; // res status 400
    }
    cart           = data;
    cart           = await ServicePromo.checkForApplyPromo(req.info, cart, _lang.code);
    const _newCart = await cart.save();
    if (req.body.item.parent) {
        _newCart.items.find((item) => item._id.toString() === req.body.item.parent).children.push(idGift);
    }
    await _newCart.save();
    return {code: 'CART_ADD_ITEM_SUCCESS', data: {cart}};
};

const updateQty = async (req) => {
    if (!req.body.item || req.body.item.quantity <= 0) {
        return {code: 'BAD_REQUEST', status: 400}; // res status 400
    }
    let cart = await Cart.findOne({_id: req.body.cartId, status: 'IN_PROGRESS'});
    if (!cart) {
        throw NSErrors.InactiveCart;
    }

    const item     = cart.items.find((item) => item._id.toString() === req.body.item._id);
    const _product = await Products.findOne({_id: item.id});

    if (global.envConfig.stockOrder.bookingStock === 'panier') {
        const ServicesProducts = require('./products');

        const quantityToAdd = req.body.item.quantity - item.quantity;
        if (_product.type === 'simple') {
            if (
                quantityToAdd > 0
                && !(await ServicesProducts.checkProductOrderable(_product.stock, quantityToAdd)).ordering.orderable
            ) {
                throw NSErrors.ProductNotInStock;
            }
            // Reza de la qte
            await ServicesProducts.updateStock(_product._id, -quantityToAdd);
        } else if (_product.type === 'bundle') {
            for (let i = 0; i < item.selections.length; i++) {
                const selectionProducts = item.selections[i].products;
                // on check que chaque produit soit commandable
                for (let j = 0; j < selectionProducts.length; j++) {
                    const selectionProduct = await Products.findById(selectionProducts[j]);
                    if (selectionProduct.type === 'simple') {
                        if (
                            quantityToAdd > 0
                            && !(await ServicesProducts.checkProductOrderable(selectionProduct.stock, quantityToAdd)).ordering.orderable
                        ) {
                            throw NSErrors.ProductNotInStock;
                        }
                        await ServicesProducts.updateStock(selectionProduct._id, -quantityToAdd);
                    }
                }
            }
        }
    }

    // On gère le stock
    // await servicesProducts.handleStock(item, _product, req.body.item.quantity);
    cart = await Cart.findOneAndUpdate(
        {_id: req.body.cartId, status: 'IN_PROGRESS', 'items._id': req.body.item._id},
        {'items.$.quantity': req.body.item.quantity},
        {new: true}
    );
    if (!cart) {
        throw NSErrors.InactiveCart;
    }
    await linkCustomerToCart(cart, req);
    cart = await ServicePromo.checkForApplyPromo(req.info, cart);
    await cart.save();
    // Event appelé par les modules pour récupérer les modifications dans le panier
    const shouldUpdateCart = aquilaEvents.emit('aqReturnCart');
    if (shouldUpdateCart) {
        cart = await Cart.findOne({_id: cart._id});
    }
    return {code: 'CART_ADD_ITEM_SUCCESS', data: {cart}};
};

const checkCountryTax = async (_cart, _user) => {
    let paidTax = true;
    try {
        if (_cart.addresses && _cart.addresses.billing && _user.billing_address >= 0) {
            const countryCode = _cart.addresses.billing.isoCountryCode || _user.addresses[_user.billing_address].isoCountryCode;
            const _country    = await servicesTerritory.getTerritory({filter: {code: countryCode}});

            if (_country) {
                if (_country.taxeFree) { // Pas de taxe
                    paidTax = false; // Payer en HT
                } else {
                    const {websiteCountry} = global.envConfig.environment;
                    if (websiteCountry && websiteCountry !== countryCode && _user.company && _user.company.intracom) {
                        paidTax = false;
                    }
                }
            }
        }
    } catch (err) {
        // On retourne la valeur par défaut
    }

    return paidTax;
};

const cartToOrder = async (cartId, _user, lang = '') => {
    try {
        const _cart = await Cart.findOne({_id: cartId, status: 'IN_PROGRESS'});
        if (!_cart) {
            throw NSErrors.CartInactive;
        }
        lang = servicesLanguages.getDefaultLang(lang);
        // On valide les données du panier
        const result = validateForCheckout(_cart);
        if (result.code !== 'VALID') {
            throw {status: 400, code: result.code, translations: {fr: result.message}};
        }
        // On verfifie que le code promo est toujours valide
        if (_cart.promos && _cart.promos.length && _cart.promos[0].code) {
            try {
                const cart = await ServicePromo.checkCodePromoByCode(_cart.promos[0].code, _cart._id, _user, lang);
                if (!cart) throw NSErrors.PromoCodePromoInvalid;
                // Si il y a des gifts dans promos alors on populate le gifts afin de recupérer le produit
                if (_cart.promos[0].gifts.length) {
                    const cart_populated = await _cart.populate('promos.gifts').execPopulate();
                    // On ajoute les produits offert aux items du cart
                    cart_populated.promos[0].gifts.forEach((gift) => _cart.items.push(gift));
                }
                // Si il y a des codes promo qui s'appliquent sur des items
                if (_cart.promos[0].productsId && _cart.promos[0].productsId.length) {
                    for (let i = 0; i < _cart.promos[0].productsId.length; i++) {
                        const discountProduct                      = _cart.promos[0].productsId[i];
                        const {discountATI, discountET, productId} = discountProduct;
                        const itemFound                            = _cart.items.find((item) => item.id.toString() === productId.toString());
                        if (itemFound) {
                            // Le priceTotal sera recalculé automatiquement
                            itemFound.price.unit.ati -= discountATI;
                            itemFound.price.unit.et  -= discountET;
                        }
                    }
                }
            } catch (error) {
                console.error(error);
                throw NSErrors.PromoCodePromoInvalid;
            }
        }
        // On verifie que les produits du panier soient bien commandable
        const {bookingStock} = global.envConfig.stockOrder;
        if (bookingStock === 'commande') {
            for (let i = 0; i < _cart.items.length; i++) {
                const cartItem = _cart.items[i];
                const _product = await Products.findOne({_id: cartItem.id});
                if (_product.kind === 'SimpleProduct') {
                    if ((_product.stock.orderable) === false) {
                        throw NSErrors.ProductNotOrderable;
                    }
                    // on reserve le stock
                    await ServicesProducts.updateStock(_product._id, -cartItem.quantity);
                } else if (_product.kind === 'BundleProduct') {
                    for (let j = 0; j < cartItem.selections.length; j++) {
                        const section = cartItem.selections[j];
                        for (let k = 0; k < section.products.length; k++) {
                            const productId        = section.products[k];
                            const _product_section = await Products.findOne({_id: productId.id});
                            if (_product_section.type === 'simple') {
                                if ((_product_section.stock.orderable) === false) {
                                    throw NSErrors.ProductNotOrderable;
                                }
                                await ServicesProducts.updateStock(_product_section._id, -cartItem.quantity);
                            }
                        }
                    }
                }
            }
        }
        const cartObj       = _cart.toObject();
        const priceTotal    = cartObj.priceTotal;
        const priceSubTotal = cartObj.priceSubTotal;
        priceTotal.paidTax  = await checkCountryTax(cartObj, _user);

        const newOrder = {
            items          : cartObj.items.filter((it) => it.quantity > 0),
            promos         : cartObj.promos,
            cartId         : cartObj._id,
            quantityBreaks : cartObj.quantityBreaks,
            discount       : cartObj.discount,
            addresses      : cartObj.addresses,
            delivery       : cartObj.delivery,
            lang,
            // if priceTotal === 0, then the order is set to status 'PAID'
            status         : (priceTotal.ati === 0 ? 'PAID' : 'PAYMENT_PENDING'),
            priceTotal,
            priceSubTotal,
            comment        : cartObj.comment,
            historyStatus  : [{status: (priceTotal.ati === 0 ? 'PAID' : 'PAYMENT_PENDING'), date: moment(new Date())}],
            customer       : {
                id           : _user._id,
                email        : _user.email,
                code         : _user.code,
                fullname     : _user.fullname,
                phone        : _user.phone,
                civility     : _user.civility,
                phone_mobile : _user.phone_mobile,
                company      : _user.company,
                status       : _user.status,
                birthDate    : _user.birthDate,
                details      : _user.details,
                type         : _user.type
            },
            orderReceipt    : cartObj.orderReceipt,
            additionnalFees : cartObj.additionnalFees
        };
        if (_cart.schema.path('point_of_sale')) {
            newOrder.point_of_sale = cartObj.point_of_sale;
        }
        // Si le mode de réception de la commande est la livraison...
        if (newOrder.orderReceipt.method === 'delivery') {
            if (!newOrder.addresses.billing) {
                newOrder.addresses.billing = newOrder.addresses.delivery;
            }

            if (newOrder.addresses.delivery) {
                if (!newOrder.addresses.delivery.firstname) {
                    newOrder.addresses.delivery.firstname = _user.firstname;
                }
                if (!newOrder.addresses.delivery.lastname) {
                    newOrder.addresses.delivery.lastname = _user.lastname;
                }
            }
            if (newOrder.addresses.billing) {
                if (!newOrder.addresses.billing.firstname) {
                    newOrder.addresses.billing.firstname = _user.firstname;
                }
                if (!newOrder.addresses.billing.lastname) {
                    newOrder.addresses.billing.lastname = _user.lastname;
                }
            }
        }

        const createdOrder = await Orders.create(newOrder);
        // Si le order a une promo de type code promo
        if (createdOrder.promos && createdOrder.promos.length && createdOrder.promos[0].promoCodeId) {
            try {
            // alors on incrémente le nombre d'utilisation de cette promo
                await Promo.updateOne({'codes._id': createdOrder.promos[0].promoCodeId}, {$inc: {'codes.$.used': 1}});
                // alors nous devons aussi actualiser le nombre de client unique ayant utilisé ce code promo
                const result = await Orders.distinct('customer.id', {'promos.promoCodeId': createdOrder.promos[0].promoCodeId});
                await Promo.updateOne({'codes._id': createdOrder.promos[0].promoCodeId}, {$set: {'codes.$.client_used': result.length}});
            // TODO P6 : Décrémenter le stock du produit offert
            // if (_cart.promos[0].gifts.length)
            } catch (err) {
                console.error(err);
            }
        }

        return {code: 'ORDER_CREATED', data: createdOrder};
    } catch (err) {
        await Cart.updateOne({_id: cartId}, {$set: {status: 'IN_PROGRESS'}});
        throw err;
    }
};

const removeOldCarts = async () => {
    const {bookingStock} = global.envConfig.stockOrder;
    const dateAgo        = new Date();
    const params         = {$or: [{createdAt: null}, {createdAt: {$lt: dateAgo}}]};
    const carts          = await Cart.find(params);

    for (let cartIndex = 0; cartIndex < carts.length; cartIndex++) {
        for (let cartItemIndex = 0; cartItemIndex < carts[cartIndex].items.length; cartItemIndex++) {
            // On gère les stock et reservation panier
            if (bookingStock === 'panier') {
                const ServicesProducts = require('./products');
                const cartItem         = carts[cartIndex].items[cartItemIndex];
                if (cartItem.type === 'simple') {
                    await ServicesProducts.updateStock(cartItem.id, cartItem.quantity);
                } else if (cartItem.type === 'bundle') {
                    for (let selectionIndex = 0; selectionIndex < cartItem.selections.length; selectionIndex++) {
                        const selectionProducts = cartItem.selections[selectionIndex].products;
                        // on check que chaque produit soit commandable
                        for (let productIndex = 0; productIndex < selectionProducts.length; productIndex++) {
                            const selectionProduct = await Products.findById(selectionProducts[productIndex]);
                            if (selectionProduct.type === 'simple') {
                                await ServicesProducts.updateStock(selectionProduct._id, cartItem.quantity);
                            }
                        }
                    }
                }
            }
        }
    }

    const nbDelete = await Cart.deleteMany(params);
    require('./stats').addOldCart(nbDelete.n);
};

/**
 * Commandable ou non
 * @param {Object} stock
 * @param {number} qty
 */
const checkProductOrderable = async (stock, qty) => {
    return stock.orderable && (stock.qty - stock.qty_booked - qty) >= 0;
};

/**
 * Fonction pour associer un utilisateur à un panier
 */
const linkCustomerToCart = async (cart, req) => {
    if (cart && (!cart.customer || !cart.customer.id)) {
        const user = req.info;
        if (user) {
            const customer = {
                id    : user._id,
                email : user.email,
                phone : user.phone
            };
            const paidTax  = await checkCountryTax(cart, user);
            await Cart.findOneAndUpdate({_id: cart._id}, {customer, paidTax}, {new: true});
            cart.paidTax  = paidTax;
            cart.customer = customer;
        }
    }
    return cart;
};

const updateDelivery = async (datas) => {
    let {shipment}                       = datas;
    const {lang, cartId, isoCountryCode} = datas;
    const oCart                          = await Cart.findOneAndUpdate({_id: cartId}, {$set: {delivery: {}}}, {new: true});
    if (!shipment.countries || !shipment.preparation) {
        const oShipment = await ServiceShipment.getShipment({filter: {_id: shipment}, structure: '*'});
        shipment        = {...shipment, ...oShipment.translation[lang], preparation: oShipment.preparation, countries: oShipment.countries};
    }
    const country       = shipment.countries.find((country) => (country.country).toLowerCase() === (isoCountryCode).toLowerCase());
    const delaysT       = country.translation;
    const delays        = delaysT && delaysT[lang] ? delaysT[lang] : {delay: 1, unit: 'day'};
    const {arrayPrices} = await ServiceShipment.getShipmentsFilter(oCart);
    const vat           = shipment.vat_rate ? shipment.vat_rate / 100 : 0.2;
    const delivery      = {
        method : shipment._id,
        value  : {
            ati : arrayPrices[shipment.code] ? arrayPrices[shipment.code] : 0,
            et  : arrayPrices[shipment.code] ? (arrayPrices[shipment.code] / (vat + 1)) : 0,
            vat : shipment.vat_rate ? shipment.vat_rate : 20
        },
        code         : shipment.code,
        name         : shipment.name,
        url          : shipment.url,
        date         : shipment.dateDelivery,
        dateDelivery : {
            delayDelivery    : delays.delay,
            unitDelivery     : delays.unit,
            delayPreparation : (shipment.preparation && shipment.preparation.delay) ? shipment.preparation.delay : 0,
            unitPreparation  : (shipment.preparation && shipment.preparation.unit) ? shipment.preparation.unit : 0
        }
    };
    const cart          = await Cart.findOneAndUpdate({_id: cartId, status: 'IN_PROGRESS'}, {delivery, 'orderReceipt.method': shipment.type === 'DELIVERY' ? 'delivery' : 'withdrawal'}, {new: true}).populate('customer.id').exec();
    if (!cart) {
        throw NSErrors.CartInactive;
    }
    if (cart.orderReceipt.method === 'delivery') {
        cart.addresses.delivery = cart.customer.id.addresses[cart.customer.id.delivery_address];
        cart.addresses.billing  = cart.customer.id.addresses[cart.customer.id.billing_address];
        await cart.save();
    }
    return {code: 'CART_DELIVERY_UPDATED', data: {cart}};
};

const removeDiscount = async (id) => {
    const updCart = await Cart.findOneAndUpdate({_id: id, status: 'IN_PROGRESS'}, {$pop: {promos: 1}}, {new: true});
    if (!updCart) {
        throw NSErrors.InactiveCart;
    }
    return {code: 'CART_DISCOUNT_REMOVE', data: {cart: updCart}};
};

const validateForCheckout = (cart) => {
    if (!cart.orderReceipt || !cart.orderReceipt.method) {
        return {code: 'NOTFOUND_RECEIPT_METHOD', message: 'Mode de réception de commande non indiqué.'};
    }

    return {code: 'VALID'};
};

/**
 * @Deprecated
 */
const _expireCarts = async () => {
    require('../utils/utils').tmp_use_route('cart_service', '_expireCarts');
    // Actually expire each cart
    const expiredCarts = await Cart.find({status: 'EXPIRING'});
    if (!expiredCarts) {
        throw NSErrors.NotFound;
    }
    expiredCarts.forEach(function (currCart) {
        let nbItem = 0;
        currCart.items.forEach(async (item) => {
            let where  = {id: item.id, 'carted.id_cart': currCart._id, 'carted.qty': item.qty};
            let action = {$pull: {carted: {id_cart: currCart._id}}};
            if (item.variation_id) {
                where['carted.id_variation']     = item.variation_id;
                action.$pull.carted.id_variation = item.variation_id;
            }

            await Products.findOneAndUpdate(where, action);
            where = {id: item.product_id, qty: {$ne: null}};
            if (item.variation_id) {
                where['variation_event._id'] = item.variation_id;
                action                       = {$inc: {'variation_event.$.qty': item.qty}};
            } else {
                action = {$inc: {qty: item.qty}};
            }

            await Products.findOneAndUpdate(where, action);
            nbItem++;
            if (nbItem === currCart.items.length) {
                currCart.status = 'expired';
                currCart.save();
            }
        });
    });
};

module.exports = {
    _expireCarts,
    getCarts,
    getCartforClient,
    getCartById,
    setCartAddresses,
    setComment,
    deleteCartItem,
    cartToOrder,
    removeOldCarts,
    checkProductOrderable,
    linkCustomerToCart,
    updateQty,
    addItem,
    updateDelivery,
    removeDiscount,
    validateForCheckout
};