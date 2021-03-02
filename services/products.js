/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const moment                  = require('moment-business-days');
const path                    = require('path');
const mongoose                = require('mongoose');
const fs                      = require('../utils/fsp');
const aquilaEvents            = require('../utils/aquilaEvents');
const QueryBuilder            = require('../utils/QueryBuilder');
const utils                   = require('../utils/utils');
const utilsServer             = require('../utils/server');
const utilsMedias             = require('../utils/medias');
const NSErrors                = require('../utils/errors/NSErrors');
const servicesLanguages       = require('./languages');
const ServicesDownloadHistory = require('./downloadHistory');
const servicesCategory        = require('./categories');
const serviceSetAttributs     = require('./setAttributes');
const servicePromos           = require('./promo');
const serviceReviews          = require('./reviews');
const utilsDatabase           = require('../utils/database');
const {
    Configuration,
    Products,
    ProductsPreview,
    Categories,
    SetAttributes,
    Attributes
}                             = require('../orm/models');

let restrictedFields = ['price.purchase', 'downloadLink'];
const defaultFields  = ['_id', 'type', 'name', 'price', 'images', 'pictos', 'translation'];

const queryBuilder        = new QueryBuilder(Products, restrictedFields, defaultFields);
const queryBuilderPreview = new QueryBuilder(ProductsPreview, restrictedFields, defaultFields);

// si dans le config, on demande de ne pas retourner les champs de stock, on les ajoute au restrictedFields
if (global.envConfig.stockOrder.returnStockToFront !== true) {
    restrictedFields = restrictedFields.concat(['stock.qty', 'stock.qty_booked', 'stock.qty_real']);
}

/**
 * Lors de la recupération d'un produit on y ajout aussi le prix min et max des produits trouvés par le queryBuilder
 * @param {PostBody} PostBody
 * @param {Express.Request} reqRes
 * @param {string} lang
 */
// eslint-disable-next-line no-unused-vars
const getProducts = async (PostBody, reqRes, lang) => {
    let properties = [];
    let structure;
    if (PostBody && PostBody.structure) {
        // obligé d'avoir tous les champs pour les règles de promo
        structure  = PostBody.structure;
        properties = Object.keys(PostBody.structure).concat(defaultFields);
        properties.push('_id');
        delete PostBody.structure;
        if (properties.includes('score')) {
            PostBody.structure = {score: structure.score};
        }
        queryBuilder.defaultFields = ['*'];
    }
    if (PostBody && PostBody.filter && PostBody.filter.$text) { // La recherche fulltext ne permet pas de couper des mot (chercher "TO" dans "TOTO")
        if (PostBody.structure && PostBody.structure.score) {
            delete PostBody.structure.score;
        }

        PostBody.filter.$or = [];
        PostBody.filter.$or.push({[`translation.${lang}.name`]: {$regex: PostBody.filter.$text.$search, $options: 'i'}});
        PostBody.filter.$or.push({[`translation.${lang}.description1.title`]: {$regex: PostBody.filter.$text.$search, $options: 'i'}});
        PostBody.filter.$or.push({[`translation.${lang}.description1.text`]: {$regex: PostBody.filter.$text.$search, $options: 'i'}});
        PostBody.filter.$or.push({[`translation.${lang}.description2.title`]: {$regex: PostBody.filter.$text.$search, $options: 'i'}});
        PostBody.filter.$or.push({[`translation.${lang}.description2.text`]: {$regex: PostBody.filter.$text.$search, $options: 'i'}});
        delete PostBody.filter.$text;
    }
    let result                 = await queryBuilder.find(PostBody);
    queryBuilder.defaultFields = defaultFields;

    // On supprime les reviews qui ne sont pas visible et verify
    if (PostBody && structure && structure.reviews === 1) {
        serviceReviews.keepVisibleAndVerifyArray(result);
    }

    const prds              = await Products.find(PostBody.filter);
    const arrayPrice        = {et: [], ati: []};
    const arraySpecialPrice = {et: [], ati: []};
    for (const prd of prds) {
        if (prd.price.et.special) {
            arrayPrice.et.push(prd.price.et.special);
        } else {
            arrayPrice.et.push(prd.price.et.normal);
        }
        if (prd.price.ati.special) {
            arrayPrice.ati.push(prd.price.ati.special);
        } else {
            arrayPrice.ati.push(prd.price.ati.normal);
        }
    }
    if (arrayPrice.et.length === 0) {
        arrayPrice.et.push(0);
    }
    if (arrayPrice.ati.length === 0) {
        arrayPrice.ati.push(0);
    }
    result.min = {et: Math.min(...arrayPrice.et), ati: Math.min(...arrayPrice.ati)};
    result.max = {et: Math.max(...arrayPrice.et), ati: Math.max(...arrayPrice.ati)};

    if (reqRes !== undefined && PostBody.withPromos !== false) {
        reqRes.res.locals = result;
        result            = await servicePromos.middlewarePromoCatalog(reqRes.req, reqRes.res);
    }

    for (const prd of result.datas) {
        if (prd.price.et.special) {
            arraySpecialPrice.et.push(prd.price.et.special);
        } else {
            arraySpecialPrice.et.push(prd.price.et.normal);
        }
        if (prd.price.ati.special) {
            arraySpecialPrice.ati.push(prd.price.ati.special);
        } else {
            arraySpecialPrice.ati.push(prd.price.ati.normal);
        }
    }

    result.specialPriceMin = {et: Math.min(...arraySpecialPrice.et), ati: Math.min(...arraySpecialPrice.ati)};
    result.specialPriceMax = {et: Math.max(...arraySpecialPrice.et), ati: Math.max(...arraySpecialPrice.ati)};

    return result;
};

/**
 * On récupére le produit correspondant au filtre du PostBody
 * @param {*} PostBody
 * @param reqRes
 * @param keepReviews
 */
