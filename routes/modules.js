/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const showdown           = require('showdown');
const {middlewareServer} = require('../middleware');
const {adminAuth}        = require('../middleware/authentication');
const serviceModule      = require('../services/modules');
const NSErrors           = require('../utils/errors/NSErrors');

module.exports = function (app) {
    app.post('/v2/modules',          adminAuth, getAllModules);
    app.post('/v2/module',           adminAuth, getModule);
    app.post('/v2/modules/upload',   adminAuth, uploadModule);
    app.post('/v2/modules/toggle',   adminAuth, toggleActiveModule);
    app.post('/v2/modules/md',       adminAuth, getModuleMd);
    app.delete('/v2/modules/:id',    adminAuth, removeModule);
    app.get('/v2/modules/check',     adminAuth, checkDependencies);
    app.post('/v2/module/setConfig', adminAuth, setModuleConfig);

    // Deprecated
    app.post('/v2/modules/md',       middlewareServer.deprecatedRoute, adminAuth, getModuleMd);
    app.put('/v2/module/config/:id', middlewareServer.deprecatedRoute, adminAuth, setModuleConfigById); // deprecated -> use /v2/module/setConfig
};

/**
 * Set the config of a module using his name
 * req.body.name -> the name of the module
 * req.body.config -> the new config
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 * @returns {Object} {config : theNewConfig}
 */
const setModuleConfig = async (req, res, next) => {
    try {
        const newConfig = await serviceModule.setConfig(req.body.name, req.body.config);
        return res.json({config: newConfig});
    } catch (err) {
        next(err);
    }
};

/**
 * Allows you to retrieve the modules according to the PostBody
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 */
async function getAllModules(req, res, next) {
    try {
        const result = await serviceModule.getModules(req.body.PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
/**
 * Allows you to retrieve a module according to the PostBody
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 */
async function getModule(req, res, next) {
    try {
        const result = await serviceModule.getModule(req.body.PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

const uploadModule = async (req, res, next) => {
    req.setTimeout(300000);
    try {
        const moduleInstalled = await serviceModule.initModule(req.files);
        return res.json(moduleInstalled);
    } catch (error) {
        return next(error);
    }
};

const toggleActiveModule = async (req, res, next) => {
    req.setTimeout(300000);
    try {
        const {idModule, active} = req.body;
        let modules              = [];
        if (active) {
            modules = await serviceModule.activateModule(idModule);
        } else {
            modules = await serviceModule.deactivateModule(idModule);
        }
        return res.json(modules);
    } catch (error) {
        return next(error);
    }
};

const removeModule = async (req, res, next) => {
    try {
        await serviceModule.removeModule(req.params.id);
        res.send({status: true});
    } catch (error) {
        return next(error);
    }
};

/**
 * @deprecated
 */
const getModuleMd = async (req, res, next) => {
    try {
        const result    = await serviceModule.getModuleMd(req.body);
        const converter = new showdown.Converter();
        res.json({html: converter.makeHtml(result)});
    } catch (error) {
        next(error);
    }
};

/**
 * @deprecated
 * Used to update the configuration of the module whose id is passed in parameter
 */
async function setModuleConfigById(req, res, next) {
    try {
        const result = await serviceModule.setModuleConfigById(req.params.id, req.body);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}