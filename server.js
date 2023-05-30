/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

require('dotenv').config();
require('aql-utils');
const express              = require('express');
const passport             = require('passport');
const path                 = require('path');
const {fs}                 = require('aql-utils');
global.aquila              = {};
global.aquila.envPath      = null;
global.aquila.envFile      = null;
global.aquila.appRoot      = path.resolve(__dirname);
global.aquila.port         = Number(process.env.PORT || 3010);
global.aquila.defaultLang  = '';
global.aquila.moduleExtend = {};
const utils                = require('./utils/utils');
const serverUtils          = require('./utils/server');
const utilsModuleInit      = require('./utils/moduleInit');
const utilsThemes          = require('./utils/themes');
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

process.on('exit', (code) => {
    if (process.env.AQUILA_ENV !== 'test') { // remove log if in "test"
        if (code === 0) {
            console.log('Process gracefully exited');
        } else {
            console.error(`/!\\ process exited with process.exit(${code}) /!\\`);
            console.trace();
        }
    }
});

const init = async () => {
    await serverUtils.getOrCreateEnvFile();
    await require('./utils/logger')();
    await serverUtils.logVersion();
};

const initDatabase = async () => {
    if (global.aquila.envFile.db) {
        // DB Layer
        const utilsDB = require('./utils/database');
        await utilsDB.connect();
        utilsDB.getMongdbVersion();
        await utilsDB.applyMigrationIfNeeded();
        await require('./services/job').initAgendaDB();

        // Schema Layer
        await utilsModuleInit.moduleInitSteps(1, {server}); // [step 1] : Module Init Pre Schemas
        await utilsDB.initDBValues(); // Schema are loaded here so the schema events are emitted here
        await require('./services/shortcodes').initDBValues();

        // DB Layer (thanks to the schema layer)
        await utilsModuleInit.moduleInitSteps(2, {server}); // [step 2] : Module Init DB Values
    }
};

const setEnvConfig = async () => {
    const {Configuration} = require('./orm/models');
    const configuration   = await Configuration.findOne();
    if (!configuration) {
        throw new Error('Configuration collection is missing');
    }
    if (!configuration.environment.needRebuild && configuration.environment.needRestart) {
        configuration.environment.needRestart = false;
        await configuration.save();
        await require('./services/admin').removeAdminInformation('server_restart_rebuild');
    }
    if (!configuration.environment.photoPath) {
        configuration.environment.photoPath = 'uploads';
    }
    global.aquila.envConfig = configuration.toObject();

    if ((await Configuration.countDocuments()) > 1) {
        console.error(`More than 1 configuration found ! _id '${global.aquila.envConfig._id}' is use`);
    }
};

const initFrontFramework = async (themeName = null) => {
    let type = 'custom'; // default type
    let themeInfo;
    if (themeName === null) {
        themeName =  global.aquila.envConfig.environment.currentTheme;
    }
    const pathToTheme  = path.join(global.aquila.appRoot, 'themes', themeName, '/');
    const pathToInit   = path.join(pathToTheme, 'themeInit.js');
    const languageInit = await require('./services/themes').languageManagement(themeName);
    if (languageInit === 'OK') {
        themeInfo = utilsThemes.loadThemeInfo(themeName);
        if (themeInfo === null) {
            themeInfo = {};
        }
        if (themeInfo && themeInfo.type) {
            type = themeInfo.type;
        }
        server.use('/', middlewareServer.maintenance);
        const color = '\x1b[36m'; // https://stackoverflow.com/a/41407246
        if (type === 'custom') {
            console.log(`%s@@ ${themeName} is a custom theme (default type) %s`, color, '\x1b[0m');
            let handler;
            try {
                if (fs.existsSync(pathToInit)) {
                    const process = require('process');
                    process.chdir(pathToTheme); // protect require of the frontFrameWork
                    console.log(`%s@@ Initializing the theme with ${themeName}/themeInit.js %s`, color, '\x1b[0m');
                    const initFileOfConfig = require(pathToInit);
                    if (initFileOfConfig && typeof initFileOfConfig.start === 'function') {
                        console.log(`%s@@ Starting the theme with ${themeName}/themeInit.js => start() %s`, color, '\x1b[0m');
                        handler = await initFileOfConfig.start(server);
                        console.log('%s@@ Theme started %s', color, '\x1b[0m');
                    } else {
                        throw new Error("The 'themeInit.js' of your theme needs to export a start() function");
                    }
                    process.chdir(global.aquila.appRoot);
                    if (typeof handler !== 'undefined' && handler !== null) {
                        server.use('/', handler);
                    }
                } else {
                    let msg = `Your theme (${themeName}) is loaded as a custom theme (default), it needs a 'themeInit.js' file\n`;
                    msg    += "You can also change or create a 'themeInfo.json' file in your theme";
                    throw  msg;
                }
            } catch (errorInit) {
                console.error(errorInit);
                throw new Error('Error loading the theme');
            }
        } else if (type === 'normal') {
            console.log(`%s@@ ${themeName} is a normal theme %s`, color, '\x1b[0m');
            // normal type
            const pathToTheme = path.join(global.aquila.appRoot, 'themes', themeName, '/');
            if (fs.existsSync(pathToTheme)) {
                let pathToPages = pathToTheme;
                if (typeof themeInfo.expose !== 'undefined') {
                    pathToPages = path.join(pathToTheme, themeInfo.expose);
                }
                server.use('/', express.static(pathToPages));
            }
        } else {
            throw new Error('Error with the theme, the type of your theme is not correct');
        }
    } else {
        throw new Error('Error with the theme, language management failed');
    }
};

