/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const showdown           = require('showdown');
const {middlewareServer} = require('../middleware');
const {adminAuthRight}   = require('../middleware/authentication');
const {adminAuth}        = require('../middleware/authentication');
const serviceModule      = require('../services/modules');
const NSErrors           = require('../utils/errors/NSErrors');
const {multerUpload}     = require('../middleware/multer');

module.exports = function (app) {
    app.post('/v2/modules', adminAuth, getAllModules);
    app.post('/v2/module', adminAuthRight('modules'), getModule);
    app.post('/v2/modules/upload', adminAuthRight('modules'), multerUpload.any(), uploadModule);
    app.post('/v2/modules/toggle', adminAuthRight('modules'), toggleActiveModule);
    app.delete('/v2/modules/:id', adminAuthRight('modules'), removeModule);
    app.get('/v2/modules/check', adminAuthRight('modules'), checkDependencies);
    app.post('/v2/module/setConfig', adminAuthRight('modules'), setModuleConfig);
    app.get('/v2/module/installDependencies', adminAuthRight('modules'), installDependencies);
    app.post('/v2/modules/md', adminAuthRight('modules'), getModuleMd);

    // Deprecated
    app.put('/v2/module/config/:id', middlewareServer.deprecatedRoute, adminAuthRight('modules'), setModuleConfigById); // deprecated -> use /v2/module/setConfig
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
        converter.setOption('tables', true);
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

async function installDependencies(req, res, next) {
    try {
        return res.json(await serviceModule.installDependencies());
    } catch (error) {
        console.error(error);
        next(error);
    }
}