const getProduct = async (PostBody, reqRes = undefined, keepReviews = false, lang = global.defaultLang) => {
    let product;
    if (reqRes && reqRes.req.query.preview) {
        PostBody.filter = {_id: reqRes.req.query.preview};
        product         = await queryBuilderPreview.findOne(PostBody, true);
    } else {
        product = await queryBuilder.findOne(PostBody, true);
    }
    if (!product) {
        return product;
    }

    // On supprime les reviews qui ne sont pas visible et verify
    if (
        product.reviews
        && product.reviews.datas
        && product.reviews.datas.length > 0
        && PostBody
        && PostBody.structure
        && PostBody.structure.reviews === 1
        && !keepReviews
    ) {
        serviceReviews.keepVisibleAndVerify(product);
    }

    if (product.associated_prds) {
        product.associated_prds = product.associated_prds.filter((p) => p.translation && p.translation[lang]);
    }
    if (reqRes !== undefined && PostBody.withPromos !== false) {
        reqRes.res.locals = product;
        product           = await servicePromos.middlewarePromoCatalog(reqRes.req, reqRes.res);
    }
    return product;
};

/**
 * On récupére les promos correspondant au produit demandé
 * @param {*} PostBody
 * @param reqRes
 * @param keepReviews
 */
const getPromosByProduct = async (PostBody, reqRes = undefined) => {
    const isAdmin = !!(reqRes.req && reqRes.req.info && reqRes.req.info.isAdmin);
    const product = await queryBuilder.findOne(PostBody, false, isAdmin);
    if (!product) {
        return product;
    }
    let datas = {};

    if (reqRes !== undefined && PostBody.withPromos !== false) {
        reqRes.res.locals     = product;
        reqRes.res.keepPromos = true;
        datas                 = await servicePromos.middlewarePromoCatalog(reqRes.req, reqRes.res);
    }
    return datas;
};

/**
 * Duplication de produit dans le back-office
 */
const duplicateProduct = async (idProduct, newCode) => {
    const doc       = await Products.findById(idProduct);
    doc._id         = mongoose.Types.ObjectId();
    const languages = await mongoose.model('languages').find({});
    for (const lang of languages) {
        if (!doc.translation[lang.code]) {
            doc.translation[lang.code] = {};
        }
        doc.translation[lang.code].slug = utils.slugify(doc._id.toString());
    }
    doc.isNew   = true;
    doc.images  = [];
    doc.reviews = {
        average    : 0,
        reviews_nb : 0,
        questions  : [],
        datas      : []
    };
    doc.stats   = {
        views : 0
    };
    doc.stock   = {
        qty        : 0,
        qty_booked : 0,
        orderable  : false,
        status     : 'liv'
    };
    doc.code    = newCode;
    for (const lang of Object.entries(doc.translation)) {
        if (doc.translation[lang[0]].canonical) {
            delete doc.translation[lang[0]].canonical;
        }
    }
    doc.active   = false;
    doc._visible = false;
    await utilsDatabase.checkSlugExist(doc, Products);
    await doc.save();
    return doc;
};

const _getProductsByCategoryId = async (id, PostBody = {}, lang, isAdmin = false, user, reqRes = undefined) => {
    return global.cache.get(
        `${id}_${lang || ''}_${isAdmin}_${JSON.stringify(PostBody)}_${user ? user._id : ''}`,
        async () => getProductsByCategoryId(id, PostBody, lang, isAdmin, user, reqRes)
    );
};

/**
 * On récupére les produits contenus dans une categorie
 * @param {*} id de la categorie
 * @param {*} PostBody
 * @param {*} lang
 * @param isAdmin
 * @param user
 * @param reqRes
 */
