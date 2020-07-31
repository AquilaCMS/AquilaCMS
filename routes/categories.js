const {middlewareServer}          = require('../middleware');
const {authentication, adminAuth} = require('../middleware/authentication');
const {securityForceActif}        = require('../middleware/security');
const {filterCategories}          = require('../middleware/categories');
const {Categories}                = require('../orm/models');
const ServiceCategory             = require('../services/categories');
const ServiceRules                = require('../services/rules');
const NSErrors                    = require('../utils/errors/NSErrors');
const utils                       = require('../utils/utils');

module.exports = function (app) {
    app.post('/v2/categories', securityForceActif(['active']), filterCategories, getCategories);
    app.post('/v2/category', securityForceActif(['active']), filterCategories, getCategory);
    app.post('/v2/category/execRules', authentication, adminAuth, execRules);
    app.post('/v2/category/applyTranslatedAttribs', applyTranslatedAttribs);
    app.post('/v2/category/:id', securityForceActif(['active']), getCategoryById);
    app.put('/v2/category', authentication, adminAuth, setCategory);
    app.put('/v2/category/:id/filters', setFilters);
    app.put('/v2/category/:id/filter', setFilter);
    app.delete('/v2/category/:id', authentication, adminAuth, deleteCategory);

    // Deprecated
    app.get('/categories', middlewareServer.deprecatedRoute, list);
    app.get('/categories/roots', middlewareServer.deprecatedRoute, listRoots);
    app.get('/categories/children/:id', middlewareServer.deprecatedRoute, listChildren);
    app.get('/categories/i/:id', middlewareServer.deprecatedRoute, getById);
    app.get('/catByProduct/:productId', middlewareServer.deprecatedRoute, getCategoriesByProduct);
    app.delete('/categories/:id', middlewareServer.deprecatedRoute, removeMenu);
    app.post('/categories', middlewareServer.deprecatedRoute, createMenu);
    app.put('/categories', middlewareServer.deprecatedRoute, updateMenu);
};
/**
 * Fonction retournant un listing de categories
 */
async function getCategories(req, res, next) {
    try {
        const {PostBody} = req.body;// checkPostBody(req.body.PostBody, req.headers.authorization);
        const result   = await ServiceCategory.getCategories(PostBody);
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
        const {PostBody, withFilter, lang} = req.body;// checkPostBody(req.body.PostBody, req.headers.authorization);
        const result   = await ServiceCategory.getCategory(PostBody, withFilter, lang);
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
        const result   = await ServiceCategory.getCategoryById(req.params.id, PostBody);
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

function execRules(req, res) {
    res.send(true);
    ServiceRules.execRules('category');
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

//= ====================================================================
//= ========================== Deprecated ==============================
//= ====================================================================

/**
 * list all categories
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 * @deprecated
 */
const list = async (req, res, next) => {
    const queryCondition = req.query;
    let menus;
    try {
        menus = await Categories.find(queryCondition).select('-productsList').sort({displayOrder: 'asc'});
    } catch (err) {
        return next(err);
    }
    if (!menus) {
        return next(NSErrors.NotFound);
    }

    res.status(200).json(menus);
};

/**
 * Liste les menus racines
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 * @deprecated
 */
const listRoots = async (req, res, next) => {
    const queryCondition = req.query;
    queryCondition.ancestors = {$size: 0};

    let menus;
    try {
        menus = await Categories.find(queryCondition).select('-productsList').sort({displayOrder: 'asc'}).populate('children');
    } catch (err) {
        return next(err);
    }
    if (!menus) {
        return next(NSErrors.NotFound);
    }
    res.status(200).json(menus);
};

/**
 * Lister les menus enfants d'un menu
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 * @deprecated
 */
const listChildren = async (req, res, next) => {
    try {
        const menu = await Categories.findOne({_id: req.params.id});
        if (!menu) {
            return next(NSErrors.NotFound);
            // return next({code: "menu_not_found", status: 404, translations: {fr: `Le menu ${req.params.id} n'existe pas.`, en: `Menu ${req.params.id} doesn't exist.`}});
        }

        const children = await Categories.find({_id: {$in: menu.children}}).sort({displayOrder: 'asc'});
        res.json(children);
    } catch (err) {
        return next(err);
    }
};

/**
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 * @deprecated
 */
async function getById(req, res, next) {
    try {
        let menu;
        if (req.query.populateFilters) {
            menu = await Categories.findOne({_id: req.params.id})
                .populate({path: 'filters.id_attribut', populate: {path: 'set_attributes'}});
        } else {
            menu = await Categories.findOne({_id: req.params.id});
        }
        res.status(200).json(menu);
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
const getCategoriesByProduct = async (req, res, next) => {
    let categories;
    try {
        categories = await Categories.find({'productsList.id': req.params.productId});
    } catch (err) {
        return next(err);
    }
    if (!categories) return next(NSErrors.NotFound);
    res.status(200).send(categories);
};

/**
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 * @deprecated
 */
const createMenu = async (req, res, next) => {
    const slugifyCode = utils.slugify(req.body.code);

    if (await Categories.findOne({code: slugifyCode})) {
        return next(NSErrors.categoryAlreadyExist);
    }

    const newMenu = new Categories({
        code        : slugifyCode,
        translation : req.body.translation
    });

    const {id_parent} = req.body;

    try {
        if (id_parent) {
            const menu = await Categories.findOne({_id: id_parent});
            if (!menu) return next(NSErrors.NotFound);
            newMenu.ancestors = menu.ancestors.concat([id_parent]);
            await newMenu.save();

            if (!menu.children.includes(newMenu._id)) {
                menu.children.push(newMenu._id);
            }
            await menu.save();
            res.end();
        } else {
            await newMenu.save();
            res.end();
        }
    } catch (err) {
        return next(err);
    }
};

/**
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 * @deprecated
 */
const updateMenu = async (req, res, next) => {
    let newData;
    if (req.body.field) {
        newData = {};
        newData[req.body.field] = req.body.value;
    } else {
        newData = req.body;
    }

    let category;
    try {
        category = await Categories.updateOne({_id: req.body._id}, newData);
    } catch (err) {
        return next(err);
    }
    if (!category) return next(NSErrors.NotFound);
    res.status(200).end();
};

/**
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 * @deprecated
 */
const removeMenu = async (req, res, next) => {
    try {
        const menu = await Categories.findOne({_id: req.params.id});
        await ServiceCategory.removeChildren(menu);
        await Categories.deleteOne({_id: menu._id});
        if (menu.ancestors.length > 0) {
            await Categories.updateOne({_id: menu.ancestors[menu.ancestors.length - 1]}, {$pull: {children: menu._id}});
        }
        res.end();
    } catch (err) {
        return next(err);
    }
};
