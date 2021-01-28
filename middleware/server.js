/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const expressJSDocSwagger = require('@aquilacms/express-jsdoc-swagger');
const cookieParser        = require('cookie-parser');
const cors                = require('cors');
const express             = require('express');
// const helmet                          = require('helmet');
const morgan                          = require('morgan');
const multer                          = require('multer');
const path                            = require('path');
const {v1: uuidv1}                    = require('uuid');
const {fsp, translation, serverUtils} = require('../utils');
const {retrieveUser}                  = require('./authentication');

const getUserFromRequest = async (req) => {
    const user = null;
    if (req.info) return req.info;
    if (req.query.u_id) {
        return require('../services/users').getUser({filter: {_id: req.query.u_id}});
    }
    return user;
};

const serverUseRequest = async (req, res, next) => {
    const user = await getUserFromRequest(req);
    if (user && user.isAdmin) {
        return next();
    }
    const original = res.json;

    res.json = function (json, keepOriginalAttribs = false) {
        const originalJson = json;
        res.json           = original;

        if (res.headersSent) {
            return res;
        }
        // if an admin request a document, we return it without touching it (them)
        if (user && user.isAdmin || res.statusCode >= 400) {
            return original.call(res, json);
        }

        if (json) {
            let lang = global.defaultLang;

            if (req.body && req.body.lang) {
                lang = req.body.lang;
            }
            json = translation.translateDocument(json, lang, keepOriginalAttribs);
            json = restrictProductFields(json, req.originalUrl);
            // remove hidden attributes from document
            if (json.attributes) {
                for (let i = 0; i < json.attributes.length; i++) {
                    if (!json.attributes[i].visible) {
                        json.attributes.splice(i, 1);
                        i--;
                    }
                }
            }
        }

        if (res.headersSent) {
            return res;
        }
        if (json === undefined) {
            json = originalJson;
        }
        if (json === null) {
            return res.status(204).end();
        }

        return original.call(res, json);
    };

    return next();
};

/**
 * initialize express server configuration
 * @param {Express} server server
 * @param {passport.PassportStatic} passport passport
 */
const initExpress = async (server, passport) => {
    server.set('port', global.port);

    // server.use(helmet.contentSecurityPolicy());
    // server.use(helmet.dnsPrefetchControl({allow: true}));
    // server.use(helmet.expectCt());
    // server.use(helmet.frameguard({action: 'deny'}));
    // server.use(helmet.hidePoweredBy());
    // server.use(helmet.hsts());
    // server.use(helmet.ieNoOpen());
    // server.use(helmet.noSniff());
    // server.use(helmet.permittedCrossDomainPolicies());
    // server.use(helmet.referrerPolicy());
    // server.use(helmet.xssFilter());

    const photoPath = serverUtils.getUploadDirectory();
    server.use(express.static(path.join(global.appRoot, 'backoffice'))); // BackOffice V1
    server.use(express.static(path.join(global.appRoot, 'acme'), {dotfiles: 'allow'}));
    server.use('/', express.static(path.join(global.appRoot, photoPath))); // Photos
    server.use('/bo', express.static(path.join(global.appRoot, 'bo/build'))); // BackOffice V2 (proof of concept)

    server.set('views', path.join(global.appRoot, 'backoffice/views/ejs'));
    server.set('view engine', 'ejs');
    if (serverUtils.getEnv() !== 'test' && global.envFile.logs && global.envFile.logs.http) {
        server.use(morgan('combined', {stream: require('../utils/logger').stream}));
        server.use(morgan('dev'));
    }
    server.use(express.json({limit: '500mb'}));
    server.use(express.urlencoded({extended: true}));

    server.use(cookieParser());
    server.use(passport.initialize());
    server.use(cors({
        origin         : '*',
        methods        : ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        allowedHeaders : ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
    }));
    server.use('/api', retrieveUser, serverUseRequest);
    server.get('*', require('../routes/index').manageExceptionsRoutes);

    // set a cookie
    server.use((req, res, next) => {
        // check if client sent cookie
        const cookie = req.cookies.cookie_notice;
        if (cookie === undefined) {
            const CurrentDate = new Date();
            CurrentDate.setMonth(CurrentDate.getMonth() + 3);
            res.cookie('cookie_notice', false, {expires: CurrentDate, httpOnly: false});
        }
        next();
    });

    const storage = multer.diskStorage({
        destination : path.resolve(photoPath, 'temp'),
        filename(req, file, cb) {
            cb(null, uuidv1() + path.extname(file.originalname));
        }
    });

    server.use(multer({storage, limits: {fileSize: 1048576000/* 1Gb */}}).any());
    const configFile  = JSON.parse(await fsp.readFile(path.resolve(global.appRoot, 'documentations/swagger/config.json')));
    const swaggerFile = require(path.resolve(global.appRoot, 'documentations/swagger/swagger.js'));
    await expressJSDocSwagger(server)(
        {...configFile, baseDir: global.appRoot},
        swaggerFile,
        {
            opts : {
                customCss       : '.curl-command { display: none }',
                customSiteTitle : 'Aquila : Api\'s documentation',
                swaggerOptions  : {
                    docExpansion : 'none'
                }
            }
        }
    );
};

const maintenance = async (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    if (
        global.envConfig.environment.maintenance
            && global.envConfig.environment.authorizedIPs.slice(';').indexOf(ip) === -1
    ) {
        const maintenanceFile = path.join(global.appRoot, 'themes', global.envConfig.environment.currentTheme, 'maintenance.html');
        if (fsp.existsSync(maintenanceFile)) {
            return res.status(301).sendFile(maintenanceFile);
        }
        return res.status(301).send('<h1>Maintenance</h1>');
    }
    return next();
};

const deprecatedRoute = (req, res, next) => {
    console.warn(`Deprecated route call  =>  ${req.method}\t${req.url}`);
    next();
};

const extendTimeOut = (req, res, next) => {
    req.setTimeout(300000);
    next();
};

module.exports = {
    getUserFromRequest,
    initExpress,
    maintenance,
    deprecatedRoute,
    extendTimeOut
};

const restrictProductFields = (element, url) => {
    const productsRestrictedFields = require('../services/products').restrictedFields;
    if ((url.includes('v2/cart') || url.includes('v2/order')) && element.items) {
        for (const item of element.items) {
            for (const restrictedProductField of productsRestrictedFields) {
                deletePropertyPath(item.id, restrictedProductField);
            }
        }
    } else if (url.includes('v2/product')) {
        for (const restrictedProductField of productsRestrictedFields) {
            deletePropertyPath(element, restrictedProductField);
        }
        if (element.associated_prds && element.associated_prds.length && typeof element.associated_prds[0] !== 'string') {
            for (const associated_prd of element.associated_prds) {
                for (const restrictedProductField of productsRestrictedFields) {
                    deletePropertyPath(associated_prd, restrictedProductField);
                }
            }
        }
    }
    return element;
};

const deletePropertyPath = (obj, path) => {
    if (!obj || !path) {
        return;
    }

    if (typeof path === 'string') {
        path = path.split('.');
    }

    for (let i = 0; i < path.length - 1; i++) {
        obj = obj[path[i]];

        if (typeof obj === 'undefined') {
            return;
        }
    }

    delete obj[path.pop()];
};