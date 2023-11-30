/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const path                 = require('path');
const {fs, restart}        = require('aql-utils');
const {middlewareServer}   = require('../middleware');
const {adminAuth}          = require('../middleware/authentication');
const {extendTimeOut}      = require('../middleware/server');
const serviceConfig        = require('../services/config');
const NSErrors             = require('../utils/errors/NSErrors');
const {getUploadDirectory} = require('../utils/server');
const {multerUpload}       = require('../middleware/multer');

module.exports = function (app) {
    app.put('/v2/config', adminAuth, extendTimeOut, saveEnvFile, saveEnvConfig);
    app.post('/v2/config', getConfig);
    app.post('/v2/config/ssl/:fileType', adminAuth, multerUpload.any(), uploadSSLFile);
    app.get('/restart', adminAuth, restartServer);
    app.get('/robot', adminAuth, getRobot);
    app.post('/robot', adminAuth, setRobot);

    // Deprecated
    app.get('/config/data', middlewareServer.deprecatedRoute, getConfigTheme);
};

/**
 * @deprecated
 */
const getConfigTheme = async (req, res, next) => {
    try {
        const data = await serviceConfig.getConfigTheme();
        return res.json(data);
    } catch (err) {
        return next(err);
    }
};

/**
 * POST /api/v2/config
 * @summary Get config of the website
 */
const getConfig = async (req, res, next) => {
    try {
        const {PostBody} = req.body;
        const config     = await serviceConfig.getConfig(PostBody, req.info);
        return res.json(config);
    } catch (e) {
        next(e);
    }
};

async function saveEnvFile(req, res, next) {
    try {
        await serviceConfig.saveEnvFile(req.body, req.files);
        next();
    } catch (err) {
        return next(err);
    }
}

/**
 * PUT /api/v2/config
 * @summary Save config
 */
async function saveEnvConfig(req, res, next) {
    try {
        await serviceConfig.saveEnvConfig(req.body);
        if (req.body?.environment?.needRestart || global.aquila.envConfig.environment.needRestart) {
            setTimeout(() => {
                restart();
            }, 5000);
        }
        res.json({
            status : 'success',
            data   : {
                needRestart : req.body?.environment?.needRestart || global.aquila.envConfig.environment.needRestart
            }
        });
    } catch (err) {
        return next(err);
    }
}

/**
 * GET /api/restart
 */
const restartServer = async (req, res, next) => {
    try {
        return res.send(await restart());
    } catch (err) {
        return next(err);
    }
};

/**
 * GET /api/robot
 */
async function getRobot(req, res, next) {
    try {
        const robotPath = path.resolve(getUploadDirectory(), 'robots.txt');
        if (await fs.hasAccess(robotPath)) {
            const file = await fs.readFile(robotPath, {encoding: 'utf-8'});
            return res.json({robot: file.toString()});
        }
        return res.json({robot: ''});
    } catch (err) {
        next(err);
    }
}

/**
 * POST /api/robot
 */
async function setRobot(req, res, next) {
    try {
        const {PostBody} = req.body;
        if (!PostBody) throw NSErrors.PostBodyUndefined;
        const robotPath = path.resolve(getUploadDirectory(), 'robots.txt');
        await fs.writeFile(robotPath, PostBody.text, 'utf8');
        return res.json({message: 'success'});
    } catch (error) {
        next(error);
    }
}

async function uploadSSLFile(req, res, next) {
    try {
        return res.json(await serviceConfig.uploadSSLFile(req.params.fileType, req.files, req.body));
    } catch (err) {
        next(err);
    }
}