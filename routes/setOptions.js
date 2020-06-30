/*
*  This is a legacy file, not used
*/

const {SetOptions, Products} = require("../orm/models");
const setOptionServices      = require('../services/setOptions');
const NSErrors               = require("../utils/errors/NSErrors");

module.exports = function (app) {
    app.post('/v2/setOptions', getSetOptions);
    app.post('/v2/setOption/:id', getSetOptionById);
    app.put("/v2/setOption", setSetOption);
    app.delete('/v2/setOption/:id', deleteSetOption);

    app.get('/setOptions', list);
    app.get('/setOptions/:code', detail);
    app.post('/setOptions/fOne', fOne);
    app.post('/setOptions/', save);
    app.delete('/setOptions/:code', remove);
};

/**
 * Fonction retournant un listing de jeux d'options
 */
async function getSetOptions(req, res, next) {
    try {
        const result = await setOptionServices.getSetOptions(req.body.PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
/**
 * Fonction retournant un jeu d'options
 */
async function getSetOptionById(req, res, next) {
    try {
        const result = await setOptionServices.getSetOptionById(req.params.id, req.body.PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
/**
 * Fonction pour ajouter ou mettre à jour un jeu d'options
 */
async function setSetOption(req, res, next) {
    try {
        const result = await setOptionServices.createOrUpdateSetAttribute(req);
        res.json(result);
    } catch (error) {
        return next(error);
    }
}
/**
 * Fonction supprimant un jeu d'options
 */
async function deleteSetOption(req, res, next) {
    try {
        const result = await setOptionServices.deleteSetOption(req);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
//= =======================================================================
//= ==============================OLD VERSION==============================
//= =======================================================================
async function list(req, res, next) {
    try {
        const setOptions = await SetOptions.find(null);
        res.json(setOptions);
    } catch (err) {
        return next(err);
    }
}

async function detail(req, res, next) {
    try {
        const setOption = await SetOptions.findOne({code: req.params.code});
        if (!setOption) {
            throw NSErrors.SetOptionNotFound;
        }
        return res.json(setOption);
    } catch (err) {
        return next(err);
    }
}

async function fOne(req, res, next) {
    try {
        const setOption = await SetOptions.findOne({_id: req.body.id});
        if (!setOption) {
            throw NSErrors.SetOptionNotFound;
        }
        return res.json(setOption);
    } catch (err) {
        return next(err);
    }
}

async function save(req, res, next) {
    try {
        const code = req.body.code.replace(/[^A-Z0-9]+/ig, "_");
        const name = req.body.name;
        const updateF = req.body.update;

        const setOption = await SetOptions.findOne({code});
        if (setOption && updateF) {
            SetOptions.updateOne({code}, {name});
            return res.send({status: true});
        }
        if (setOption && !updateF) {
            return res.send({alreadyExist: true});
        }
        await SetOptions.create({code, name});
        return res.send({status: true});
    } catch (err) {
        return next(err);
    }
}
async function remove(req, res, next) {
    try {
        const _setOpt = await SetOptions.findOne({code: req.params.code});
        if (!_setOpt) {
            throw {
                code         : "setoption_not_found",
                status       : 404,
                translations : {
                    fr : `Le jeu d'options ${req.params.code} n'existe pas.`,
                    en : `Options set ${req.params.code} doesn't exist.`
                }
            };
        }
        await Products.updateMany({set_options: _setOpt._id}, {$unset: {set_options: ""}});
        await _setOpt.remove();
        return res.end();
    } catch (err) {
        return next(err);
    }
}