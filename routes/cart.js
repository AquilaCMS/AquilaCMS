const mongoose                    = require('mongoose');
const utilsDatabase               = require('../utils/database');
const aquilaEvents                = require('../utils/aquilaEvents');
const NSErrors                    = require('../utils/errors/NSErrors');
const {Cart, ProductSimple}       = require('../orm/models');
const ServiceCart                 = require('../services/cart');
const ServicePromo                = require('../services/promo');
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
    app.get('/cart', middlewareServer.deprecatedRoute, authentication, adminAuth, get);
    app.put('/cart/removeItem', middlewareServer.deprecatedRoute, deleteItem);
    app.put('/cart/item', middlewareServer.deprecatedRoute, addItem);
    app.put('/cart/updateQty', middlewareServer.deprecatedRoute, updateQty);
    app.get('/cart/:id', middlewareServer.deprecatedRoute, getOne);
    app.put('/cart/addresses', middlewareServer.deprecatedRoute, updateAddresses);
    app.put('/cart/delivery', middlewareServer.deprecatedRoute, authentication, updateDelivery);
    app.put('/cart/comment', middlewareServer.deprecatedRoute, updateComment);
};

/**
 * Fonction retournant un listing panier
 */
const getCarts = async (req, res, next) => {
    try {
        return res.status(200).json(await ServiceCart.getCarts(req.body.PostBody));
    } catch (error) {
        return next(error);
    }
};

/**
 * Get cart(s) for this client
 */
const getCartforClient = async (req, res, next) => {
    try {
        return res.status(200).json(await ServiceCart.getCartforClient(req.params.idclient));
    } catch (error) {
        return next(error);
    }
};

/**
 * Fonction retournant un panier
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

//= ====================================================================
//= ========================== Deprecated ==============================
//= ====================================================================

/**
 * @Deprecated
 */
function getJobExpireCarts(req, res) {
    console.log(`Paniers expirés -> Run at ${new Date().getHours()}:${new Date().getMinutes()}:${new Date().getSeconds()}`);
    ServiceCart._expireCarts();
    return res.json({res: 'ok'});
}

/**
 * @Deprecated
 */
const get = async (req, res, next) => {
    let carts;
    try {
        carts = await Cart.find();
    } catch (err) {
        return next(err);
    }
    if (!carts) {
        return next(NSErrors.NotFound);
    }
    res.status(200).json({code: 'GET_LIST_CART_SUCCESS', data: {carts}});
};

/**
 * @Deprecated
 */
async function getOne(req, res, next) {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) return next(NSErrors.InvalidRequest);
        const cart = await Cart.findOne({_id: req.params.id, status: 'IN_PROGRESS'});
        if (!cart) {
            return next(NSErrors.NotFound);
        }
        return res.status(200).json({code: 'GET_CART_SUCCESS', data: {cart}});
    } catch (error) {
        return next(error);
    }
}

/**
 * @Deprecated
 */
async function deleteItem(req, res, next) {
    try {
        const cartOld = await Cart.findById(req.body.cartId);
        let cart = await Cart.findOneAndUpdate({
            _id    : req.body.cartId,
            status : 'IN_PROGRESS'
        }, {$pull: {items: {_id: req.body.itemId}}}, {new: true});
        if (!cart) {
            return next(NSErrors.InactiveCart);
        }
        await ServiceCart.linkCustomerToCart(cart, req);
        // Si des promos sont présents et qu'on supprime un item dans le panier on verifie si le code promo peut toujours être utilisé
        let user = null;
        if (req.headers && req.headers.authorization) {
            user = getDecodedToken(req.headers.authorization);
        }
        cart = await ServicePromo.checkForApplyPromo(user, cart);
        if (req.body.item) {
            if (req.body.item.children && req.body.item.children.length > 0) {
                // On créer un tableau contenant les items du panier qui ne sont pas ces childrens de l'élement que l'on supprime
                const arrayToKeep = cart.items.filter((item) => !req.body.item.children.includes(item._id.toString()));
                cart.items = arrayToKeep;
            }
            if (req.body.item.parent) {
                // On supprime l'id du produit supprimé dans le tableau children de son parent
                const indexFind = cart.items.findIndex((item) => item._id.toString() === req.body.item.parent);
                cart.items[indexFind].children
                    .splice(cart.items.find((item) => item._id.toString() === req.body.item.parent).children
                        .findIndex((item) => item.toString() === req.body.item._id), 1);
            }
            // On gère les stock et reservation panier
            if (global.envConfig.stockOrder.bookingStock === 'panier') {
                const item = cartOld.items.find((_item) => _item._id.toString() === req.body.itemId.toString());
                await ProductSimple.updateOne({_id: item.id}, {$inc: {'stock.qty_booked': -item.quantity}}); // Annulation de la reza
            }
            await cart.save();
            // Event appelé par les modules pour récupérer les modifications dans le panier
            const shouldUpdateCart = aquilaEvents.emit('aqReturnCart');
            if (shouldUpdateCart) {
                cart = await Cart.findOne({_id: cart._id});
            }
            return res.json({
                code : 'CART_DELETE_ITEM_SUCCESS',
                data : {cart}
            });
        }
        // Event appelé par les modules pour récupérer les modifications dans le panier
        const shouldUpdateCart = aquilaEvents.emit('aqReturnCart');
        if (shouldUpdateCart) {
            cart = await Cart.findOne({_id: cart._id});
        }
        return res.json({code: 'CART_DELETE_ITEM_SUCCESS', data: {cart}});
    } catch (err) {
        return next(err);
    }
}

/**
 * @Deprecated
 */
async function updateAddresses(req, res, next) {
    try {
        const result = await ServiceCart.setCartAddresses(req.body.cartId, req.body.addresses);
        await ServiceCart.linkCustomerToCart(result.data.cart, req);
        return res.json(result.data.cart);
    } catch (error) {
        return next(error);
    }
}

/**
 * @Deprecated
 */
async function updateDelivery(req, res, next) {
    try {
        const result = await ServiceCart.updateDelivery(req.body);
        await ServiceCart.linkCustomerToCart(result.data.cart, req);
        return res.send(result.data.cart);
    } catch (err) {
        return next(err);
    }
}

/**
 * @Deprecated
 */
async function removeDiscount(req, res, next) {
    try {
        const result = await ServiceCart.removeDiscount(req.params.cartId);
        return res.json(result.data.cart);
    } catch (err) {
        return next(err);
    }
}