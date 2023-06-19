/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const moment                      = require('moment-business-days');
const path                        = require('path');
const mongoose                    = require('mongoose');
const Fuse                        = require('fuse.js');
const {fs, aquilaEvents, slugify} = require('aql-utils');
const QueryBuilder                = require('../utils/QueryBuilder');
const utils                       = require('../utils/utils');
const utilsServer                 = require('../utils/server');
const utilsMedias                 = require('../utils/medias');
const NSErrors                    = require('../utils/errors/NSErrors');
const servicesLanguages           = require('./languages');
const ServicesDownloadHistory     = require('./downloadHistory');
const servicesCategory            = require('./categories');
const serviceSetAttributs         = require('./setAttributes');
const servicePromos               = require('./promo');
const serviceReviews              = require('./reviews');
const {
    Configuration,
    Products,
    ProductsPreview,
    Categories,
    Attributes
}                                 = require('../orm/models');

let restrictedFields = ['price.purchase', 'downloadLink'];
const defaultFields  = ['_id', 'type', 'name', 'price', 'images', 'pictos', 'translation', 'variants', 'variants_values', 'filename'];

const queryBuilder        = new QueryBuilder(Products, restrictedFields, defaultFields);
const queryBuilderPreview = new QueryBuilder(ProductsPreview, restrictedFields, defaultFields);

// if in the config, we ask not to return the stock fields, we add them to the restrictedFields
if (global.aquila.envConfig?.stockOrder?.returnStockToFront !== true) {
    restrictedFields = restrictedFields.concat(['stock.qty', 'stock.qty_booked', 'stock.qty_real']);
}

const objectPathCrawler = (object, pathAsArray) => {
    for (let i = 0; i < Object.keys(object).length; i++) {
        const key = Object.keys(object)[i];
        if (typeof object[key] === 'object' && object[key] !== null && key === pathAsArray[0]) {
            pathAsArray.shift();
            return objectPathCrawler(object[key], pathAsArray);
        }
        if (pathAsArray[0] === key) return object[key];
    }
};

const objectSortConditions = (firstValue, secondValue) => {
    if (typeof firstValue === 'number' && typeof secondValue === 'number') {
        return firstValue - secondValue;
    }

    if (typeof firstValue === 'string' && typeof secondValue === 'string') {
        return firstValue.localeCompare(secondValue);
    }

    if (typeof firstValue === 'boolean' && typeof secondValue === 'boolean') {
        if (firstValue === secondValue) return 0;
        return firstValue ? 1 : -1;
    }

    return 0;
};

const sortProductList = (products, PostBodySort, category) => {
    if (!PostBodySort || PostBodySort?.sortWeight) {
        /**
         * If a category is not filled in, this means that we are on the search page and the sorting by weight has already been done
         */
        if (category) {
            products.forEach((product, index) => {
                const idx = category.productsList.findIndex((resProd) => resProd.id.toString() === product._id.toString());
                // add sortWeight to result.datas[i] (modification of an object by reference)
                if (idx > -1) {
                    products[index].sortWeight = category.productsList[idx].sortWeight;
                } else {
                    products[index].sortWeight = -1;
                }
            });
            // Products are sorted by weight, sorting by relevance is always done from most relevant to least relevant
            products.sort((p1, p2) => p2.sortWeight - p1.sortWeight);
        }
    } else {
        const sortPropertyName = Object.getOwnPropertyNames(PostBodySort)[0];
        let sortArray          = sortPropertyName.split('.');
        if (sortArray[0] === 'price' && sortArray[1] !== 'priceSort') { // If theme send another price field to sort
            const taxes = sortArray[1];
            sortArray   = ['price', 'priceSort', taxes];
        } else if (sortArray[0] === 'price' && sortArray[1] === 'priceSort') { // If the theme doesn't send the ET/ATI info
            const taxes = sortArray[2] ? sortArray[2] : 'ati';
            sortArray   = ['price', 'priceSort', taxes];
        }

        if (sortArray[0] === 'translation') {
            if (`${PostBodySort[sortPropertyName]}` === '1') {
                products.sort((p1, p2) => p1.translation[sortArray[1]][sortArray[2]].localeCompare(p2.translation[sortArray[1]][sortArray[2]], global.aquila.defaultLang));
            } else {
                products.sort((p1, p2) => p2.translation[sortArray[1]][sortArray[2]].localeCompare(p1.translation[sortArray[1]][sortArray[2]], global.aquila.defaultLang));
            }
        } else {
            // Generic sort condition as for "sort by is_new" where "-1" means that products with the requested property will appear in the first results
            if (`${PostBodySort[sortPropertyName]}` === '1') {
                products.sort((p1, p2) => {
                    const p1Value = objectPathCrawler(p1, sortArray.map((x) => x));
                    const p2Value = objectPathCrawler(p2, sortArray.map((x) => x));

                    return objectSortConditions(p1Value, p2Value);
                });
            } else {
                products.sort((p1, p2) => {
                    const p1Value = objectPathCrawler(p1, sortArray.map((x) => x));
                    const p2Value = objectPathCrawler(p2, sortArray.map((x) => x));

                    return objectSortConditions(p2Value, p1Value);
                });
            }
        }
    }
    return products;
};

