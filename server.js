/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

require('dotenv').config();
const express       = require('express');
const passport      = require('passport');
const path          = require('path');
global.envPath      = null;
global.envFile      = null;
global.appRoot      = path.resolve(__dirname);
global.port         = Number(process.env.PORT || 3010);
global.defaultLang  = '';
global.moduleExtend = {};
global.translate    = require('./utils/translate');
const utils         = require('./utils/utils');
const fs            = require('./utils/fsp');
const serverUtils   = require('./utils/server');
const utilsModules  = require('./utils/modules');
const utilsThemes   = require('./utils/themes');
const {
    middlewarePassport,
    expressErrorHandler,
    middlewareServer
} = require('./middleware');

const dev    = serverUtils.dev;
const server = express();

// ATTENTION, do not require services directly on top of this file
// because it causes problems in the order of calling the files
// Example : modification of the mongo models schema called in the said services

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
    const configuration   = await Configuration.findOne();
    if (!configuration) {
        throw new Error('Configuration collection is missing');
    }
    global.envConfig = configuration.toObject();
};

const initFrontFramework = async (themeName = null) => {
    let type = 'custom'; // default type
    let themeConfig;
    if (themeName === null) {
        themeName =  global.envConfig.environment.currentTheme;
    }
    const pathToTheme = path.join(global.appRoot, 'themes', themeName, '/');
    const pathToInit  = path.join(pathToTheme, 'themeInit.js');
    if (!(await fs.existsSync(path.join(pathToTheme, 'dynamic_langs.js')))) {
        await require('./services/languages').createDynamicLangFile();
    }
    themeConfig = utilsThemes.loadThemeConfig(themeName);
    if (themeConfig === null) {
        themeConfig = {};
    }
    if (themeConfig && themeConfig.type) {
        type = themeConfig.type;
    }
    server.use('/', middlewareServer.maintenance);

    if (type === 'custom') {
        let handler;
        try {
            if (fs.existsSync(pathToInit)) {
                const process = require('process');
                process.chdir(pathToTheme); // protect require of the frontFrameWork
                const initFileOfConfig = require(pathToInit);
                if (initFileOfConfig && typeof initFileOfConfig.start === 'function') {
                    handler = await initFileOfConfig.start(server);
                } else {
                    throw "The 'themeInit.js' of your theme needs to export a start() function";
                }
                process.chdir(global.appRoot);
                if (typeof handler !== 'undefined' && handler !== null) {
                    server.use('/', handler);
                }
            } else {
                throw `Your theme (${themeName}) is a custom theme, it needs a 'themeInit.js' file`;
            }
        } catch (errorInit) {
            console.error(errorInit);
            throw 'Error loading the theme';
        }
    } else if (type === 'normal') {
        // normal type
        const pathToTheme = path.join(global.appRoot, 'themes', themeName, '/');
        if (fs.existsSync(pathToTheme)) {
            let pathToPages = pathToTheme;
            if (typeof themeConfig.expose !== 'undefined') {
                pathToPages = path.join(pathToTheme, themeConfig.expose);
            }
            server.use('/', express.static(pathToPages));
        }
    } else {
        console.error('Error with the theme');
    }
};

const initServer = async () => {
    if (global.envFile.db) {
        await setEnvConfig();
        await utils.checkOrCreateAquilaRegistryKey();
        // we check if we compile (default: true)
        const compile = (typeof global?.envFile?.devMode?.compile === 'undefined' || (typeof global?.envFile?.devMode?.compile !== 'undefined' && global.envFile.devMode.compile === true));

        middlewareServer.initExpress(server, passport);
        await middlewarePassport.init(passport);
        require('./services/cache').cacheSetting();
        const apiRouter = require('./routes').InitRoutes(express, server);
        await utilsModules.modulesLoadInitAfter(apiRouter, server, passport);
        if (compile) {
            const {currentTheme} = global.envConfig.environment;
            const themeFolder    = path.join(global.appRoot, 'themes', currentTheme, '/');
            if (!fs.existsSync(themeFolder)) {
                throw new Error(`themes folder ${themeFolder} not found`);
            }
            console.log(`%s@@ Current theme : ${currentTheme}%s`, '\x1b[32m', '\x1b[0m');
            await initFrontFramework(currentTheme); // we compile the front
        } else {
            console.log('%s@@ No compilation for the theme %s', '\x1b[32m', '\x1b[0m');
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

module.exports = server;