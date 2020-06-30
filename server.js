require("dotenv").config();
const express               = require("express");
const passport              = require("passport");
const path                  = require("path");
const next                  = require("next").default;
const i18nextMiddleware     = require("i18next-http-middleware");
global.envPath              = null;
global.envFile              = null;
global.appRoot              = path.resolve(__dirname);
global.port                 = process.env.PORT || 3010;
global.defaultLang          = "";
global.moduleExtend         = {};
global.translate            = require("./utils/translate");
const npm                   = require("./utils/npm");
const fs                    = require('./utils/fsp');
const utilsModules          = require('./utils/modules');
const utilsThemes           = require('./utils/themes');
const NSError               = require("./utils/errors/NSError");
const NSErrors              = require("./utils/errors/NSErrors");
const {
    middlewarePassport,
    expressErrorHandler,
    middlewareServer
}                           = require("./middleware");
const translation           = require("./utils/translation");
const serverUtils = require('./utils/server');

const dev = !serverUtils.isProd();

// ATTENTION, ne pas require des services directement en haut de ce fichier
// car cela cause des problèmes dans l'ordre d'appel des fichiers
// Exemple : modification du schéma des modèles mongo appelés dans les dits services

const init = async () => {
    try {
        await npm.npmLoad({});
        await serverUtils.getOrCreateEnvFile();
        require("./utils/logger")();
        await serverUtils.logVersion();
        const server = express();

        // is a first launch ?
        if (global.envFile.db) {
            await require('./utils/database').connect();
            await utilsModules.modules_LoadInit(express);

            await require("./utils/database").initDBValues();
            require("./services/job").initAgendaDB();

            const {Configuration} = require('./orm/models');
            global.envConfig      = await Configuration.findOne();
            if (!global.envConfig) {
                throw new NSError(
                    NSErrors.MissingConfiguration.status,
                    NSErrors.MissingConfiguration.code,
                    'Configuration collection is missing'
                );
            }
            global.envConfig = global.envConfig.toObject();
            console.log(`%s@@ Current theme : ${global.envConfig.environment.currentTheme}%s`, '\x1b[32m', '\x1b[0m');
            const themeFolder = path.join(global.appRoot, 'themes', global.envConfig.environment.currentTheme);
            const compile = typeof global.envFile.devMode !== "undefined"
                && typeof global.envFile.devMode.compile !== "undefined"
                && !global.envFile.devMode.compile;
            if (!fs.existsSync(themeFolder) && !compile) {
                throw new Error(`themes folder ${themeFolder} not found`);
            }

            middlewareServer.initExpress(server, passport);
            await middlewarePassport.init(passport);
            require('./services/cache').cacheSetting();
            const apiRouter = require("./routes").InitRoutes(express, server);
            await utilsModules.modules_LoadInitAfter(apiRouter, server, passport);

            if (compile) {
                console.log("devMode detected, no compilation");
            } else {
                if (dev) {
                    await utilsThemes.themeCompile();
                }

                const app                = next({dev, dir: themeFolder});
                const routes             = require(path.join(themeFolder, 'routes'));
                const handler            = routes.getRequestHandler(app);
                const {i18nInstance, ns} = await utilsThemes.loadTheme();

                if (i18nInstance) {
                    await translation.initI18n(i18nInstance, ns);
                    server.use(i18nextMiddleware.handle(i18nInstance));
                    server.use("/locales", express.static(path.join(themeFolder, 'assets/i18n')));
                }

                console.log("next build start...");
                await app.prepare();
                console.log("next build finish");

                server.use("/", middlewareServer.maintenance, handler);
            }
        } else {
            // Only for installation purpose, will be inaccessible after first installation
            require("./installer/install").handleInstaller(middlewareServer, middlewarePassport, server, passport, express);
        }
        server.use(expressErrorHandler);
        await serverUtils.startListening(server);
        serverUtils.showAquilaLogo();
    } catch (err) {
        console.error(err);
        setTimeout(() => process.exit(1), 2000);
    }
};

init();
