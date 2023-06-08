/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const moment                                     = require('moment');
const mongoose                                   = require('mongoose');
const {aquilaEvents, populateItems, aquilaHooks} = require('aql-utils');
const QueryBuilder                               = require('../utils/QueryBuilder');
const NSErrors                                   = require('../utils/errors/NSErrors');
const servicesLanguages                          = require('./languages');
const ServicePromo                               = require('./promo');
const ServiceShipment                            = require('./shipment');
const ServicesProducts                           = require('./products');
const servicesTerritory                          = require('./territory');
const servicesMail                               = require('./mail');
const ServiceJob                                 = require('./job');
const {
    Cart,
    Orders,
    Products,
    Configuration
} = require('../orm/models');

const restrictedFields = [];
const defaultFields    = ['_id', 'delivery', 'status', 'items', 'promos', 'orderReceipt', 'customer'];
const queryBuilder     = new QueryBuilder(Cart, restrictedFields, defaultFields);

const getCarts = async (PostBody) => queryBuilder.find(PostBody);

/**
 * Get cart(s) for this client
 * @returns {Promise<mongoose.Document>}
 */
const getCartforClient = async (idclient) => Cart.find({'customer.id': mongoose.Types.ObjectId(idclient)});

const getCartById = async (id, PostBody = null, user = null) => {
    if (PostBody && PostBody.structure) {
        // Need to have all the fields for the discount rules
        const structure = PostBody.structure;
        delete PostBody.structure;
        if (structure.score) {
            PostBody.structure = {score: structure.score};
        }
        queryBuilder.defaultFields = ['*'];
    }
    if (!PostBody) PostBody = {};
    PostBody.filter = {
        ...PostBody.filter,
        _id : mongoose.Types.ObjectId(id)
    };

    let cart = await queryBuilder.findOne(PostBody);

    if (cart) {
        // if the cart belongs to a customer and none is login
        if (cart.customer?.email && !user) {
            return null;
        }

        if (user && !user.isAdmin) {
            cart = await linkCustomerToCart(cart, user);
        }
        return cart.getItemsStock();
    }
    return cart;
};

/**
 * Updates the delivery and / or billing address of a cart
 * @param {*} cartId cart's id
 * @param {*} addresses delivery and / or billing address
 */
const setCartAddresses = async (cartId, addresses, userInfo) => {
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
        // Force matching current user and the cart's customer
        const filter = {
            _id : mongoose.Types.ObjectId(cartId),
            ...(userInfo?.isAdmin ? {} : {'customer.id': (userInfo?._id)})
        };

        resp = await Cart.findOneAndUpdate(filter, {$set: {...update}}, {new: true});
        if (!resp) {
            const newCart = await Cart.create(update);
            await populateItems(newCart.items);
            return {code: 'CART_CREATED', data: {cart: await newCart.getItemsStock()}};
        }

        // Check if products exists in the cart
        resp = await checkCartProductsExist(resp);

        await populateItems(resp.items);
        return {code: 'CART_UPDATED', data: {cart: await resp.getItemsStock()}};
    } catch (err) {
        console.error(err);
        throw err;
    }
};

const setComment = async (cartId, comment, userInfo) => {
    // Force matching current user and the cart's customer
    const filter = {
        _id : mongoose.Types.ObjectId(cartId),
        ...(userInfo?.isAdmin ? {} : {'customer.id': (userInfo?._id)})
    };
    let resp     = await Cart.findOneAndUpdate(filter, {comment}, {new: true});
    if (!resp) return {code: 'CART_UPDATE_COMMENT_SUCCESS', data: {cart: null}};

    // Check if products exists in the cart
    resp = await checkCartProductsExist(resp);

    return {code: 'CART_UPDATE_COMMENT_SUCCESS', data: {cart: await resp.getItemsStock()}};
};

