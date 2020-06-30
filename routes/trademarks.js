const {middlewareServer}          = require('../middleware');
const {authentication, adminAuth} = require("../middleware/authentication");
const trademarkServices           = require('../services/trademarks');
const {Trademarks, Products}      = require("../orm/models");
const NSErrors                    = require("../utils/errors/NSErrors");
const utils                       = require('../utils/utils');

module.exports = function (app) {
    app.post('/v2/trademarks',      authentication, adminAuth, getTrademarks);
    app.post('/v2/trademark',       authentication, adminAuth, getTrademark);
    app.post('/v2/trademark/:id',   authentication, adminAuth, getTrademarkById);
    app.put("/v2/trademark",        authentication, adminAuth, setTrademark);
    app.delete("/v2/trademark/:id", authentication, adminAuth, deleteTrademark);

    app.post('/trademarks/update', authentication, adminAuth, update); // TODO RV2 : Utilisé dans /admin/#/trademarks/__code__ ==> Ne pas transformer en V2 !

    // Deprecated
    app.get('/trademarks', middlewareServer.deprecatedRoute, list);
    app.get('/trademarks/:id', middlewareServer.deprecatedRoute, detail);
    app.delete('/trademarks/:id', middlewareServer.deprecatedRoute, remove);
    app.post('/trademarks', middlewareServer.deprecatedRoute, save);
};

/**
 * Fonction retournant un listing marque
 */
async function getTrademarks(req, res, next) {
    try {
        const result = await trademarkServices.getTrademarks(req.body.PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Fonction retournant une marque
 */
async function getTrademark(req, res, next) {
    try {
        const result = await trademarkServices.getTrademark(req.body.PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
/**
 * Fonction retournant une marque
 */
async function getTrademarkById(req, res, next) {
    try {
        const result = await trademarkServices.getTrademarkById(req.params.id, req.body.PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
/**
 * Fonction pour ajouter ou mettre à jour une marque
 */
async function setTrademark(req, res, next) {
    try {
        const result = await trademarkServices.saveTrademark(req);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
/**
 * Fonction supprimant une marque
 */
async function deleteTrademark(req, res, next) {
    // On supprime la marque des produits
    try {
        const result = await trademarkServices.deleteTrademark(req);
        return res.json(result);
    } catch (error) {
        return next(error);
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
async function list(req, res, next) {
    try {
        const params = {};
        if (req.query.active === "true") {
            params.$or = [{active: true}, {active: null}];
        }
        const trademarks = await Trademarks.find(params);
        return res.json(trademarks);
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
async function detail(req, res, next) {
    try {
        const trademark = await Trademarks.findOne({_id: req.params.id});
        return res.json(trademark);
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
const save = async (req, res, next) => {
    const newData = {
        name : utils.slugify(req.body.name)
    };
    if (req.body._id === '') {
        try {
            const newTrademark = new Trademarks(newData);
            await newTrademark.save();
            return res.json({status: true});
        } catch (err) {
            return next(err);
        }
    } else {
        let msg;
        try {
            await Trademarks.findOneAndUpdate({_id: req.body._id}, newData, {upsert: true, new: true});
            msg = {status: true};
        } catch (err) {
            msg = {status: false, msg: err.errmsg};
        }
        return res.json(msg);
    }
};

/**
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 * @deprecated
 */
function update(req, res, next) {
    try {
        const newData = {};
        newData[req.body.field] = req.body.value;
        let msg;
        try {
            Trademarks.findOneAndUpdate({_id: req.body._id}, newData, {upsert: true, new: true});
            msg = {status: true};
        } catch (err) {
            msg = {status: false, msg: err.errmsg};
        }
        res.json(msg);

        // TODO should be called or not ?
        if (req.body.field === 'name') {
            Products.updateTrademark(req.body._id, req.body.value);
        }
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
const remove = async (req, res, next) => {
    try {
        // On supprime la marque des produits
        const trademark = await Trademarks.findOne({code: req.params.id});
        if (!trademark) {
            throw NSErrors.NotFound;
        }
        await Products.updateMany({}, {$unset: {trademark: {id: trademark._id}}});
        await Trademarks.deleteOne({_id: trademark._id});
        return res.end();
    } catch (err) {
        return next(err);
    }
};