const getProductsByCategoryId = async (id, PostBody = {}, lang, isAdmin = false, user, reqRes = undefined) => {
    moment.locale(global.defaultLang);
    lang = servicesLanguages.getDefaultLang(lang);
    // Si admin alors on populate tout les documents sans restriction de visibilité ou d'actif
    if (!PostBody.filter) PostBody.filter = {};
    if (!isAdmin) {
        PostBody.filter = {
            ...PostBody.filter,
            _visible : true,
            active   : true
        };
    }
    PostBody.filter = {
        ...PostBody.filter,
        [`translation.${lang}`] : {$exists: true}
    };
    if (!PostBody.structure) {
        PostBody.structure = {};
    }
    PostBody.structure = {
        ...PostBody.structure,
        price : 1,
        type  : 1
    };

    const menu = await Categories.findById(id).lean();
    if (menu === null) {
        throw NSErrors.CategoryNotFound;
    }
    if (isAdmin && PostBody && PostBody.filter && PostBody.filter.inProducts !== undefined) {
        // On supprime les produits de productsList en fonction de inProducts (true ou false)
        for (let i = menu.productsList.length - 1; i >= 0; i--) {
            const prd = menu.productsList[i];
            if (prd.checked !== PostBody.filter.inProducts) {
                menu.productsList.splice(i, 1);
            }
        }
        delete PostBody.filter.inProducts;
        delete PostBody.filter.productsIds;
    }
    // Si un productsList.id ne répond pas au match alors productsList.id === null
    if (global.envConfig.stockOrder.bookingStock !== 'none') { // Besoin impératif des stock si un le gère
        PostBody.structure.stock = 1;
    }

    // On verifie que les infos de PostBody sont correctes
    const {limit, skip} = queryBuilder.verifyPostBody(PostBody, 'find');
    // On récupére les produits trié par sortWeight, et on slice(filter.skip, filter.limit)

    PostBody.filter._id = {$in: menu.productsList.map((item) => item.id.toString())};
    // On récupére les produits de productList
    const result = await queryBuilder.find(PostBody, true);
    if ((PostBody.sort && PostBody.sort.sortWeight) || !PostBody.sort) {
        // On ajoute le sortWeight correspondant au produit dans le doc produit
        menu.productsList.forEach((product) => {
            const ProdFound = result.datas.find((resProd) => resProd._id.toString() === product.id.toString());
            // on ajoute sortWeight au result.datas[i] (modification d'un objet par réference)
            if (ProdFound) {
                ProdFound.sortWeight = product.sortWeight;
            }
        });
        // On trie les produits par poids
        result.datas.sort((p1, p2) => p2.sortWeight - p1.sortWeight);
    }
    if (global.envConfig.stockOrder.bookingStock !== 'none') {
        for (let i = 0; i < result.datas.length; i++) {
            const product   = result.datas[i];
            const stockData = await calculStock({lang}, product);
            if (product.type === 'simple') {
                // TODO P2 "shipping : business day" : ne marche plus, on met le jour même en dur
                // const dateShipped = moment().businessAdd(shipment.delay.unit === "DAY" ? shipment.delay.value : 1).format('DD/MM/YYYY');
                result.datas[i].stock.label       = stockData.label;
                result.datas[i].stock.dateShipped = stockData.dateShipped;
                result.datas[i].stock.status      = stockData.product.stock.status;
                result.datas[i].stock.qty         = stockData.product.stock.qty;
                result.datas[i].stock.orderable   = stockData.product.stock.orderable;
                result.datas[i].stock.qty_real    = stockData.product.stock.qty_real;
            }
        }
    }

    if (PostBody.structure && PostBody.structure.sortWeight) {
        for (let i = 0; i < result.datas.length; i++) {
            const sortedPrd = menu.productsList.find((sortedPrd) => sortedPrd.id.toString() === result.datas[i]._id.toString());
            if (sortedPrd) {
                result.datas[i].sortWeight = sortedPrd.sortWeight;
            }
        }
    }

    // On récupére tous les produits appartenant a cette categorie afin d'avoir le min et max
    let priceFilter;
    if (PostBody.filter.$and) {
        priceFilter = PostBody.filter.$and[0];
        PostBody.filter.$and.shift();
        if (PostBody.filter.$and.length === 0) delete PostBody.filter.$and;
    }
    // on utilise lean afin d'améliorer grandement les performances de la requete (x3 plus rapide)
    // {virtuals: true} permet de récupérer les champs virtuels (stock.qty_real)
    let prds       = await Products
        .find(PostBody.filter, PostBody.structure)
        .populate(PostBody.populate)
        .sort(PostBody.sort)
        .lean({virtuals: true});
    let prdsPrices = JSON.parse(JSON.stringify(prds));

    prdsPrices = await servicePromos.checkPromoCatalog(prdsPrices, user, lang, true);
    if (priceFilter) {
        prdsPrices = prdsPrices.filter((prd) => {
            if (priceFilter.$or[1]['price.ati.special']) {
                if (prd.price.ati.special) {
                    if (prd.price.ati.special <= priceFilter.$or[1]['price.ati.special'].$lte
                        && prd.price.ati.special >= priceFilter.$or[1]['price.ati.special'].$gte) {
                        return true;
                    }
                } else {
                    if (prd.price.ati.normal <= priceFilter.$or[0]['price.ati.normal'].$lte
                        && prd.price.ati.normal >= priceFilter.$or[0]['price.ati.normal'].$gte) {
                        return true;
                    }
                }
            } else if (priceFilter.$or[1]['price.et.special']) {
                if (prd.price.et.special) {
                    if (prd.price.et.special <= priceFilter.$or[1]['price.et.special'].$lte
                        && prd.price.et.special >= priceFilter.$or[1]['price.et.special'].$gte) {
                        return true;
                    }
                } else {
                    if (prd.price.et.normal <= priceFilter.$or[0]['price.et.normal'].$lte
                        && prd.price.et.normal >= priceFilter.$or[0]['price.et.normal'].$gte) {
                        return true;
                    }
                }
            }

            return false;
        });
        prds       = prds.filter((prd) => prdsPrices
            .map((prdPri) => prdPri._id.toString())
            .indexOf(prd._id.toString()) !== -1);
        if (PostBody.sort && PostBody.sort['price.ati.normal']) {
            prds = prds.sort((a, b) => {
                let priceA = a.price.ati.normal;
                let priceB = a.price.ati.normal;
                if (a.price.ati.special) priceA = a.price.ati.special;
                if (b.price.ati.special) priceB = b.price.ati.special;
                let result;
                const sort = Number(PostBody.sort['price.ati.normal']);
                if (sort === 1) result = priceA - priceB;
                if (sort === -1) result = priceB - priceA;
                return result;
            });
        }
    }

    const arrayPrice        = {et: [], ati: []};
    const arraySpecialPrice = {et: [], ati: []};

    for (const prd of prds) {
        if (prd.price) {
            if (prd.price.et.special) {
                arrayPrice.et.push(prd.price.et.special);
            } else {
                arrayPrice.et.push(prd.price.et.normal);
            }
            if (prd.price.ati.special) {
                arrayPrice.ati.push(prd.price.ati.special);
            } else {
                arrayPrice.ati.push(prd.price.ati.normal);
            }
        }
    }

    const priceMin = {et: Math.min(...arrayPrice.et), ati: Math.min(...arrayPrice.ati)};
    const priceMax = {et: Math.max(...arrayPrice.et), ati: Math.max(...arrayPrice.ati)};

    for (const prd of prdsPrices) {
        if (prd.price) {
            if (prd.price.et.special) {
                arraySpecialPrice.et.push(prd.price.et.special);
            } else {
                arraySpecialPrice.et.push(prd.price.et.normal);
            }
            if (prd.price.ati.special) {
                arraySpecialPrice.ati.push(prd.price.ati.special);
            } else {
                arraySpecialPrice.ati.push(prd.price.ati.normal);
            }
        }
    }

    const specialPriceMin = {et: Math.min(...arraySpecialPrice.et), ati: Math.min(...arraySpecialPrice.ati)};
    const specialPriceMax = {et: Math.max(...arraySpecialPrice.et), ati: Math.max(...arraySpecialPrice.ati)};

    // On récupére uniquement l'image ayant pour default = true si aucune image trouvé on prend la premiére image du produit
    for (let i = 0; i < result.datas.length; i++) {
        if (result.datas[i].images) {
            if (!result.datas[i].images.length) continue;
            const image = utilsMedias.getProductImageUrl(result.datas[i]);
            if (!image) result.datas[i].images = [result.datas[i].images[0]];
            else result.datas[i].images = [image];
        }
    }

    if ((PostBody.sort && PostBody.sort.sortWeight) || !PostBody.sort) {
        prds.forEach((product, index) => {
            const idx = menu.productsList.findIndex((resProd) => resProd.id.toString() === product._id.toString());
            // on ajoute sortWeight au result.datas[i] (modification d'un objet par réference)
            if (idx > -1) {
                prds[index].sortWeight = menu.productsList[idx].sortWeight;
            } else {
                prds[index].sortWeight = -1;
            }
        });

        // On trie les produits par poids, le trie par pertinence se fait toujours du plus pertinent au moins pertienent
        prds.sort((p1, p2) => p2.sortWeight - p1.sortWeight);
    }

    let products = prds.slice(skip, limit + skip);

    // TODO P5 (chaud) le code ci-dessous permet de retourner la structure que l'on envoi dans le PostBody car actuellement ça renvoi tout les champs
    // ce code ne marche pas car _doc n'exsite pas dans produits et removeFromStructure en a besoin
    // if (Object.keys(PostBody.structure).length > 0) {
    //     queryBuilder.removeFromStructure(PostBody.structure, tProducts);
    // }

    if (reqRes !== undefined && PostBody.withPromos !== false) {
        reqRes.res.locals.datas  = products;
        reqRes.req.body.PostBody = PostBody;
        const productsDiscount   = await servicePromos.middlewarePromoCatalog(reqRes.req, reqRes.res);
        products                 = productsDiscount.datas;
        // Ce bout de code permet de recalculer les prix en fonction des filtres notamment après le middlewarePromoCatalog
        // Le code se base sur le fait que les filtres de prix seront dans PostBody.filter.$and[0].$or
    }
    if (PostBody.filter.$and && PostBody.filter.$and[0] && PostBody.filter.$and[0].$or) {
        products = products.filter((prd) =>  {
            const pr = prd.price[getTaxDisplay(user)].special || prd.price[getTaxDisplay(user)].normal;
            return pr >= (
                PostBody.filter.$and[0].$or[1][`price.${getTaxDisplay(user)}.special`].$gte
                || PostBody.filter.$and[0].$or[0][`price.${getTaxDisplay(user)}.normal`].$gte
            )
            && pr <= (
                PostBody.filter.$and[0].$or[1][`price.${getTaxDisplay(user)}.special`].$lte
                || PostBody.filter.$and[0].$or[0][`price.${getTaxDisplay(user)}.normal`].$lte
            );
        });
    }

    if (
        PostBody.sort
        && (
            PostBody.sort['price.priceSort.et']
            || PostBody.sort['price.priceSort.ati']
        )
    ) {
        if (PostBody.sort['price.priceSort.et']) {
            products = orderByPriceSort(products, PostBody, 'price.priceSort.et');
        } else if (PostBody.sort['price.priceSort.ati']) {
            products = orderByPriceSort(products, PostBody, 'price.priceSort.ati');
        }
    }

    return {
        count : prds.length,
        datas : products,
        priceMin,
        priceMax,
        specialPriceMin,
        specialPriceMax
    };
};