// Function to retrieve and remove the price filter from the PostBody
const priceFilterFromPostBody = (PostBody) => {
    let priceFilter;
    if (PostBody.filter.$and) {
        for (let i = 0; i < PostBody.filter.$and.length; i++) {
            const thisField = PostBody.filter.$and[i];
            if (thisField.$or) {
                for (let j = 0; j < thisField.$or.length; j++) {
                    if (thisField.$or[j]) {
                        const thisSubFieldArray = Object.keys(thisField.$or[j])[0].split('.');
                        if (thisSubFieldArray[0] === 'price') {
                            priceFilter = thisField;
                            PostBody.filter.$and.splice(i, 1);
                            break;
                        }
                    }
                }
            } else {
                const thisSubFieldArray = Object.keys(thisField)[0].split('.');
                if (thisSubFieldArray[0] === 'price') {
                    priceFilter = thisField;
                    PostBody.filter.$and.splice(i, 1);
                    break;
                }
            }
        }
        if (PostBody.filter.$and.length === 0) delete PostBody.filter.$and;
    }
    return priceFilter;
};

// Returns all products found, the products on the current page and the total number of products found
const getProductsByOrderedSearch = async (pattern, filters, lang = global.aquila.defaultLang) => {
    const config         = await Configuration.findOne({}, {'environment.searchSettings': 1}).lean();
    const searchSettings = config?.environment?.searchSettings;

    for (let index = 0; index < searchSettings.keys.length; index++) {
        searchSettings.keys[index].name = searchSettings.keys[index].name.replace('{lang}', lang);
    }
    const selectedFieldsArray = [
        {name: `translation.${lang}.name`, weight: 10},
        {name: 'code', weight: 20},
        {name: `translation.${lang}.description1.title`, weight: 3},
        {name: `translation.${lang}.description1.text`, weight: 2.5},
        {name: `translation.${lang}.description2.title`, weight: 2},
        {name: `translation.${lang}.description2.text`, weight: 1.5}];
    const keySearch           = (searchSettings.keys !== undefined && searchSettings.keys.length !== 0) ? searchSettings.keys : selectedFieldsArray;
    const selectedFields      = keySearch.map(function (item) {
        return item.name;
    });

    const allProductsWithSearchCriteria = await Products.find(filters).select(selectedFields).lean();

    // To adapt the options see the following link https://fusejs.io/concepts/scoring-theory.html#scoring-theory
    const options = {
        shouldSort         : searchSettings.shouldSort !== undefined ? searchSettings.shouldSort : true,
        findAllMatches     : searchSettings.findAllMatches !== undefined ? searchSettings.findAllMatches : true,
        includeScore       : searchSettings.includeScore !== undefined ? searchSettings.includeScore : true,
        ignoreLocation     : searchSettings.ignoreLocation !== undefined ? searchSettings.ignoreLocation : true,
        ignoreFieldNorm    : searchSettings.ignoreFieldNorm !== undefined ? searchSettings.ignoreFieldNorm : true,
        useExtendedSearch  : searchSettings.useExtendedSearch !== undefined ? searchSettings.useExtendedSearch : true,
        minMatchCharLength : searchSettings.minMatchCharLength !== undefined ? searchSettings.minMatchCharLength : 2,
        threshold          : searchSettings.threshold !== undefined ? searchSettings.threshold : 0.2, // 0.2 and 0.3 are the recommended values
        keys               : keySearch
    };

    const fuse    = new Fuse(allProductsWithSearchCriteria, options);
    const fuseRes = fuse.search(pattern);
    return {allProducts: fuseRes, count: fuseRes.length};
};

