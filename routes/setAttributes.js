/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const setAttributeServices = require('../services/setAttributes');
const {adminAuth}          = require('../middleware/authentication');

module.exports = function (app) {
    app.post('/v2/setAttributes', getSetAttributes);
    app.post('/v2/setAttribute', getSetAttribute);
    app.put('/v2/setAttribute', adminAuth, setSetAttribute);
    app.delete('/v2/setAttribute/:id', adminAuth, deleteSetAttribute);
};

/**
 * Function returning a listing of sets of attributes
 */
async function getSetAttributes(req, res, next) {
    try {
        const result = await setAttributeServices.getSetAttributes(req.body.PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
/**
 * Function returning a set of attributes
 */
async function getSetAttribute(req, res, next) {
    try {
        const result = await setAttributeServices.getSetAttribute(req.body.PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
/**
 * Function to add or update an attribute set
 */
async function setSetAttribute(req, res, next) {
    try {
        // The route does not appear to contain a change to setAttributes
        const result = await setAttributeServices.createOrUpdateSetAttribute(req.body);
        res.json(result);
    } catch (error) {
        return next(error);
    }
}
/**
 * Function deleting a set of attributes
 */
async function deleteSetAttribute(req, res, next) {
    try {
        const result = await setAttributeServices.deleteSetAttribute(req.params.id);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
