const {authentication, adminAuth} = require('../middleware/authentication');
const {Territory}                 = require('../orm/models');
const ServiceTerritory            = require('../services/territory');

module.exports = function (app) {
    app.post('/v2/territories', getTerritories);
    app.post('/v2/territory', getTerritory);
    app.delete('/v2/territory/:id', authentication, adminAuth, deleteTerritory);
    app.put('/v2/territory', authentication, adminAuth, setTerritory);
    app.post('/v2/territory/:id', getTerritoryById);
    app.get('/territory/countries', listCountries);
};

/**
 * POST /api/v2/territories
 * @tags Territory
 * @summary get a list of territory
 * @param {PostBody} request.body.required - PostBody
 * @return {ResponseTerritories} 200 - list of territories | territories
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
 * @tags Territory
 * @param {PostBody} request.body.required - PostBody
 * @returns {TerritorySchema} territory
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
 * @summary used for creating and updating territories
 * @tags Territory
 * @param {TerritorySchema} request.body.required - territory
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
 * @tags Territory
 * @param {string} id.path.required - territory id
 * @param {PostBody} request.body - PostBody
 * @returns {TerritorySchema} territory
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
 * @tags Territory
 * @param {string} id.path.required - territory id
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
 * @tags Territory
 */
async function listCountries(req, res, next) {
    try {
        const countries = await Territory.find({type: 'country'}).sort({name: 1});
        return res.json(countries);
    } catch (err) {
        return next(err);
    }
}