const initServer = async () => {
    if (global.aquila.envFile.db) {
        // Config Layer
        await setEnvConfig();
        await utils.checkOrCreateAquilaRegistryKey();
        console.log(`%s@@ Admin : '/${global.aquila.envConfig.environment?.adminPrefix}'%s`, '\x1b[32m', '\x1b[0m');
        await utilsModuleInit.moduleInitSteps(3, {server}); // [step 3] Module Init Post Env Config

        // Routes Layer
        middlewareServer.initExpress(server, passport);
        await middlewarePassport.init(passport);
        require('./services/cache').cacheSetting();
        const apiRouter = require('./routes').InitRoutes(express, server);
        await utilsModuleInit.moduleInitSteps(4, {apiRouter, passport, server}); // [step 4] Module Init Post Routes

        if (dev) {
            const {hotReloadAPI} = require('./services/devFunctions');
            await hotReloadAPI(express, server, passport);
        }

        // Theme Layer
        // we check if we compile (default: true)
        const compile = (typeof global?.aquila?.envFile?.devMode?.compile === 'undefined' || (typeof global?.aquila?.envFile?.devMode?.compile !== 'undefined' && global.aquila.envFile.devMode.compile === true));
        if (compile) {
            const {currentTheme} = global.aquila.envConfig.environment;
            const themeFolder    = path.join(global.aquila.appRoot, 'themes', currentTheme, '/');
            if (!fs.existsSync(themeFolder)) {
                throw new Error(`themes folder ${themeFolder} not found`);
            }
            console.log(`%s@@ Current theme : ${currentTheme}%s`, '\x1b[32m', '\x1b[0m');
            try {
                await initFrontFramework(currentTheme); // we compile the front
            } catch (e) {
                server.use('/', (req, res) => res.end('Theme start fail - Please configure or compile your front-end'));
                console.error(`Theme start fail : ${e}`);
            }
        } else {
            server.use('/', (req, res) => res.end('No compilation for the theme'));
            console.log('%s@@ No compilation for the theme %s', '\x1b[32m', '\x1b[0m');
        }
        return;
    }

    // Install mode : Only for installation purpose, will be inaccessible after first installation
    const silentInstall = {
        databaseAdd : serverUtils.getEnv('MONGODB_URI'),
        language    : serverUtils.getEnv('LANGUAGE'),
        firstname   : serverUtils.getEnv('FIRSTNAME'),
        lastname    : serverUtils.getEnv('LASTNAME'),
        email       : serverUtils.getEnv('EMAIL'),
        appUrl      : serverUtils.getEnv('APPURL'),
        adminPrefix : serverUtils.getEnv('ADMIN_PREFIX'),
        siteName    : serverUtils.getEnv('SITENAME')
    };
    // Detect if the installer is in silent mode
    if (silentInstall.databaseAdd && silentInstall.language && silentInstall.firstname  && silentInstall.lastname && silentInstall.email && silentInstall.appUrl && silentInstall.adminPrefix && silentInstall.siteName) {
        require('./installer/install').handleSilentInstaller();
    } else {
        require('./installer/install').handleInstaller(middlewareServer, middlewarePassport, server, passport, express);
    }
};

const startServer = async () => {
    server.use(expressErrorHandler);
    if (global.aquila.envFile.db) await utilsModuleInit.moduleInitSteps(5, {server}); // [step 5] Module Init Pre Start
    await serverUtils.startListening(server);
    if (global.aquila.envFile.db) await utilsModuleInit.moduleInitSteps(6, {server}); // [step 6] Module Init Post Start
    serverUtils.showAquilaLogo();
};

(async () => {
    try {
        const [...args] = process.argv;
        let mode        = 'run';
        if (args && args[2]) {
            mode = args[2];
        }

        await init();
        await serverUtils.updateEnv();
        await initDatabase();

        if (mode === 'build') {
            if (!args[3]) throw new Error('You need to specify a theme to build');
            await utilsThemes.themeInstallAndCompile(args[3]);
            process.exit(0);
        }

        await initServer();
        await startServer();
    } catch (err) {
        console.error(err);
        setTimeout(() => process.exit(1), 2000);
    }
})();

module.exports = server;