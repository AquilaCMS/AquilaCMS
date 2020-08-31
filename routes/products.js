const aquilaEvents                  = require('../utils/aquilaEvents');
const ServiceProduct                = require('../services/products');
const {authentication, adminAuth}   = require('../middleware/authentication');
const {securityForceActif}          = require('../middleware/security');
const {getDecodedToken}             = require('../services/auth');

module.exports = function (app) {
    app.post('/v2/products/searchObj', getProductsSearchObj);
    app.post('/v2/products/:withFilters?', securityForceActif(['active']), getProductsListing);
    app.post('/v2/product', securityForceActif(['active']), getProduct);
    app.post('/v2/product/promos', getPromosByProduct);
    app.post('/v2/product/duplicate', authentication, adminAuth, duplicateProduct);
    app.get('/v2/product/download', authentication, downloadProduct);
    app.post('/v2/product/calculStock', calculStock);
    app.post('/v2/product/:id', getProductById);
    app.post('/v2/products/category/:id', getProductsByCategoryId);
    app.put('/v2/product', authentication, adminAuth, setProduct);
    app.delete('/v2/product/:id', authentication, adminAuth, deleteProduct);
};

/**
 * Fonction retournant un listing de produits
 */
async function getProductsListing(req, res, next) {
    try {
        req.body.PostBody.populate = [
            {
                path  : 'associated_prds',
                match : {
                    _visible : true,
                    active   : true
                }
            },
            'bundle_sections.products.id'
        ];
        const result = await ServiceProduct.getProductsListing(req, res);

        if (req.body.dynamicFilters) {
            const resultat = await ServiceProduct.calculateFilters(req, result);
            return res.json(resultat, req.body.keepOriginalAttribs);
        }
        // Si c'est une visualisation de produit, on modifie ces stats de vue
        if (req.body.countviews && result.datas.length > 0) {
            require('../services/statistics').setProductViews(result.datas[0]._id);
        }

        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Fonction retournant un produit
 */
async function getProduct(req, res, next) {
    try {
        const result = await ServiceProduct.getProduct(req.body.PostBody, {req, res}, req.body.keepReviews);
        res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Fonction retournant un produit
 */
async function getPromosByProduct(req, res, next) {
    try {
        const result = await ServiceProduct.getPromosByProduct(req.body.PostBody, {req, res});
        res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Fonction de duplicaiton de produit
 */
async function duplicateProduct(req, res, next) {
    try {
        const result = await ServiceProduct.duplicateProduct(req.body.idProduct, req.body.newCode);
        res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Fonction retournant un produit
 */
async function getProductById(req, res, next) {
    try {
        const result = await ServiceProduct.getProductById(req.params.id, req.body.PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Fonction retournant une liste de produit appartenant a la categorie dont l'id est passé en parametre
 */
async function getProductsByCategoryId(req, res, next) {
    try {
        let isAdmin = false;
        let user;
        if (req.headers.authorization) {
            const userInfo = getDecodedToken(req.headers.authorization);
            if (userInfo && userInfo.info && userInfo.info.isAdmin === true) {
                isAdmin = true;
            }
            if (userInfo) user = userInfo.info;
        }

        const result = await ServiceProduct._getProductsByCategoryId(req.params.id, req.body.PostBody, req.body.lang, isAdmin, user, {req, res});
        if (req.body.dynamicFilters) {
            const resultat = await ServiceProduct.calculateFilters(req, result);
            return res.json(resultat);
        }
        res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Fonction pour ajouter ou mettre à jour un produit
 */
async function setProduct(req, res, next) {
    // On ajoute le produit
    try {
        if (req.body._id) {
            // On update le produit
            const result = await ServiceProduct.setProduct(req);
            return res.json(result);
        }

        const result = await ServiceProduct.createProduct(req);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Fonction supprimant un produit
 */
async function deleteProduct(req, res, next) {
    try {
        await ServiceProduct.deleteProduct(req.params.id);
        return res.json({status: true});
    } catch (error) {
        return next(error);
    }
}

/**
 * @api {get} /v2/product/download Download virtual product
 * @apiGroup Products
 * @apiVersion 2.0.0
 * @apiDescription Download a virtual-product
 * @apiParam {string} op_id (optional) _id de l'ITEM (et non du produit) d'une la commande
 * @apiParam {string} p_id (optional) _id d'un produit (dans le cas d'un produit gratuit)
 * @apiSuccess {Stream} - Stream to download
 */
async function downloadProduct(req, res, next) {
    try {
        const fileBinary = await ServiceProduct.downloadProduct(req, res);
        const val = aquilaEvents.emit('aqDownloadProduct', fileBinary, req, res, next);
        if (!val) {
            res.setHeader('Content-Length', fileBinary.length);
            res.write(fileBinary, 'binary');
            return res.end();
        }
    } catch (error) {
        return next(error);
    }
}

/**
 * Fonction permettant de calculer les informations de stock pour un produit
 */
async function calculStock(req, res, next) {
    try {
        const result = await ServiceProduct.calculStock(req.body);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * @api {post} /v2/products/searchObj Get products
 * @apiGroup Products
 * @apiVersion 2.0.0
 * @apiDescription Get all products
 * @apiUse param_PostBody
 * @apiParamExample {js} Example usage:
TODO
{"page":1,"limit":12,"filter":{},"sortObj":{"code":1}}
 * @apiUse ProductSchemaDefault
 * @apiUse ProductPrice
 * @apiUse ProductTranslation
 * @apiUse ProductReviews
 * @apiUse ProductStats
 * @apiUse ErrorPostBody
 */
async function getProductsSearchObj(req, res, next) {
    try {
        const result = await ServiceProduct.getProductsSearchObj(req.body, req.params);
        return res.json(result);
    } catch (error) {
        next(error);
    }
}