const orderByPriceSort = (tProducts, PostBody, param = 'price.priceSort.et') => {
    tProducts = tProducts.sort((a, b) => {
        if (a.price.priceSort > b.price.priceSort) {
            return Number(PostBody.sort[param]) === 1 ? 1 : -1;
        }
        if (b.price.priceSort > a.price.priceSort) {
            return Number(PostBody.sort[param]) === 1 ? -1 : 1;
        }
        return 0;
    });
    return tProducts;
};

const getProductById = async (id, PostBody = null) => {
    return queryBuilder.findById(id, PostBody);
};

const calculateFilters = async (req, result) => {
    // On récupère les attributs, le dernier attribut sélectionné et si la valeur a été check ou non
    const attributes            = req.body.attributes;
    const attributeLastSelected = req.body.attributeSelected ? req.body.attributeSelected.id_attribut : '';
    const checked               = req.body.checked;

    const products              = result.datas;
    const returnArray           = {};
    const returnArrayAttributes = {};
    const returnArrayToRemove   = {};

    // Pour chaque attribut
    for (let i = 0; i < attributes.length; i++) {
        const attrId = attributes[i]._id || attributes[i].id_attribut;
        // On recalcule uniquement si l'attribut bouclé est différent de celui sélectionné dans le front sauf si la valeur vient d'être uncheck dans le front
        if (attrId.toString() !== attributeLastSelected.toString() || (attrId.toString() === attributeLastSelected.toString() && checked)) {
            returnArray[attrId]           = [];
            returnArrayAttributes[attrId] = [];
            returnArrayToRemove[attrId]   = [];
            // ON parcourt tout les produits et on va distinct les différentes valeurs des attributs
            const unique = [...new Set(products.map((item) => {
                const index = item && item.attributes ? item.attributes.findIndex((att) => att.id.toString() === attrId) : -1;
                if (index > -1) {
                    return item.attributes[index].translation && item.attributes[index].translation[req.body.lang] ? item.attributes[index].translation[req.body.lang].value : item.attributes[index].value;
                }
                return null;
            }))];
            // Cas d'un attribut à sélection multiple
            if (Array.isArray(unique[0])) {
                const toPush = [];
                for (let j = 0; j < unique.length; j++) {
                    if (unique[j]) {
                        for (let k = 0; k < unique[j].length; k++) {
                            toPush.push(unique[j][k]);
                        }
                    }
                }
                returnArray[attrId] = toPush;
            } else {
                // Cas d'une liste déroulante
                returnArray[attrId] = unique;
            }
            const attr = await Attributes.findOne({_id: attrId});
            // On récupère toutes les valeurs possibles pour un attribut
            if (attributes[i].type === 'bool') {
                returnArrayAttributes[attrId] = [false, true];
            } else if (attributes[i].type === 'textfield' || attributes[i].type === 'color') {
                const prds = await require('../orm/models/products').find({});
                const arr  = [];
                for (let i = 0; i < prds.length; i++) {
                    const item = prds[i];
                    for (let j = 0; j < item.attributes.length; j++) {
                        const attribute = item.attributes[j];
                        if (attribute.id.toString() === attrId && attribute.translation[req.body.lang] && attribute.translation[req.body.lang].value) {
                            arr.push(attribute.translation[req.body.lang].value);
                        }
                    }
                }
                returnArrayAttributes[attrId] = [...new Set(arr)];
            } else {
                returnArrayAttributes[attrId] = attr.toObject().translation && attr.toObject().translation[req.body.lang] ? attr.toObject().translation[req.body.lang].values : attr.toObject().values;
            }
        }
    }
    for (let i = 0; i < Object.keys(returnArray).length; i++) {
        // On connaît les attributs à garder mais il faut donc calculer les attributs à supprimer
        if (returnArrayAttributes[Object.keys(returnArray)[i]]) {
            returnArrayToRemove[Object.keys(returnArray)[i]] = returnArrayAttributes[Object.keys(returnArray)[i]].filter((x) => !returnArray[Object.keys(returnArray)[i]].includes(x));
        }
    }

    result.dynamicFilters = {
        removes : returnArrayToRemove,
        keep    : returnArray
    };
    return result;
};

