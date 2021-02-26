/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

require('dotenv').config();
const express                = require('express');
const passport               = require('passport');
const path                   = require('path');
const next                   = require('next').default;
const i18nextMiddleware      = require('i18next-http-middleware');
const {makeExecutableSchema} = require('@graphql-tools/schema');
const {loadFiles}            = require('@graphql-tools/load-files');
const {ApolloServer}         = require('apollo-server-express');
const {InMemoryLRUCache}     = require('apollo-server-caching');
global.envPath               = null;
global.envFile               = null;
global.appRoot               = path.resolve(__dirname);
global.port                  = process.env.PORT || 3010;
global.defaultLang           = '';
global.moduleExtend          = {};
global.translate             = require('./utils/translate');
const utils                  = require('./utils/utils');
const npm                    = require('./utils/npm');
const fs                     = require('./utils/fsp');
const translation            = require('./utils/translation');
const serverUtils            = require('./utils/server');
const utilsModules           = require('./utils/modules');
const utilsThemes            = require('./utils/themes');
const {
    middlewarePassport,
    expressErrorHandler,
    middlewareServer
}                           = require('./middleware');

const dev    = !serverUtils.isProd();
const server = express();

// ATTENTION, ne pas require des services directement en haut de ce fichier
// car cela cause des problèmes dans l'ordre d'appel des fichiers
// Exemple : modification du schéma des modèles mongo appelés dans les dits services

// If an error occurred we exit the process because there is no point on continuing
// if for any reason you want to handle error later, don't do that just fix your code
process.on('uncaughtException', (err, origin) => {
    console.error('/!\\ Uncaught Exception origin /!\\', origin);
    console.error('/!\\ Uncaught Exception err /!\\', err);
    if (dev) process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('/!\\ Unhandled rejection promise /!\\', promise);
    console.error('/!\\ Unhandled rejection reason /!\\', reason);
    if (dev) process.exit(1);
});

const init = async () => {
    await npm.npmLoad({});
    await serverUtils.getOrCreateEnvFile();
    require('./utils/logger')();
    await serverUtils.logVersion();
};

const initDatabase = async () => {
    if (global.envFile.db) {
        const utilsDB = require('./utils/database');
        await utilsDB.connect();
        await utilsDB.applyMigrationIfNeeded();
        await require('./services/job').initAgendaDB();
        await utilsModules.modulesLoadInit(server);
        await utilsDB.initDBValues();
        await require('./services/shortcodes').initDBValues();
    }
};

const setEnvConfig = async () => {
    const {Configuration} = require('./orm/models');
    global.envConfig      = await Configuration.findOne();
    if (!global.envConfig) {
        throw new Error('Configuration collection is missing');
    }
    global.envConfig = global.envConfig.toObject();
};

const initFrontFramework = async (themeFolder) => {
    if (dev) await utilsThemes.themeCompile();

    const app = next({dev, dir: themeFolder});
    let handler;
    if (fs.existsSync(path.join(themeFolder, 'routes.js'))) {
        const routes = require(path.join(themeFolder, 'routes'));
        handler      = routes.getRequestHandler(app);
    } else {
        handler = app.getRequestHandler();
    }
    const {i18nInstance, ns} = await utilsThemes.loadTheme();

    if (i18nInstance) {
        await translation.initI18n(i18nInstance, ns);
        server.use(i18nextMiddleware.handle(i18nInstance));
        server.use('/locales', express.static(path.join(themeFolder, 'assets/i18n')));
    }

    console.log('next build start...');
    await app.prepare();
    console.log('next build finish');

    server.use('/', middlewareServer.maintenance, handler);
};

const initServer = async () => {
    if (global.envFile.db) {
        await setEnvConfig();
        await utils.checkOrCreateAquilaRegistryKey();
        const {currentTheme} = global.envConfig.environment;
        console.log(`%s@@ Current theme : ${currentTheme}%s`, '\x1b[32m', '\x1b[0m');
        const themeFolder = path.join(global.appRoot, 'themes', currentTheme);
        const compile     = typeof global.envFile.devMode !== 'undefined'
            && typeof global.envFile.devMode.compile !== 'undefined'
            && !global.envFile.devMode.compile;
        if (!fs.existsSync(themeFolder) && !compile) {
            throw new Error(`themes folder ${themeFolder} not found`);
        }

        middlewareServer.initExpress(server, passport);
        const {Modules}       = require('./orm/models');
        const {buildSchema}   = require('./graphql');
        const directivesPaths = ['./graphql/directives'];
        const resolversPaths  = ['./graphql/resolvers'];
        const schemaPaths     = [path.resolve(global.appRoot, './graphql/schema')];

        const modules = await Modules.find({active: true});
        for (const gPath of modules.map((m) => `${m.path}graphql`)) {
            if (await fs.hasAccess(gPath)) {
                directivesPaths.push(path.resolve(gPath, 'directives'));
                resolversPaths.push(path.resolve(gPath, 'resolvers'));
                schemaPaths.push(path.resolve(gPath, 'schema'));
            }
        }
        const typeDefs         = await buildSchema(schemaPaths);
        const resolvers        = await loadFiles(resolversPaths);
        const schemaDirectives = await loadFiles(directivesPaths);

        const apolloServer = new ApolloServer({
            schema : makeExecutableSchema({
                typeDefs,
                resolvers,
                schemaDirectives : schemaDirectives.reduce(function (acc, dir) {
                    return {
                        ...acc,
                        ...dir
                    };
                }, {})
            }),
            introspection    : true,
            playground       : true,
            cacheControl     : true,
            persistedQueries : {
                cache : new InMemoryLRUCache(),
                ttl   : 900
            },
            context : async ({req, res}) => {
                if (!req.headers.authorization) return {};
                const {getDecodedToken} = require('./services/auth');
                const {authenticate}    = require('./middleware/passport');
                const decoded           = getDecodedToken(req.headers.authorization);
                if (decoded.type === 'USER') {
                    const user = await authenticate(req, res);
                    return {user: user.info};
                }
                return {};
            }
        });
        apolloServer.applyMiddleware({app: server});

        await middlewarePassport.init(passport);
        require('./services/cache').cacheSetting();
        const apiRouter = require('./routes').InitRoutes(express, server);
        await utilsModules.modulesLoadInitAfter(apiRouter, server, passport);

        if (compile) {
            console.log('devMode detected, no compilation');
        } else {
            await initFrontFramework(themeFolder);
        }
    } else {
        // Only for installation purpose, will be inaccessible after first installation
        require('./installer/install').handleInstaller(middlewareServer, middlewarePassport, server, passport, express);
    }
};

const startServer = async () => {
    server.use(expressErrorHandler);
    await serverUtils.startListening(server);
    serverUtils.showAquilaLogo();
};

(async () => {
    try {
        await init();
        await serverUtils.updateEnv();
        await initDatabase();
        await initServer();
        await startServer();
    } catch (err) {
        console.error(err);
        setTimeout(() => process.exit(1), 2000);
    }
})();
