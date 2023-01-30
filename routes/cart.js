/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const NSErrors                         = require('../utils/errors/NSErrors');
const ServiceCart                      = require('../services/cart');
const {authentication, adminAuthRight} = require('../middleware/authentication');

module.exports = function (app) {
    app.post('/v2/carts',  adminAuthRight('cart'), getCarts);
    app.post('/v2/cart/:id', getCartById);
    app.put('/v2/cart/item', addItem);
    app.put('/v2/cart/updateQty', updateQty);
    app.put('/v2/cart/to/order', authentication, setCartToOrder);
    app.delete('/v2/cart/:cartId/item/:itemId', deleteCartItem);
    app.get('/v2/cart/user/:idclient',  adminAuthRight('cart'), getCartforClient);
    app.delete('/v2/cart/discount/:cartId', removeDiscount);
    app.put('/v2/cart/addresses', updateAddresses);
    app.put('/v2/cart/delivery', authentication, updateDelivery);
    app.put('/v2/cart/comment', updateComment);
};

/**
 * POST /api/v2/carts
 * @summary Listing of carts
 */
const getCarts = async (req, res, next) => {
    try {
        return res.status(200).json(await ServiceCart.getCarts(req.body.PostBody));
    } catch (error) {
        return next(error);
    }
};

/**
 * GET /api/v2/cart/user/{idclient}
 * @summary Get cart(s) for this client
 */
const getCartforClient = async (req, res, next) => {
    try {
        return res.status(200).json(await ServiceCart.getCartforClient(req.params.idclient));
    } catch (error) {
        return next(error);
    }
};

/**
 * POST /api/v2/cart/{id}
 * @summary Get cart by id
 */
const getCartById = async (req, res, next) => {
    try {
        const result = await ServiceCart.getCartById(req.params.id, req.body.PostBody, req.info);
        if (result) {
            return res.json(result);
        }
        return next(NSErrors.CartNotFound);
    } catch (error) {
        return next(error);
    }
};

/**
 * POST /api/v2/cart/to/order
 * @summary Transform cart to order
 */
async function setCartToOrder(req, res, next) {
    try {
        const result = await ServiceCart.cartToOrder(req.body.cartId, req.info, req.body.lang);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * DELETE /api/v2/cart/{cartId}/item/{itemId}
 * @summary Delete an item in cart
 */
async function deleteCartItem(req, res, next) {
    try {
        const result = await ServiceCart.deleteCartItem(req.params.cartId, req.params.itemId, req.info);
        return res.json(result.data.cart);
    } catch (error) {
        return next(error);
    }
}

/**
 * PUT /api/v2/cart/item
 * @summary Add an item in cart
 */
const addItem = async (req, res, next) => {
    // Check if user has cart in progress
    // YES : add product
    // NO : create and add
    try {
        const result = await ServiceCart.addItem(req.body, req.info, req.headers.lang);
        if (result && result.data && result.data.cart) {
            return res.json(result.data.cart);
        }
        return res.status(400).json(result);
    } catch (e) {
        next(e);
    }
};

/**
 * PUT /api/v2/cart/updateQty
 * @summary Update an item quantity in cart
 */
async function updateQty(req, res, next) {
    try {
        const result = await ServiceCart.updateQty(req.body, req.info);
        if (result.data) {
            return res.json(result.data.cart);
        }
        return res.status(result.status).json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * PUT /api/v2/cart/comment
 * @summary Update comment in cart
 */
async function updateComment(req, res, next) {
    try {
        const result = await ServiceCart.setComment(req.body.cartId, req.body.comment, req.info);
        await ServiceCart.linkCustomerToCart(result.data.cart, req.info);
        return res.json(result.data.cart);
    } catch (error) {
        return next(error);
    }
}

/**
 * PUT /api/v2/cart/addresses
 * @summary Update address in cart
 */
async function updateAddresses(req, res, next) {
    try {
        const result = await ServiceCart.setCartAddresses(req.body.cartId, req.body.addresses, req.info);
        await ServiceCart.linkCustomerToCart(result.data.cart, req.info);
        return res.json(result.data.cart);
    } catch (error) {
        return next(error);
    }
}

/**
 * PUT /api/v2/cart/delivery
 * @summary Update delivery address in cart
 */
async function updateDelivery(req, res, next) {
    try {
        const result = await ServiceCart.updateDelivery(req.body, req.query ? req.query.removeDeliveryDatas : false);
        await ServiceCart.linkCustomerToCart(result.data.cart, req.info);
        return res.send(result.data.cart);
    } catch (err) {
        return next(err);
    }
}

/**
 * DELETE /v2/cart/discount/{cartId}
 * @summary Remove discount in cart
 */
async function removeDiscount(req, res, next) {
    try {
        const result = await ServiceCart.removeDiscount(req.params.cartId);
        return res.json(result.data.cart);
    } catch (err) {
        return next(err);
    }
}
