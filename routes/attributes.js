const servicesAttributes          = require('../services/attribute');
const {authentication, adminAuth} = require('../middleware/authentication');

module.exports = function (app) {
    app.post('/v2/attributes', getAllAttributes);
    app.post('/v2/attribute', getAttribute);
    app.put('/v2/attribute', authentication, adminAuth, saveAttribute);
    app.delete('/v2/attribute/:_id', authentication, adminAuth, deleteAttribute);
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
