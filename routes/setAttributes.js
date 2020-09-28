const setAttributeServices        = require('../services/setAttributes');
const {authentication, adminAuth} = require('../middleware/authentication');

module.exports = function (app) {
    app.post('/v2/setAttributes', getSetAttributes);
    app.post('/v2/setAttribute', getSetAttribute);
    app.put('/v2/setAttribute', authentication, adminAuth, setSetAttribute);
    app.delete('/v2/setAttribute/:id', authentication, adminAuth, deleteSetAttribute);
};

/**
 * Fonction retournant un listing de jeux d'attributs
 */
async function getSetAttributes(req, res, next) {
    try {
        const result = await setAttributeServices.getSetAttributes(req.body.PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
/**
 * Fonction retournant un jeu d'attributs
 */
async function getSetAttribute(req, res, next) {
    try {
        const result = await setAttributeServices.getSetAttribute(req.body.PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
/**
 * Fonction pour ajouter ou mettre à jour un jeu d'attributs
 */
async function setSetAttribute(req, res, next) {
    try {
        // La route ne semble pas contenir de modification de setAttributes
        const result = await setAttributeServices.createOrUpdateSetAttribute(req);
        res.json(result);
    } catch (error) {
        return next(error);
    }
}
/**
 * Fonction supprimant un jeu d'attributs
 */
async function deleteSetAttribute(req, res, next) {
    try {
        const result = await setAttributeServices.deleteSetAttribute(req);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