/**
 * When a product is retrieved, the minimum and maximum price of the products found by the queryBuilder is also added
 * List A: set of products returned by the fuzzy search
 * List B: all previous products found in list A after application of the filters
 * List C: all previous products found in list B after the pagination
 * @param {PostBody} PostBody
 * @param {Express.Request} reqRes
 * @param {string} lang
 */
const getProducts = async (PostBody, reqRes, lang, withFilters) => {
    let structure = {};
    if (PostBody && PostBody.structure) {
        // required to have all fields for promo rules
        PostBody.structure = {
            ...PostBody.structure,
            attributes : 1
        };
        structure          = PostBody.structure;
        let properties     = [];
        properties         = Object.keys(PostBody.structure).concat(defaultFields);
        properties.push('_id');
        if (properties.includes('score')) {
            PostBody.structure = {score: structure.score};
        }
        if (PostBody.structure.price !== 0) delete PostBody.structure; // For catalogue promotions we must keep all product fields
        queryBuilder.defaultFields = ['*'];
    }

    let filter;
    const realLimit = PostBody.limit;
    const sort      = PostBody.sort;
    delete PostBody.sort;
    if (PostBody && PostBody.filter && PostBody.filter.$text) {
        if (PostBody.structure && PostBody.structure.score) {
            delete PostBody.structure.score;
        }
        const textSearch = PostBody.filter.$text.$search;
        delete PostBody.filter.$text;
        filter          = JSON.parse(JSON.stringify(PostBody.filter));
        PostBody.filter = {};

        if (!PostBody.filter.$and) PostBody.filter.$and = [];
        PostBody.filter.$and.push({active: true});
        PostBody.filter.$and.push({_visible: true});

        const searchedProducts = await getProductsByOrderedSearch(textSearch, PostBody.filter, lang);
        const allProducts      = searchedProducts.allProducts;
        PostBody.filter._id    = {$in: allProducts.map((res) => res.item._id.toString())};
        filter._id             = {$in: allProducts.map((res) => res.item._id.toString())};
        PostBody.limit         = 0;
    }

    let querySelect = '';
    if (PostBody.structure) {
        for (const [key, value] of Object.entries(PostBody.structure)) {
            if (value === 0) {
                querySelect = `${querySelect}-${key} `;
            }
        }
    }

    // Fetch all products
    let allProductsRes;
    if (withFilters) {
        // Fetch all products found by the fuzzy search
        const allProducts = await Products
            .find(PostBody.filter)
            .populate(PostBody.populate)
            .select(querySelect)
            .lean();
        allProductsRes    = {datas: allProducts, count: allProducts.length}; // List A
    } else {
        allProductsRes = await queryBuilder.find(PostBody); // List A
    }
    queryBuilder.defaultFields = defaultFields;

    let result = JSON.parse(JSON.stringify(allProductsRes));

    // We delete the reviews that are not visible and verify
    if (PostBody && structure && structure.reviews === 1) {
        serviceReviews.keepVisibleAndVerifyArray(result);
    }

    let allFilteredProducts;
    if (reqRes !== undefined && PostBody.withPromos !== false && structure.price !== 0 && withFilters) {
        reqRes.res.locals = result;
        result            = await servicePromos.middlewarePromoCatalog(reqRes.req, reqRes.res);

        let priceFilter = priceFilterFromPostBody({filter}) || undefined; // Remove the $or field from filter

        // Temporary solution to avoid having to wait for changes on the theme side
        if (priceFilter && priceFilter.$or && priceFilter.$or[0]['price.ati.normal']) {
            priceFilter = {
                'price.priceSort.ati' : priceFilter.$or[0]['price.ati.normal']
            };
        }

        const formatedPriceFilter = {
            gte : priceFilter && priceFilter['price.priceSort.ati']?.$gte ? priceFilter['price.priceSort.ati']?.$gte : 0,
            lte : priceFilter && priceFilter['price.priceSort.ati']?.$lte ? priceFilter['price.priceSort.ati']?.$lte : 9999999
        };

        // Filtered products (without filter on prices)
        const filteredProductsRes = await Products
            .find(filter)
            .select('_id')
            .lean();
        const filteredId          = filteredProductsRes.map((res) => res._id.toString());

        // Filtered products (filter on prices is take into account here)
        const filteredProductsData = result.datas.filter((item) => {
            const res = filteredId.includes(item._id.toString()) && (item.price.priceSort.ati >= formatedPriceFilter.gte && item.price.priceSort.ati <= formatedPriceFilter.lte);
            return res;
        });
        allFilteredProducts = {datas: filteredProductsData, count: filteredProductsData.length};

        const arrayUnfilteredPriceSort = {et: [], ati: []};
        for (const prd of result.datas) {
            if (prd.price) {
                if (typeof prd.price.priceSort.et !== 'undefined') {
                    arrayUnfilteredPriceSort.et.push(prd.price.priceSort.et);
                }
                if (typeof prd.price.priceSort.ati !== 'undefined') {
                    arrayUnfilteredPriceSort.ati.push(prd.price.priceSort.ati);
                }
            }
        }

        result = JSON.parse(JSON.stringify(allFilteredProducts)); // List B

        const arrayPriceSort = {et: [], ati: []};
        for (const prd of result.datas) {
            if (prd.price) {
                if (prd.price.priceSort.et) {
                    arrayPriceSort.et.push(prd.price.priceSort.et);
                }
                if (prd.price.priceSort.ati) {
                    arrayPriceSort.ati.push(prd.price.priceSort.ati);
                }
            }
        }

        result.unfilteredPriceSortMin = {et: Math.min(...arrayUnfilteredPriceSort.et), ati: Math.min(...arrayUnfilteredPriceSort.ati)};
        result.unfilteredPriceSortMax = {et: Math.max(...arrayUnfilteredPriceSort.et), ati: Math.max(...arrayUnfilteredPriceSort.ati)};

        result.priceSortMin = {et: Math.min(...arrayPriceSort.et), ati: Math.min(...arrayPriceSort.ati)};
        result.priceSortMax = {et: Math.max(...arrayPriceSort.et), ati: Math.max(...arrayPriceSort.ati)};
    } else if (structure.price === 0 && withFilters) { // For themes that don't want to manage prices
        // Filtered products
        const filteredProductsRes  = await Products
            .find(filter)
            .select('_id')
            .lean();
        const filteredId           = filteredProductsRes.map((res) => res._id.toString());
        const filteredProductsData = result.datas.filter((item) => filteredId.includes(item._id.toString()));
        allFilteredProducts        = {datas: filteredProductsData, count: filteredProductsData.length};
        result                     = JSON.parse(JSON.stringify(allFilteredProducts)); // List B
    }

    if (PostBody.filter?._id?.$in) {
        delete PostBody.structure;

        if (sort && !sort.sortWeight) {
            result.datas = sortProductList(result.datas, sort);
        } else {
            // We order the products according to the order given by the fuzzy search just before
            result.datas.sort((a, b) => {
                const aIndex = PostBody.filter._id.$in.indexOf(a._id.toString());
                const bIndex = PostBody.filter._id.$in.indexOf(b._id.toString());
                return aIndex - bIndex;
            });
        }

        // To create the pagination
        if (PostBody.page) {
            const res = [];
            let i     = 0;
            if (PostBody.page !== 1) {
                i = (PostBody.page - 1) * realLimit;
            }
            while (i < realLimit + (PostBody.page - 1) * realLimit && i < result.datas.length) {
                res.push(result.datas[i]);
                i++;
            }
            result.datas = res; // List C
        }
        delete PostBody.filter._id;
    }

    if (structure.price !== 0) {
        // Get the maximum and minimum price in the Produc's query
        const normalET  = await Products.aggregate([
            {$match: PostBody.filter},
            {$group: {_id: null, min: {$min: '$price.et.normal'}, max: {$max: '$price.et.normal'}}}
        ]);
        const normalATI = await Products.aggregate([
            {$match: PostBody.filter},
            {$group: {_id: null, min: {$min: '$price.ati.normal'}, max: {$max: '$price.ati.normal'}}}
        ]);
        if (normalET.length > 0 && normalATI.length > 0) {
            result.min = {et: normalET[0].min, ati: normalATI[0].min};
            if (!result.priceSortMin) result.priceSortMin = {et: normalET[0].min, ati: normalATI[0].min};
            result.max = {et: normalET[0].max, ati: normalATI[0].max};
            if (!result.priceSortMax) result.priceSortMax = {et: normalET[0].max, ati: normalATI[0].max};
        }

        // Specials prices
        const arraySpecialPrice = {et: [], ati: []};
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
    }

    result.allProductsRes          = allProductsRes; // List A
    result.allProductsAfterFilters = allFilteredProducts; // List B

    return result;
};

