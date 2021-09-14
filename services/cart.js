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
    Languages,
    Configuration
}                       = require('../orm/models');
const aquilaEvents      = require('../utils/aquilaEvents');
const QueryBuilder      = require('../utils/QueryBuilder');
const utilsDatabase     = require('../utils/database');
const NSErrors          = require('../utils/errors/NSErrors');
const servicesLanguages = require('./languages');
const ServicePromo      = require('./promo');
const ServiceShipment   = require('./shipment');
const ServicesProducts  = require('./products');
const servicesTerritory = require('./territory');
const servicesMail      = require('./mail');
const ServiceJob        = require('./job');

const restrictedFields = [];
const defaultFields    = ['_id', 'delivery', 'status', 'items', 'promos', 'orderReceipt'];
const queryBuilder     = new QueryBuilder(Cart, restrictedFields, defaultFields);

const getCarts = async (PostBody) => queryBuilder.find(PostBody);

/**
 * Get cart(s) for this client
 * @returns {Promise<mongoose.Document>}
 */
const getCartforClient = async (idclient) => Cart.find({'customer.id': mongoose.Types.ObjectId(idclient)});

const getCartById = async (id, PostBody = null, user = null, lang = null, req = null) => {
    if (PostBody && PostBody.structure) {
        // Need to have all the fields for the discount rules
        const structure = PostBody.structure;
        delete PostBody.structure;
        if (structure.score) {
            PostBody.structure = {score: structure.score};
        }
        queryBuilder.defaultFields = ['*'];
    }
    let cart = await queryBuilder.findById(id, PostBody);

    if (cart) {
        const products        = cart.items.map((product) => product.id);
        const productsCatalog = await ServicePromo.checkPromoCatalog(products, user, lang, false);
        if (productsCatalog) {
            for (let i = 0, leni = cart.items.length; i < leni; i++) {
                if (cart.items[i].type !== 'bundle') {
                    cart = await ServicePromo.applyPromoToCartProducts(productsCatalog, cart, i);
                }
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
 * Updates the delivery and / or billing address of a cart
 * @param {*} cartId cart's id
 * @param {*} addresses delivery and / or billing address
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
            await utilsDatabase.populateItems(newCart.items);
            return {code: 'CART_CREATED', data: {cart: newCart}};
        }
        await utilsDatabase.populateItems(resp.items);
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
                    // we check that each product is orderable
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

    await cart.save();
    aquilaEvents.emit('aqReturnCart');
    cart = await Cart.findOne({_id: cart._id});
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

    if (typeof req.body.item.options !== 'undefined' && req.body.item.options !== null) {
        // we set options in the cart !
        // quick check if all mandatory options are present
        for (const oneProductOptions of _product.options) {
            if (oneProductOptions && oneProductOptions.mandatory === true) {
                const isPresent = req.body.item.options.findIndex((oneOptionsInBody) => oneOptionsInBody._id.toString() === oneProductOptions._id.toString());
                if (isPresent === -1 ) {
                    throw NSErrors.InvalidOptions;
                }
            }
        }
        // add to item
        // add code, add name, add modifier, add control
        for (const oneOptionsInReq of req.body.item.options) {
            const optionInProduct     = _product.options.find(((oneOptions) => oneOptions.code === oneOptionsInReq.code));
            oneOptionsInReq.mandatory = optionInProduct.mandatory;
            oneOptionsInReq.type      = optionInProduct.type;
            oneOptionsInReq.name      = optionInProduct.name;
            if (oneOptionsInReq.values.length > 1 &&  optionInProduct.type !== 'checkbox') {
                // only checkbox has multiple values
                throw NSErrors.InvalidOptions;
            }
            for (const oneValue of oneOptionsInReq.values) {
                const valueInProduct = optionInProduct.values.find((element) => element._id.toString() === oneValue._id);
                if (typeof valueInProduct === 'undefined') {
                    throw NSErrors.InvalidOptions;
                }
                oneValue.control  = valueInProduct.control;
                oneValue.modifier = valueInProduct.modifier;
                if (optionInProduct.type === 'textfield' || optionInProduct.type === 'number') {
                    const valueToCheck = oneValue.values[0];
                    if (optionInProduct.type === 'textfield' && oneValue.control.min < valueToCheck.length && valueToCheck.length < oneValue.control.max) {
                        continue;
                    } else if (optionInProduct.type === 'number' && oneValue.control.min < valueToCheck && valueToCheck < oneValue.control.max) {
                        continue;
                    } else {
                        throw NSErrors.InvalidOptions;
                    }
                } else if (optionInProduct.type === 'checkbox') {
                    // multiple value are accepted
                } else {
                    const valueToCheck = oneValue.values[0];
                    let checked        = true;
                    /* eslint-disable no-labels */
                    loopOfValue:
                    for (const oneValueValues of optionInProduct.values) {
                        for (const oneLang in oneValueValues.name) {
                            if (valueToCheck === oneValueValues.name[oneLang]) {
                                checked = true;
                                break loopOfValue;
                            }
                        }
                    }
                    /* eslint-enable no-labels */
                    if (checked !== true) {
                        throw NSErrors.InvalidOptions;
                    }
                }
            }
        }
    }

    if (cart.items && cart.items.length) {
        // const index = cart.items.findIndex((item) => item.id._id.toString() === _product._id.toString());
        const indexes     = cart.items.toObject()
            .map((val, index) => ({val, index}))
            .filter(({val}) => val.id._id.toString() === _product._id.toString())
            .map(({index}) => index);
        let isANewProduct = false;
        /* eslint-disable no-labels */
        for (const index of indexes) {
            let selections;
            if (cart.items[index].type === 'bundle') {
                selections = cart.items[index].selections.toObject().map((elem) => {
                    const id = elem.products[0]._id.toString();
                    return {
                        bundle_section_ref : elem.bundle_section_ref,
                        products           : [id]
                    };
                });
            }
            if (
                cart.items[index].type === 'bundle'
                && JSON.stringify(selections) !== JSON.stringify(req.body.item.selections)
            ) {
                continue;
            } else {
                if (typeof req.body.item.options !== 'undefined' && typeof cart.items[index].options !== 'undefined') {
                    // check if same options
                    const optionsOfItemInCart = cart.items[index].options;
                    if (req.body.item.options.length === optionsOfItemInCart.length) {
                        loopCheckOptions:
                        for (const oneOptions of req.body.item.options) {
                            const indexOptions = optionsOfItemInCart.findIndex((element) => element.code === oneOptions.code);
                            if (indexOptions === -1) {
                                isANewProduct = true;
                                break;
                            } else {
                                if (optionsOfItemInCart[indexOptions].values.length === oneOptions.values.length) {
                                    for (const oneOptionsValue of optionsOfItemInCart[indexOptions].values) {
                                        const valueAlreadyPresent = oneOptionsValue._id.toString();
                                        const indexInValues       = oneOptions.values.findIndex((element) => element._id === valueAlreadyPresent);
                                        if (indexInValues > -1) {
                                            if (oneOptions.values[indexInValues].values === oneOptionsValue.values) {
                                                isANewProduct = false;
                                                continue;
                                            } else {
                                                isANewProduct = true;
                                                break loopCheckOptions;
                                            }
                                        } else {
                                            isANewProduct = true;
                                            break loopCheckOptions;
                                        }
                                    }
                                    // need to check other options
                                } else {
                                    isANewProduct = true;
                                    break;
                                }
                            }
                        }
                        if (typeof isANewProduct === 'boolean' && isANewProduct === false) {
                            isANewProduct = index;
                            break;
                        }
                    } else {
                        isANewProduct = true;
                    }
                } else {
                    if (typeof req.body.item.options === 'undefined' && typeof cart.items[index].options === 'undefined') {
                        isANewProduct = index;
                        break;
                    } else  if (typeof req.body.item.options === 'undefined' && typeof cart.items[index].options.length !== 'undefined' && cart.items[index].options.length === 0) {
                        isANewProduct = index;
                        break;
                    }
                }
                /* eslint-enable no-labels */
            }
        }
        if (typeof isANewProduct === 'number') {
            req.body.item._id       = cart.items[isANewProduct]._id.toString();
            req.body.item.quantity += cart.items[isANewProduct].quantity;

            delete req.body.item.id;
            delete req.body.item.weight;
            return updateQty(req);
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

    const weightOptionsModifier = await mongoose.model('products').getOptionsWeight(req.body.item.options, req.body.item.id);

    const finalPrice = _product.weight + weightOptionsModifier;

    const item = {...req.body.item, weight: finalPrice, price: _product.price, options: req.body.item.options};
    if (_product.type !== 'virtual') {
        item.stock = _product.stock;
    }
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
    aquilaEvents.emit('aqReturnCart');
    cart = await Cart.findOne({_id: _newCart._id});
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
                && !ServicesProducts.checkProductOrderable(_product.stock, quantityToAdd).ordering.orderable
            ) {
                throw NSErrors.ProductNotInStock;
            }
            // quantity reservation
            await ServicesProducts.updateStock(_product._id, -quantityToAdd);
        } else if (_product.type === 'bundle') {
            for (let i = 0; i < item.selections.length; i++) {
                const selectionProducts = item.selections[i].products;
                // we check that each product is orderable
                for (let j = 0; j < selectionProducts.length; j++) {
                    const selectionProduct = await Products.findById(selectionProducts[j]);
                    if (selectionProduct.type === 'simple') {
                        if (
                            quantityToAdd > 0
                            && !ServicesProducts.checkProductOrderable(selectionProduct.stock, quantityToAdd).ordering.orderable
                        ) {
                            throw NSErrors.ProductNotInStock;
                        }
                        await ServicesProducts.updateStock(selectionProduct._id, -quantityToAdd);
                    }
                }
            }
        }
    }

    // Manage stock
    // await servicesProducts.handleStock(item, _product, req.body.item.quantity);
    await cart.updateOne({
        $set : {'items.$[item].quantity': req.body.item.quantity}
    }, {
        arrayFilters : [{'item._id': req.body.item._id}],
        new          : true
    });
    await linkCustomerToCart(cart, req);
    cart = await ServicePromo.checkForApplyPromo(req.info, cart);
    await cart.save();
    // Event called by the modules to retrieve the modifications in the cart
    aquilaEvents.emit('aqReturnCart');
    cart = await Cart.findOne({_id: cart._id});
    return {code: 'CART_ADD_ITEM_SUCCESS', data: {cart}};
};

const checkCountryTax = async (_cart, _user) => {
    let paidTax = true;
    try {
        if (_cart.addresses && _cart.addresses.billing && _user.billing_address >= 0) {
            const countryCode = _cart.addresses.billing.isoCountryCode || _user.addresses[_user.billing_address].isoCountryCode;
            const _country    = await servicesTerritory.getTerritory({filter: {code: countryCode}});

            if (_country) {
                if (_country.taxeFree) { // No tax
                    paidTax = false; // Pay in ET
                } else {
                    const {websiteCountry} = global.envConfig.environment;
                    if (websiteCountry && websiteCountry !== countryCode && _user.company && _user.company.intracom) {
                        paidTax = false;
                    }
                }
            }
        }
    } catch (err) {
        // We return the default value
    }

    return paidTax;
};

const cartToOrder = async (cartId, _user, lang = '') => {
    try {
        const _cart = await Cart.findOne({_id: cartId, status: 'IN_PROGRESS'});
        if (!_cart) {
            throw NSErrors.CartInactive;
        }
        aquilaEvents.emit('cartToOrder', _cart);
        lang = servicesLanguages.getDefaultLang(lang);
        // We validate the basket data
        const result = validateForCheckout(_cart);
        if (result.code !== 'VALID') {
            throw {status: 400, code: result.code, translations: {fr: result.message}};
        }
        // We check that the promo code is still valid
        if (_cart.promos && _cart.promos.length && _cart.promos[0].code) {
            try {
                const cart = await ServicePromo.checkCodePromoByCode(_cart.promos[0].code, _cart._id, _user, lang);
                if (!cart) throw NSErrors.PromoCodePromoInvalid;
                // If there are gifts in promos then we populate the gifts in order to collect the product
                if (_cart.promos[0].gifts.length) {
                    const cart_populated = await _cart.populate('promos.gifts').execPopulate();
                    // We add the products offered to the items of the cart
                    cart_populated.promos[0].gifts.forEach((gift) => _cart.items.push(gift));
                }
                // If there are promo codes that apply to items
                if (_cart.promos[0].productsId && _cart.promos[0].productsId.length) {
                    for (let i = 0; i < _cart.promos[0].productsId.length; i++) {
                        const discountProduct                      = _cart.promos[0].productsId[i];
                        const {discountATI, discountET, productId} = discountProduct;
                        const itemFound                            = _cart.items.find((item) => item.id.toString() === productId.toString());
                        if (itemFound) {
                            // The priceTotal will be recalculated automatically
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
        // We check that the products in the basket are orderable
        const {bookingStock} = global.envConfig.stockOrder;
        if (bookingStock === 'commande') {
            for (let i = 0; i < _cart.items.length; i++) {
                const cartItem = _cart.items[i];
                const _product = await Products.findOne({_id: cartItem.id});
                if (_product.kind === 'SimpleProduct') {
                    if ((_product.stock.orderable) === false) {
                        throw NSErrors.ProductNotOrderable;
                    }
                    // we book the stock
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
            ...cartObj,
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
                ..._user,
                id : _user._id
            },
            orderReceipt    : cartObj.orderReceipt,
            additionnalFees : cartObj.additionnalFees
        };
        // If the method of receipt of the order is delivery...
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
            // We manage the stock and reservation cart
            if (bookingStock === 'panier') {
                const ServicesProducts = require('./products');
                const cartItem         = carts[cartIndex].items[cartItemIndex];
                if (cartItem.type === 'simple') {
                    await ServicesProducts.updateStock(cartItem.id, cartItem.quantity);
                } else if (cartItem.type === 'bundle') {
                    for (let selectionIndex = 0; selectionIndex < cartItem.selections.length; selectionIndex++) {
                        const selectionProducts = cartItem.selections[selectionIndex].products;
                        // Check that each product is orderable
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
const checkProductOrderable = (stock, qty) => stock.orderable && (stock.qty - stock.qty_booked - qty) >= 0;

/**
 * Function to associate a user with a cart
 * @param {any} cart
 * @param {Express.Request} req
 * @returns {Promise<any>}
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

const updateDelivery = async (datas, removeDeliveryDatas = false) => {
    let cart = {};
    if (removeDeliveryDatas) {
        cart = await Cart.findOneAndUpdate({_id: datas.cartId}, {$unset: {delivery: {}, orderReceipt: ''}}, {new: true});
    } else {
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
        cart                = await Cart.findOneAndUpdate({_id: cartId, status: 'IN_PROGRESS'}, {delivery, 'orderReceipt.method': shipment.type === 'DELIVERY' ? 'delivery' : 'withdrawal'}, {new: true}).populate('customer.id').exec();
        if (!cart) {
            throw NSErrors.CartInactive;
        }
        if (cart.orderReceipt.method === 'delivery') {
            cart.addresses.delivery = cart.customer.id.addresses[cart.customer.id.delivery_address];
            cart.addresses.billing  = cart.customer.id.addresses[cart.customer.id.billing_address];
            await cart.save();
        }
    }
    return {code: 'CART_DELIVERY_UPDATED', data: {cart}};
};

const removeDelivery = async (body) => {
    const cart = await Cart.updateOne({_id: body.cart_id}, {$unset: {delivery: '', 'orderReceipt.method': ''}});
    return cart;
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

const mailPendingCarts = async () => {
    try {
        const config = await Configuration.findOne();
        const now    = moment(new Date());
        if (config.stockOrder.requestMailPendingCarts) {
            const job   = await ServiceJob.getModuleJobByName('Mail to pending carts');
            const limit = moment(new Date());
            limit.subtract(config.stockOrder.requestMailPendingCarts, 'hours');
            let filter = {};
            if (job.attrs.lastRunAt) {
                const lastRunAt = moment(job.attrs.lastRunAt);
                lastRunAt.subtract(config.stockOrder.requestMailPendingCarts, 'hours');
                // $gte <-> min <-> lastRun - requestMailPendingCarts
                // $lte <-> max <-> timeNow - requestMailPendingCarts
                filter = {updatedAt: {$gte: lastRunAt.toISOString(), $lte: limit.toISOString()}, customer: {$exists: true, $ne: null}};
            } else {
                // the 'lastRunAt' value is not set, so we take all carts (the first time)
                filter = {updatedAt: {$lte: limit.toISOString()}, customer: {$exists: true, $ne: null}};
            }
            const carts = await Cart.find(filter);
            let nbMails = 0;
            for (const cart of carts) {
                try {
                    await servicesMail.sendMailPendingCarts(cart);
                    nbMails++;
                } catch (error) {
                    console.error(error);
                    throw error;
                }
            }
            return `Success, ${nbMails} mail(s) sent : ${now.toString()}`;
        }
        return `Success : ${now.toString()}`;
    } catch (error) {
        console.error('mailPendingCarts', error);
        throw error;
    }
};

module.exports = {
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
    validateForCheckout,
    removeDelivery,
    mailPendingCarts
};