const aquilaEvents                          = require('../utils/aquilaEvents');
const NSErrors                              = require('../utils/errors/NSErrors');
const utils                                 = require('../utils/utils');
const mediasUtils                           = require('../utils/medias');
const ServiceProduct                        = require('../services/products');
const {middlewareServer}                    = require('../middleware');
const {authentication, adminAuth}           = require('../middleware/authentication');
const {securityForceActif}                  = require('../middleware/security');
const {getDecodedToken}                     = require('../services/auth');
const {Products, SetAttributes, Attributes} = require('../orm/models');

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

    // Deprecated
    app.get('/products', middlewareServer.deprecatedRoute, list);
    app.get('/products/:code', middlewareServer.deprecatedRoute, detail);
    app.get('/products/pagination/:page/:limit', middlewareServer.deprecatedRoute, getPagination);
    app.post('/products', middlewareServer.deprecatedRoute, save); // TODO RV2 : Utilisé dans /admin/#/products/simple/__id__ lors du save
    app.post('/products/searchadmin', middlewareServer.deprecatedRoute, searchProductsAdmin);
    app.get('/products/associated/:code/:size?', middlewareServer.deprecatedRoute, getAssociatedProducts);
    app.delete('/products/:code', middlewareServer.deprecatedRoute, removeProduct);
    app.post('/v2/products/attribs/applyTranslated', middlewareServer.deprecatedRoute, applyTranslatedAttribs);
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
 *
 * @param {Express.Request} req - Request
 * @param {Express.Response} res
 * @param {Function} next
 *
 * req.query.op_id = _id de l'ITEM (et non du produit) d'une la commande
 * req.query.p_id = _id d'un produit (dans le cas d'un produit gratuit)
 * req.headers.authorization = token d'un user (dans le cas d'une requete depuis le site client)
 *
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

async function getProductsSearchObj(req, res, next) {
    try {
        const result = await ServiceProduct.getProductsSearchObj(req.body, req.params);
        return res.json(result);
    } catch (error) {
        next(error);
    }
}

//= ====================================================================
//= ========================== Deprecated ==============================
//= ====================================================================

