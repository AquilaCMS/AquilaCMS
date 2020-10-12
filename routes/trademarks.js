const {authentication, adminAuth} = require('../middleware/authentication');
const trademarkServices           = require('../services/trademarks');

module.exports = function (app) {
    app.post('/v2/trademarks',      authentication, adminAuth, getTrademarks);
    app.post('/v2/trademark',       authentication, adminAuth, getTrademark);
    app.post('/v2/trademark/:id',   authentication, adminAuth, getTrademarkById);
    app.put('/v2/trademark',        authentication, adminAuth, setTrademark);
    app.delete('/v2/trademark/:id', authentication, adminAuth, deleteTrademark);
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
