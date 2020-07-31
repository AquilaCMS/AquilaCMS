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

async function getTerritories(req, res, next) {
    try {
        const result = await ServiceTerritory.getTerritories(req.body.PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

async function getTerritory(req, res, next) {
    try {
        const result = await ServiceTerritory.getTerritory(req.body.PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Save or edit Territory
 */
async function setTerritory(req, res, next) {
    try {
        await ServiceTerritory.setTerritory(req.body);
        res.end();
    } catch (error) {
        return next(error);
    }
}

async function getTerritoryById(req, res, next) {
    try {
        const result = await ServiceTerritory.getTerritoryById(req.params.id, req.body.PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Delete Territory
 */
async function deleteTerritory(req, res, next) {
    try {
        await ServiceTerritory.deleteTerritory(req.params.id);
        res.end();
    } catch (error) {
        return next(error);
    }
}

async function listCountries(req, res, next) {
    try {
        const countries = await Territory.find({type: 'country'}).sort({name: 1});
        return res.json(countries);
    } catch (err) {
        return next(err);
    }
}