const deleteCartItem = async (cartId, itemId, userInfo) => {
    // Force matching current user and the cart's customer
    const filter = {
        _id : mongoose.Types.ObjectId(cartId),
        ...(userInfo?.isAdmin ? {} : {'customer.id': (userInfo?._id)})
    };

    let cart = await Cart.findOne(filter);

    if (!cart) throw NSErrors.CartNotFound;
    filter.status = 'IN_PROGRESS';
    cart          = await Cart.findOne(filter);
    if (!cart) throw NSErrors.CartInactive;

    // Check if products exists in the cart
    cart = await checkCartProductsExist(cart);

    const itemIndex = cart.items.findIndex((item) => item._id.toString() === itemId);
    if (itemIndex > -1) {
        if (global.aquila.envConfig.stockOrder.bookingStock === 'panier') {
            const ServicesProducts = require('./products');
            const cartItem         = cart.items[itemIndex];
            if (cartItem.type === 'simple') {
                await ServicesProducts.updateStock(cartItem.id, cartItem.quantity, undefined, cartItem.selected_variant);
            } else if (cartItem.type === 'bundle') {
                for (let i = 0; i < cartItem.selections.length; i++) {
                    const selectionProducts = cartItem.selections[i].products;
                    // we check that each product is orderable
                    for (let j = 0; j < selectionProducts.length; j++) {
                        const selectionProduct = await Products.findOne({_id: selectionProducts[j].id});
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
    }
    await populateItems(cart.items);
    const products        = cart.items.map((product) => product.id);
    const productsCatalog = await ServicePromo.checkPromoCatalog(products, userInfo, undefined, false);
    if (productsCatalog) {
        for (let i = 0; i < cart.items.length; i++) {
            let itemCart = cart.items[i];
            if (itemCart.type !== 'bundle' && !itemCart.selected_variant) cart = await ServicePromo.applyPromoToCartProducts(productsCatalog, cart, i);
            itemCart      = await aquilaHooks('aqGetCartItem', {item: itemCart, PostBody: undefined, cart}, async () => itemCart);
            cart.items[i] = itemCart;
        }
        cart = await ServicePromo.checkQuantityBreakPromo(cart, userInfo, undefined, false);
    }

    cart = await ServicePromo.checkForApplyPromo(userInfo, cart);
    await cart.save();
    aquilaEvents.emit('aqReturnCart');
    cart = await Cart.findOne({_id: cart._id});
    await populateItems(cart.items);
    return {code: 'CART_ITEM_DELETED', data: {cart: await cart.getItemsStock()}};
};

const addItem = async (postBody, userInfo, lang = '') => {
    // Force matching current user and the cart's customer
    const filter = {
        status : 'IN_PROGRESS',
        _id    : mongoose.Types.ObjectId(postBody.cartId),
        ...(userInfo?.isAdmin ? {} : {'customer.id': (userInfo?._id)})
    };

    let cart = await Cart.findOne(filter).populate('items.id');
    if (!cart) {
        cart = await Cart.create({status: 'IN_PROGRESS'});
    }

    const _product = await Products.findOne({_id: postBody.item.id, active: true});

    let variant;
    await linkCustomerToCart(cart, userInfo);
    if (!_product || (_product.type === 'simple' && (!_product.stock?.orderable || _product.stock?.date_selling > Date.now()))) { // TODO : check if product is orderable with real function (stock control, etc)
        return {code: 'NOTFOUND_PRODUCT', message: 'Le produit est indisponible.'}; // res status 400
    }

    // Check if products exists in the cart
    cart = await checkCartProductsExist(cart);

    const _lang = await servicesLanguages.getDefaultLang(lang);

    if (_product.hasVariantsValue(_product) && !postBody.item.selected_variant) {
        throw NSErrors.InvalidParameters;
    } else if (_product.hasVariantsValue(_product) && typeof !postBody.item.selected_variant) {
        // we set variant in the cart !
        // quick check if all mandatory options are present
        const isPresent = _product.variants_values.findIndex((oneVariant) => postBody.item.selected_variant._id.toString() === oneVariant._id.toString());
        if (isPresent === -1 ) {
            throw NSErrors.InvalidParameters;
        } else {
            postBody.item.selected_variant.id = postBody.item.selected_variant._id;
            variant                           = _product.variants_values[isPresent];
        }
    }
    if (cart.items && cart.items.length) {
        if (typeof cart.items.toObject === 'function') {
            const indexes     = cart.items.toObject()
                .map((val, index) => ({val, index}))
                .filter(({val}) => val.id._id.toString() === _product._id.toString())
                .map(({index}) => index);
            let isANewProduct = false;
            for (const index of indexes) {
                if (
                    cart.items[index].type === 'bundle'
            && JSON.stringify(cart.items[index].selections.toObject().map((elem) => ({bundle_section_ref: elem.bundle_section_ref, products: [elem.products[0]._id.toString()]}))) !== JSON.stringify(postBody.item.selections)
                // eslint-disable-next-line no-empty
                ) {
                    continue;
                } else {
                    if (
                        (
                            postBody.item.selected_variant?._id?.toString() === cart.items[index].selected_variant?.id?.toString()     // <== this check if the 2 products got the same selected variant
                        ) || (
                            typeof postBody.item.selected_variant === 'undefined' && typeof cart.items[index].selected_variant === 'undefined'      // <== this check if the 2 products got no selected variants
                        )
                    ) {
                        // then it's the same product in the cart
                        isANewProduct = index;
                        break;
                    } else {
                        // else, it's a new product in the cart
                        isANewProduct = true;
                    }
                }
            }
            if (typeof isANewProduct === 'number') {
                postBody.item._id = cart.items[isANewProduct]._id.toString();

                postBody.item.quantity += cart.items[isANewProduct].quantity;

                delete postBody.item.id;

                delete postBody.item.weight;

                return updateQty(postBody, userInfo);
            }
        }
    }
    if (_product.translation[_lang]) {
        postBody.item.name = _product.translation[_lang].name;
        postBody.item.slug = _product.translation[_lang].slug;
    }
    postBody.item.code  = _product.code;
    postBody.item.image = require('../utils/medias').getProductImageId(variant || _product);
    const idGift        = mongoose.Types.ObjectId();
    if (postBody.item.parent) {
        postBody.item._id = idGift;
    }

    let item = {
        ...postBody.item,
        weight       : _product.weight,
        price        : _product.price,
        description1 : _product.translation[_lang].description1,
        description2 : _product.translation[_lang].description2,
        canonical    : _product.translation[_lang].canonical,
        attributes   : _product.attributes
    };

    if (_product.type !== 'virtual') {
        item.stock = _product.stock;
    } else {
        item.filename      = _product.filename;
        item.downloadInfos = _product.downloadInfos;
    }
    if (_product.type === 'bundle') item.bundle_sections = _product.bundle_sections;
    if (item.selected_variant) item.selected_variant.id = item.selected_variant._id;

    // Here you can change any information of a product before adding it to the user's cart
    item = await aquilaHooks('aqAddToCart', {item, postBody, userInfo}, async () => item);

    await _product.addToCart(cart, item, userInfo, _lang);
    const data = await Cart.findOne({_id: cart._id}).populate('items.id');
    if (data && data.code) {
        return {code: data.code, data: {error: data}}; // res status 400
    }
    cart = data;
    await populateItems(cart.items);
    const products        = cart.items.map((product) => product.id);
    const productsCatalog = await ServicePromo.checkPromoCatalog(products, userInfo, _lang, false);
    if (productsCatalog) {
        for (let i = 0; i < cart.items.length; i++) {
            let itemCart = cart.items[i];
            if (itemCart.type !== 'bundle' && !itemCart.selected_variant) cart = await ServicePromo.applyPromoToCartProducts(productsCatalog, cart, i);
            itemCart      = await aquilaHooks('aqGetCartItem', {item: itemCart, PostBody: postBody, cart}, async () => itemCart);
            cart.items[i] = itemCart;
        }
        cart = await ServicePromo.checkQuantityBreakPromo(cart, userInfo, _lang, false);
    }
    cart           = await ServicePromo.checkForApplyPromo(postBody, cart, _lang);
    const _newCart = await cart.save();
    if (postBody.item.parent) {
        _newCart.items.find((item) => item._id.toString() === postBody.item.parent).children.push(idGift);
    }
    await _newCart.save();
    aquilaEvents.emit('aqReturnCart');
    cart = await Cart.findOne({_id: _newCart._id});
    await populateItems(cart.items);
    return {code: 'CART_ADD_ITEM_SUCCESS', data: {cart: await cart.getItemsStock()}};
};

const updateQty = async (postBody, userInfo) => {
    if (!postBody.item || postBody.item.quantity <= 0) {
        return {code: 'BAD_REQUEST', status: 400}; // res status 400
    }
    // Force matching current user and the cart's customer
    const filter = {
        status : 'IN_PROGRESS',
        _id    : mongoose.Types.ObjectId(postBody.cartId),
        ...(userInfo?.isAdmin ? {} : {'customer.id': (userInfo?._id)})
    };
    let cart     = await Cart.findOne(filter);
    if (!cart) {
        throw NSErrors.InactiveCart;
    }

    // Check if products exists in the cart
    cart = await checkCartProductsExist(cart);
    if (cart.items.length) {
        const item = cart.items.find((item) => item._id.toString() === postBody.item._id.toString());
        if (item) {
            const _product = await Products.findOne({_id: item.id});
            if (_product) {
                if (global.aquila.envConfig.stockOrder.bookingStock === 'panier') {
                    const ServicesProducts = require('./products');

                    const quantityToAdd = postBody.item.quantity - item.quantity;
                    if (_product.type === 'simple') {
                        if (
                            quantityToAdd > 0
                            && !(await ServicesProducts.checkProductOrderable(_product.stock, quantityToAdd, item.selected_variant)).ordering.orderable
                        ) {
                            throw NSErrors.ProductNotInStock;
                        }
                        // quantity reservation
                        await ServicesProducts.updateStock(_product._id, -quantityToAdd, undefined, item.selected_variant);
                    } else if (_product.type === 'bundle') {
                        for (let i = 0; i < item.selections.length; i++) {
                            const selectionProducts = item.selections[i].products;
                            // we check that each product is orderable
                            for (let j = 0; j < selectionProducts.length; j++) {
                                const selectionProduct = await Products.findOne({_id: selectionProducts[j].id});
                                if (selectionProduct.type === 'simple') {
                                    if (
                                        quantityToAdd > 0
                                        && !ServicesProducts.checkProductOrderable(selectionProduct.stock, quantityToAdd, item.selected_variant).ordering.orderable
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
                // await servicesProducts.handleStock(item, _product, postBody.item.quantity);
                cart = await Cart.findOneAndUpdate({_id: cart._id}, {
                    $set : {'items.$[item].quantity': postBody.item.quantity}
                }, {
                    arrayFilters : [{'item._id': postBody.item._id}],
                    new          : true
                });
            }
        }
        await linkCustomerToCart(cart, userInfo);
        await populateItems(cart.items);
        const products        = cart.items.map((product) => product.id);
        const productsCatalog = await ServicePromo.checkPromoCatalog(products, userInfo, undefined, false);
        if (productsCatalog) {
            for (let i = 0; i < cart.items.length; i++) {
                let itemCart = cart.items[i];
                if (itemCart.type !== 'bundle' && !itemCart.selected_variant) cart = await ServicePromo.applyPromoToCartProducts(productsCatalog, cart, i);
                itemCart      = await aquilaHooks('aqGetCartItem', {item: itemCart, PostBody: postBody, cart}, async () => itemCart);
                cart.items[i] = itemCart;
            }
            cart = await ServicePromo.checkQuantityBreakPromo(cart, userInfo, undefined, false);
        }
        cart = await ServicePromo.checkForApplyPromo(userInfo, cart);
    }
    await cart.save();
    // Event called by the modules to retrieve the modifications in the cart
    aquilaEvents.emit('aqReturnCart');
    cart = await Cart.findOne({_id: cart._id});
    await populateItems(cart.items);
    return {code: 'CART_ADD_ITEM_SUCCESS', data: {cart: await cart.getItemsStock()}};
};

// Check if products in cart exist
// Return the cart with only existing products
const checkCartProductsExist = async (cart) => {
    const products  = cart.items.map((item) => item.id);
    const _products = await Products.find({_id: {$in: products}});
    // Delete products that don't exist anymore & disabled products
    let save   = false;
    cart.items = cart.items.filter((item) => {
        const _product = _products.find((product) => product._id.toString() === item.id?._id?.toString() || product._id.toString() === item.id?.toString());
        if (!_product || !_product.active) {
            save = true;
            return false;
        }
        return true;
    });
    if (save) {
        await cart.save();
    }
    return cart;
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
                    const {websiteCountry} = global.aquila.envConfig.environment;
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
    const {orderStatuses} = require('./orders');

    try {
        const _cart = await Cart.findOne({_id: cartId, status: 'IN_PROGRESS'});
        if (!_cart) {
            throw NSErrors.CartInactive;
        }
        aquilaEvents.emit('cartToOrder', _cart);
        lang = await servicesLanguages.getDefaultLang(lang);
        // We validate the basket data
        const result = await validateForCheckout(_cart);
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
        const {bookingStock} = global.aquila.envConfig.stockOrder;
        if (bookingStock === 'commande') {
            for (let i = 0; i < _cart.items.length; i++) {
                const cartItem = _cart.items[i];
                const _product = await Products.findOne({_id: cartItem.id});
                if (_product.type === 'simple') {
                    if ((_product.stock.orderable) === false) {
                        throw NSErrors.ProductNotOrderable;
                    }
                    // we book the stock
                    await ServicesProducts.updateStock(_product._id, -cartItem.quantity, undefined, cartItem.selected_variant);
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
            items : cartObj.items.filter((it) => it.quantity > 0).map(function ({stock, ...rest}) {
                return {...rest};
            }),
            promos         : cartObj.promos,
            cartId         : cartObj._id,
            quantityBreaks : cartObj.quantityBreaks,
            discount       : cartObj.discount,
            addresses      : cartObj.addresses,
            delivery       : cartObj.delivery,
            lang,
            // if priceTotal === 0, then the order is set to status 'PAID'
            status         : (priceTotal.ati === 0 ? orderStatuses.PAID : orderStatuses.PAYMENT_PENDING),
            priceTotal,
            priceSubTotal,
            comment        : cartObj.comment,
            historyStatus  : [{status: (priceTotal.ati === 0 ? orderStatuses.PAID : orderStatuses.PAYMENT_PENDING), date: moment(new Date())}],
            customer       : {
                ..._user,
                id : _user._id
            },
            orderReceipt    : cartObj.orderReceipt,
            additionnalFees : cartObj.additionnalFees
        };
        delete newOrder._id;
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
        aquilaEvents.emit('postCartToOrder', _cart);

        return {code: 'ORDER_CREATED', data: createdOrder};
    } catch (err) {
        await Cart.updateOne({_id: cartId}, {$set: {status: 'IN_PROGRESS'}});
        throw err;
    }
};

const removeOldCarts = async () => {
    const {bookingStock} = global.aquila.envConfig.stockOrder;
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
                    await ServicesProducts.updateStock(cartItem.id, cartItem.quantity, undefined, cartItem.selected_variant);
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
const checkProductOrderable = (stock, qty, selected_variant = undefined) => {
    if (selected_variant) {
        return selected_variant.stock.orderable && (selected_variant.stock.qty - selected_variant.stock.qty_booked - qty) >= 0;
    }
    return stock.orderable && (stock.qty - stock.qty_booked - qty) >= 0;
};

/**
 * Function to associate a user with a cart
 * @param {any} cart
 * @param {Object} User info
 * @returns {Object} cart
 */
const linkCustomerToCart = async (cart, userInfo) => {
    if (cart && (!cart.customer || !cart.customer.id)) {
        const user = userInfo;
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
    cart     = await Cart.findOne({_id: datas.cartId});
    // Check if products exists in the cart
    cart = await checkCartProductsExist(cart);

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
    return {code: 'CART_DELIVERY_UPDATED', data: {cart: await cart.getItemsStock()}};
};

const removeDelivery = async (body) => {
    const cart = await Cart.updateOne({_id: body.cart_id}, {$unset: {delivery: '', 'orderReceipt.method': ''}});
    return cart.getItemsStock();
};

const removeDiscount = async (id) => {
    let updCart = await Cart.findOneAndUpdate({_id: id, status: 'IN_PROGRESS'}, {$pop: {promos: 1}}, {new: true});
    if (!updCart) {
        throw NSErrors.InactiveCart;
    }
    // Check if products exists in the cart
    updCart = await checkCartProductsExist(updCart);
    return {code: 'CART_DISCOUNT_REMOVE', data: {cart: await updCart.getItemsStock()}};
};

const validateForCheckout = async (cart) => {
    if (!cart.orderReceipt || !cart.orderReceipt.method) {
        return {code: 'NOTFOUND_RECEIPT_METHOD', message: 'Mode de réception de commande non indiqué.'};
    }
    // Check if cart items are available
    const products  = cart.items.map((item) => item.id);
    const _products = await Products.find({_id: {$in: products}});
    // Delete products that don't exist anymore & disabled products
    let save   = false;
    cart.items = cart.items.filter((item) => {
        const _product = _products.find((product) => product._id.toString() === item.id.toString());
        if (!_product || !_product.active) {
            save = true;
            return false;
        }
        return true;
    });
    if (save) {
        await cart.save();
        return {code: 'NOTAVAILABLE_PRODUCTS_FOR_ORDER', message: 'Un ou plusieurs produits ne sont plus disponibles.'};
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
                    // Verify that an order has not already been generated after the creation of the cart
                    const orders = await Orders.find({createdAt: {$gte: cart.createdAt}, 'customer.id': cart.customer.id});
                    if (!orders || orders.length === 0) {
                        await servicesMail.sendMailPendingCarts(cart);
                        nbMails++;
                    }
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
    checkCartProductsExist,
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