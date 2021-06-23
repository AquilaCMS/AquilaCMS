/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const name                        = 'optionsSet';
const ServiceOptionsSet           = require(`../services/${name}`);
const {authentication, adminAuth} = require('../middleware/authentication');

async function listOptionsSet(req, res, next) {
    try {
        const result = await ServiceOptionsSet.listOptionsSet(req.body.PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

async function getOptionsSet(req, res, next) {
    try {
        const result = await ServiceOptionsSet.getOptionsSet(req.body.PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

async function setOptionsSet(req, res, next) {
    try {
        const result = await ServiceOptionsSet.setOptionsSet(req.body);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

async function deleteOptionsSet(req, res, next) {
    try {
        const result = await ServiceOptionsSet.deleteOptionsSet(req.params.id);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

module.exports = function (app) {
    app.post(`/v2/${name}/list`, listOptionsSet);  // not protected for now (if we want to access it for filter in front)
    app.post(`/v2/${name}/get`, authentication, adminAuth,  getOptionsSet);
    app.post(`/v2/${name}/set`, authentication, adminAuth,  setOptionsSet);
    app.delete(`/v2/${name}/:id`, authentication, adminAuth,  deleteOptionsSet);
};