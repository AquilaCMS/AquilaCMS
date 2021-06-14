/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const showdown                    = require('showdown');
const {authentication, adminAuth} = require('../middleware/authentication');
const serviceModule               = require('../services/modules');
const NSErrors                    = require('../utils/errors/NSErrors');

module.exports = function (app) {
    app.post('/v2/modules',          authentication, adminAuth, getAllModules);
    app.post('/v2/module',           authentication, adminAuth, getModule);
    app.post('/v2/modules/upload',   authentication, adminAuth, uploadModule);
    app.post('/v2/modules/toggle',   authentication, adminAuth, toggleActiveModule);
    app.post('/v2/modules/md',       authentication, adminAuth, getModuleMd);
    app.delete('/v2/modules/:id',    authentication, adminAuth, removeModule);
    app.get('/v2/modules/check',     authentication, adminAuth, checkDependencies);
    app.put('/v2/module/config/:id', authentication, adminAuth, setModuleConfigById); // deprecated -> use /v2/module/setConfig
    app.post('/v2/module/setConfig',  authentication, adminAuth, setModuleConfig);
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

const checkDependencies = async (req, res, next) => {
    req.setTimeout(300000);
    try {
        const {idModule, installation} = req.query;
        if (!idModule || !installation) throw NSErrors.UnprocessableEntity;
        let result;
        if (installation === 'true') {
            result = await serviceModule.checkDependenciesAtInstallation(idModule);
        } else {
            result = await serviceModule.checkDependenciesAtUninstallation(idModule);
        }
        res.json(result);
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
        const {idModule, toBeChanged, toBeRemoved, active} = req.body;
        let modules                                        = [];
        if (active) {
            modules = await serviceModule.activateModule(idModule, toBeChanged);
        } else {
            modules = await serviceModule.deactivateModule(idModule, toBeChanged, toBeRemoved);
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