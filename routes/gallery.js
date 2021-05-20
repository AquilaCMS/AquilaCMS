/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const ServiceGallery              = require('../services/gallery');
const {authentication, adminAuth} = require('../middleware/authentication');

module.exports = function (app) {
    app.post('/v2/galleries', authentication, adminAuth, getGalleries);
    app.get('/v2/gallery/:_id', getGallery);
    app.get('/v2/gallery/:code/items', getItemsGallery);
    app.put('/v2/gallery', authentication, adminAuth, setGallery);
    app.put('/v2/gallery/:_id/item', authentication, adminAuth, setItemGallery);
    app.put('/v2/gallery/:_id/items', authentication, adminAuth, setItemsGallery);
    app.delete('/v2/gallery/:_id', authentication, adminAuth, deleteGallery);
    app.delete('/v2/gallery/:_id/:_id_item', authentication, adminAuth, deleteItemGallery);
};

/**
 * Function returning a gallery listing
 */
async function getGalleries(req, res, next) {
    try {
        const result = await ServiceGallery.getGalleries(req.body.PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
/**
 * Function returning a gallery by its id
 */
async function getGallery(req, res, next) {
    try {
        const result = await ServiceGallery.getGallery(req.params._id);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
/**
 * Function returning the items of a gallery according to its code
 */
async function getItemsGallery(req, res, next) {
    try {
        const result = await ServiceGallery.getItemsGallery(req.params.code, 0, 200);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
/**
 * Function to add or update a gallery
 */
async function setGallery(req, res, next) {
    // we add product
    try {
        const result = await ServiceGallery.setGallery(req.body.code, req.body.initItemNumber, req.body.maxColumnNumber, req.body._id);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
/**
 * Function to add or update an item from a gallery
 */
async function setItemGallery(req, res, next) {
    try {
        const result = await ServiceGallery.setItemGallery(req.params._id, req.body);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

async function setItemsGallery(req, res, next) {
    try {
        const result = await ServiceGallery.setItemGallery(req.params._id, req.body);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Function deleting a gallery
 */
async function deleteGallery(req, res, next) {
    try {
        const result = await ServiceGallery.deleteGallery(req.params._id);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
async function deleteItemGallery(req, res, next) {
    try {
        const result = await ServiceGallery.deleteItemGallery(req.params._id, req.params._id_item);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
