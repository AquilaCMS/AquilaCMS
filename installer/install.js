/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const path                   = require('path');
const themeServices          = require('../services/themes');
const fs                     = require('../utils/fsp');
const serverUtils            = require('../utils/server');
const {themeCompile}         = require('../utils/themes');
const {createListModuleFile} = require('../utils/modules');
const NSErrors               = require('../utils/errors/NSErrors');

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
        await require('../utils/database').testdb(req.body.data);
    } catch (err) {
        throw new Error('Cannot connect to MongoDB');
    }
};

// Only for installation purpose, will be inaccessible after first installation
const handleInstaller = async (middlewareServer, middlewarePassport, server, passport, express) => {
    console.log('-= Start installation =-');
    middlewareServer.initExpress(server, passport);
    await middlewarePassport.init(passport);
    const installRouter = express.Router();
    require('../routes/install')(installRouter);
    server.use('/', installRouter, (req, res, next) => {
        if (req.originalUrl !== '/') {
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
        const datas = req.body;
        if (!fs.existsSync(datas.envPath) || path.extname(datas.envPath) !== '.json') {
            throw new Error('envPath is not correct');
        }

        console.log('Installer : write env file');
        await fs.writeFile('./config/envPath', datas.envPath);
        const aquila_env       = serverUtils.getEnv('AQUILA_ENV');
        global.envPath         = datas.envPath;
        let envFile            = JSON.parse((await fs.readFile(datas.envPath)).toString());
        envFile[aquila_env].db = datas.databaseAdd;
        await fs.writeFile(path.join(global.appRoot, 'config/env.json'), JSON.stringify(envFile, null, 2));
        envFile        = envFile[aquila_env];
        global.envFile = envFile;
        console.log('Installer : finish writing env file');

        await require('../utils/database').connect();
        // We need to override data in database
        let configuration;
        if (datas.override === 'on') {
            console.log('Installer : start default db installation');
            configuration = await createConfiguration(datas);
            await createUserAdmin(datas);
            await createDefaultLanguage(datas.language);
            await createDefaultCountries();

            console.log('Installer : end default db installation');
        }

        await createDynamicLangFile(datas.language);

        if (datas.demoData && datas.override === 'on') {
            console.log('Installer : installation of the default theme datas');
            await themeServices.copyDatas('default_theme', true, configuration);
            console.log('Installer : end installation of the default theme datas');
        }
        await createListModuleFile('default_theme');
        // Compilation du theme par default
        console.log('Installer : start default theme compilation');
        await themeCompile('default_theme');
        console.log('Installer : end default theme compilation');
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
        throw new Error('env file doesn\'t exist or is not located in this folder');
    }

    if (path.extname(envPath) === '.js') {
        const tmpPath = `../${envPath.slice(2)}`;
        const oldFile = require(tmpPath);
        await fs.writeFile(`${envPath}on`, JSON.stringify(oldFile, null, 2));
        await fs.unlink(envPath);
        envPath = `${envPath}on`;
    }
    await fs.writeFile('./config/envPath', envPath);
    global.envPath = envPath;
    global.envFile = JSON.parse(await fs.readFile(envPath))[serverUtils.getEnv('AQUILA_ENV')];
    console.log('Installer : finish fetching new env path');
};

/**
 * Create configuration in Database
 * @param {Object} datas Datas to insert
 */
const createConfiguration = async (datas) => {
    datas.appUrl          = datas.appUrl.endsWith('/') ? datas.appUrl : `${datas.appUrl}/`;
    const {Configuration} = require('../orm/models');
    return Configuration.create({
        environment : {
            appUrl          : datas.appUrl,
            currentTheme    : 'default_theme',
            adminPrefix     : datas.adminPrefix,
            websiteCountry  : datas.language && datas.language === 'EN' ? 'UK' : 'FR',
            siteName        : datas.siteName,
            demoMode        : true,
            websiteTimezone : 'Europe/Paris',
            // We don't want to apply migration after the installation, so we calculate the current migration step
            migration       : require('../utils/migration').migrationScripts.length
        },
        stockOrder : {
            cartExpireTimeout         : 1,
            pendingOrderCancelTimeout : 1,
            bookingStock              : 'none'
        },
        taxerate : [
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
 */
const createUserAdmin = async (userDatas) => {
    const {Users} = require('../orm/models');
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
 * Create language in file "config/dynamic_langs.js"
 * @param {string} language Language to create
 */
const createDynamicLangFile = async (language) => {
    const contentFile = `module.exports = [{code: '${language}', defaultLanguage: true}];`;
    await fs.writeFile('./config/dynamic_langs.js', contentFile);
};

/**
 * Create default countries
 */
const createDefaultCountries = async () => {
    const {Territory} = require('../orm/models');
    try {
        await Territory.insertMany([{
            code : 'FR',
            name : 'France',
            type : 'country'
        }, {
            code : 'UK',
            name : 'United Kingdom',
            type : 'country'
        }]);
    } catch (err) {
        console.error('Countries cannot be created');
    }
};

module.exports = {
    firstLaunch,
    handleInstaller,
    testdb
};