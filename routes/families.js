const {Families, Products}        = require("../orm/models");
const {authentication, adminAuth} = require("../middleware/authentication");
const {middlewareServer}          = require('../middleware');
const ServicesFamilies            = require('../services/families');
const utils                       = require('../utils/utils');

module.exports = function (app) {
    app.post('/v2/families', getFamilies);
    app.post('/v2/family', getFamily);
    app.put('/v2/family', authentication, adminAuth, saveFamily);
    app.delete('/v2/family/:_id', authentication, adminAuth, deleteFamily);

    // Deprecated
    app.get('/families', middlewareServer.deprecatedRoute, listInAdmin);
    app.get('/families/t/:type', middlewareServer.deprecatedRoute, getByType);
    app.get('/families/t/:type/:parent', middlewareServer.deprecatedRoute, getByType);
    app.get('/families/f/:id', middlewareServer.deprecatedRoute, getFamilyById);
    app.post('/families', middlewareServer.deprecatedRoute, save);
    app.delete('/families/:id', middlewareServer.deprecatedRoute, remove);
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
        next(error);
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

//= ====================================================================
//= ============================ Deprecated ============================
//= ====================================================================

/**
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 * @deprecated
 */
async function listInAdmin(req, res, next) {
    try {
        const families = await Families.find(req.query)
            .sort("name");
        return res.json(families);
    } catch (err) {
        return next(err);
    }
}

/**
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 * @deprecated
 */
async function getByType(req, res, next) {
    try {
        res.json(await Families.find({type: req.params.type}));
    } catch (err) {
        return next(err);
    }
}

/**
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 * @deprecated
 */
async function save(req, res, next) {
    let newData = {
        name   : req.body.name,
        type   : req.body.type,
        parent : req.body.parent,
        code   : utils.slugify(req.body.code)
    };

    if (req.body._id === "") {
        try {
            const newFamilly = new Families(newData);
            await newFamilly.save();
            if (req.body.id_parent !== '') {
                await Families.findOneAndUpdate({_id: req.body.id_parent}, {$push: {children: newFamilly._id}}, {new: true});
            }
            return res.status(200).end();
        } catch (err) {
            return next(err);
        }
    }
    if (req.body.field !== '') {
        // var oldData = newData;
        newData = {};
        // newData[req.body.field] = oldData[req.body.field];
        newData[req.body.field] = req.body.value;
        if (req.body.field === 'name') {
            newData.slug = utils.slugify(newData.name);
        }
    }

    let msg;
    try {
        await Families.findOneAndUpdate({_id: req.body._id}, newData, {upsert: true, new: true});
        msg = {status: true};
    } catch (err) {
        msg = {status: false, msg: err.errmsg};
    }
    if (req.body.field === 'name') {
        try {
            await Families.updateMany({'ancestors._id_ancestor': req.body._id}, {
                $set : {
                    'ancestors.$.name'  : newData.name,
                    'ancestors.$._slug' : `${utils.slugify(newData.name)}-${this.id}`
                }
            });
            console.log("Name: Ancestors updated!");
        } catch (err) {
            return next(err);
        }
    }
    return res.json(msg);
}

/**
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 * @deprecated
 */
const getFamilyById = async (req, res, next) => {
    try {
        const family = await Families.findOne({_id: req.params.id}).populate('children');
        family.children.sort((a, b) => {
            return a.displayOrder > b.displayOrder ? 1 : -1;
        });
        return res.json(family);
    } catch (err) {
        return next(err);
    }
};

/**
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 * @deprecated
 */
const remove = async (req, res, next) => {
    try {
        const _family = await Families.findOne({_id: req.params.id});
        await removeChildren2(_family);
        await Families.deleteOne({code: _family.code});

        // On supprime la famille de la famille parente
        await Families.updateOne({children: _family._id}, {$pull: {children: _family._id}});

        const where = {};
        const action = {};
        if (_family.type === "universe") {
            where.universe = _family.slug;
            action.$unset = {universe: "", family: "", subfamily: ""};
        } else if (_family.type === "family") {
            where.family = _family.slug;
            action.$unset = {family: "", subfamily: ""};
        } else {
            where.subfamily = _family.slug;
            action.$unset = {subfamily: ""};
        }

        await Products.updateMany(where, action);
        return res.end();
    } catch (err) {
        return next(err);
    }
};

/**
 *
 * @param {*} family
 * @deprecated
 */
const removeChildren2 = async (family) => {
    for (const childId of family.children) {
        await removeChildren2(await Families.findOneAndRemove({_id: childId}));
    }
};