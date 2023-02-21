/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const path                     = require('path');
const {fs}                     = require('aql-utils');
const themeServices            = require('../services/themes');
const serverUtils              = require('../utils/server');
const {themeInstallAndCompile} = require('../utils/themes');
const {createListModuleFile}   = require('../utils/modules');
const NSErrors                 = require('../utils/errors/NSErrors');

/**
 * If it's the first launch (/config/env.js exist or not), display the configurator
 * @param {Object} req
 * @param {Boolean} install true / false - full install or recover from envFile
 */
const firstLaunch = async (req, install) => {
    // First launch : Start installer !
    console.log('-= Process installer =-');
    if (install) {
        await postConfiguratorDatas(req);
    } else {
        await recoverConfiguration(req);
    }
};

/**
 * Test if a connection to database is valid
 * @param {Object} req.body.data Connection string to mongodb
 */
const testdb = async (req) => {
    try {
        const utilsDatabase = require('../utils/database');
        return utilsDatabase.testdb(req.body.data);
    } catch (err) {
        throw new Error('Cannot connect to MongoDB');
    }
};

/**
 * Silent installation (only if env variable exists)
 */
const handleSilentInstaller = async () => {
    try {
        console.log('-= Process silent installer =-');

        const generateTmpPass = () => {
            const characters     = 'abcdefghijklmnopqrstuvwxyz';
            const charactersUp   = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            const charactersNum  = '0123456789';
            const charactersSpec = '#.!@,?*';
            const allChar        = [characters, characters, characters, charactersNum, charactersUp, charactersUp, charactersSpec, characters];
            let result           = '';

            for (let i = 0; i < allChar.length; i++) {
                result += allChar[i].charAt(Math.floor(Math.random() * allChar[i].length));
            }

            console.log('/!\\ Admin password :', result);
            return result;
        };

        const datas = {
            databaseAdd : serverUtils.getEnv('MONGODB_URI'),
            language    : serverUtils.getEnv('LANGUAGE'),
            firstname   : serverUtils.getEnv('FIRSTNAME'),
            lastname    : serverUtils.getEnv('LASTNAME'),
            email       : serverUtils.getEnv('EMAIL'),
            appUrl      : serverUtils.getEnv('APPURL'),
            adminPrefix : serverUtils.getEnv('ADMIN_PREFIX'),
            siteName    : serverUtils.getEnv('SITENAME'),
            compilation : serverUtils.getEnv('THEME_COMPILATION') ?? true,
            password    : serverUtils.getEnv('PASSWORD') ?? generateTmpPass(),
            envPath     : 'config/env.json',
            override    : 'on',
            demoData    : true
        };

        await postConfiguratorDatas({body: datas});
        await require('../services/job').initAgendaDB();
        await require('../utils/database').initDBValues();
        await require('../services/admin').welcome();

        const {restart} = require('aql-utils');
        await restart();
    } catch (err) {
        console.error(err);
        throw err;
    }
};

/**
 * Only for installation purpose, will be inaccessible after first installation
 */
const handleInstaller = async (middlewareServer, middlewarePassport, server, passport, express) => {
    console.log('-= Start installation =-');
    global.aquila.installMode = true;
    middlewareServer.initExpress(server, passport);
    await middlewarePassport.init(passport);
    const installRouter = express.Router();
    require('./routes')(installRouter);
    server.use('/', installRouter, (req, res, next) => {
        if (req.originalUrl !== '/' && req.originalUrl !== '/favicon.ico') {
            return res.status(301).redirect('/');
        }
        return next();
    });
};

/**
 * Catch the Configurator's datas and save it in database
 */
const postConfiguratorDatas = async (req) => {
    try {
        console.log('Installer : Record datas value');
        const datas     = req.body;
        const bOverride = datas.override === 'on';
        if (datas.compilation === undefined) datas.compilation = true;
        if (!fs.existsSync(datas.envPath) || path.extname(datas.envPath) !== '.json') {
            throw new Error('envPath is not correct');
        }

        console.log('Installer : write env file');
        await fs.writeFile('./config/envPath', datas.envPath);
        const aquila_env       = serverUtils.getEnv('AQUILA_ENV');
        global.aquila.envPath  = datas.envPath;
        let envFile            = JSON.parse((await fs.readFile(datas.envPath)).toString());
        envFile[aquila_env].db = datas.databaseAdd;
        await fs.writeFile(path.join(global.aquila.appRoot, 'config/env.json'), JSON.stringify(envFile, null, 2));
        envFile               = envFile[aquila_env];
        global.aquila.envFile = envFile;
        console.log('Installer : finish writing env file');

        await require('../utils/database').connect();

        console.log('Installer : start default db installation');
        const configuration = await createConfiguration(datas, bOverride);
        await createUserAdmin(datas, bOverride);
        await createDefaultLanguage(datas.language);
        await createDefaultCountries();
        console.log('Installer : end default db installation');

        if (datas.compilation !== 'false') {
            global.aquila.envConfig = configuration.toObject();
            await require('../services/themes').languageManagement('default_theme_2');

            if (datas.demoData && datas.override === 'on') {
                console.log('Installer : installation of the default theme datas');
                await themeServices.copyDatas('default_theme_2', true, configuration);
                console.log('Installer : end installation of the default theme datas');
            }
            await createListModuleFile('default_theme_2');
            // Compilation du theme par default
            console.log('Installer : start default theme compilation');
            await themeInstallAndCompile('default_theme_2');
            console.log('Installer : end default theme compilation');
        }
    } catch (err) {
        console.error(err);
        throw err;
    }
};

