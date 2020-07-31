const express           = require('express');
const path              = require('path');
const morgan            = require('morgan');
const cookieParser      = require('cookie-parser');
const multer            = require('multer');
const {v1: uuidv1}      = require('uuid');
const cors              = require('cors');
const {getDecodedToken} = require('../services/auth');
const {fsp, translation, serverUtils} = require('../utils');

const getUserFromRequest = (req) => {
    const user = null;
    if (req.info) {
        return req.info;
    } if (req.headers && req.headers.authorization) {
        try {
            const userInfo = getDecodedToken(req.headers.authorization);
            if (userInfo) return userInfo.info;
        } catch (error) {
            console.error(error);
        }
    } else if (req.query.u_id) {
        return require('../services/users').getUser({filter: {_id: req.query.u_id}});
    }
    return user;
};

const serverUseRequest = (req, res, next) => {
    const user = getUserFromRequest(req);
    if (user && user.isAdmin) {
        return next();
    }
    const original = res.json;

    res.json = function (json, keepOriginalAttribs = false) {
        const originalJson = json;
        res.json = original;

        if (res.headersSent) {
            return res;
        }
        if (req.baseUrl.indexOf(`/${global.envConfig.environment.adminPrefix}`) === 0 || res.statusCode >= 400) {
            return original.call(res, json);
        }

        if (json) {
            let lang = global.defaultLang;

            if (req.body && req.body.lang) {
                lang = req.body.lang;
            }
            if (json.collection && json.collection.collectionName) {
                json = translation.translateDocument(json, lang, keepOriginalAttribs);
                json = restrictProductFields(json, req.originalUrl);
            } else if (json.datas !== undefined) {
                for (let i = 0; i < json.datas.length; i++) {
                    json.datas[i] = translation.translateDocument(json.datas[i], lang, keepOriginalAttribs);
                    json.datas[i] = restrictProductFields(json.datas[i], req.originalUrl);
                }
                if (json.filters !== undefined) {
                    for (let i = 0; i < Object.keys(json.filters).length; i++) {
                        const filterKey = Object.keys(json.filters)[i];
                        if (json.filters[filterKey].length) {
                            for (let j = 0; j < json.filters[filterKey].length; j++) {
                                json.filters[filterKey][j] = translation.translateDocument(json.filters[filterKey][j], lang);
                            }
                        }
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
    let port = 3010;
    if (global.envConfig) {
        port = global.envConfig.environment.port;
    } else if (process.env.PORT) {
        port = process.env.PORT;
    }
    server.set('port', port);

    const photoPath = serverUtils.getUploadDirectory();
    server.use(express.static(path.join(global.appRoot, 'backoffice'))); // BackOffice V1
    server.use('/', express.static(path.join(global.appRoot, photoPath))); // Photos
    server.use('/bo', express.static(path.join(global.appRoot, 'bo/build'))); // BackOffice V2 (proof of concept)
    server.use('/apidoc', express.static(path.join(global.appRoot, 'documentations/apidoc'))); // Documentations

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
    server.use('/api', serverUseRequest);
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
        destination : photoPath,
        filename(req, file, cb) {
            cb(null, uuidv1() + path.extname(file.originalname));
        }
    });

    server.use(multer({storage, limits: {fileSize: 1048576000/* 1Gb */}}).any());
};

const maintenance = async (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    if (
        global.envConfig.environment.maintenance
            && global.envConfig.environment.authorizedIPs.slice(';').indexOf(ip) === -1
    ) {
        const maintenanceFile = path.join(global.appRoot, 'themes', global.envConfig.environment.currentTheme, 'maintenance.html');
        if (fsp.existsSync(maintenanceFile) && await fsp.access(maintenanceFile)) {
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

module.exports = {
    getUserFromRequest,
    initExpress,
    maintenance,
    deprecatedRoute
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