const setProduct = async (req) => {
    // On update le produit
    const product = await Products.findById(req.body._id);
    if (!product) throw NSErrors.ProductNotFound;
    // On met à jour le slug du produit
    if (req.body.autoSlug) req.body._slug = `${utils.slugify(req.body.name)}-${req.body.id}`;
    await utilsDatabase.checkSlugExist(req.body, Products);
    const result = await product.updateData(req.body);
    await ProductsPreview.deleteOne({code: req.body.code});
    await Products.findOne({code: result.code}).populate(['bundle_sections.products._id']);
};

const createProduct = async (req) => {
    // On vérifie que l'id n'est pas déjà pris
    const product = await Products.findOne({_id: req.body._id});
    if (product) throw NSErrors.ProductIdExisting;
    switch (req.body.type) {
    case 'simple':
        req.body.kind = 'SimpleProduct';
        break;
    case 'virtual':
        req.body.kind = 'VirtualProduct';
        break;
    case 'bundle':
        req.body.kind = 'BundleProduct';
        break;
    default:
        break;
    }
    if (req.body.set_attributes === undefined) {
        req.body.attributes          = [];
        const setAtt                 = await SetAttributes.findOne({code: 'defaut'});
        req.body.set_attributes_name = setAtt.name;
        req.body.set_attributes      = setAtt._id;
        for (const attrs of setAtt.attributes) {
            const attr = await Attributes.findOne({_id: attrs});
            if (attr != null) {
                let arrAttr = [];
                arrAttr     = JSON.parse(JSON.stringify(attr));
                arrAttr.id  = attr._id;
                req.body.attributes.push(arrAttr);
            }
        }
        const result = await Products.create(req.body);
        aquilaEvents.emit('aqProductCreated', result._id);
        return result;
    }
    req.body.code = utils.slugify(req.body.code);
    await utilsDatabase.checkSlugExist(req.body, Products);
    const res = await Products.create(req.body);
    aquilaEvents.emit('aqProductCreated', res._id);
    return res;
};

/**
 * @todo maybe replace map by a for of to fix eslint problem ?
 */
const deleteProduct = async (_id) => {
    if (!mongoose.Types.ObjectId.isValid(_id)) throw NSErrors.InvalidObjectIdError;
    const doc = await Products.findOneAndRemove({_id});
    if (!doc) throw NSErrors.ProductNotFound;
    await Categories.updateMany({}, {$pull: {productsList: {id: _id}}});
    await Products.updateMany({}, {$pull: {associated_prds: _id}});
    const products = await Products.find({type: 'bundle'});
    for (let i = 0; i < products.length; i++) {
        const prd = products[i];
        for (const section of prd.bundle_sections) {
            const prdIndex = section.products.findIndex((sectionPrd) => sectionPrd.id.toString() === _id.toString());
            if (prdIndex > -1) {
                section.products.splice(prdIndex, 1);
            }
        }
        // prd.bundle_sections.map((section) => {
        //     const prdIndex = section.products.findIndex((sectionPrd) => sectionPrd.id.toString() === _id.toString());
        //     if (prdIndex > -1) {
        //         section.products.splice(prdIndex, 1);
        //     }
        // });
        prd.save();
    }
    return doc;
};

/**
 * Controle la commandabilité d'un produit par rapport à ses stocks
 * @param   {object}  objstock Objet stock du produit²
 * @param   {number?} qtecdé   Quantité a commander
 * @returns {object}  Informations de retour
 */
const checkProductOrderable = async (objstock, qtecdé = 0) => {
    let prdStock = {};
    // si objstock est un id, on recupere le produit
    if (typeof objstock === 'string') {
        prdStock = (await Products.findById(objstock)).stock;
    } else {
        prdStock = objstock;
    }
    const datas = {
        selling : {// Affichage
            sellable : false,   // Produit vendable (affichage du bouton d'achat en gros)
            message  : ''       // Libelé à afficher
        },
        delivery : {// Livraison
            dates : []          // Eventuelles dates de livraison (donne indication sur le nombre de ligne à créer). Si y'en a deux, il faut aussi passer le status à "dif"
        }
    };
    if (qtecdé > 0) {
        datas.ordering = {// Produit commandable
            orderable : false,  // Ajoutable au panier / commandable (par rapport à la demande)
            message   : ''      // Message de retour à afficher dans un toast (succes ou erreur)
        };
    }

    // si qtecdé est null, c'est que l'on teste si un produit bundle est orderable ou non
    if (qtecdé === null) {
        if (prdStock.status === 'epu') {
            datas.selling.message = {code: 'Épuisé', translation: {fr: 'Produit définitivement épuisé', en: 'Product permanently out of stock'}};
            return datas;
        }
    }

    const change_lib_stock = 5; // a récup en bdd

    if (typeof prdStock.date_selling !== 'undefined'/* && prdStock.date_selling > date.now() */) {
        datas.selling.message   = {code: 'OrderableFrom', translation: {fr: `Commandable à partir du ${prdStock.date_selling}`, en: `Orderable from ${prdStock.date_selling}`}};
        datas.delivery.dates[0] = prdStock.date_selling;
    } else if (prdStock.qty_real === 0 && prdStock.status === 'epu') {
        datas.selling.message = {code: 'Épuisé', translation: {fr: 'Produit définitivement épuisé', en: 'Product permanently out of stock'}};
    } else if (prdStock.qty_real <= change_lib_stock) {
        datas.selling.message   = {code: 'NbObjAvailable', translation: {fr: `Plus que ${prdStock.qty_real} produits disponibles`, en: `Only ${prdStock.qty_real} products available`}};
        datas.delivery.dates[0] = 'today';
        datas.selling.sellable  = true;
    } else {
        datas.selling.message   = {code: 'Livrable', translation: {fr: 'Produit disponible', en: 'Available product'}};
        datas.delivery.dates[0] = 'today';
        datas.selling.sellable  = true;
    }

    // Commandable ?
    if (qtecdé > 0 && datas.selling.sellable) {
        if (qtecdé > prdStock.qty_real) {
            datas.ordering.message = {code: 'NotEnoughPdts', translation: {fr: 'Pas assez de produits disponibles pour votre commande.', en: 'There not enough products in our stock for your order.'}};
        } else {
            datas.ordering.orderable = true;
        }
    }

    return datas;
};