const parseSortObject = (sort) => {
    let parsedSort = sort;

    if (sort.includes('asc') || sort.includes('desc')) {
        const splitSort = sort.split('.');
        const orderWord = splitSort.pop();
        const field     = splitSort.join('.');

        // If no order specified, order will be asc
        let order = 1;
        if (orderWord === 'desc') order = -1;

        parsedSort = `{"${field}": ${order}}`;
    }

    return JSON.parse(parsedSort);
};

const getProductsAsAdmin = async ({page, limit, sort, filter, select}, lang = global.aquila.defaultLang) => {
    if (!select) select = `{"code": 1, "images": 1, "active": 1, "_visible": 1, "stock.qty": 1,  "type": 1, "price.ati.normal": 1, "translation.${lang}.name": 1}`;

    let ormSort = {};
    if (sort) ormSort = parseSortObject(sort);

    let allProducts = await Products
        .find(filter ? JSON.parse(filter) : {})
        .select(select ? JSON.parse(select) : {})
        .sort(ormSort)
        .lean();

    const count = allProducts.length;

    // To create a pagination
    page  = +page;
    limit = +limit;
    if (page) {
        const res = [];
        let i     = 0;
        if (page !== 1) {
            i = (page - 1) * limit;
        }
        while (i < limit + (page - 1) * limit && i < count) {
            res.push(allProducts[i]);
            i++;
        }
        allProducts = res;
    }

    const res = {
        datas : allProducts,
        count
    };
    return res;
};

