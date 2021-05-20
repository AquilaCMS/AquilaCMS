/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const ServiceSuppliers            = require('../services/suppliers');
const {authentication, adminAuth} = require('../middleware/authentication');

module.exports = function (app) {
    app.post('/v2/suppliers', listSuppliers);
    app.post('/v2/supplier', getSupplier);
    app.put('/v2/supplier', authentication, adminAuth, saveSupplier);
    app.delete('/v2/supplier/:id', authentication, adminAuth, deleteSupplier);
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
