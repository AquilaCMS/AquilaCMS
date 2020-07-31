const {Attributes}                = require('../orm/models');
const servicesAttributes          = require('../services/attribute');
const {authentication, adminAuth} = require('../middleware/authentication');
const utils                       = require('../utils/utils');
const {middlewareServer}          = require('../middleware');
const NSErrors                    = require('../utils/errors/NSErrors');

module.exports = function (app) {
    app.post('/v2/attributes', getAllAttributes);
    app.post('/v2/attribute', getAttribute);
    app.put('/v2/attribute', authentication, adminAuth, saveAttribute);
    app.delete('/v2/attribute/:_id', authentication, adminAuth, deleteAttribute);

    // Deprecated
    app.get('/attributes', middlewareServer.deprecatedRoute, authentication, adminAuth, listClassed);
    app.get('/attributes/fOne', middlewareServer.deprecatedRoute, authentication, adminAuth, listOrphans);
    app.get('/attributes/:code', middlewareServer.deprecatedRoute, authentication, adminAuth, detail);
    app.post('/attributes/fOne', middlewareServer.deprecatedRoute, authentication, adminAuth, fOne);
    app.post('/attributes/', middlewareServer.deprecatedRoute, authentication, adminAuth, save);
    app.delete('/attributes/:code', middlewareServer.deprecatedRoute, authentication, adminAuth, remove);
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

//= ====================================================================
//= ========================== Deprecated ==============================
//= ====================================================================

/**
 * @Deprecated
 */
const listClassed = async (req, res, next) => {
    const where = req.query;

    if (!where.set_attributes) {
        where.set_attributes = {$gt: []};
    }

    let populate_attributes;
    if (where.populate === 'true') {
        populate_attributes = true;
        delete where.populate;
    }
    if (where._type) {
        if (where._type === 'products') {
            where._type = {$in: ['products', null]};
        }
    } else {
        where._type = {$in: ['products', null]};
    }

    let result;
    if (populate_attributes) {
        result = await Attributes
            .find(where)
            .populate('set_attributes')
            .exec();
    } else {
        result = await Attributes
            .find(where)
            .exec();
    }
    try {
        return res.status(200).json(result);
    } catch (err) {
        return next(err);
    }
};

/**
 * @Deprecated
 */
const listOrphans = async (req, res, next) => {
    let attributes;
    try {
        attributes = await Attributes.find({set_attributes: [], ...req.query});
    } catch (err) {
        return next(err);
    }
    if (!attributes) return next(NSErrors.NotFound);
    return res.status(200).json(attributes);
};

/**
 * @Deprecated
 */
const detail = async (req, res, next) => {
    let attribute;
    try {
        attribute = await Attributes.findOne({code: req.params.code});
    } catch (err) {
        return next(err);
    }
    if (!attribute) {
        return next(NSErrors.NotFound);
    }
    attribute.type = utils.attributeCorrectOldTypeName(attribute.type);
    return res.status(200).json(attribute);
};

/**
 * @Deprecated
 */
const fOne = async (req, res, next) => {
    let attribute;
    try {
        attribute = await Attributes.findOne({_id: req.body.id});
    } catch (err) {
        return next(err);
    }
    if (!attribute) {
        return next(NSErrors.NotFound);
    }
    attribute.type = utils.attributeCorrectOldTypeName(attribute.type);
    res.status(200).json(attribute);
};

/**
 * @Deprecated
 */
async function save(req, res, next) {
    try {
        res.send(await servicesAttributes.setAttribute(req.body));
    } catch (err) {
        return next(err);
    }
}

/**
 * @Deprecated
 */
const remove = async (req, res, next) => {
    try {
        await servicesAttributes.remove(req.params.code);
        res.status(200).end();
    } catch (err) {
        return next(err);
    }
};
