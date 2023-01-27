/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {adminAuthRight} = require('../middleware/authentication');
const {autoFillCode}   = require('../middleware/autoFillCode');
const {Territory}      = require('../orm/models');
const ServiceTerritory = require('../services/territory');

module.exports = function (app) {
    app.post('/v2/territories', getTerritories);
    app.post('/v2/territory', getTerritory);
    app.delete('/v2/territory/:id', adminAuthRight('territories'), deleteTerritory);
    app.put('/v2/territory', adminAuthRight('territories'), autoFillCode, setTerritory);
    app.post('/v2/territory/:id', getTerritoryById);
    app.get('/territory/countries', listCountries);
};

/**
 * POST /api/v2/territories
 * @summary Get a list of territory
 */
async function getTerritories(req, res, next) {
    try {
        const result = await ServiceTerritory.getTerritories(req.body.PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * POST /api/v2/territory
 * @param {PostBody} request.body - PostBody
 */
async function getTerritory(req, res, next) {
    try {
        const result = await ServiceTerritory.getTerritory(req.body.PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * PUT /api/v2/territory
 * @summary Used for creating and updating territories
 */
async function setTerritory(req, res, next) {
    try {
        await ServiceTerritory.setTerritory(req.body);
        res.end();
    } catch (error) {
        return next(error);
    }
}

/**
 * POST /api/v2/territory/{id}
 */
async function getTerritoryById(req, res, next) {
    try {
        const result = await ServiceTerritory.getTerritoryById(req.params.id, req.body.PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * DELETE /api/v2/territory/{id}
 */
async function deleteTerritory(req, res, next) {
    try {
        await ServiceTerritory.deleteTerritory(req.params.id);
        res.end();
    } catch (error) {
        return next(error);
    }
}

/**
 * GET /api/territory/countries
 */
async function listCountries(req, res, next) {
    try {
        const countries = await Territory.find({type: 'country'}).sort({name: 1});
        return res.json(countries);
    } catch (err) {
        return next(err);
    }
}
