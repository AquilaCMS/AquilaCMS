const path                        = require('path');
const {Configuration}             = require('../orm/models');
const {authentication, adminAuth} = require('../middleware/authentication');
const {extendTimeOut}             = require('../middleware/server');
const ServiceConfig               = require('../services/config');
const packageManager              = require('../utils/packageManager');
const NSErrors                    = require('../utils/errors/NSErrors');
const fs                          = require('../utils/fsp');
const {getDecodedToken}           = require('../services/auth');

module.exports = function (app) {
    app.put('/v2/config', authentication, adminAuth, extendTimeOut, saveEnvFile, saveEnvConfig);
    app.post('/v2/config/sitename', getSiteName);
    app.post('/v2/config/:key?', getConfigV2);

    app.get('/config/sitename', getSiteName);
    app.post('/config/save', authentication, adminAuth, extendTimeOut, saveEnvFile, saveEnvConfig);
    app.get('/config/:action/:propertie', authentication, adminAuth, getConfig);
    app.get('/config/data', getConfigTheme);
    app.get('/restart', authentication, adminAuth, restart);
    app.get('/robot', authentication, adminAuth, getRobot);
    app.post('/robot', authentication, adminAuth, setRobot);

    app.get('/config/next', authentication, adminAuth, getNextVersion);
    app.post('/config/next', authentication, adminAuth, changeNextVersion);
};

/**
 * POST /api/v2/config/{key}
 * @tags Configuration
 * @summary Get config of the website
 * @param {string} key.path.required - key config ex: environment
 * @param {PostBody} request.body - PostBody
 * @param {string} authorization.headers - authorization
 * @return {Config} 200 - success
 */
const getConfigV2 = async (req, res, next) => {
    try {
        let userInfo;
        if (req.headers && req.headers.authorization) {
            try {
                userInfo = getDecodedToken(req.headers.authorization);
                if (userInfo) userInfo = userInfo.info;
            } catch (error) {
                console.error(error);
            }
        }
        const config = await ServiceConfig.getConfigV2(req.params.key, req.body.PostBody, userInfo);
        return res.json(config);
    } catch (e) {
        return next(e);
    }
};

async function saveEnvFile(req, res, next) {
    try {
        await ServiceConfig.saveEnvFile(req.body, req.files);
        next();
    } catch (err) {
        return next(err);
    }
}

/**
 * PUT /api/v2/config
 * @summary Save config
 * @tags Configuration
 * @param {Config} request.body - config
 * @return {string} 200 - success | success | "success"
 */
async function saveEnvConfig(req, res, next) {
    try {
        await ServiceConfig.saveEnvConfig(req.body);
        return res.send('success');
    } catch (err) {
        return next(err);
    }
}

/**
 * GET /api/config/{action}/{propertie}
 * @tags Configuration
 * @param {string} action.path.required - action
 * @param {string} propertie.path.required - propertie
 */
const getConfig = async (req, res, next) => {
    try {
        const {action, propertie} = req.params;
        return res.json(await ServiceConfig.getConfig(action, propertie));
    } catch (err) {
        return next(err);
    }
};

/**
 * POST /api/v2/config/sitename
 * @summary Get sitename from config
 * @tags Configuration
 */
const getSiteName = async (req, res, next) => {
    try {
        return res.json(await ServiceConfig.getSiteName());
    } catch (err) {
        return next(err);
    }
};

/**
 * GET /api/config/next
 * @tags Configuration
 */
const getNextVersion = async (req, res, next) => {
    try {
        const datas = {};
        if (await fs.access(path.join(global.appRoot, 'yarn.lock'))) {
            const result = await packageManager.execSh('yarn', ['info', 'next', 'versions', '--json'], global.appRoot);
            let data     = result.stdout.split('}\n{');
            data         = data[data.length - 1];
            if (!data.startsWith('{')) {
                data = `{${data}`;
            }
            let currentVersion = await packageManager.execSh('yarn', ['list', '--pattern', 'next', '--json'], global.appRoot);
            currentVersion     = JSON.parse(currentVersion.stdout).data.trees;
            for (const elem of currentVersion) {
                if (elem.name.startsWith('next@')) {
                    currentVersion = elem.name;
                    break;
                }
            }

            datas.actual   = currentVersion.slice(5);
            datas.versions = JSON.parse(data).data;
        } else {
            const nextInstalledVersion = await packageManager.execSh('npm', ['ls', 'next', '--json'], global.appRoot);
            const listNextVersion      = await packageManager.execSh('npm', ['view', 'next', '--json'], global.appRoot);
            datas.actual               = JSON.parse(nextInstalledVersion.stdout).dependencies.next.version;
            datas.versions             = JSON.parse(listNextVersion.stdout).versions;
        }

        return res.status(200).json({datas});
    } catch (err) {
        return next(err);
    }
};

/**
 * POST /api/config/next
 * @tags Configuration
 */
const changeNextVersion = async (req, res, next) => {
    try {
        const {nextVersion} = req.body;
        if (!nextVersion) throw NSErrors.UnprocessableEntity;
        let result;
        if (await fs.access(path.join(global.appRoot, 'yarn.lock'))) {
            result = await packageManager.execSh('yarn', ['add', `next@${nextVersion}`], global.appRoot);
        } else {
            result = await packageManager.execSh('npm', ['install', `next@${nextVersion}`], global.appRoot);
        }
        if (result.code !== 0) throw NSErrors.InvalidRequest;
        res.end();
    } catch (err) {
        return next(err);
    }
};

/**
 * GET /api/restart
 * @tags Configuration
 */
const restart = async (req, res, next) => {
    try {
        await packageManager.restart();
    } catch (err) {
        return next(err);
    }
};

/**
 * GET /api/config/data
 * @tags Configuration
 */
const getConfigTheme = async (req, res, next) => {
    try {
        const _config = await Configuration.findOne({});
        return res.json({
            appUrl     : _config.environment.appUrl,
            siteName   : _config.environment.siteName,
            demoMode   : _config.environment.demoMode,
            stockOrder : _config.stockOrder
        });
    } catch (err) {
        return next(err);
    }
};

/**
 * GET /api/robot
 * @tags Configuration
 */
async function getRobot(req, res) {
    try {
        if (await fs.access('robots.txt')) {
            const file = await fs.readFileSync('robots.txt');
            return res.json({robot: file.toString()});
        }
    } catch (error) {
        return res.json({robot: ''});
    }
}

/**
 * POST /api/robot
 * @tags Configuration
 * @param {PostBody} request.body
 * @return {object} 200 - success | success | {
 * "message": "success"
 * }
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
