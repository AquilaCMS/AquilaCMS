/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2022 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const servicesAttributes = require('../services/attribute');
const {adminAuthRight}   = require('../middleware/authentication');
const {autoFillCode}     = require('../middleware/autoFillCode');

module.exports = function (app) {
    app.post('/v2/attributes', getAllAttributes);
    app.post('/v2/attribute', getAttribute);
    app.put('/v2/attribute', adminAuthRight('attributes'), autoFillCode,  saveAttribute);
    app.delete('/v2/attribute/:_id', adminAuthRight('attributes'), deleteAttribute);
};

async function getAllAttributes(req, res, next) {
    try {
        const attributes = await servicesAttributes.getAllAttributes(req.body.PostBody);
        return res.status(200).json(attributes);
    } catch (error) {
        return next(error);
    }
}

async function getAttribute(req, res, next) {
    try {
        const attribute = await servicesAttributes.getAttribute(req.body.PostBody);
        return res.status(200).json(attribute);
    } catch (error) {
        return next(error);
    }
}

async function saveAttribute(req, res, next) {
    try {
        const attribute = await servicesAttributes.setAttribute(req.body);
        return res.status(200).json(attribute);
    } catch (error) {
        return next(error);
    }
}

async function deleteAttribute(req, res, next) {
    try {
        const attribute = await servicesAttributes.remove(req.params._id);
        return res.status(200).json(attribute);
    } catch (error) {
        return next(error);
    }
}
