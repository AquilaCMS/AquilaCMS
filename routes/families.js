/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {adminAuthRight} = require('../middleware/authentication');
const {autoFillCode}   = require('../middleware/autoFillCode');
const ServicesFamilies = require('../services/families');

module.exports = function (app) {
    app.post('/v2/families', getFamilies);
    app.post('/v2/family', getFamily);
    app.put('/v2/family', adminAuthRight('families'), autoFillCode, saveFamily);
    app.delete('/v2/family/:_id', adminAuthRight('families'), deleteFamily);
};

async function getFamilies(req, res, next) {
    try {
        const result = await ServicesFamilies.getFamilies(req.body.PostBody);
        return res.json(result);
    } catch (error) {
        next(error);
    }
}

async function getFamily(req, res, next) {
    try {
        const family = await ServicesFamilies.getFamily(req.body.PostBody);
        return res.json(family);
    } catch (error) {
        next(error);
    }
}

async function saveFamily(req, res, next) {
    try {
        const result = await ServicesFamilies.saveFamily(req.body);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
async function deleteFamily(req, res, next) {
    try {
        await ServicesFamilies.deleteFamily(req.params._id);
        return res.status(200).end();
    } catch (error) {
        next(error);
    }
}