/**
 * Controle la cohérence de chaque produit
 * @returns {object}  Informations sur les produits incohérent
 */
const controlAllProducts = async (option) => {
    try {
        const languages   = await servicesLanguages.getLanguages({filter: {status: 'visible'}, limit: 100});
        const tabLang     = languages.datas.map((_lang) => _lang.code);
        const _config     = await Configuration.findOne({}, {stockOrder: 1});
        let fixAttributs  = false;
        let returnErrors  = '';
        let returnWarning = '';
        let productsList;
        if (option) {
            productsList = [await Products.findOne({_id: mongoose.Types.ObjectId(option)})];
        } else {
            productsList = await Products.find({});
        }
        for (const oneProduct of productsList) {
            // Control du code
            if (typeof oneProduct.code === 'undefined' || oneProduct.code === '') {
                returnErrors += `<b>${oneProduct._id}</b> : Code undefined<br/>`;
                continue;
            }

            // Control par langue
            for (let iLang = 0; iLang < tabLang.length; iLang++) {
                const currentLang = tabLang[iLang];

                // Control de translation
                if (typeof oneProduct.translation === 'undefined' || typeof oneProduct.translation[currentLang] === 'undefined') {
                    returnErrors += `<b>${oneProduct.code}</b> : Language (${currentLang}) undefined<br/>`;
                    continue;
                }

                // Control du nom
                if (typeof oneProduct.translation[currentLang].name === 'undefined' || oneProduct.translation[currentLang].name === '') {
                    returnErrors += `<b>${oneProduct.code}</b> : Name undefined (${currentLang})<br/>`;
                }

                // Control du slug
                if (typeof oneProduct.translation[currentLang].slug === 'undefined' || oneProduct.translation[currentLang].slug === '') {
                    returnErrors += `<b>${oneProduct.code}</b> : Slug undefined (${currentLang})<br/>`;
                }

                // Control des attributs 1 : vérifie la localisation
                for (let iAttri = 0; iAttri < oneProduct.attributes.length; iAttri++) {
                    if (!oneProduct.attributes[iAttri].translation || !oneProduct.attributes[iAttri].translation[currentLang]) {
                        returnErrors += `<b>${oneProduct.code}</b> : attributes '<i>${oneProduct.attributes[iAttri].code}</i>' lake of translate (${currentLang})<br/>`;
                    }
                }
            } // End Control par langue

            // Control des images
            if (typeof oneProduct.images === 'undefined' || oneProduct.images.length === 0) {
                returnWarning += `<b>${oneProduct.code}</b> : No image<br/>`;
            }
            if (oneProduct.images.length > 0 && typeof utilsMedias.getProductImageUrl(oneProduct) === 'undefined') {
                returnErrors += `<b>${oneProduct.code}</b> : No main image<br/>`;
            }
            if (oneProduct.images.length > 0) {
                for (let i = 0; i < oneProduct.images.length; i++) {
                    if (!await utilsMedias.existsFile(decodeURIComponent(oneProduct.images[i].url))) {
                        returnWarning += `<b>${oneProduct.code}</b> : Image ${i} not exist<br/>`;
                    }
                }
            }

            // Control du prix
            if (typeof oneProduct.price.et.normal === 'undefined' || oneProduct.price.et.normal <= 0 || typeof oneProduct.price.ati.normal === 'undefined' || oneProduct.price.ati.normal <= 0) {
                returnWarning += `<b>${oneProduct.code}</b> : Price is undefined or zero<br/>`;
            }

            // Control du prix spécial
            if (
                (
                    !(typeof oneProduct.price.et.special === 'undefined' || oneProduct.price.et.special == null)
                    && oneProduct.price.et.special <= 0
                )
                || (
                    !(typeof oneProduct.price.ati.special === 'undefined' || oneProduct.price.ati.special == null)
                    && oneProduct.price.ati.special <= 0
                )
            ) {
                returnWarning += `<b>${oneProduct.code}</b> : Special price is maybe wrong<br/>`;
            }

            // Control du stock
            if (_config.stockOrder.bookingStock !== 'none' && oneProduct.type !== 'bundle') { // On gère le stock
                if (typeof oneProduct.stock === 'undefined' || oneProduct.stock.length === 0 || (oneProduct.stock.qty <= 0 && oneProduct.stock.status === 'liv')) {
                    returnWarning += `<b>${oneProduct.code}</b> : Stock issues<br/>`;
                }
            }

            // Control du poids
            if (typeof oneProduct.weight === 'undefined' || oneProduct.weight <= 0) {
                returnWarning += `<b>${oneProduct.code}</b> : No weight<br/>`;
            }

            // Control des attributs 2 : vérifie le bon nombre d'attributs par rapport au SetAttributs
            if (!oneProduct.set_attributes) {
                returnErrors += `<b>${oneProduct.code}</b> : set_attributes is undefined<br/>`;
            } else {
                const usedSetAttribut = await serviceSetAttributs.getSetAttributeById(oneProduct.set_attributes, {structure: {attributes: 1}});
                if (oneProduct.attributes.length !== usedSetAttribut.attributes.length) {
                    returnErrors += `<b>${oneProduct.code}</b> : ${usedSetAttribut.attributes.length - oneProduct.attributes.length} attribute(s) missing<br/>`;
                }
            }
            // Control des attributs 3 : vérifie l'ordre des attributs
            if (!checkAttribsValidity(oneProduct.attributes)) {
                returnWarning += `<b>${oneProduct.code}</b> : Unsorted attributes<br/>`;
                fixAttributs   = true;
            }

            // Control de la catégorisation
            await Categories.find({'productsList.id': oneProduct._id.toString()}, (err, categories) => {
                if (typeof categories === 'undefined' || categories.length === 0) {
                    returnWarning += `<b>${oneProduct.code}</b> : No category<br/>`;
                }
            });
        }

        // Affichage du résumé
        if (returnErrors.length !== 0) returnErrors = `<br/>Errors :<br/>${returnErrors}`;
        if (returnWarning.length !== 0) returnWarning = `<br/>Warning :<br/>${returnWarning}`;
        if (returnErrors.length === 0 && returnWarning.length === 0) returnErrors = 'All products are fine';

        // AutoFix :
        try {
            if (fixAttributs) {await require('./devScripts').sortAttribs();}
        } catch (ee) {
            returnErrors += `sortAttribs : ${ee.toString()}`;
        }

        return returnErrors + returnWarning;
    } catch (error) {
        if (error.message) {return error.message;}
        return error;
    }
};

