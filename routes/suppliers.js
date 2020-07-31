const {Suppliers, Products}       = require('../orm/models');
const ServiceSuppliers            = require('../services/suppliers');
const {middlewareServer}          = require('../middleware');
const {authentication, adminAuth} = require('../middleware/authentication');
const NSErrors                    = require('../utils/errors/NSErrors');
const utils                       = require('../utils/utils');

module.exports = function (app) {
    app.post('/v2/suppliers', listSuppliers);
    app.post('/v2/supplier', getSupplier);
    app.put('/v2/supplier', authentication, adminAuth, saveSupplier);
    app.delete('/v2/supplier/:id', authentication, adminAuth, deleteSupplier);

    // Deprecated
    app.get('/suppliers', middlewareServer.deprecatedRoute, list);
    app.get('/suppliers/:id', middlewareServer.deprecatedRoute, detail);
    app.get('/suppliers/getById/:id', middlewareServer.deprecatedRoute, getById);
    app.get('/suppliers/products/:id', middlewareServer.deprecatedRoute, getSupplierProducts);
    app.post('/suppliers', middlewareServer.deprecatedRoute, save);
    app.post('/suppliers/search', middlewareServer.deprecatedRoute, searchSupplier);
    app.delete('/suppliers/:code', middlewareServer.deprecatedRoute, remove);
};

const listSuppliers = async (req, res, next) => {
    try {
        return res.json(await ServiceSuppliers.listSuppliers(req.body.PostBody));
    } catch (error) {
        next(error);
    }
};

const getSupplier = async (req, res, next) => {
    try {
        return res.json(await ServiceSuppliers.getSupplier(req.body.PostBody));
    } catch (error) {
        next(error);
    }
};

const saveSupplier = async (req, res, next) => {
    try {
        return res.json(await ServiceSuppliers.saveSupplier(req.body));
    } catch (error) {
        next(error);
    }
};

const deleteSupplier = async (req, res, next) => {
    try {
        await ServiceSuppliers.deleteSupplier(req.params.id);
        return res.status(200).end();
    } catch (error) {
        next(error);
    }
};

//= ====================================================================
//= ========================== Deprecated ==============================
//= ====================================================================

/**
 * @deprecated
 * @param {Express.Request} req req
 * @param {Express.Response} res res
 * @param {Function} next next
 */
const searchSupplier = async (req, res, next) => {
    try {
        const queryCondition = {
            $or : [{name: new RegExp(req.body.q, 'i')}, {code: new RegExp(req.body.q, 'i')}]
        };
        const foundSuppliers = await Suppliers.find(queryCondition, null, {
            skip  : (req.body.start - 1) * req.body.limit,
            limit : req.body.limit
        }).sort('name');
        const count = await Suppliers.countDocuments(queryCondition);
        res.json({suppliers: foundSuppliers, count});
    } catch (err) {
        return next(err);
    }
};

/**
 * @deprecated
 * @param {Express.Request} req req
 * @param {Express.Response} res res
 * @param {Function} next next
 */
const list = async (req, res, next) => {
    try {
        res.json(await Suppliers.find(null));
    } catch (err) {
        return next(err);
    }
};

/**
 * @deprecated
 * @param {Express.Request} req req
 * @param {Express.Response} res res
 * @param {Function} next next
 */
const detail = async (req, res, next) => {
    try {
        res.status(200).json(await Suppliers.findOne({code: req.params.id}));
    } catch (err) {
        return next(err);
    }
};

/**
 * @deprecated
 * @param {Express.Request} req req
 * @param {Express.Response} res res
 * @param {Function} next next
 */
const getById = async (req, res, next) => {
    try {
        res.status(200).json(await Suppliers.findOne({_id: req.params.id}));
    } catch (err) {
        return next(err);
    }
};

/**
 * @deprecated
 * @param {Express.Request} req req
 * @param {Express.Response} res res
 * @param {Function} next next
 */
const save = async (req, res, next) => {
    try {
        const supplier = await Suppliers.findById(req.body._id);
        if (!supplier) {
            req.body.code = utils.slugify(req.body.code);
            const response = await Suppliers.create(req.body);
            res.send({status: 200, response});
        }
        const updatedData = req.body;
        const response = await Suppliers.updateOne({_id: req.body._id}, updatedData);
        res.send({status: 200, response});
    } catch (err) {
        return next(err);
    }
};

/**
 * @deprecated
 * @param {Express.Request} req req
 * @param {Express.Response} res res
 * @param {Function} next next
 */
const getSupplierProducts = async (req, res, next) => {
    try {
        const prdFound = await Products.find({supplier_ref: req.params.id}, null, {
            skip  : (req.query.page - 1) * req.query.limit,
            limit : parseInt(req.query.limit, 10)
        });
        const count = await Products.countDocuments({supplier_ref: req.params.id});
        res.json({products: prdFound, count});
    } catch (err) {
        return next(err);
    }
};

/**
 * @deprecated
 * @param {Express.Request} req req
 * @param {Express.Response} res res
 * @param {Function} next next
 */
const remove = async (req, res, next) => {
    try {
        const supplier = await Suppliers.findOne({code: req.params.code});
        if (!supplier) throw NSErrors.NotFound;

        await Products.updateMany({supplier_ref: supplier._id}, {$unset: {supplier_ref: ''}});
        supplier.remove();
        res.status(200).end();
    } catch (err) {
        return next(err);
    }
};
