/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const name                        = 'options';
const ServiceOptions              = require(`../services/${name}`);
const {authentication, adminAuth} = require('../middleware/authentication');

async function listOptions(req, res, next) {
    try {
        const result = await ServiceOptions.listOptions(req.body.PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

async function getOptions(req, res, next) {
    try {
        const result = await ServiceOptions.getOptions(req.body.PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

async function setOptions(req, res, next) {
    try {
        const result = await ServiceOptions.setOptions(req.body);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

async function deleteOptions(req, res, next) {
    try {
        const result = await ServiceOptions.deleteOptions(req.params.id);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

module.exports = function (app) {
    app.post(`/v2/${name}/list`, listOptions); // not protected for now (if we want to access it for filter in front)
    app.post(`/v2/${name}/get`, authentication, adminAuth, getOptions);
    app.post(`/v2/${name}/set`, authentication, adminAuth, setOptions);
    app.delete(`/v2/${name}/:id`, authentication, adminAuth, deleteOptions);
};