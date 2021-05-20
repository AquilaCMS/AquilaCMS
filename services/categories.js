/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose         = require('mongoose');
const {
    Categories,
    Products,
    Attributes
}                      = require('../orm/models');
const QueryBuilder     = require('../utils/QueryBuilder');
const NSErrors         = require('../utils/errors/NSErrors');
const ServiceRules     = require('./rules');
const ServiceLanguages = require('./languages');

const restrictedFields = ['clickable'];
const defaultFields    = ['_id', 'code', 'action', 'translation'];
const queryBuilder     = new QueryBuilder(Categories, restrictedFields, defaultFields);

const getCategories = async (PostBody) => {
    return queryBuilder.find(PostBody);
};

const generateFilters = async (res, lang = '') => {
    lang = ServiceLanguages.getDefaultLang(lang);
    if (res && res.filters && res.filters.attributes && res.filters.attributes.length > 0) {
        const attributes = [];
        const values     = {};
        const pictos     = [];
        for (const filter of res.filters.attributes) {
            attributes.push(filter.id_attribut.toString());
        }
        let productsList = res.datas;
        // If productsList does not exist or that products.id is not populate we will populate the object
        // productsList[i].id is an id or a Products : if it's not a Products we populate it
        if (!productsList || (productsList.length && typeof productsList[0] !== 'object')) {
            const category = await Categories.findById(res._id).populate({
                path  : 'productsList.id',
                match : {_visible: true, active: true}
            }).lean();
            productsList   = category.productsList;
        }
        for (let i = 0; i < productsList.length; ++i) {
            let prd;
            // products can be an object of type Product or an object of type category.productList containing the id of the product populated by the product
            if (productsList[i].attributes !== undefined || (productsList[i].id != null && productsList[i].id.attributes !== undefined)) {
                if (productsList[i].id != null && productsList[i].id.attributes !== undefined) {
                    prd = productsList[i].id;
                } else {
                    prd = productsList[i];
                }
            } else {
                prd = await Products.findOne({_id: productsList[i].id, active: true, _visible: true}).lean();
            }

            if (prd && prd.attributes) {
                if (prd.pictos) {
                    for (const picto of prd.pictos) {
                        pictos.push(picto);
                    }
                }

                for (const attr of prd.attributes) {
                    if (attributes.includes(attr.id.toString())) {
                        if (attr.translation && attr.translation[lang]) {
                            const value = attr.translation[lang].value;

                            if (!values[attr.id]) {
                                values[attr.id] = [];
                            }

                            if (value && typeof value === 'object' && value.length > 0) {
                                for (let i = 0; i < value.length; i++) {
                                    if (values[attr.id].includes(value[i]) === false) {
                                        values[attr.id].push(value[i]);
                                    }
                                }
                            } else {
                                if (values[attr.id].includes(value) === false) {
                                    values[attr.id].push(value);
                                }
                            }
                        }
                    }
                }
            }
        }
        // If emptyValues then we remove the labels of the filters
        let emptyValues = true;
        // Sort the array (distinct and sort)
        for (const key in values) {
            if (!values.hasOwnProperty(key)) continue;
            emptyValues        = false;
            const obj          = values[key];
            values[key]        = obj.sort((a, b) => {
                if (a > b) return 1;
                if (a < b) return -1;
                return 0;
            }).filter((value, index, self) => self.findIndex((o) => o === value) === index);
            const tValuesValid = [];
            values[key].forEach((value) => {
                if (value !== '' && value !== undefined && value !== null && typeof value !== 'object') {
                    tValuesValid.push(value);
                }
            });
            values[key] = tValuesValid;
            // If the filter has less than two we will not display the values
            if (values[key].length < 2) {
                delete values[key];
                const idx = res.filters.attributes.findIndex((attrLabel) => attrLabel.id === key);
                if (idx >= 0) {
                    res.filters.attributes.splice(idx, 1);
                }
            }
            if (values[key] && values[key].length > 0) {
                const attribute = res.filters.attributes.find((_attr) => _attr.id_attribut.toString() === key.toString());
                if (attribute && attribute.type === 'Intervalle') {
                    const min   = Math.min(...values[key]);
                    const max   = Math.max(...values[key]);
                    values[key] = [min, max];
                }
            }
        }
        if (emptyValues) {
            res.filters.attributes = [];
        }
        res.filters.attributesValues = values;
        if (pictos.length > 0) {
            res.filters.pictos = pictos.sort((a, b) => {
                if (a.title > b.title) return 1;
                if (a.title < b.title) return -1;
                return 0;
            }).filter((value, index, self) => self.findIndex((o) => o.code === value.code) === index);
        }
    }
    return res;
};

const getCategory = async (PostBody, withFilter = null, lang = '') => {
    lang      = ServiceLanguages.getDefaultLang(lang);
    const res =  await queryBuilder.findOne(PostBody);
    return withFilter ? generateFilters(res, lang) : res;
};

