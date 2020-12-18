/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const ServiceGallery = require('../services/gallery');

module.exports = function (app) {
    app.get('/v2/galleries', getGalleries);
    app.get('/v2/gallery/:_id', getGallery);
    app.get('/v2/gallery/:code/items', getItemsGallery);
    app.put('/v2/gallery', setGallery);
    app.put('/v2/gallery/:_id/item', setItemGallery);
    app.put('/v2/gallery/:_id/items', setItemsGallery);
    app.delete('/v2/gallery/:_id', deleteGallery);
    app.delete('/v2/gallery/:_id/:_id_item', deleteItemGallery);
};

/**
 * Fonction retournant un listing de galleries
 */
async function getGalleries(req, res, next) {
    try {
        const result = await ServiceGallery.getGalleries();
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
/**
 * Fonction retournant une gallerie par son id
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
 * Fonction retournant les items d'une gallerie en fonction de son code
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
 * Fonction pour ajouter ou mettre à jour une gallerie
 */
async function setGallery(req, res, next) {
    // On ajoute le produit
    try {
        const result = await ServiceGallery.setGallery(req.body.code, req.body.initItemNumber, req.body.maxColumnNumber, req.body._id);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
/**
 * Fonction pour ajouter ou mettre à jour un item d'une gallerie
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
 * Fonction supprimant une gallerie
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