/**
 * @return types:
 *      true => sorted array
 *      false => unsorted array
 * @param:
 *      array => product.attributes
 */
function checkAttribsValidity(array) {
    const sorted = array.slice(0);
    sorted.sort((first, second) => {
        if (first.code < second.code) return -1;
        if (first.code > second.code) return 1;
        return 0;
    });
    for (let i = 0; i < array.length; i++) {
        if (array[i].code !== sorted[i].code) {
            return false;
        }
    }
    return true;
}

const applyTranslatedAttribs = async (PostBody) => {
    require('../utils/utils').tmp_use_route('products_service', 'applyTranslatedAttribs');

    try {
        // On récupere ts les produits
        let _products = [];
        if (PostBody === {} || PostBody === undefined) {
            _products = await Products.find({});
        } else {
            _products = [await queryBuilder.find(PostBody)];
        }
        // On récupere ts les attributs
        const _attribs = await Attributes.find({});

        // On boucle sur les produits
        for (let i = 0; i < _products.length; i++) {
            if (_products[i].attributes !== undefined) {
                // On boucle sur les attributs du produit [i]
                for (let j = 0; j < _products[i].attributes.length; j++) {
                    // On recupere l'attribut original correspondant a l'attribut [j] du produit [i]
                    const attrib = _attribs.find((attrib) => attrib._id.toString() === _products[i].attributes[j].id.toString());

                    if (attrib && attrib.translation) {
                        // On boucle sur chaque langue dans laquelle l'attribut original est traduit
                        for (let k = 0; k < Object.keys(attrib.translation).length; k++) {
                            const lang = Object.keys(attrib.translation)[k];
                            if (_products[i].attributes[j].translation[lang] === undefined) {
                                _products[i].attributes[j].translation[lang] = {name: ''};
                            }
                            _products[i].attributes[j].translation[lang].name = attrib.translation[lang].name;
                        }
                    }
                }
                await Products.updateOne({_id: _products[i]._id}, {$set: {attributes: _products[i].attributes}});
            }
        }
        return 'OK';
    } catch (e) {
        console.error(e);
        return 'ERROR';
    }
};

function getTaxDisplay(user) {
    if (user && user.taxDisplay !== undefined) {
        if (!user.taxDisplay) {
            return 'et';
        }
    }
    return 'ati';
}

const downloadProduct = async (req, res) => {
    let prd    = {};
    const user = req.info;

    // si produit payant et que l'on passe par une commande
    if (req.query.op_id) {
        // on check que la commande et le produit existe

        // require('./orders') : need to use require there because circular reference is detected
        const order = await require('./orders').getOrder({
            filter    : {'customer.id': user._id.toString(), 'items._id': req.query.op_id},
            structure : '*',
            populate  : 'items.id'
        });
        if (!order) {
            throw NSErrors.OrderNotFound;
        }
        if (['PAID', 'BILLED'].indexOf(order.status) === -1) {
            throw NSErrors.OrderNotPaid;
        }
        prd = order.items.find((item) => item._id.toString() === req.query.op_id.toString()).id;
        // on check que le produit est bien dans le commande
        if (!prd) {
            throw NSErrors.ProductNotFoundInOrder;
        }
        // si produit (p_id)
    } else if (req.query.p_id) {
        prd = await getProduct({filter: {_id: req.query.p_id}, structure: '*'}, {req, res}, undefined);
        // on check qu'il soit bien virtuel, et que sont prix est egal a 0
        if (!prd || prd.kind !== 'VirtualProduct') {
            throw NSErrors.ProductNotFound;
        } else if (prd.price.ati.special !== undefined) {
            if (prd.price.ati.special > 0) {
                throw NSErrors.AccesUnauthorized;
            }
        } else if (prd.price.ati.normal !== undefined) {
            if (prd.price.ati.normal > 0) {
                throw NSErrors.AccesUnauthorized;
            }
        }
    } else {
        throw NSErrors.AccesUnauthorized;
    }
    if (!prd.downloadLink) throw NSErrors.ProductDownloadLinkInvalid;
    // on genere le path du fichier temp en local
    let tmpFileLocalPath;
    let unlink = true;
    if (/^https?:\/\//.test(prd.downloadLink)) {
        try {
            tmpFileLocalPath = path.join(
                utilsServer.getUploadDirectory(),
                `/modules/${(new Date()).getTime()}${path.basename(prd.downloadLink)}`
            );
            // on DL le fichier
            await utils.downloadFile(prd.downloadLink, tmpFileLocalPath);
        } catch (err) {
            console.error(err);
            throw NSErrors.ProductDownloadLinkInvalid;
        }
    } else {
        unlink           = false;
        tmpFileLocalPath = path.resolve(
            utilsServer.getUploadDirectory(),
            'medias',
            prd.downloadLink
        );
    }
    // on recupere le binaire du fichier
    const fileBinary = await fs.readFile(tmpFileLocalPath, 'binary');
    // on delete le fichier tmp
    if (unlink) await fs.unlinkSync(tmpFileLocalPath);
    // on enregistre que le client télécharge un produit
    await ServicesDownloadHistory.addToHistory(user, prd);
    return fileBinary;
};