/**
* @deprecated
*/
async function applyTranslatedAttribs(req, res, next) {
    try {
        const result = await ServiceProduct.applyTranslatedAttribs(req.body.PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**

 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 * @deprecated
 */
async function removeProduct(req, res, next) {
    try {
        // /!\
        // lors de la suppression d'un produit nous supprimons aussi les attributes du produit dans categories.filters.attributes
        // cette suppression se fait via un hook mongoose (voir post(findOneAndRemove,...) dans models/products.js)
        // Si vous changez la fonction findOneAndRemove ci-dessous par une autre, veillez a changer le hook dans models/products
        // Verifier aussi que lors de la suppression le nouveau hook est appelé
        // /!\
        const product = await Products.findOneAndRemove({code: req.params.code});
        deleteImages(product._id, product.images, []);
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
const save = async (req, res, next) => {
    try {
        if (!req.body._id) {
            // On vérifie que le code n'est pas déjà pris
            const product = await Products.findOne({code: req.body.code});
            if (product) {
                return next(NSErrors.ProductCodeExisting);
            }

            switch (req.body.type) {
            case 'simple':
                req.body.kind = "SimpleProduct";
                break;
            case 'virtual':
                req.body.kind = "VirtualProduct";
                break;
            case 'bundle':
                req.body.kind = "BundleProduct";
                break;
            default:
                break;
            }

            if (req.body.set_attributes === undefined) {
                req.body.attributes = [];

                const setAtt = await SetAttributes.findOne({code: "defaut"});
                req.body.set_attributes_name = setAtt.name;
                req.body.set_attributes = setAtt._id;

                for (const attrs of setAtt.attributes) {
                    const attr = await Attributes.findOne({_id: attrs});
                    if (attr != null) {
                        const arrAttr = JSON.parse(JSON.stringify(attr));
                        arrAttr.id = attr._id;
                        req.body.attributes.push(arrAttr);
                    }
                }
                aquilaEvents.emit('aqProductCreated', product._id);
                return res.send(product);
            }
            req.body.code = utils.slugify(req.body.code);

            const _product = await Products.create(req.body);
            aquilaEvents.emit('aqProductCreated', _product._id);
            return res.send(_product);
        }
        const product = await Products.findById(req.body._id);
        if (!product) throw NSErrors.NotFound;

        deleteImages(req.body._id, product.images, req.body.images);

        if (req.body.autoSlug) {
            // On met à jour le slug du produit
            req.body._slug = `${utils.slugify(req.body.name)}-${req.body.code}`;
        }

        product.updateData(req.body, (err, result) => {
            if (err) {
                return next(err);
            }
            return res.json(result);
        });
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
 * @todo RV2 : Utilisé lors d'un delete produit dans l'admin
 */
function deleteImages(id, oldImages, newImages) {
    console.warn("Legacy method : deleteImages()");

    const bIds = {};
    newImages.forEach((obj) => bIds[obj._id] = obj);

    oldImages
        .filter((obj) => !(obj._id in bIds))
        .forEach(async (item) => mediasUtils.deleteFile(item.url));
}

/**
 * Full text search on backoffice
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 * @deprecated
 */
const searchProductsAdmin = async (req, res, next) => {
    let queryCondition = {
        $or : [// {'details.description': new RegExp(req.body.q, 'i')},
            {name: new RegExp(req.body.q, "i")} /* {_supplier: new RegExp(req.body.q, 'i')},
             {_trademark: new RegExp(req.body.q, 'i')},
             {supplier_ref: new RegExp(req.body.q, 'i')},
             {'specific.custom_text1': new RegExp(req.body.q, 'i')},
             {'specific.custom_text2': new RegExp(req.body.q, 'i')},
             {'specific.custom_text3': new RegExp(req.body.q, 'i')} */
        ]
    };
    if (req.query.requiredSlugMenus) {
        queryCondition = {
            $and : [
                {
                    $or : [{slugMenus: {$size: 0}}, {slugMenus: {$exists: false}}]
                }, {
                    $or : [// {'details.description': new RegExp(req.body.q, 'i')},
                        {name: new RegExp(req.body.q, "i")} /* {_supplier: new RegExp(req.body.q, 'i')},
                         {_trademark: new RegExp(req.body.q, 'i')},
                         {supplier_ref: new RegExp(req.body.q, 'i')} */
                    ]
                }
            ]
        };
    }
    try {
        const products = await Products.find(queryCondition, null, {skip: req.body.start, limit: req.body.limit}).sort("code");
        return res.json(products);
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
const list = async (req, res, next) => {
    try {
        const products = await Products.find(req.query).populate("location.town location.country");
        return res.json(products);
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
const getAssociatedProducts = async (req, res, next) => {
    try {
        const product = await Products.findOne({code: req.params.code});
        if (!product) {
            throw NSErrors.NotFound;
        }
        let associatedProds = [];

        if (product.associated_prds.length > req.params.size && req.params.size !== undefined) {
            let limit = 0;
            while (associatedProds.length < req.params.size && limit < 1000) {
                const rand = Math.floor(Math.random() * product.associated_prds.length);
                if (associatedProds.indexOf(product.associated_prds[rand]) === -1) {
                    associatedProds.push(product.associated_prds[rand]);
                }

                limit++;
            }
        } else {
            associatedProds = product.associated_prds;
        }

        const products = await Products.find({
            _id : {$in: associatedProds}
        }).populate("location.town location.country");
        return res.json(products);
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
const detail = async (req, res, next) => {
    const filter = {
        code : req.params.code
    };
    if (req.query.active) {
        filter.active = req.query.active;
    }
    let query = Products.findOne(filter);
    if (req.query.populate === "true") {
        query = query.populate("location.town location.country");
    }

    // Si c'est l'admin qui a fait la demande
    if (req.baseUrl !== "") {
        query = query.populate("set_attributes");
    }

    try {
        const product = await query;
        if (!product) {
            throw NSErrors.NotFound;
        }
        return res.json(product);
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
const getPagination = async (req, res, next) => {
    try {
        const foundProducts = await Products.find(req.query, null, {
            skip  : (req.params.page - 1) * req.params.limit,
            limit : parseInt(req.params.limit, 10)
        });
        const count = await Products.countDocuments(req.query);
        return res.json({products: foundProducts, count});
    } catch (err) {
        return next(err);
    }
};
