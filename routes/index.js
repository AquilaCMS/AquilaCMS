/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const path     = require('path');
const {fs}     = require('aql-utils');
const NSErrors = require('../utils/errors/NSErrors');

const InitRoutes = (express, server) => {
    const apiRouter = express.Router(); // Route api for the front for client
    server.use('/api', apiRouter, (req, res, next) => next(NSErrors.ApiNotFound));
    loadDynamicRoutes(apiRouter); // Load API routes

    const adminFrontRouter = express.Router(); // Route for serving the front of the admin
    server.use(`/${global.aquila.envConfig.environment.adminPrefix}`, adminFrontRouter);
    loadAdminRoutes(adminFrontRouter); // loading backoffice
    return apiRouter;
};

/**
 * Load the admin route
 */
const loadAdminRoutes = (adminFrontRouter) => {
    const pathToAdminFile = path.join(global.aquila.appRoot, 'routes', 'backoffice.js');
    require(pathToAdminFile)(adminFrontRouter);
};

/**
 * Dynamically load all routes from the routes folder
 */
const loadDynamicRoutes = (app) => {
    console.log('Routes : Loading...');
    const pathToRoutes = path.join(global.aquila.appRoot, 'routes');
    const date         = Date.now();
    const allRoutes    = fs.readdirSync(pathToRoutes).filter((file) => {
        if (file === path.basename(__filename)
            || path.extname(file) !== '.js'
            || file === 'backoffice.js'
        ) {
            return false;
        }
        return true;
    });
    allRoutes.forEach((file) => {
        require(`./${file}`)(app);
    });
    const time = (Date.now() - date) / 1000;
    console.log(`Routes : Loaded in %s${time}%s%s`, '\x1b[33m', '\x1b[0m', '\x1b[32m \u2713 \x1b[0m');
};

/**
 * Route exceptions
 */
const manageExceptionsRoutes = async (req, res, next) => {
    if (['.jpg', '.jpeg', '.png', '.css', '.js', '.json', '.txt', '.ico', 'mp4'].includes(path.extname(req.url).toLowerCase())) {
        res.setHeader('Cache-Control', 'public, max-age=2592000');

        const dt = new Date(Date.now());
        dt.setMonth( dt.getMonth() + 1 );
        res.setHeader('Expires', dt.toUTCString());
    }
    // Exception BO React
    if (req.url.startsWith('/bo/') && !req.url.startsWith('/bo/api')) {
        if (path.basename(req.url).indexOf('.') > -1) {
            const url = req.url.replace('/bo', '/bo/build');
            res.sendFile(path.join(global.aquila.appRoot, url));
        } else {
            res.sendFile(path.join(global.aquila.appRoot, 'bo/build/index.html'));
        }
    } else if (req.url.startsWith('/google')) {
        res.sendFile(path.join(global.aquila.appRoot, req.url));
    } else if (req.url && req.url.startsWith('/images') && req.url.split('/').length === 6) {
        await require('../services/medias').getImageStream(req.url, res);
    } else if (
        global.aquila.envConfig?.environment?.adminPrefix?.length >= 0
        && req.url.length > global.aquila.envConfig.environment.adminPrefix.length + 2
        && req.url.indexOf(`/${global.aquila.envConfig.environment.adminPrefix}/`)  > -1
        && req.url.split('/')[req.url.split('/').length - 1].indexOf('.') > -1
    ) {
        let url = req.url.replace(global.aquila.envConfig.environment.adminPrefix, 'backoffice').split('?')[0];
        if (fs.existsSync(path.join(global.aquila.appRoot, url))) {
            res.sendFile(path.join(global.aquila.appRoot, url));
        } else {
            url = url.replace('backoffice', require('../utils/server').getUploadDirectory());
            if (fs.existsSync(path.join(global.aquila.appRoot, url))) {
                res.sendFile(path.join(global.aquila.appRoot, url));
            } else {
                res.end();
            }
        }
    } else {
        const isAdmin = (req && req.info && req.info.isAdmin) || false;
        if (!global.aquila.installMode && !isAdmin) {
            require('../services/stats').addUserVisitReq(req);
        }

        // We add the port to req so that it is available in the req of the getInitialProps of next
        req.port = global.aquila.port;
        next();
    }
};

module.exports = {
    manageExceptionsRoutes,
    loadDynamicRoutes,
    InitRoutes
};