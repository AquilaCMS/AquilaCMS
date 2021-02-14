/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {authentication, adminAuth} = require('../middleware/authentication');
const {extendTimeOut}             = require('../middleware/server');
const serviceConfig               = require('../services/config');
const packageManager              = require('../utils/packageManager');
const NSErrors                    = require('../utils/errors/NSErrors');
const fs                          = require('../utils/fsp');
const {getDecodedToken}           = require('../services/auth');

module.exports = function (app) {
    app.put('/v2/config', authentication, adminAuth, extendTimeOut, saveEnvFile, saveEnvConfig);
    app.post('/v2/config', getConfig);
    app.get('/restart', authentication, adminAuth, restart);
    app.get('/robot', authentication, adminAuth, getRobot);
    app.post('/robot', authentication, adminAuth, setRobot);
    app.get('/config/data', getConfigTheme);
};

/**
 * GET /api/config/data
 */
const getConfigTheme = async (req, res, next) => {
    try {
        const data = serviceConfig.getConfigTheme();
        return res.json(data);
    } catch (err) {
        return next(err);
    }
};

/**
 * POST /api/v2/config/{key}
 * @summary Get config of the website
 */
const getConfig = async (req, res, next) => {
    try {
        const {PostBody} = req.body;
        let userInfo;
        if (req.headers && req.headers.authorization) {
            try {
                userInfo = getDecodedToken(req.headers.authorization);
                if (userInfo) userInfo = userInfo.info;
            } catch (error) {
                console.error(error);
            }
        }
        const config = await serviceConfig.getConfig(PostBody, userInfo);
        return res.json(config);
    } catch (e) {
        return next(e);
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
        if (req.body.needRestart) {
            setTimeout(() => {
                packageManager.restart();
            }, 5000);
        }
        res.send({
            status : 'success',
            data   : {
                needRestart : req.body.needRestart
            }
        });
    } catch (err) {
        return next(err);
    }
}

/**
 * GET /api/restart
 */
const restart = async (req, res, next) => {
    try {
        await packageManager.restart();
    } catch (err) {
        return next(err);
    }
};

/**
 * GET /api/robot
 */
async function getRobot(req, res) {
    try {
        if (!(await fs.access('robots.txt'))) {
            const file = await fs.readFile('robots.txt', {encoding: 'utf-8'});
            return res.json({robot: file.toString()});
        }
    } catch (error) {
        return res.json({robot: ''});
    }
}

/**
 * POST /api/robot
 */
async function setRobot(req, res, next) {
    try {
        const {PostBody} = req.body;
        if (!PostBody) throw NSErrors.PostBodyUndefined;
        await fs.writeFile('robots.txt', PostBody.text, 'utf8');
        return res.json({message: 'success'});
    } catch (error) {
        next(error);
    }
}
