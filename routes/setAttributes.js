const {SetAttributes, Attributes, Products} = require('../orm/models');
const setAttributeServices                  = require('../services/setAttributes');
const {middlewareServer}                    = require('../middleware');
const {authentication, adminAuth}           = require('../middleware/authentication');
const NSErrors                              = require('../utils/errors/NSErrors');

module.exports = function (app) {
    app.post('/v2/setAttributes', getSetAttributes);
    app.post('/v2/setAttribute', getSetAttribute);
    app.put('/v2/setAttribute', authentication, adminAuth, setSetAttribute);
    app.delete('/v2/setAttribute/:id', authentication, adminAuth, deleteSetAttribute);

    // Deprecated
    app.get('/setAttributes', middlewareServer.deprecatedRoute, list);
    app.get('/setAttributes/:code', middlewareServer.deprecatedRoute, detail);
    app.post('/setAttributes/', middlewareServer.deprecatedRoute, authentication, adminAuth, save);
    app.delete('/setAttributes/:code', middlewareServer.deprecatedRoute, authentication, adminAuth, remove);
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
    if (req.query.type) {
        if (req.query.type === 'products') {
            req.query.type = {$in: ['products', null]};
        }
    }  else {
        req.query.type = {$in: ['products', null]};
    }
    try {
        const setAttributes = await SetAttributes.find(req.query);
        res.json(setAttributes);
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
        const setAttribute = await SetAttributes.findOne({code: req.params.code}).populate('attributes');
        if (!setAttribute) {
            return next(NSErrors.SetAttributeNotFound);
        }
        res.json(setAttribute);
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
async function save(req, res, next) {
    try {
        const code = req.body.code.replace(/[^A-Z0-9]+/ig, '_');
        const {name, update : updateF, questions, type} = req.body;
        const setAttribute = await SetAttributes.findOne({code});
        if (setAttribute && updateF) {
            const setAttr = await SetAttributes.findOneAndUpdate({code}, {name, questions, type}, {new: true});
            let tQuestions = [];
            if (setAttr.questions.length) {
                tQuestions = setAttr.questions.map((question) => ({idQuestion: question._id, translation: question.translation}));
            }
            // On met a jour les produits ayant le set_attributes qui vient de changer, et on set les nouvelles questions des reviews
            // Cela aura pour effet de supprimer les anciennes notes, nous devons donc les recalculer
            await Products.updateMany({set_attributes: setAttribute.id}, {$set: {'reviews.questions': tQuestions}});
            const tProducts = await Products.find({set_attributes: setAttribute.id});
            const tPromises = [];
            for (let i = 0; i < tProducts.length; i++) {
                const product = tProducts[i];
                require('../services/reviews').computeAverageRateAndCountReviews(product);
                tPromises.push(product.save());
            }
            await Promise.all(tPromises);
            // Nous recalculons les notes moyennes par question
            return res.send({status: true});
        }
        if (setAttribute && !updateF) {
            return res.send({alreadyExist: true});
        }
        await SetAttributes.create({code, name, questions, type});
        return res.send({status: true});
    } catch (error) {
        return next(error);
    }
}

/**
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 * @deprecated
 */
async function remove(req, res, next) {
    try {
        const setAttr = await SetAttributes.findOne({code: req.params.code});
        if (!setAttr) return res.status(404).send(`Le jeu d'attributs ${req.params.code} n'existe pas.`);
        const product = await Products.findOne({set_attributes: setAttr._id});
        if (product) return res.status(403).send('Un produit est lié à ce jeu d\'attributs. Vous ne pouvez pas le supprimer.');
        await setAttr.remove();
        await Attributes.updateMany({}, {$pull: {set_attributes: setAttr._id}});
        return res.end();
    } catch (err) {
        return next(err);
    }
}