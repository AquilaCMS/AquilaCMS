/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {aquilaEvents}                   = require('aql-utils');
const ServiceProduct                   = require('../services/products');
const ProductPreview                   = require('../services/preview');
const {authentication, adminAuthRight} = require('../middleware/authentication');
const {securityForceActif}             = require('../middleware/security');
const {autoFillCode}                   = require('../middleware/autoFillCode');

module.exports = function (app) {
    app.get('/v2/adm/products/:lang?', adminAuthRight('products'), getProductsAsAdmin);
    app.post('/v2/products/:withFilters?', securityForceActif(['active']), getProductsListing);
    app.post('/v2/product', securityForceActif(['active']), getProduct);
    app.post('/v2/product/promos', getPromosByProduct);
    app.post('/v2/product/duplicate', adminAuthRight('products'), duplicateProduct);
    app.get('/v2/product/download', authentication, downloadProduct);
    app.post('/v2/product/calculStock', calculStock);
    app.post('/v2/product/preview', adminAuthRight('products'), preview);
    app.post('/v2/product/changeType', adminAuthRight('products'), changeProductType);
    app.post('/v2/product/:id', getProductById);
    app.post('/v2/products/category/:id', getProductsByCategoryId);
    app.put('/v2/product', adminAuthRight('products'), autoFillCode, setProduct);
    app.delete('/v2/product/:id', adminAuthRight('products'), deleteProduct);
    app.get('/v2/product/getCoherence/:id', adminAuthRight('products'), getCoherence);
};

async function getCoherence(req, res, next) {
    try {
        return  res.json({content: await ServiceProduct.controlAllProducts(req.params.id)});
    } catch (error) {
        return next(error);
    }
}

/**
 * POST /api/v2/products
 * @summary Listing of products
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
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
        const result               = await ServiceProduct.getProductsListing(req, res);

        // If it is a product visualization, we modify these view stats
        if (req.body.countviews && result.datas.length > 0) {
            require('../services/statistics').setProductViews(result.datas[0]._id);
        }

        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * GET /api/v2/products
 * @summary Fetch all products
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 */
async function getProductsAsAdmin(req, res, next) {
    try {
        const result = await ServiceProduct.getProductsAsAdmin(req.query, req.params.lang);
        res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * POST /api/v2/product
 * @summary Get product
 */
async function getProduct(req, res, next) {
    try {
        const {
            PostBody,
            keepReviews,
            lang
        } = req.body;
        const result = await ServiceProduct.getProduct(PostBody, {req, res}, keepReviews, lang);
        res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * POST /v2/product/promos
 * @summary Return product
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
 * Product duplicating function
 */
async function duplicateProduct(req, res, next) {
    try {
        const result = await ServiceProduct.duplicateProduct(req.body._id, req.body.code);
        res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * POST /api/v2/product/{id}
 * @summary Get one product by id
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
 * POST /api/v2/products/category/{id}
 * @summary Listing of product by category
 */
async function getProductsByCategoryId(req, res, next) {
    try {
        let isAdmin = false;
        if (req.info) isAdmin = req.info.isAdmin;

        const result = await ServiceProduct._getProductsByCategoryId(req.params.id, req.info, req.body.lang, req.body.PostBody, isAdmin, {req, res});

        res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * PUT /api/v2/product
 * @summary Set product
 */
async function setProduct(req, res, next) {
    // We add the product
    try {
        if (req.body._id) {
            // We update the product
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
 * DELETE /api/v2/product/{id}
 * @summary Delete product
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
 * @api {get} /api/v2/product/download Download virtual product
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
        const val        = aquilaEvents.emit('aqDownloadProduct', fileBinary, req, res, next);
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
 * Function for calculating stock information for a product
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
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 */
async function preview(req, res, next) {
    try {
        const url = await ProductPreview.preview(req.body);
        return res.json({url});
    } catch (err) {
        next(err);
    }
}

async function changeProductType(req, res, next) {
    try {
        const newProduct = await ServiceProduct.changeProductType(req.body.product, req.body.newType);
        return res.json(newProduct);
    } catch (error) {
        console.error(error);
        next(error);
    }
}