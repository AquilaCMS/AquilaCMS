const utilsDatabase               = require('../utils/database');
const NSErrors                    = require('../utils/errors/NSErrors');
const ServiceCart                 = require('../services/cart');
const {getDecodedToken}           = require('../services/auth');
const {authentication, adminAuth} = require('../middleware/authentication');
const {middlewareServer}          = require('../middleware');

module.exports = function (app) {
    app.post('/v2/carts',  authentication, adminAuth, getCarts);
    app.post('/v2/cart/:id', getCartById);
    app.put('/v2/cart/item', addItem);
    app.put('/v2/cart/updateQty', updateQty);
    app.put('/v2/cart/to/order', authentication, setCartToOrder);
    app.delete('/v2/cart/:cartId/item/:itemId', deleteCartItem);
    app.get('/v2/cart/user/:idclient',  authentication, adminAuth, getCartforClient);
    app.delete('/v2/cart/discount/:cartId', removeDiscount);
    app.put('/v2/cart/addresses', updateAddresses);
    app.put('/v2/cart/delivery', authentication, updateDelivery);
    app.put('/v2/cart/comment', updateComment);

    // Deprecated
    app.get('/v2/cart/checkcart/expire', middlewareServer.deprecatedRoute, getJobExpireCarts);
    app.put('/cart/comment', middlewareServer.deprecatedRoute, updateComment);
};

/**
 * POST /api/v2/carts
 * @tags Cart
 * @summary Listing of carts
 * @security api_key
 * @param {PostBody} request.body.required - PostBody
 */
const getCarts = async (req, res, next) => {
    try {
        return res.status(200).json(await ServiceCart.getCarts(req.body.PostBody));
    } catch (error) {
        return next(error);
    }
};

/**
 * GET /v2/cart/user/{idclient}
 * @tags Cart
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
 * Post /api/v2/cart/:id
 * @tags Cart
 * @summary Get cart by id
 */
const getCartById = async (req, res, next) => {
    try {
        let user;
        if (req.headers.authorization) {
            const userInfo = getDecodedToken(req.headers.authorization);
            if (userInfo) {
                user = userInfo.info;
            }
        }
        const result = await ServiceCart.getCartById(req.params.id, req.body.PostBody, user, req.body.lang, req);
        if (result) {
            await utilsDatabase.populateItems(result.items);
            return res.json(result);
        }
        return next(NSErrors.CartNotFound);
    } catch (error) {
        return next(error);
    }
};

async function setCartToOrder(req, res, next) {
    try {
        const result = await ServiceCart.cartToOrder(req.body.cartId, req.info, req.body.lang);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Fonction supprimant un panier
 */
async function deleteCartItem(req, res, next) {
    try {
        const result = await ServiceCart.deleteCartItem(req.params.cartId, req.params.itemId);
        return res.json(result.data.cart);
    } catch (error) {
        return next(error);
    }
}

const addItem = async (req, res, next) => {
    // Check if user has cart in progress
    // YES : add product
    // NO : create and add
    try {
        const result = await ServiceCart.addItem(req);
        if (result.data.cart) {
            return res.json(result.data.cart);
        }
        return res.status(400).json(result);
    } catch (e) {
        next(e);
    }
};

async function updateQty(req, res, next) {
    try {
        const result = await ServiceCart.updateQty(req);
        if (result.data) {
            return res.json(result.data.cart);
        }
        return res.status(result.status).json(result);
    } catch (error) {
        return next(error);
    }
}

async function updateComment(req, res, next) {
    try {
        const result = await ServiceCart.setComment(req.body.cartId, req.body.comment);
        await ServiceCart.linkCustomerToCart(result.data.cart, req);
        return res.json(result.data.cart);
    } catch (error) {
        return next(error);
    }
}

async function updateAddresses(req, res, next) {
    try {
        const result = await ServiceCart.setCartAddresses(req.body.cartId, req.body.addresses);
        await ServiceCart.linkCustomerToCart(result.data.cart, req);
        return res.json(result.data.cart);
    } catch (error) {
        return next(error);
    }
}

async function updateDelivery(req, res, next) {
    try {
        const result = await ServiceCart.updateDelivery(req.body);
        await ServiceCart.linkCustomerToCart(result.data.cart, req);
        return res.send(result.data.cart);
    } catch (err) {
        return next(err);
    }
}

async function removeDiscount(req, res, next) {
    try {
        const result = await ServiceCart.removeDiscount(req.params.cartId);
        return res.json(result.data.cart);
    } catch (err) {
        return next(err);
    }
}

//= ====================================================================
//= ========================== Deprecated ==============================
//= ====================================================================

/**
 * PUT /api/cart/comment
 * @tags Cart
 * @deprecated
 */

/**
 * GET /api/v2/cart/checkcart/expire
 * @tags Cart
 * @deprecated
 */
function getJobExpireCarts(req, res) {
    console.log(`Paniers expirés -> Run at ${new Date().getHours()}:${new Date().getMinutes()}:${new Date().getSeconds()}`);
    ServiceCart._expireCarts();
    return res.json({res: 'ok'});
}