/**
 * Get the product corresponding to the PostBody filter
 * @param {*} PostBody
 * @param reqRes
 * @param keepReviews
 */
const getProduct = async (PostBody, reqRes = undefined, keepReviews = false, lang = global.aquila.defaultLang) => {
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
            if (languages.find((dbLang) => dbLang.code === lang[0])) {
                delete doc.translation[lang[0]].slug;
            } else {
                doc.translation[lang[0]].slug = `dup-${doc.translation[lang[0]].slug}`;
            }
        }
    }

    for (const lang of languages) {
        if (!doc.translation[lang.code]) {
            doc.translation[lang.code] = {};
        }
        doc.translation[lang.code].slug = slugify(doc._id.toString());
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
    doc.code     = slugify(newCode);
    doc.active   = false;
    doc._visible = false;
    await doc.save();
    return doc;
};

const _getProductsByCategoryId = async (id, user, lang, PostBody = {}, isAdmin = false, reqRes = undefined) => global.cache.get(
    `${id}_${lang || ''}_${isAdmin}_${JSON.stringify(PostBody)}_${user ? user._id : ''}`,
    async () => getProductsByCategoryId(id, user, lang, PostBody, isAdmin, reqRes)
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
const getProductsByCategoryId = async (id, user, lang, PostBody = {}, isAdmin = false, reqRes = undefined) => {
    moment.locale(global.aquila.defaultLang);
    lang = await servicesLanguages.getDefaultLang(lang);

    // Set PostBody.filter and PostBody.structure
    if (!PostBody.filter) PostBody.filter = {};

    PostBody.filter[`translation.${lang}`] = {$exists: true};

    PostBody.structure = {
        type  : 1,
        price : 1,
        ...(PostBody.structure || {})
    };

    const menu = await Categories.findById(id).lean();
    if (menu === null) {
        throw NSErrors.CategoryNotFound;
    }

    // If admin then we populate all documents without visibility or asset restriction
    if (isAdmin && PostBody && PostBody.filter && PostBody.filter.inProducts !== undefined) {
        // We delete products from productsList depending on inProducts (true or false)
        menu.productsList = menu.productsList.filter((prd) => prd.checked === PostBody.filter.inProducts);
        delete PostBody.filter.inProducts;
        delete PostBody.filter.productsIds;
    }

    // If a productsList.id does not respond to the match then productsList.id === null
    if (global.aquila.envConfig.stockOrder.bookingStock !== 'none') { // Imperative need of stock if one manages it
        PostBody.structure.stock = 1;
    }

    // We check that the PostBody information is correct
    const {limit, skip} = queryBuilder.verifyPostBody(PostBody, 'find');

    let prds;

    let priceMin               = {et: 0, ati: 0}; // Deprecated (only use in TPD1)
    let priceMax               = {et: 0, ati: 0}; // Deprecated (only use in TPD1)
    let specialPriceMin        = {et: 0, ati: 0}; // Deprecated (only use in TPD1)
    let specialPriceMax        = {et: 0, ati: 0}; // Deprecated (only use in TPD1)
    let priceSortMin           = {et: 0, ati: 0};
    let priceSortMax           = {et: 0, ati: 0};
    let unfilteredPriceSortMin = {et: 0, ati: 0};
    let unfilteredPriceSortMax = {et: 0, ati: 0};

    // If we don't need the price information, we can bypass a lot of processes
    if (PostBody.structure.price === 0) {
        PostBody.filter = {
            ...PostBody.filter,
            _visible : true,
            active   : true,
            _id      : {$in: menu.productsList.map((item) => item.id.toString())}
        };

        const querySelect = Object.entries(PostBody.structure)
            .filter(([, value]) => value === 0)
            .map(([key]) => `-${key}`)
            .join(' ');

        prds = await Products
            .find(PostBody.filter)
            .populate(PostBody.populate)
            .lean({virtuals: true}) // {virtuals: true} allows to get virtual fields (stock.qty_real)
            .select(querySelect); // We don't need the price so we can avoid checking the promos and therefore eliminate all the fields we don't need
    } else {
        let filters;
        if (!isAdmin) {
            filters         = JSON.parse(JSON.stringify(PostBody.filter));
            PostBody.filter = {
                _visible : true,
                active   : true,
                _id      : {$in: menu.productsList.map((item) => item.id.toString())}
            };
        }

        prds = await Products
            .find(PostBody.filter)
            .populate(PostBody.populate)
            .lean({virtuals: true}); // {virtuals: true} allows to get virtual fields (stock.qty_real)

        let prdsPrices = JSON.parse(JSON.stringify(prds));

        // We collect all the products belonging to this category in order to have the min and max
        prdsPrices = await servicePromos.checkPromoCatalog(prdsPrices, user, lang, true);

        const arrayPrice               = {et: [], ati: []};
        const arraySpecialPrice        = {et: [], ati: []};
        const arrayUnfilteredPriceSort = {et: [], ati: []};

        for (const prd of prds) {
            if (prd.variants_values?.length > 0) {
                arrayPrice.et.push(...prd.variants_values.map((it) => it.price.et.normal));
                arrayPrice.ati.push(...prd.variants_values.map((it) => it.price.ati.normal));
            } else if (prd.price) {
                arrayPrice.et.push(prd.price.et.normal);
                arrayPrice.ati.push(prd.price.ati.normal);
            }
        }

        priceMin = {et: Math.min(...arrayPrice.et), ati: Math.min(...arrayPrice.ati)};
        priceMax = {et: Math.max(...arrayPrice.et), ati: Math.max(...arrayPrice.ati)};

        for (const prd of prdsPrices) {
            if (prd.variants_values?.length > 0) {
                for (const prdVariant of prd.variants_values) {
                    if (prdVariant.price.et.special) {
                        arraySpecialPrice.et.push(prdVariant.price.et.special);
                    }
                    if (prdVariant.price.ati.special) {
                        arraySpecialPrice.ati.push(prdVariant.price.ati.special);
                    }
                    if (typeof prdVariant.price.priceSort.et !== 'undefined') {
                        arrayUnfilteredPriceSort.et.push(prdVariant.price.priceSort.et);
                    }
                    if (typeof prdVariant.price.priceSort.ati !== 'undefined') {
                        arrayUnfilteredPriceSort.ati.push(prdVariant.price.priceSort.ati);
                    }
                }
            } else if (prd.price) {
                if (prd.price.et.special) {
                    arraySpecialPrice.et.push(prd.price.et.special);
                }
                if (prd.price.ati.special) {
                    arraySpecialPrice.ati.push(prd.price.ati.special);
                }
                if (typeof prd.price.priceSort.et !== 'undefined') {
                    arrayUnfilteredPriceSort.et.push(prd.price.priceSort.et);
                }
                if (typeof prd.price.priceSort.ati !== 'undefined') {
                    arrayUnfilteredPriceSort.ati.push(prd.price.priceSort.ati);
                }
            }
        }

        specialPriceMin = {et: Math.min(...arraySpecialPrice.et), ati: Math.min(...arraySpecialPrice.ati)};
        specialPriceMax = {et: Math.max(...arraySpecialPrice.et), ati: Math.max(...arraySpecialPrice.ati)};

        unfilteredPriceSortMin = {et: Math.min(...arrayUnfilteredPriceSort.et), ati: Math.min(...arrayUnfilteredPriceSort.ati)};
        unfilteredPriceSortMax = {et: Math.max(...arrayUnfilteredPriceSort.et), ati: Math.max(...arrayUnfilteredPriceSort.ati)};

        if (reqRes !== undefined && PostBody.withPromos !== false) {
            reqRes.res.locals.datas  = prds;
            reqRes.req.body.PostBody = PostBody;
            const productsDiscount   = await servicePromos.middlewarePromoCatalog(reqRes.req, reqRes.res);
            prds                     = productsDiscount.datas;
            // This code snippet allows to recalculate the prices according to the filters especially after the middlewarePromoCatalog
            // The code is based on the fact that the price filters will be in PostBody.filter.$and[0].$or
        }

        if (!isAdmin) {
            let priceFilter = priceFilterFromPostBody({filter: filters}) || undefined; // Remove the $or field from filters

            // Temporary solution to avoid having to wait for changes on the theme side
            if (priceFilter && priceFilter.$or && priceFilter.$or[0]['price.ati.normal']) {
                priceFilter = {
                    'price.priceSort.ati' : priceFilter.$or[0]['price.ati.normal']
                };
            }

            const formatedPriceFilter = {
                gte : priceFilter && priceFilter['price.priceSort.ati']?.$gte ? priceFilter['price.priceSort.ati']?.$gte : unfilteredPriceSortMin.ati,
                lte : priceFilter && priceFilter['price.priceSort.ati']?.$lte ? priceFilter['price.priceSort.ati']?.$lte : unfilteredPriceSortMax.ati
            };

            filters             = {
                ...filters,
                ...PostBody.filter
            };
            const filteredPrdId = await Products.find(filters).lean().select('_id');
            const filteredId    = filteredPrdId.map((res) => res._id.toString());
            prds                = prds.filter((item) => {
                if (item.variants_values?.length > 0) {
                    const isFilterd = item.variants_values.filter((it) => it.price.priceSort.ati >= formatedPriceFilter.gte && it.price.priceSort.ati <= formatedPriceFilter.lte).length > 0;
                    return filteredId.includes(item._id.toString()) && isFilterd;
                }
                const res = filteredId.includes(item._id.toString()) && (item.price.priceSort.ati >= formatedPriceFilter.gte && item.price.priceSort.ati <= formatedPriceFilter.lte);
                return res;
            });

            const arrayPriceSort = {et: [], ati: []};
            for (const prd of prds) {
                if (prd.variants_values?.length > 0) {
                    arrayPriceSort.et.push(...prd.variants_values.map((it) => it.price.et.normal));
                    arrayPriceSort.ati.push(...prd.variants_values.map((it) => it.price.ati.normal));
                } else if (prd.price) {
                    if (prd.price.priceSort.et) {
                        arrayPriceSort.et.push(prd.price.priceSort.et);
                    }
                    if (prd.price.priceSort.ati) {
                        arrayPriceSort.ati.push(prd.price.priceSort.ati);
                    }
                }
            }

            priceSortMin = {et: Math.min(...arrayPriceSort.et), ati: Math.min(...arrayPriceSort.ati)};
            priceSortMax = {et: Math.max(...arrayPriceSort.et), ati: Math.max(...arrayPriceSort.ati)};
        }
    }

    prds = sortProductList(prds, PostBody.sort, menu);

    const res = {
        count   : prds.length,
        datas   : JSON.parse(JSON.stringify(prds)),
        filters : {}
    };
    if (reqRes.req.body.dynamicFilters) {
        // Selected attributes
        const selectedAttributes = [];
        if (PostBody.filter.$and) {
            const filterArray = PostBody.filter.$and;
            selectedAttributes.push(
                ...filterArray.filter((item) => Object.keys(item)[0] === 'attributes').map((item) => item.attributes.$elemMatch)
            );
        }

        // Re-generate filters after the new products list has been calculated
        const attributes = menu.filters.attributes.map((attr) => ({
            code        : attr.code,
            id_attribut : attr.id_attribut,
            name        : attr.translation[lang].name,
            position    : attr.position,
            type        : attr.type,
            values      : attr.translation[lang].values
        }));

        res.filters = {attributes};
        await servicesCategory.generateFilters(res, lang, selectedAttributes);
    }

    const products = prds.slice(skip, limit + skip);

    // The code below allows to return the structure that we send in the PostBody because currently it returns all the fields
    if (Object.keys(PostBody.structure).length > 0) {
        queryBuilder.removeFromStructure(PostBody.structure, products);
    }

    return {
        count   : prds.length,
        datas   : products,
        filters : res.filters,
        priceMin,
        priceMax,
        specialPriceMin,
        specialPriceMax,
        priceSortMin,
        priceSortMax,
        unfilteredPriceSortMin,
        unfilteredPriceSortMax
    };
};

const getProductById = async (id, PostBody = null) => queryBuilder.findById(id, PostBody);

/**
 * DEPRECATED old function
 * @deprecated
 */
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
    if (req.body.autoSlug) req.body._slug = `${slugify(req.body.name)}-${req.body.id}`;
    const result = await product.updateData(req.body);
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
    req.body.code = slugify(req.body.code);
    const res     = await Products.create(body);
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
        const _config     = await Configuration.findOne({}, {stockOrder: 1}).lean();
        let fixAttributs  = false;
        let returnErrors  = '';
        let returnWarning = '';
        let productsList;
        if (option) {
            productsList = [await Products.findOne({_id: mongoose.Types.ObjectId(option)}).lean()];
        } else {
            productsList = await Products.find({}).lean();
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
            const categoriesId = await Categories.find({'productsList.id': oneProduct._id.toString()}).lean();
            if (typeof categoriesId === 'undefined' || categoriesId.length === 0) {
                returnWarning += `<b>${oneProduct.code}</b> : No category<br/>`;
            }
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
    const structure = req.body.PostBody.structure || {};
    const filter    = JSON.parse(JSON.stringify(req.body.PostBody.filter));

    const result = await getProducts(req.body.PostBody, {req, res}, req.body.lang, req.params.withFilters);

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

        /* If we want dynamic filters, we generate them from the remaining products,
        * otherwise we generate them from all the products found after the search and before the filters are applied
        */
        const datas = JSON.parse(JSON.stringify(result.datas));
        if (!req.body.dynamicFilters) {
            result.datas = result.allProductsRes.datas;
        } else {
            result.datas = result.allProductsAfterFilters.datas;
        }
        delete result.allProductsRes;
        delete result.allProductsAfterFilters;

        const selectedAttributes = [];
        if (filter.$and) {
            const filterArray = filter.$and;
            for (let i = 0; i < filterArray.length; i++) {
                if (Object.keys(filterArray[i])[0] === 'attributes') selectedAttributes.push(filterArray[i].attributes.$elemMatch);
            }
        }
        await servicesCategory.generateFilters(result, req.body.lang, selectedAttributes, true);
        result.datas = datas;
    } else {
        delete result.allProductsRes;
        delete result.allProductsAfterFilters;
    }
    if ({req, res} !== undefined && req.params.withFilters === 'true') {
        res.locals.datas = result.datas;

        // This code snippet allows to recalculate the prices according to the filters especially after the middlewarePromoCatalog
        if (structure.price !== 0) {
            const priceFilter = priceFilterFromPostBody(req.body.PostBody);
            if (priceFilter) {
                result.datas = result.datas.filter((prd) =>  {
                    const pr = prd.price.ati.special || prd.price.ati.normal;
                    return pr >= (
                        priceFilter.$or[1]['price.ati.special'].$gte
                        || priceFilter.$or[0]['price.ati.normal'].$gte)
                        && pr <= (priceFilter.$or[1]['price.ati.special'].$lte
                        || priceFilter.$or[0]['price.ati.normal'].$lte);
                });
            }
        }
    }

    if (Object.keys(structure).length > 0) {
        queryBuilder.removeFromStructure(structure, result.datas);
    }

    return result;
};

const updateStock = async (productId, qty1 = 0, qty2 = undefined, selected_variant = null) => {
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

const updateVariantsStock = async (prd, qty1, qty2, selected_variant) => {
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
    moment.locale(global.aquila.defaultLang);
    const stockLabels = global.aquila.envConfig.stockOrder.labels;
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
    getProductsAsAdmin,
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