const setCategory = async (req) => {
    return Categories.updateOne({_id: req.body._id}, {$set: req.body});
};

const createCategory = async (req) => {
    const newMenu   = new Categories(req.body);
    const id_parent = req.body.id_parent;
    const _menu     = await Categories.findOne({_id: id_parent});
    if (id_parent) {
        newMenu.ancestors = [..._menu.ancestors, id_parent];
        if (!_menu) throw NSErrors.CategoryParentMissing;
    }
    if (_menu) {
        if (!_menu.children.includes(newMenu._id)) {
            _menu.children.push(newMenu._id);
        }
        _menu.save();
    }
    const saved = await newMenu.save();
    return saved;
};

const deleteCategory = async (id) => {
    const _menu = await Categories.findOne({_id: mongoose.Types.ObjectId(id)});
    if (!_menu) {
        throw NSErrors.NotFound;
    }
    await removeChildren(_menu);
    const result = await Categories.deleteOne({_id: _menu._id});
    const rule   = await ServiceRules.queryRule({filter: {owner_id: id}});
    if (rule) {
        await ServiceRules.deleteRule(rule._id);
    }

    if (_menu.ancestors.length > 0) {
        await Categories.updateOne({_id: _menu.ancestors[_menu.ancestors.length - 1]}, {$pull: {children: _menu._id}});
    }
    return result.ok === 1;
};

const getCategoryChild = async (code, childConds, user = null) => {
    const queryCondition = {
        ancestors : {$size: 0},
        code
    };

    let projectionOptions = {};
    if (user && !user.isAdmin) {
        const date          = new Date();
        queryCondition.$and = [
            {openDate: {$lte: date}},
            {$or: [{closeDate: {$gte: date}}, {closeDate: {$eq: undefined}}]}
        ];
        childConds.$and     = [
            {openDate: {$lte: date}},
            {$or: [{closeDate: {$gte: date}}, {closeDate: {$eq: undefined}}]}
        ];

        projectionOptions = {
            canonical_weight : 0,
            active           : 0,
            createdAt        : 0,
            openDate         : 0,
            ancestors        : 0
        };
    }

    // TODO P5 Manage populate recursion (currently only 3 levels)
    // the populate in the pre does not work
    return Categories.findOne(queryCondition)
        .select({productsList: 0, ...projectionOptions})
        .populate({
            path     : 'children',
            match    : childConds,
            options  : {sort: {displayOrder: 'asc'}},
            select   : projectionOptions,
            populate : {
                path     : 'children',
                match    : childConds,
                options  : {sort: {displayOrder: 'asc'}},
                select   : projectionOptions,
                populate : {
                    path     : 'children',
                    match    : childConds,
                    options  : {sort: {displayOrder: 'asc'}},
                    populate : {path: 'children'},
                    select   : projectionOptions
                }
            }
        });
};

const execRules = async () => {
    return ServiceRules.execRules('category');
};

/**
 * Allows you to update the canonicals of all products
 */
const execCanonical = async () => {
    try {
        // All active categories
        const categories             = await Categories.find({active: true, action: 'catalog'}).sort({canonical_weight: 'desc'}); // le poid le plus lourd d'abord
        const products_canonicalised = [];
        const languages              = await ServiceLanguages.getLanguages({filter: {status: 'visible'}, limit: 100});
        const tabLang                = languages.datas.map((_lang) => _lang.code);

        // For each category
        for (let iCat = 0; iCat < categories.length; iCat++) {
            const current_category = categories[iCat];

            // Build the complete slug : [{"fr" : "fr/parent1/parent2/"}, {"en": "en/ancestor1/ancestor2/"}]
            const current_category_slugs = await getCompleteSlugs(current_category._id, tabLang);

            // For each product in this category
            const cat_with_products = await current_category.populate({path: 'productsList.id'}).execPopulate();
            for (let iProduct = 0; iProduct < cat_with_products.productsList.length; iProduct++) {
                const product = cat_with_products.productsList[iProduct].id;

                // Construction of the slug
                let bForceForOtherLang = false;
                for (let iLang = 0; iLang < tabLang.length; iLang++) {
                    const currentLang = tabLang[iLang];
                    if (
                        product
                        && (
                            bForceForOtherLang
                            || products_canonicalised.indexOf(product._id.toString()) === -1
                        )
                        && typeof product.translation[currentLang] !== 'undefined'
                        && typeof product.translation[currentLang].slug !== 'undefined'
                    ) { // Le produit existe et on l'a pas déjà traité pour cette langue
                        await Products.updateOne(
                            {_id: product._id},
                            {$set: {[`translation.${currentLang}.canonical`]: `${current_category_slugs[currentLang]}/${product.translation[currentLang].slug}`}}
                        );
                        products_canonicalised.push(product._id.toString());
                        bForceForOtherLang = true; // We passed once, we pass for other languages
                    }
                }
            }
        }

        // Set the canonical to empty for all untreated products
        const productsNotCanonicalised      = await Products.find({_id: {$nin: products_canonicalised}});
        let   productsNotCanonicaliedString = '';
        for (let productNC = 0; productNC < productsNotCanonicalised.length; productNC++) {
            for (let iLang = 0; iLang < tabLang.length; iLang++) {
                if (typeof productsNotCanonicalised[productNC].translation[tabLang[iLang]] !== 'undefined') {
                    productsNotCanonicalised[productNC].translation[tabLang[iLang]].canonical = '';
                }
            }
            await productsNotCanonicalised[productNC].save();
            productsNotCanonicaliedString += `${productsNotCanonicalised[productNC].code}, `;
        }

        return `${productsNotCanonicalised.length} products not canonicalised : ${productsNotCanonicaliedString}`;
    } catch (error) {
        return error.message;
    }
};