const getProductsListing = async (req, res) => {
    // TODO P1 : bug lors d'un populate (produit complémentaires) : il faut les filtrer par actif / visible
    const result = await getProducts(req.body.PostBody, {req, res}, req.body.lang, false);
    if (req.params.withFilters === 'true') {
        delete req.body.PostBody.page;
        delete req.body.PostBody.limit;

        const attrs = await Attributes.find({usedInFilters: true});
        if (!result.filters) {
            result.filters = {};
        }
        result.filters.attributes = attrs.map((attr) => ({
            id_attribut : attr._id,
            code        : attr.code,
            type        : attr.type,
            position    : attr.position,
            translation : attr.translation
        }));

        await servicesCategory.generateFilters(result, req.body.lang);
    }
    if ({req, res} !== undefined && req.params.withFilters === 'true') {
        res.locals.datas = result.datas;
        /* const productsDiscount = await servicePromos.middlewarePromoCatalog(req, res);
        result.datas = productsDiscount.datas; */
        // Ce bout de code permet de recalculer les prix en fonction des filtres notamment après le middlewarePromoCatalog
        // Le code se base sur le fait que les filtres de prix seront dans PostBody.filter.$and[0].$or
        if (
            req.body.PostBody.filter.$and
            && req.body.PostBody.filter.$and[0]
            && req.body.PostBody.filter.$and[0].$or
        ) {
            result.datas = result.datas.filter((prd) =>  {
                const pr = prd.price.ati.special || prd.price.ati.normal;
                return pr >= (
                    req.body.PostBody.filter.$and[0].$or[1]['price.ati.special'].$gte
                    || req.body.PostBody.filter.$and[0].$or[0]['price.ati.normal'].$gte)
                    && pr <= (req.body.PostBody.filter.$and[0].$or[1]['price.ati.special'].$lte
                    || req.body.PostBody.filter.$and[0].$or[0]['price.ati.normal'].$lte);
            });
        }
    }
    return result;
};

const updateStock = async (productId, qty1 = 0, qty2 = undefined) => {
    const prd = await Products.findOne({_id: productId, type: 'simple'});
    if (prd.stock.date_selling > new Date() && prd.stock.status !== 'dif') {
        throw NSErrors.ProductNotSalable;
    }
    // si qty2 existe, c'est soit un retour produit ou d'un envoi de colis
    if (qty2 !== undefined) {
        // si qty2 === 0, il s'agit d'un retour produit, sino, c'est un envoi
        if (qty2 === 0) {
            // qty1 = la quantité à retourné
            const qtyToReturn = qty1;
            prd.stock.qty    += qtyToReturn;
        } else if (qty1 === 0) {
            const qtyToSend       = qty2;
            prd.stock.qty        += qtyToSend;
            prd.stock.qty_booked += qtyToSend;
        }
    } else {
        // dans le cas d'un ajout au panier, qty change ou d'une suppression d'item dans un panier
        const qtyToAddOrRemove = qty1;
        prd.stock.qty_booked  -= qtyToAddOrRemove;
    }
    await prd.save();
};

const handleStock = async (item, _product, inStockQty) => {
    const {Configuration} = require('../orm/models');
    const config          = await Configuration.findOne({}, {stockOrder: 1});
    if (config.stockOrder.bookingStock === 'panier') {
        if (_product.stock && _product.stock.date_selling > new Date() && _product.stock.status !== 'dif') {
            const product_no_salable = {code: 'product_no_salable'};
            throw product_no_salable;
        }
        // Commandable et on gère la reservation du stock
        const qtyAdded    = inStockQty - item.quantity;
        const ServiceCart = require('./cart');
        if (await ServiceCart.checkProductOrderable(_product.stock, qtyAdded)) {
            _product.stock.qty_booked = qtyAdded + _product.stock.qty_booked;
            await _product.save();
        } else {
            throw NSErrors.ProductNotInStock;
        }
    }
};

/**
 * Fonction permettant de calculer les informations de stock pour un produit
 */
const calculStock = async (params, product = undefined) => {
    moment.locale('fr', {
        workingWeekdays : [1, 2, 3, 4, 5]
    });
    moment.locale(global.defaultLang);
    const stockLabels = global.envConfig.stockOrder.labels;
    if (!product) {
        product = await Products.findOne({_id: params.idProduct});
    }
    if (product.type !== 'simple') {
        return undefined;
    }
    let date = moment();
    if (product.stock.date_selling && moment(product.stock.date_selling).isAfter(moment())) {
        date = product.stock.date_selling;
    } else if (product.stock.date_supply && moment(product.stock.date_supply).isAfter(moment())) {
        date = product.stock.date_supply;
    }
    const stockLabelExists = stockLabels.find((label) => label.code === product.stock.label);
    let label              = '';
    if (stockLabelExists) {
        label = date && stockLabelExists.translation[params.lang] && stockLabelExists.translation[params.lang].value
            ? stockLabelExists.translation[params.lang].value.replace('{date}', moment(date).format('DD/MM/YYYY'))
            : stockLabelExists.translation[params.lang].value;
    }
    // TODO P2 "shipping : business day" : ne marche plus, on met le jour même en dur
    // const dateShipped = moment().businessAdd(shipment.delay.unit === "DAY" ? shipment.delay.value : 1).format('DD/MM/YYYY');
    const dateShipped = moment().format('DD/MM/YYYY');
    return {
        label,
        dateShipped,
        status    : product.stock.status,
        qty       : product.stock.qty,
        orderable : product.stock.orderable,
        qty_real  : product.stock.qty_real,
        product
    };
};

module.exports = {
    getProducts,
    getProduct,
    getPromosByProduct,
    duplicateProduct,
    _getProductsByCategoryId,
    getProductById,
    calculateFilters,
    setProduct,
    createProduct,
    deleteProduct,
    checkProductOrderable,
    controlAllProducts,
    applyTranslatedAttribs,
    downloadProduct,
    getProductsListing,
    updateStock,
    handleStock,
    calculStock,
    restrictedFields
};