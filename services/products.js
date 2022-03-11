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
const {aquilaEvents}          = require('aql-utils');
const fs                      = require('../utils/fsp');
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
const {
    Configuration,
    Products,
    ProductsPreview,
    Categories,
    Attributes
}                             = require('../orm/models');

let restrictedFields = ['price.purchase', 'downloadLink'];
const defaultFields  = ['_id', 'type', 'name', 'price', 'images', 'pictos', 'translation', 'variants', 'variants_values'];

const queryBuilder        = new QueryBuilder(Products, restrictedFields, defaultFields);
const queryBuilderPreview = new QueryBuilder(ProductsPreview, restrictedFields, defaultFields);

// if in the config, we ask not to return the stock fields, we add them to the restrictedFields
if (global.envConfig?.stockOrder?.returnStockToFront !== true) {
    restrictedFields = restrictedFields.concat(['stock.qty', 'stock.qty_booked', 'stock.qty_real']);
}

/**
 * When a product is retrieved, the minimum and maximum price of the products found by the queryBuilder is also added
 * @param {PostBody} PostBody
 * @param {Express.Request} reqRes
 * @param {string} lang
 */
// eslint-disable-next-line no-unused-vars
const getProducts = async (PostBody, reqRes, lang) => {
    let properties = [];
    let structure;
    if (PostBody && PostBody.structure) {
        // required to have all fields for promo rules
        structure  = PostBody.structure;
        properties = Object.keys(PostBody.structure).concat(defaultFields);
        properties.push('_id');
        delete PostBody.structure;
        if (properties.includes('score')) {
            PostBody.structure = {score: structure.score};
        }
        queryBuilder.defaultFields = ['*'];
    }
    // The fulltext search does not allow to cut words (search "TO" in "TOTO")
    if (PostBody && PostBody.filter && PostBody.filter.$text) {
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

    // We delete the reviews that are not visible and verify
    if (PostBody && structure && structure.reviews === 1) {
        serviceReviews.keepVisibleAndVerifyArray(result);
    }

    const prds              = await Products.find(PostBody.filter).lean();
    const arrayPrice        = {et: [], ati: []};
    const arraySpecialPrice = {et: [], ati: []};
    for (const prd of prds) {
        arrayPrice.et.push(prd.price.et.normal);
        arrayPrice.ati.push(prd.price.ati.normal);
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
        }
        if (prd.price.ati.special) {
            arraySpecialPrice.ati.push(prd.price.ati.special);
        }
    }

    result.specialPriceMin = {
        et  : Math.min(...arraySpecialPrice.et),
        ati : Math.min(...arraySpecialPrice.ati)
    };
    result.specialPriceMax = {
        et  : Math.max(...arraySpecialPrice.et),
        ati : Math.max(...arraySpecialPrice.ati)
    };

    return result;
};

/**
 * Get the product corresponding to the PostBody filter
 * @param {*} PostBody
 * @param reqRes
 * @param keepReviews
 */