/**
 * Built a category slug from his parents
 * @param {guid} categorie_id category id
 * @param {guid} tabLang Language table
 */
const getCompleteSlugs = async (categorie_id, tabLang) => {
    // /!\ Default language slug does not contain lang prefix : en/parent1/parent2 vs /parent1/parent2
    const current_category_slugs = []; // [{"fr" : "parent1/parent2/"}, {"en": "en/ancestor1/ancestor2/"}]
    // For the current category
    const current_category = await Categories.findOne({_id: categorie_id});
    const lang             = ServiceLanguages.getDefaultLang();

    if (typeof current_category !== 'undefined') {
        // Add the current category to the list of categories to browse
        const categoriesToBrowse = current_category.ancestors;
        categoriesToBrowse.push(categorie_id);

        // For each "grandparent"
        for (let iCat = 0; iCat < categoriesToBrowse.length; iCat++) {
            const parent_category_id = categoriesToBrowse[iCat];
            const parent_category    = await Categories.findOne({_id: parent_category_id});

            // We add it to the slug
            if (typeof parent_category !== 'undefined' && parent_category.active) { // Usually the root is not taken, so it must be deactivated
                // For each of the languages
                for (let iLang = 0; iLang < tabLang.length; iLang++) {
                    const currentLang = tabLang[iLang];
                    if (typeof parent_category.translation[currentLang] !== 'undefined') {
                        if (typeof current_category_slugs[currentLang] === 'undefined') { // 1st time
                            current_category_slugs[currentLang] = (lang === currentLang) ? '' : `/${currentLang}`; // We start with the "/lang" except for the default language!
                        }
                        current_category_slugs[currentLang] = `${current_category_slugs[currentLang]}/${parent_category.translation[currentLang].slug}`;
                    }
                }
            }
        }
    }

    return current_category_slugs;
};

const applyTranslatedAttribs = async (PostBody) => {
    try {
        // const res = {n: 0, nModified: 0, ok: 0};
        // Get all products
        let _categories = [];
        if (PostBody === undefined || PostBody === {}) {
            _categories = await Categories.find({});
        } else {
            _categories = [await queryBuilder.findOne(PostBody)];
        }
        // Get all attributes
        const _attribs = await Attributes.find({});

        for (let i = 0; i < _categories.length; i++) {
            if (_categories[i].filters && _categories[i].filters.attributes !== undefined) {
                // Loop the product's attributes [i]
                for (let j = 0; j < _categories[i].filters.attributes.length; j++) {
                    // Get the original attribute corresponding to the attribute [j] of the product [i]
                    const attrib = _attribs.find((attrib) => attrib._id.toString() === _categories[i].filters.attributes[j].id_attribut);

                    if (attrib && attrib.translation) {
                        // Loop on each language in which the original attribute is translated
                        for (let k = 0; k < Object.keys(attrib.translation).length; k++) {
                            const lang = Object.keys(attrib.translation)[k];
                            if (_categories[i].filters.attributes[j].translation[lang] === undefined) {
                                _categories[i].filters.attributes[j].translation[lang] = {name: ''};
                            }
                            _categories[i].filters.attributes[j].translation[lang].name = attrib.translation[lang].name;
                        }
                    }
                }
                await Categories.updateOne({_id: _categories[i]._id}, {$set: {filters: _categories[i].filters}});
            }
        }
        return 'OK';
    } catch (e) {
        console.error(e);
        return 'ERROR';
    }
};

// Delete the children recursively
async function removeChildren(menu) {
    for (const childId of menu.children) {
        const removedChild = await Categories.findOneAndRemove({_id: childId});
        await removeChildren(removedChild);
    }
}

module.exports = {
    getCategories,
    generateFilters,
    getCategory,
    setCategory,
    createCategory,
    getCategoryChild,
    execRules,
    execCanonical,
    getCompleteSlugs,
    applyTranslatedAttribs,
    removeChildren,
    deleteCategory
};