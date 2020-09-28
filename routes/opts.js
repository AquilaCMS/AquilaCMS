/*
*  This is a legacy file, not used
*/

const {Opts, SetOptions} = require('../orm/models');
const mediasUtils        = require('../utils/utils');
const NSErrors           = require('../utils/errors/NSErrors');

module.exports = function (app) {
    app.get('/opts', listClassed);
    app.get('/opts/fOne', listOrphans);
    app.get('/opts/:code', detail);
    app.post('/opts/fOne', fOne);
    app.post('/opts/', save);
    app.delete('/opts/:code', remove);
    app.post('/opts/search', search);
};

const listClassed = async (req, res, next) => {
    try {
        res.json(await Opts.find({set_options: {$gt: []}}));
    } catch (err) {
        return next(err);
    }
};

const listOrphans = async (req, res, next) => {
    try {
        res.json(await Opts.find({set_options: []}));
    } catch (err) {
        return next(err);
    }
};

const detail = async (req, res, next) => {
    try {
        res.json(await Opts.find({code: req.params.code})[0]);
    } catch (err) {
        return next(err);
    }
};

const fOne = async (req, res, next) => {
    try {
        res.json(await Opts.find({_id: req.body.id})[0]);
    } catch (err) {
        return next(err);
    }
};

const save = async (req, res, next) => {
    const code        = req.body.code.replace(/[^A-Z0-9]+/ig, '_');
    const name        = req.body.name;
    const columns     = req.body.columns;
    const values      = req.body.values;
    const updateF     = req.body.update;
    const set_options = req.body.set_options;
    const setToAdd    = req.body.multiModifAdd;
    const setToRemove = req.body.multiModifRemove;

    try {
        const option = await Opts.findOne({code});
        if (option && updateF) {
            for (const column of option.columns) {
                if (column.type === 'Image') {
                    const bUrls = {};
                    values.forEach(function (obj) {
                        bUrls[obj[column.name]] = obj;
                    });

                    const toRemove = option.values.filter((obj) => !(obj[column.name] in bUrls));

                    for (let j = 0; j < toRemove.length; j++) {
                        await mediasUtils.deleteFile(toRemove[j][column.name]);
                    }
                }
            }

            await Opts.updateOne({code}, {name, set_options, columns, values});
            for (const set of setToRemove) {
                await SetOptions.updateMany({_id: set}, {$pull: {opts: option._id}});
            }
            for (const set of setToAdd) {
                await SetOptions.updateMany({_id: set}, {$addToSet: {opts: option._id}});
            }
            res.send({status: true});
        } else if (option && !updateF) {
            res.send({alreadyExist: true});
        } else {
            const opt = await Opts.create({code, name, set_options, columns, values});
            for (const set of set_options) {
                await SetOptions.updateMany({_id: set}, {$push: {opts: opt._id}});
            }
            res.send(opt);
        }
    } catch (err) {
        return next(err);
    }
};

const remove = async (req, res, next) => {
    try {
        const _opt = Opts.findOne({code: req.params.code});
        if (!_opt) {
            // return res.status(404).send(`L'option ${req.params.code} n'existe pas.`);
            throw NSErrors.NotFound;
        }
        const opt = _opt;
        await SetOptions.updateMany({_id: {$in: _opt.set_options}}, {$pull: {opts: _opt._id}});
        await _opt.remove();
        for (let i = 0; i < opt.columns.length; i++) {
            const column = opt.columns[i];
            if (column.type === 'Image') {
                for (let j = 0; j < opt.values.length; j++) {
                    await mediasUtils.deleteFile(opt.values[j][column.name]);
                }
            }
        }
        res.end();
    } catch (err) {
        return next(err);
    }
};

const search = async (req, res, next) => {
    try {
        res.json(await Opts.find(req.body));
    } catch (err) {
        return next(err);
    }
};