/**
 * Catch the RecoverConfiguration's datas and save it in envPath
 */
const recoverConfiguration = async (req) => {
    console.log('Installer : fetching new env path');
    let {envPath} = req.body;

    if (fs.existsSync(envPath)) {
        throw new Error('Path is not correct');
    }

    if (path.extname(envPath) === '.js') {
        const tmpPath = `../${envPath.slice(2)}`;
        const oldFile = require(tmpPath);
        await fs.writeFile(`${envPath}on`, JSON.stringify(oldFile, null, 2));
        await fs.unlink(envPath);
        envPath = `${envPath}on`;
    }
    const envPathFile = path.join(global.aquila.appRoot, 'config', 'envPath');
    await fs.writeFile(envPathFile, envPath);
    global.aquila.envPath = envPath;
    global.aquila.envFile = JSON.parse(await fs.readFile(envPath))[serverUtils.getEnv('AQUILA_ENV')];
    console.log('Installer : finish fetching new env path');
};

/**
 * Create configuration in Database
 * @param {Object} datas Datas to insert
 * @param {Boolean} bOverride Override datas if exist
 */
const createConfiguration = async (datas, bOverride) => {
    const {Configuration} = require('../orm/models');

    // check if this configuration already exist
    const existConf = await Configuration.countDocuments();
    if (existConf > 0) {
        if (bOverride) {
            console.log('Configuration already exist, removing...');
            await Configuration.deleteMany({});
        } else {
            console.warn('Configuration already exist and was not inserted !');
            return;
        }
    }

    datas.appUrl = datas.appUrl.endsWith('/') ? datas.appUrl : `${datas.appUrl}/`;

    global.aquila.defaultLang = datas.language;

    return Configuration.create({
        environment : {
            appUrl          : datas.appUrl,
            currentTheme    : 'default_theme_2',
            adminPrefix     : datas.adminPrefix,
            websiteCountry  : datas.language && datas.language.toLowerCase() === 'en' ? 'GB' : 'FR',
            siteName        : datas.siteName,
            demoMode        : true,
            websiteTimezone : 'Europe/Paris',
            defaultImage    : '/medias/no-image.png',
            // We don't want to apply migration after the installation, so we calculate the current migration step
            migration       : require('../utils/migration').migrationScripts.length
        },
        stockOrder : {
            cartExpireTimeout         : 1,
            pendingOrderCancelTimeout : 1,
            bookingStock              : 'none'
        },
        taxerate : [
            {rate: 0},
            {rate: 2.1},
            {rate: 5.5},
            {rate: 10.0},
            {rate: 20.0}
        ]
    });
};

/**
 * Create the admin
 * @param {{password: String, firstname: String, lastname: String, email: String}} userDatas datas to insert
 * @param {Boolean} bOverride Override datas if exist
 */
const createUserAdmin = async (userDatas, bOverride) => {
    const {Users} = require('../orm/models');

    // check if this admin already exist
    const existAdmin = await Users.countDocuments({email: userDatas.email});
    if (existAdmin > 0) {
        if (bOverride) {
            console.log('Administrator already exist, removing...');
            await Users.deleteMany({email: userDatas.email});
        } else {
            console.warn('Administrator already exist and was not inserted !');
            return;
        }
    }

    try {
        await Users.create({
            password  : userDatas.password,
            firstname : userDatas.firstname,
            lastname  : userDatas.lastname,
            email     : userDatas.email,
            isAdmin   : true,
            isActive  : true
        });
    } catch (err) {
        if (err._errors && err._errors.message === 'FORMAT_PASSWORD') {
            throw NSErrors.LoginSubscribePasswordInvalid;
        }
        if (err._errors && err._errors.message === 'BAD_EMAIL_FORMAT') {
            throw NSErrors.EmailFormatInvalid;
        }
        console.error('Admin cannot be created');
    }
};

/**
 * Create default language
 * @param {string} language Language to create
 */
const createDefaultLanguage = async (language) => {
    const {Languages} = require('../orm/models');
    try {
        await Languages.create({
            position        : 1,
            defaultLanguage : true,
            status          : 'visible',
            code            : language,
            name            : language === 'fr' ? 'Français' : 'English'
        });
    } catch (err) {
        console.error('Language cannot be created');
    }
};

/**
 * Create default countries
 */
const createDefaultCountries = async () => {
    const {Territory} = require('../orm/models');
    try {
        await Territory.insertMany([{
            code        : 'FR',
            type        : 'country',
            translation : {
                fr : {
                    name : 'France'
                },
                en : {
                    name : 'France'
                }
            }
        },
        {
            code        : 'GB',
            type        : 'country',
            translation : {
                fr : {
                    name : 'Royaume-uni'
                },
                en : {
                    name : 'United Kingdom'
                }
            }
        }
        ]);
    } catch (err) {
        console.error('Countries cannot be created');
    }
};

module.exports = {
    firstLaunch,
    handleInstaller,
    testdb,
    handleSilentInstaller
};
