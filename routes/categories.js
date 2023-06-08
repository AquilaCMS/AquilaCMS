/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {adminAuthRight}     = require('../middleware/authentication');
const {securityForceActif} = require('../middleware/security');
const {filterCategories}   = require('../middleware/categories');
const ServiceCategory      = require('../services/categories');
const ServiceRules         = require('../services/rules');
const {autoFillCode}       = require('../middleware/autoFillCode');

module.exports = function (app) {
    app.post('/v2/categories', securityForceActif(['active']), filterCategories, getCategories);
    app.post('/v2/category', securityForceActif(['active']), filterCategories, getCategory);
    app.get('/v2/category/export/:catId', adminAuthRight('categories'), exportCategoryProducts);
    app.post('/v2/category/import', adminAuthRight('categories'), importCategoryProducts);
    app.post('/v2/category/execRules', adminAuthRight('categories'), execRules);
    app.post('/v2/category/canonical', adminAuthRight('categories'), execCanonical);
    app.post('/v2/category/applyTranslatedAttribs', adminAuthRight('categories'), applyTranslatedAttribs);
    app.put('/v2/category', adminAuthRight('categories'), autoFillCode, setCategory);
    app.delete('/v2/category/:id', adminAuthRight('categories'), deleteCategory);
};

/**
 * POST /api/v2/categories
 * @summary Listing of categories
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
 * POST /api/v2/category
 * @summary Category details
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
 * PUT /api/v2/category
 * @summary Add or update category
 */
async function setCategory(req, res, next) {
    try {
        let response;
        if (req.body._id) {
            response = await ServiceCategory.setCategory(req.body);
        } else {
            response = await ServiceCategory.createCategory(req.body);
        }
        return res.json(response);
    } catch (error) {
        return next(error);
    }
}

/**
 * DELETE /v2/category/{id}
 * @summary Remove category
 */
async function deleteCategory(req, res, next) {
    try {
        await ServiceCategory.deleteCategory(req.params.id);
        return res.status(200).end();
    } catch (err) {
        return next(err);
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

async function importCategoryProducts(req, res, next) {
    try {
        const {data, category} = req.body;
        res.json(await ServiceCategory.importCategoryProducts(data, category));
    } catch (err) {
        console.error(err);
        next(err);
    }
}

async function exportCategoryProducts(req, res, next) {
    try {
        res.json(await ServiceCategory.exportCategoryProducts(req.params.catId));
    } catch (err) {
        console.error(err);
        next(err);
    }
}