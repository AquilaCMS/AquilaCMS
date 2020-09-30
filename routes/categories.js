const {authentication, adminAuth} = require('../middleware/authentication');
const {securityForceActif}        = require('../middleware/security');
const {filterCategories}          = require('../middleware/categories');
const ServiceCategory             = require('../services/categories');
const ServiceRules                = require('../services/rules');

module.exports = function (app) {
    app.post('/v2/categories', securityForceActif(['active']), filterCategories, getCategories);
    app.post('/v2/category', securityForceActif(['active']), filterCategories, getCategory);
    app.post('/v2/category/execRules', authentication, adminAuth, execRules);
    app.post('/v2/category/canonical', authentication, adminAuth, execCanonical);
    app.post('/v2/category/applyTranslatedAttribs', applyTranslatedAttribs);
    app.post('/v2/category/:id', securityForceActif(['active']), getCategoryById);
    app.put('/v2/category', authentication, adminAuth, setCategory);
    app.put('/v2/category/:id/filters', setFilters);
    app.put('/v2/category/:id/filter', setFilter);
    app.delete('/v2/category/:id', authentication, adminAuth, deleteCategory);
};

/**
 * POST /api/v2/categories
 * @summary Listing of categories
 * @tags Category
 * @param {PostBody} request.body.required - PostBody
 */
async function getCategories(req, res, next) {
    try {
        const {PostBody} = req.body;
        const result     = await ServiceCategory.getCategories(PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Fonction retournant une catégorie
 */
async function getCategory(req, res, next) {
    try {
        const {PostBody, withFilter, lang} = req.body;
        const result                       = await ServiceCategory.getCategory(PostBody, withFilter, lang);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Fonction retournant une categorie
 */
async function getCategoryById(req, res, next) {
    try {
        const {PostBody} = req.body;
        const result     = await ServiceCategory.getCategoryById(req.params.id, PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
/**
 * Fonction pour ajouter ou mettre à jour une categorie
 */
async function setCategory(req, res, next) {
    try {
        let response;
        if (req.body._id) {
            response = await ServiceCategory.setCategory(req);
        } else {
            response = await ServiceCategory.createCategory(req);
        }
        return res.json(response);
    } catch (error) {
        return next(error);
    }
}

/**
 * Fonction supprimant une categorie
 */
async function deleteCategory(req, res, next) {
    try {
        await ServiceCategory.deleteCategory(req.params.id);
        return res.status(200).end();
    } catch (err) {
        return next(err);
    }
}

/**
 * Met a jour le filtre passer dans le body si il contient un id_attribut sinon, le filtre sera testé
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 */
async function setFilter(req, res, next) {
    try {
        // Met a jour le filtre dont l'id est passé en parametre
        const result = await ServiceCategory.setFilter(req.params.id, req.body);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
/**
 * Met a jour les filtres passer dans le body
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 */
async function setFilters(req, res, next) {
    try {
        // Met a jour les filtres d'une categorie
        const result = await ServiceCategory.setFilters(req.params.id, req.body);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

async function execRules(req, res) {
    await ServiceRules.execRules('category');
    res.send(true);
}

async function execCanonical(req, res, next) {
    try {
        res.json(await ServiceCategory.execCanonical());
    } catch (err) {
        console.error(err);
        next(err);
    }
}

async function applyTranslatedAttribs(req, res, next) {
    try {
        const result = await ServiceCategory.applyTranslatedAttribs(req.body.PostBody);
        res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * @param {{}} postBody PostBody
 * @param {string} req_headers_authorization header Authorization
 * @deprecated
 */
// eslint-disable-next-line no-unused-vars
function checkPostBody(postBody, req_headers_authorization) {
    postBody = securityForceActif(postBody, req_headers_authorization, ['active']);

    // TODO : lors de la canonicalisation, prendre aussi en comptes les dates et ne pas mettre de produit dedans si en dehors des dates, ou si inactive

    return postBody;
}
