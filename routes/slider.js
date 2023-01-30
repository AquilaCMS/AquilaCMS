/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {adminAuthRight} = require('../middleware/authentication');
const {autoFillCode}   = require('../middleware/autoFillCode');
const ServiceSlider    = require('../services/slider');

module.exports = function (app) {
    app.post('/v2/sliders', getSliders);
    app.post('/v2/slider', getSlider);
    app.post('/v2/slider/:id', getSliderById);
    app.put('/v2/slider/:id?', adminAuthRight('slider'), autoFillCode, setSlider);
    app.delete('/v2/slider/:id', adminAuthRight('slider'), deleteSlider);
    app.delete('/v2/slider/:_id/:_id_item', adminAuthRight('slider'), deleteItemSlider);
};

/**
 * Function returning a product listing
 */
async function getSliders(req, res, next) {
    try {
        const result = await ServiceSlider.getSliders(req.body.PostBody, req.info);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
/**
 * Function returning a slider according to its id
 */
async function getSliderById(req, res, next) {
    try {
        const result = await ServiceSlider.getSliderById(req.params.id, req.body.PostBody, req.info);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
/**
 * Function returning a slider according to the parameters of the queryBuilder filter
 */
async function getSlider(req, res, next) {
    try {
        const result = await ServiceSlider.getSlider(req.body.PostBody, req.info);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
/**
 * Function to add or update a slider
 */
async function setSlider(req, res, next) {
    // We add the slider
    try {
        let result;
        if (req.body._id) {
            // We update the slider
            result = await ServiceSlider.setSlider(req.body._id, req.body);
        } else {
            // Creating the slider
            result = await ServiceSlider.createSlider(req.body);
        }
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
/**
 * Function removing a slider
 */
async function deleteSlider(req, res, next) {
    try {
        await ServiceSlider.deleteSlider(req.params.id);
        return res.json({status: true});
    } catch (error) {
        return next(error);
    }
}

async function deleteItemSlider(req, res, next) {
    try {
        const result = await ServiceSlider.deleteItemSlider(req.params._id, req.params._id_item);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