const getProduct = async (PostBody, reqRes = undefined, keepReviews = false, lang = global.defaultLang) => {
    let product;
    if (reqRes && reqRes.req.query.preview) {
        PostBody.filter = {_id: reqRes.req.query.preview};
        product         = await queryBuilderPreview.findOne(PostBody, false);
    } else {
        product = await queryBuilder.findOne(PostBody, false);
    }
    if (!product) {
        return product;
    }

    // We delete the reviews that are not visible and verify
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
 * Get the discount corresponding to the requested product
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
 * Product duplication in the back office
 */
const duplicateProduct = async (idProduct, newCode) => {
    const doc       = await Products.findById(idProduct);
    doc._id         = mongoose.Types.ObjectId();
    const languages = await mongoose.model('languages').find({});

    for (const lang of Object.entries(doc.translation)) {
        if (doc.translation[lang[0]].canonical) {
            delete doc.translation[lang[0]].canonical;
            delete doc.translation[lang[0]].slug;
        }
    }

    for (const lang of languages) {
        if (!doc.translation[lang.code]) {
            doc.translation[lang.code] = {};
        }
        doc.translation[lang.code].slug = utils.slugify(doc._id.toString());
    }
    doc.isNew    = true;
    doc.images   = [];
    doc.reviews  = {
        average    : 0,
        reviews_nb : 0,
        questions  : [],
        datas      : []
    };
    doc.stats    = {
        views : 0
    };
    doc.stock    = {
        qty        : 0,
        qty_booked : 0,
        orderable  : false,
        status     : 'liv'
    };
    doc.code     = utils.slugify(newCode);
    doc.active   = false;
    doc._visible = false;
    await doc.save();
    return doc;
};

const _getProductsByCategoryId = async (id, PostBody = {}, lang, isAdmin = false, user, reqRes = undefined) => global.cache.get(
    `${id}_${lang || ''}_${isAdmin}_${JSON.stringify(PostBody)}_${user ? user._id : ''}`,
    async () => getProductsByCategoryId(id, PostBody, lang, isAdmin, user, reqRes)
);

/**
 * We get the products contained in a category
 * @param {*} id category id
 * @param {*} PostBody
 * @param {*} lang
 * @param isAdmin
 * @param user
 * @param reqRes
 */
const getProductsByCategoryId = async (id, PostBody = {}, lang, isAdmin = false, user, reqRes = undefined) => {
    moment.locale(global.defaultLang);
    lang = servicesLanguages.getDefaultLang(lang);
    // If admin then we populate all documents without visibility or asset restriction
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
        // We delete products from productsList depending on inProducts (true or false)
        for (let i = menu.productsList.length - 1; i >= 0; i--) {
            const prd = menu.productsList[i];
            if (prd.checked !== PostBody.filter.inProducts) {
                menu.productsList.splice(i, 1);
            }
        }
        delete PostBody.filter.inProducts;
        delete PostBody.filter.productsIds;
    }
    // If a productsList.id does not respond to the match then productsList.id === null
    if (global.envConfig.stockOrder.bookingStock !== 'none') { // Imperative need of stock if one manages it
        PostBody.structure.stock = 1;
    }

    // We check that the PostBody information is correct
    const {limit, skip} = queryBuilder.verifyPostBody(PostBody, 'find');
    // We get the products sorted by sortWeight, and we slice(filter.skip, filter.limit)

    PostBody.filter._id = {$in: menu.productsList.map((item) => item.id.toString())};
    // Get products from productList
    const result = await queryBuilder.find(PostBody, true);
    if ((PostBody.sort && PostBody.sort.sortWeight) || !PostBody.sort) {
        // We add the sortWeight corresponding to the product in the product doc
        menu.productsList.forEach((product) => {
            const ProdFound = result.datas.find((resProd) => resProd._id.toString() === product.id.toString());
            // add sortWeight to result.datas[i] (modification of an object by reference)
            if (ProdFound) {
                ProdFound.sortWeight = product.sortWeight;
            }
        });
        // Products are sorted by weight
        result.datas.sort((p1, p2) => p2.sortWeight - p1.sortWeight);
    }
    if (global.envConfig.stockOrder.bookingStock !== 'none') {
        for (let i = 0; i < result.datas.length; i++) {
            const product   = result.datas[i];
            const stockData = await calculStock({lang}, product);
            if (product.type === 'simple') {
                // TODO P2 "shipping : business day" : doesn't work anymore, we put the same day in hard
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

    // We collect all the products belonging to this category in order to have the min and max
    let priceFilter;
    if (PostBody.filter.$and) {
        priceFilter = PostBody.filter.$and[0];
        PostBody.filter.$and.shift();
        if (PostBody.filter.$and.length === 0) delete PostBody.filter.$and;
    }
    // we use lean to greatly improve the performance of the query (x3 faster)
    // {virtuals: true} allows to get virtual fields (stock.qty_real)
    let prds       = await Products
        .find(PostBody.filter)
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
            arrayPrice.et.push(prd.price.et.normal);
            arrayPrice.ati.push(prd.price.ati.normal);
        }
    }

    const priceMin = {et: Math.min(...arrayPrice.et), ati: Math.min(...arrayPrice.ati)};
    const priceMax = {et: Math.max(...arrayPrice.et), ati: Math.max(...arrayPrice.ati)};

    for (const prd of prdsPrices) {
        if (prd.price) {
            if (prd.price.et.special) {
                arraySpecialPrice.et.push(prd.price.et.special);
            }
            if (prd.price.ati.special) {
                arraySpecialPrice.ati.push(prd.price.ati.special);
            }
        }
    }

    const specialPriceMin = {et: Math.min(...arraySpecialPrice.et), ati: Math.min(...arraySpecialPrice.ati)};
    const specialPriceMax = {et: Math.max(...arraySpecialPrice.et), ati: Math.max(...arraySpecialPrice.ati)};

    // Get only the image having for default = true if no image found we take the first image of the product
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
            // add sortWeight to result.datas[i] (modification of an object by reference)
            if (idx > -1) {
                prds[index].sortWeight = menu.productsList[idx].sortWeight;
            } else {
                prds[index].sortWeight = -1;
            }
        });

        // Products are sorted by weight, sorting by relevance is always done from most relevant to least relevant
        prds.sort((p1, p2) => p2.sortWeight - p1.sortWeight);
    }

    let products = prds.slice(skip, limit + skip);

    // TODO P5 (hot) the code below allows to return the structure that we send in the PostBody because currently it returns all the fields
    // this code does not work because _doc does not exist in products and removeFromStructure needs it
    // if (Object.keys(PostBody.structure).length > 0) {
    //     queryBuilder.removeFromStructure(PostBody.structure, tProducts);
    // }

    if (reqRes !== undefined && PostBody.withPromos !== false) {
        reqRes.res.locals.datas  = products;
        reqRes.req.body.PostBody = PostBody;
        const productsDiscount   = await servicePromos.middlewarePromoCatalog(reqRes.req, reqRes.res);
        products                 = productsDiscount.datas;
        // This code snippet allows to recalculate the prices according to the filters especially after the middlewarePromoCatalog
        // The code is based on the fact that the price filters will be in PostBody.filter.$and[0].$or
    }
    if (PostBody.filter.$and && PostBody.filter.$and[0] && PostBody.filter.$and[0].$or && PostBody.filter.$and[0].$or[0][`price.${getTaxDisplay(user)}.normal`]) {
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

const getProductById = async (id, PostBody = null) => queryBuilder.findById(id, PostBody);

const calculateFilters = async (req, result) => {
    // We recover the attributes, the last selected attribute and if the value has been checked or not
    const attributes            = req.body.attributes;
    const attributeLastSelected = req.body.attributeSelected ? req.body.attributeSelected.id_attribut : '';
    const checked               = req.body.checked;

    const products              = result.datas;
    const returnArray           = {};
    const returnArrayAttributes = {};
    const returnArrayToRemove   = {};

    // For each attribute
    for (let i = 0; i < attributes.length; i++) {
        const attrId = attributes[i]._id || attributes[i].id_attribut;
        // We recalculate only if the looped attribute is different from the one selected in the front except if the value has just been unchecked in the front
        if (attrId.toString() !== attributeLastSelected.toString() || (attrId.toString() === attributeLastSelected.toString() && checked)) {
            returnArray[attrId]           = [];
            returnArrayAttributes[attrId] = [];
            returnArrayToRemove[attrId]   = [];
            // We go through all the products and we will distinguish the different values of the attributes
            const unique = [...new Set(products.map((item) => {
                const index = item && item.attributes ? item.attributes.findIndex((att) => att.id.toString() === attrId) : -1;
                if (index > -1) {
                    return item.attributes[index].translation && item.attributes[index].translation[req.body.lang] ? item.attributes[index].translation[req.body.lang].value : item.attributes[index].value;
                }
                return null;
            }))];
            // Case of an attribute with multiple selection
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
                // Case of a drop-down list
                returnArray[attrId] = unique;
            }
            const attr = await Attributes.findOne({_id: attrId});
            // We get all possible values for an attribute
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
        // We know the attributes to keep but we must calculate the attributes to delete
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
    // We update the product
    let product = await Products.findById(req.body._id);
    if (!product) throw NSErrors.ProductNotFound;
    if (product.type !== req.body.type) product = await changeProductType(product, req.body.type);
    // We update the product slug
    if (req.body.autoSlug) req.body._slug = `${utils.slugify(req.body.code)}-${req.body.id}`;
    const result = await product.updateData(req.body);
    if (result.code === 'SlugAlreadyExist' ) {
        throw NSErrors.SlugAlreadyExist;
    }
    await ProductsPreview.deleteOne({code: req.body.code});
    return Products.findOne({code: result.code}).populate(['bundle_sections.products.id']);
};

const createProduct = async (req) => {
    // We check that the id is not already taken
    const product = await Products.findOne({_id: req.body._id});
    if (product) throw NSErrors.ProductIdExisting;
    let body = req.body;
    if (body.set_attributes === undefined) {
        body = await serviceSetAttributs.addAttributesToProduct(body);
    }
    body.code = utils.slugify(body.code);
    const res = await Products.create(body);
    aquilaEvents.emit('aqProductCreated', res._id);
    return res;
};

/**
 * Remove product
 */
const deleteProduct = async (_id) => {
    if (!mongoose.Types.ObjectId.isValid(_id)) {
        throw NSErrors.InvalidObjectIdError;
    }
    const doc = await Products.findOneAndRemove({_id});
    if (!doc) {
        throw NSErrors.ProductNotFound;
    }
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
        prd.save();
    }
    return doc;
};

/**
 * Controls the orderability of a product in relation to its inventory
 * @param   {object}  objstock Product stock item
 * @param   {number?} qtecdé   Quantity to order
 * @returns {object}  Return Information
 */
const checkProductOrderable = async (objstock, qtecdé = 0, selected_variant  = undefined) => {
    let prdStock = {};
    // if objstock is an id, we get the product
    if (selected_variant) {
        prdStock = {
            ...selected_variant.stock,
            qty_real : Number(selected_variant.stock.qty) - Number(selected_variant.stock.qty_booked)
        };
    } else if (typeof objstock === 'string') {
        prdStock = (await Products.findById(objstock)).stock;
    } else {
        prdStock = objstock;
    }
    const datas = {
        selling : {// Display
            sellable : false,   // Saleable product (display of bulk purchase button)
            message  : ''       // Label to display
        },
        delivery : {// Delivery
            dates : []          // Possible delivery dates (gives indication on the number of lines to create). If there are two, you must also change the status to "dif".
        }
    };
    if (qtecdé > 0) {
        datas.ordering = {// Orderable product
            orderable : false,  // Add to cart / orderable (on demand)
            message   : ''      // Return message to display in a toast (success or error)
        };
    }

    // if qtecdé is null, it means that we are testing if a bundle product is orderable or not
    if (qtecdé === null) {
        if (prdStock.status === 'epu') {
            datas.selling.message = {code: 'Épuisé', translation: {fr: 'Produit définitivement épuisé', en: 'Product permanently out of stock'}};
            return datas;
        }
    }

    const change_lib_stock = 5; // to recover in db

    if (typeof prdStock.date_selling !== 'undefined' && prdStock.date_selling > Date.now()) {
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

    // Orderable ?
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
 * Checks the consistency of each product
 * @returns {object}  Inconsistent product information
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
            // Code control
            if (typeof oneProduct.code === 'undefined' || oneProduct.code === '') {
                returnErrors += `<b>${oneProduct._id}</b> : Code undefined<br/>`;
                continue;
            }

            // Control by language
            for (let iLang = 0; iLang < tabLang.length; iLang++) {
                const currentLang = tabLang[iLang];

                // Translation control
                if (typeof oneProduct.translation === 'undefined' || typeof oneProduct.translation[currentLang] === 'undefined') {
                    returnErrors += `<b>${oneProduct.code}</b> : Language (${currentLang}) undefined<br/>`;
                    continue;
                }

                // Name control
                if (typeof oneProduct.translation[currentLang].name === 'undefined' || oneProduct.translation[currentLang].name === '') {
                    returnErrors += `<b>${oneProduct.code}</b> : Name undefined (${currentLang})<br/>`;
                }

                // Slug control
                if (typeof oneProduct.translation[currentLang].slug === 'undefined' || oneProduct.translation[currentLang].slug === '') {
                    returnErrors += `<b>${oneProduct.code}</b> : Slug undefined (${currentLang})<br/>`;
                }

                // Attribute control 1: checks the location
                for (let iAttri = 0; iAttri < oneProduct.attributes.length; iAttri++) {
                    if (!oneProduct.attributes[iAttri].translation || !oneProduct.attributes[iAttri].translation[currentLang]) {
                        returnErrors += `<b>${oneProduct.code}</b> : attributes '<i>${oneProduct.attributes[iAttri].code}</i>' lake of translate (${currentLang})<br/>`;
                    }
                }
            } // End Control by language

            // Image control
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

            // Price control
            if (
                typeof oneProduct.price.et.normal === 'undefined'
                || oneProduct.price.et.normal <= 0
                || typeof oneProduct.price.ati.normal === 'undefined'
                || oneProduct.price.ati.normal <= 0
            ) {
                returnWarning += `<b>${oneProduct.code}</b> : Price is undefined or zero<br/>`;
            }

            // Control of the special price
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

            // Stock control
            if (_config.stockOrder.bookingStock !== 'none' && oneProduct.type === 'simple') { // On gère le stock
                if (typeof oneProduct.stock === 'undefined' || oneProduct.stock.length === 0 || (oneProduct.stock.qty <= 0 && oneProduct.stock.status === 'liv')) {
                    returnWarning += `<b>${oneProduct.code}</b> : Stock issues<br/>`;
                }
            }

            // Weight control
            if (oneProduct.type !== 'virtual' && (typeof oneProduct.weight === 'undefined' || oneProduct.weight <= 0)) {
                returnWarning += `<b>${oneProduct.code}</b> : No weight<br/>`;
            }

            // Attribute control 2: check the right number of attributes against the SetAttributes
            if (!oneProduct.set_attributes) {
                returnErrors += `<b>${oneProduct.code}</b> : set_attributes is undefined<br/>`;
            } else {
                const usedSetAttribut = await serviceSetAttributs.getSetAttributeById(oneProduct.set_attributes, {structure: {attributes: 1}});
                if (oneProduct.attributes.length !== usedSetAttribut.attributes.length) {
                    returnErrors += `<b>${oneProduct.code}</b> : ${usedSetAttribut.attributes.length - oneProduct.attributes.length} attribute(s) missing<br/>`;
                }
            }
            // Attribute control 3: checks the order of the attributes
            if (!checkAttribsValidity(oneProduct.attributes)) {
                returnWarning += `<b>${oneProduct.code}</b> : Unsorted attributes<br/>`;
                fixAttributs   = true;
            }

            // Control of the categorization
            await Categories.find({'productsList.id': oneProduct._id.toString()}, (err, categories) => {
                if (typeof categories === 'undefined' || categories.length === 0) {
                    returnWarning += `<b>${oneProduct.code}</b> : No category<br/>`;
                }
            });
        }

        // Displaying the summary
        if (returnErrors.length !== 0) returnErrors = `<br/>Errors :<br/>${returnErrors}`;
        if (returnWarning.length !== 0) returnWarning = `<br/>Warning :<br/>${returnWarning}`;
        if (returnErrors.length === 0 && returnWarning.length === 0) returnErrors = 'All products are fine';

        // AutoFix :
        try {
            if (fixAttributs) {
                await require('./devFunctions').sortAttribs();
            }
        } catch (ee) {
            returnErrors += `sortAttribs : ${ee.toString()}`;
        }

        return returnErrors + returnWarning;
    } catch (error) {
        if (error.message) {
            return error.message;
        }
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

    // if the product is paid for and the order is placed
    if (req.query.op_id) {
        // we check that the order and the product exist

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
        // we check that the product is in the order
        if (!prd) {
            throw NSErrors.ProductNotFoundInOrder;
        }
        // if product (p_id)
    } else if (req.query.p_id) {
        prd = await getProduct({filter: {_id: req.query.p_id}, structure: '*'}, {req, res}, undefined);
        // we check that it is virtual, and that its price is equal to 0
        if (!prd || prd.type !== 'virtual') {
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
    // we generate the path of the local temp file
    let tmpFileLocalPath;
    let unlink = true;
    if (/^https?:\/\//.test(prd.downloadLink)) {
        try {
            tmpFileLocalPath = path.join(
                utilsServer.getUploadDirectory(),
                `/modules/${(new Date()).getTime()}${path.basename(prd.downloadLink)}`
            );
            // we DL the file
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
    // we get the binary of the file
    const fileBinary = await fs.readFile(tmpFileLocalPath, 'binary');
    // delete the tmp file
    if (unlink) await fs.unlinkSync(tmpFileLocalPath);
    // we register that the customer downloads a product
    await ServicesDownloadHistory.addToHistory(user, prd);
    return fileBinary;
};

const getProductsListing = async (req, res) => {
    // TODO P1 : bug during a populate (complementary products) : you have to filter them by active / visible
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
        // This code snippet allows to recalculate the prices according to the filters especially after the middlewarePromoCatalog
        // The code is based on the fact that the price filters will be in PostBody.filter.$and[0].$or
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

const updateStock = async (productId, qty1 = 0, qty2 = undefined, selected_variant) => {
    const prd = await Products.findOne({_id: productId, type: 'simple'});

    if (selected_variant) {
        await updateVariantsStock(prd, qty1, qty2, selected_variant);
    } else {
        if (prd.stock.date_selling > new Date() && prd.stock.status !== 'dif') {
            throw NSErrors.ProductNotSalable;
        } else if (!prd.stock.orderable) {
            throw NSErrors.ProductNotOrderable;
        }
        // if qty2 exists, it is either a product return or a shipment
        if (qty2 !== undefined) {
            // if qty2 === 0, it is a product return, sino, it is a shipment
            if (qty2 === 0) {
                // qty1 = the quantity to return
                const qtyToReturn = qty1;
                prd.stock.qty    += qtyToReturn;
            } else if (qty1 === 0) {
                const qtyToSend       = qty2;
                prd.stock.qty        += qtyToSend;
                prd.stock.qty_booked += qtyToSend;
            }
        } else {
            // in the case of an addition to the cart, qty change or deletion of an item in a cart
            const qtyToAddOrRemove = qty1;
            prd.stock.qty_booked  -= qtyToAddOrRemove;
        }
        await prd.save();
    }
};

const updateVariantsStock = async (prd, qty1 = 0, qty2 = undefined, selected_variant) => {
    const selectedVariantIndex = prd.variants_values.findIndex((prdVariant) => prdVariant._id.toString() === selected_variant.id);
    if (selectedVariantIndex > -1) {
        if (prd.variants_values[selectedVariantIndex].stock.date_selling > new Date() && prd.variants_values[selectedVariantIndex].stock.status !== 'dif') {
            throw NSErrors.ProductNotSalable;
        } else if (!prd.variants_values[selectedVariantIndex].stock.orderable) {
            throw NSErrors.ProductNotOrderable;
        }
        // if qty2 exists, it is either a product return or a shipment
        if (qty2 !== undefined) {
            // if qty2 === 0, it is a product return, sino, it is a shipment
            if (qty2 === 0) {
                // qty1 = the quantity to return
                const qtyToReturn                                    = qty1;
                prd.variants_values[selectedVariantIndex].stock.qty += qtyToReturn;
            } else if (qty1 === 0) {
                const qtyToSend                                             = qty2;
                prd.variants_values[selectedVariantIndex].stock.qty        += qtyToSend;
                prd.variants_values[selectedVariantIndex].stock.qty_booked += qtyToSend;
            }
        } else {
            // in the case of an addition to the cart, qty change or deletion of an item in a cart
            const qtyToAddOrRemove                                      = qty1;
            prd.variants_values[selectedVariantIndex].stock.qty_booked -= qtyToAddOrRemove;
        }
        await prd.updateData(prd);
    }
};

const handleStock = async (item, _product, inStockQty) => {
    const {Configuration} = require('../orm/models');
    const config          = await Configuration.findOne({}, {stockOrder: 1});
    if (config.stockOrder.bookingStock === 'panier') {
        if (_product.stock && _product.stock.date_selling > new Date() && _product.stock.status !== 'dif') {
            const product_no_salable = {code: 'product_no_salable'};
            throw product_no_salable;
        }
        // Orderable and we manage the stock reservation
        const qtyAdded    = inStockQty - item.quantity;
        const ServiceCart = require('./cart');
        if (ServiceCart.checkProductOrderable(_product.stock, qtyAdded, item.selected_variant)) {
            _product.stock.qty_booked = qtyAdded + _product.stock.qty_booked;
            await _product.save();
        } else {
            throw NSErrors.ProductNotInStock;
        }
    }
};

/**
 * Function to calculate stock information for a product
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
    // TODO P2 "shipping : business day" : doesn't work anymore, we put the same day in hard
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

const changeProductType = async (product, newType) => {
    const oldProduct = await Products.findOne({code: product.code});
    if (!(['simple', 'bundle', 'virtual']).includes(newType)) throw NSErrors.ProductTypeInvalid;
    if (oldProduct && newType && newType !== oldProduct.type) {
        return Products.findOneAndUpdate({_id: oldProduct._id}, {$set: {type: newType}}, {new: true});
    }
    return oldProduct;
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
    downloadProduct,
    getProductsListing,
    updateStock,
    handleStock,
    calculStock,
    restrictedFields,
    changeProductType
};