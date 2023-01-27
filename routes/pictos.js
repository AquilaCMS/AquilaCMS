/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {adminAuthRight} = require('../middleware/authentication');
const ServiceRule      = require('../services/rules');
const ServicePicto     = require('../services/pictos');
const {autoFillCode}   = require('../middleware/autoFillCode');

module.exports = function (app) {
    app.post('/v2/picto',           adminAuthRight('picto'), getPictos);
    app.post('/v2/picto/execRules', adminAuthRight('picto'), execRules);
    app.post('/v2/picto/:id',       adminAuthRight('picto'), getPictoById);
    app.put('/v2/picto/:id?',       adminAuthRight('picto'), autoFillCode, savePicto);
    app.delete('/v2/picto/:id',     adminAuthRight('picto'), deletePicto);
};

/**
 * Function returning a picto listing
 */
async function getPictos(req, res, next) {
    try {
        const result = await ServicePicto.getPictos(req.body.PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
/**
 * Function returning a pictogram according to its id
 */
async function getPictoById(req, res, next) {
    try {
        const result = await ServicePicto.getPictoById(
            req.params.id,
            req.body.PostBody
        );
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
/**
 * Function to add or update a pictogram
 */
async function savePicto(req, res, next) {
    try {
        let result;
        if (req.body._id) {
            result = await ServicePicto.savePicto(req.body);
        } else {
            result = await ServicePicto.createPicto(req.body);
        }
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
/**
 * Function removing a pictogram
 */
async function deletePicto(req, res, next) {
    try {
        const result = await ServicePicto.deletePicto({_id: req.params.id});
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

function execRules(req, res, next) {
    try {
        if (req.body.id) {
            // TODO don't work
            ServiceRule.execRules('picto', [], req.body.id);
        } else {
            ServiceRule.execRules('picto');
        }
        return res.end();
    } catch (error) {
        return next(error);
    }
}
