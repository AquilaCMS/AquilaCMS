const {Cart, Orders, PaymentMethods} = require('../orm/models');
const orderService                   = require('../services/orders');
const ServiceMail                    = require('../services/mail');
const ServiceLanguages               = require('../services/languages');
const ServiceOrder                   = require('../services/orders');
const ServiceAuth                    = require('../services/auth');
const {middlewareServer}             = require('../middleware');
const {authentication, adminAuth}    = require('../middleware/authentication');
const utilsDatabase                  = require('../utils/database');
const NSErrors                       = require('../utils/errors/NSErrors');

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
    app.get('/orders/:id', middlewareServer.deprecatedRoute, detail);
    app.get('/orders/user/:idUser', middlewareServer.deprecatedRoute, authentication, adminAuth, getByClient);
    app.post('/orders/cancel/:id', middlewareServer.deprecatedRoute, authentication, cancelOrder);
    app.put('/orders/status/:id', middlewareServer.deprecatedRoute, authentication, adminAuth, updateStatus);
    app.post('/orders/pay/:orderNumber/:lang?', middlewareServer.deprecatedRoute, authentication, payOrder);
    app.post('/orders/payment', middlewareServer.deprecatedRoute, authentication, adminAuth, updatePayment);
};

/**
 * Fonction retournant un listing des commandes
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 */
async function getOrders(req, res, next) {
    try {
        const PostBodyVerified = await ServiceAuth.validateUserIsAllowed(req.headers.authorization, req.baseUrl, req.body.PostBody, 'customer.id');
        const result           = await ServiceOrder.getOrders(PostBodyVerified);
        return res.json(result);
    } catch (error) {
        next(error);
    }
}

/**
 * Fonction pour ajouter ou mettre à jour une commande
 */
async function setOrder(req, res, next) {
    // On update la commande
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
        const PostBodyVerified = await ServiceAuth.validateUserIsAllowed(req.headers.authorization, req.baseUrl, req.body.PostBody, 'customer.id');
        const result           = await ServiceOrder.getOrder(PostBodyVerified);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Fonction retournant une commande
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 */
async function getOrderById(req, res, next) {
    try {
        const PostBodyVerified = await ServiceAuth.validateUserIsAllowed(req.headers.authorization, req.baseUrl, req.body.PostBody, 'customer.id');
        const result           = await ServiceOrder.getOrderById(req.params.id, PostBodyVerified);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 *
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
        req.body.query = await ServiceAuth.validateUserIsAllowedWithoutPostBody(req.headers.authorization, req.baseUrl, {_id: req.body.idOrder || null}, 'customer.id');
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
 * Permet de mettre à jour le statut d'une commande si cette modification peut être faite manuellement
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
        const result = await orderService.cancelOrderRequest(req.params.id || req.body.id, req.headers.authorization);
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
async function detail(req, res, next) {
    try {
        const tPopulate = ['customer.id', 'items.id'];
        // Si le champs orders.point_of_sale existe alors le module est importé
        if (Orders.schema.path('point_of_sale')) {
            tPopulate.push('point_of_sale');
        }
        const order = await Orders.findOne({_id: req.params.id}).populate(tPopulate);
        if (!order) {
            return next(NSErrors.OrderNotFound);
        }
        await utilsDatabase.populateItems(order.items);
        return res.json(order);
    } catch (err) {
        return next(err);
    }
}

/**
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 * @deprecated
 */
async function getByClient(req, res, next) {
    try {
        const sortObj = {};
        const query = {
            'customer.id' : req.params.idUser
        };
        if (req.query.sort_creationDate) {
            sortObj.creationDate = req.query.sort_creationDate;
        }
        /* if(req.baseUrl === ''){
         query.status = {$nin: ['PAYMENT_PENDING','PAYMENT_CONFIRMATION_PENDING','CANCELED']};
         } */
        const _orders = await Orders.find(query).sort(sortObj).populate('items.id');
        return res.json(_orders);
    } catch (err) {
        return next(err);
    }
}

/**
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 * @deprecated
 */
async function payOrder(req, res, next) {
    const lang = ServiceLanguages.getDefaultLang(req.params.lang);
    const order = await Orders.findOne({number: req.params.orderNumber, status: 'PAYMENT_PENDING', 'customer.id': req.info._id});
    if (!order) {
        return next(NSErrors.OrderNotFound);
    }

    const query = {active: true};
    // Si la commande est associée à un point de vente, alors on recupere les modes de paiement de ce point de vente
    if (order.schema.path('point_of_sale') && order.point_of_sale) {
        query.$or = [{all_points_of_sale: true}, {points_of_sale: order.point_of_sale}];
    }
    // Sinon, on recupere tous les modes de paiement actifs
    try {
        const paymentMethods = await PaymentMethods.find(query);
        // On vérifie que le mode de paiement souhaité est disponible
        const method = paymentMethods.find((method) => method.code === req.body.paymentMethod);
        if (!method) {
            return next(NSErrors.PaymentModeNotAvailable);
        }
        await Orders.findOneAndUpdate({
            number        : req.params.orderNumber,
            status        : 'PAYMENT_PENDING',
            'customer.id' : req.info._id
        },
        {
            $set : {
                status  : 'PAYMENT_RECEIPT_PENDING',
                payment : [createPayment(order, method)]
            }
        });

        if (method.isDeferred) {
            await Cart.deleteOne({_id: order.cartId});
        }

        order.payment = [createPayment(order, method)];

        await order.save();

        try {
            // On envoie la langue par defaut a l'entreprise
            await ServiceMail.sendMailOrderToCompany(order._id);
        } catch (err) {
            console.error('payOrder sendMailOrderToCompany ->', err);
        }
        try {
            await ServiceMail.sendMailOrderToClient(order._id, lang);
        } catch (err) {
            console.error('payOrder sendMailOrderToClient ->', err);
        }

        return res.json(order);
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