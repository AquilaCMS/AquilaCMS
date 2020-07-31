const {authentication, adminAuth} = require('../middleware/authentication');
const ServiceRule                 = require('../services/rules');
const ServicePicto                = require('../services/pictos');

module.exports = function (app) {
    app.post('/v2/picto',           authentication, adminAuth, getPictos);
    app.post('/v2/picto/execRules', authentication, adminAuth, execRules);
    app.post('/v2/picto/:id',       authentication, adminAuth, getPictoById);
    app.put('/v2/picto/:id?',       authentication, adminAuth, savePicto);
    app.delete('/v2/picto/:id',     authentication, adminAuth, deletePicto);
};

/**
 * Fonction retournant un listing de picto
 */
async function getPictos(req, res, next) {
    try {
        const result = await ServicePicto.getPictos(req.body.PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
/**
 * Fonction retournant un picto en fonction de son id
 */
async function getPictoById(req, res, next) {
    try {
        const result = await ServicePicto.getPictoById(
            req.params.id,
            req.body.PostBody
        );
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
/**
 * Fonction pour ajouter ou mettre à jour un picto
 */
async function savePicto(req, res, next) {
    try {
        let result;
        if (req.body._id) {
            result = await ServicePicto.savePicto(req.body);
        } else {
            result = await ServicePicto.createPicto(req.body);
        }
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
/**
 * Fonction supprimant un picto
 */
async function deletePicto(req, res, next) {
    try {
        const result = await ServicePicto.deletePicto({_id: req.params.id});
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

function execRules(req, res, next) {
    try {
        ServiceRule.execRules('picto');
        return res.end();
    } catch (error) {
        return next(error);
    }
}
