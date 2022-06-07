/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2022 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const diff                      = require('diff-arrays-of-objects');
const path                      = require('path');
const {merge}                   = require('lodash');
const ServiceCache              = require('./cache');
const fs                        = require('../utils/fsp');
const serverUtils               = require('../utils/server');
const QueryBuilder              = require('../utils/QueryBuilder');
const utils                     = require('../utils/utils');
const {Configuration, Products} = require('../orm/models');

const isProd = !serverUtils.dev;

const restrictedFields = [];
const defaultFields    = [];
const queryBuilder     = new QueryBuilder(Configuration, restrictedFields, defaultFields);

const getConfig = async (PostBody = {filter: {}}, user = null) => {
    PostBody    = merge({filter: {}}, PostBody);
    let isAdmin = true;
    if (!user || !user.isAdmin) {
        isAdmin                       = false;
        queryBuilder.defaultFields    = [];
        queryBuilder.restrictedFields = [];
        // two choice :
        // - add many field in "restrictedFields" (need change if we change the config file)
        // - change the Postbody to just have only one parameters
        PostBody = {
            structure : {
                'environment.siteName' : 1,
                'environment.demoMode' : 1
            },
            filter : {}
        };
    } else {
        queryBuilder.restrictedFields = [];
    }
    const config = await queryBuilder.findOne(PostBody, true);
    if (config.environment) {
        if (isAdmin) {
            config.environment = {
                ...config.environment,
                databaseConnection : global.envFile.db
            };
            if (global.envFile.ssl && global.envFile.ssl.active === true) {
                config.environment = {
                    ...config.environment,
                    ssl : global.envFile.ssl
                };
            } else {
                // Put the SSL links empty if false
                config.environment = {
                    ...config.environment,
                    ssl : {
                        active : false,
                        cert   : '',
                        key    : ''
                    }
                };
            }
        }
    }
    return config;
};

const updateEnvFile = async () => {
    const aquila_env      = serverUtils.getEnv('AQUILA_ENV');
    const absoluteEnvPath = path.join(global.appRoot, global.envPath);
    let oldEnvFile        = await fs.readFile(absoluteEnvPath);
    oldEnvFile            = JSON.parse(oldEnvFile);
    if (!utils.isEqual(oldEnvFile[aquila_env], global.enFile)) {
        oldEnvFile[aquila_env] = global.envFile;
        global.envFile         = oldEnvFile[aquila_env];
        await fs.writeFile(absoluteEnvPath, JSON.stringify(oldEnvFile, null, 4));
    }
};

const saveEnvFile = async (body, files) => {
    const {environment} = body;
    if (environment) {
        global.envFile.ssl = {
            cert   : '',
            key    : '',
            active : false,
            ...global.envFile.ssl
        };
        if (files && files.length > 0) {
            for (const file of files) {
                if (['cert', 'key'].indexOf(file.fieldname) !== -1) {
                    try {
                        await fs.moveFile(
                            path.resolve(file.destination, file.filename),
                            path.resolve(global.appRoot, 'config/ssl', file.originalname),
                            {mkdirp: true}
                        );
                        global.envFile.ssl[file.fieldname] = `config/ssl/${file.originalname}`;
                        body.needRestart                   = true;
                    } catch (err) {
                        console.error(err);
                    }
                }
            }
        }
        if (environment.ssl && environment.ssl.active === 'true') {
            if (environment.ssl.active === 'false') {
                global.envFile.ssl.active = false;
            } else {
                global.envFile.ssl.active = true;
            }
            body.needRestart = true;
        }
        if (
            environment.databaseConnection
            && environment.databaseConnection !== global.envFile.db
        ) {
            global.envFile.db = environment.databaseConnection;
            body.needRestart  = true;
        }
        await updateEnvFile();
        delete environment.databaseConnection;
        delete environment.ssl;
    }
};

const saveEnvConfig = async (newConfig) => {
    const oldConfig                 = await Configuration.findOne({});
    const {environment, stockOrder} = newConfig;
    // environment
    if (environment) {
        newConfig = await updateConfig(newConfig, oldConfig);
    }

    // if the stockOrder has changed, in this case for the stock labels, we apply the changes to the product with these labels
    if (stockOrder) {
        await updateProductsStockOrder(stockOrder, oldConfig.stockOrder);
    }
    const cfg        = await Configuration.findOneAndUpdate({}, {$set: newConfig}, {new: true});
    global.envConfig = cfg;
};

/**
 * use `getConfig(PostBody?, user?)` instead
 * @deprecated
 */
const getConfigTheme = async () => {
    const _config = await Configuration.findOne({});
    return {
        appUrl     : _config.environment.appUrl,
        siteName   : _config.environment.siteName,
        demoMode   : _config.environment.demoMode,
        stockOrder : _config.stockOrder
    };
};

// Set config props to true if step is needed (0: rest props1: build)
const needRebuildAndRestart = async (restart = false, rebuild = false) => {
    const _config = await Configuration.findOne({});
    if (isProd && rebuild) {
        _config.environment.needRebuild = true;
    } else {
        _config.environment.needRebuild = false;
    }
    if (restart) {
        _config.environment.needRestart = true;
    }
    await _config.save();
    await require('./admin').removeAdminInformation('server_restart_rebuild');
    await require('./admin').insertAdminInformation({
        code        : 'server_restart_rebuild',
        type        : 'warning',
        translation : {
            en : {
                title : _config.environment.needRebuild ? 'Rebuild & Restart Aquila' : 'Restart Aquila',
                text  : `To apply lanquages changes, ${_config.environment.needRebuild ? 'rebuild & restart' : 'restart'} Aquila <a href="#/themes">here</a>`
            },
            fr : {
                title : _config.environment.needRebuild ? 'Compilez & Redemarrez Aquila' : 'Redemarrez Aquila',
                text  : `Pour appliquer les modifications apportées au langues, ${_config.environment.needRebuild ? 'compilez & redemarrez' : 'redemarrez'} Aquila <a href="#/themes">ici</a>`
            }
        }
    });
};

const updateProductsStockOrder = async (stockOrder, oldStockOrder) => {
    const result = diff(
        JSON.parse(JSON.stringify(oldStockOrder.labels)),
        stockOrder.labels,
        '_id',
        {updatedValues: diff.updatedValues.second}
    );
    for (let i = 0; i < result.removed.length; i++) {
        await Products.updateMany(
            {'stock.label': result.removed[i].code},
            {'stock.label': null, 'stock.translation': undefined}
        );
    }
    for (let i = 0; i < result.updated.length; i++) {
        await Products.updateMany(
            {'stock.label': result.updated[i].code},
            {'stock.translation': result.updated[i].translation}
        );
    }
};

const updateConfig = async (newConfig, oldConfig) => {
    // Content security policy
    if (typeof newConfig?.environment?.contentSecurityPolicy !== 'undefined' && typeof newConfig.environment.contentSecurityPolicy.values === 'undefined') {
        newConfig.environment.contentSecurityPolicy.values = [];
    }
    // compare two array (old contentPolicy & new contentPolicy)
    const oldValues = oldConfig.environment.contentSecurityPolicy.values.slice().sort();
    const newValues = newConfig.environment.contentSecurityPolicy.values.slice().sort();
    const isSame    = newValues.length === oldValues.length && newValues.every((value, index) =>  value === oldValues[index]);
    if (
        oldConfig.environment.appUrl !== newConfig.environment.appUrl
        || oldConfig.environment.adminPrefix !== newConfig.environment.adminPrefix
        || isSame === false
        || oldConfig.environment.contentSecurityPolicy.active !== newConfig.environment.contentSecurityPolicy.active
    ) {
        newConfig.environment.needRestart = true;
    }
    // images
    if (newConfig.environment.defaultImage !== oldConfig.environment.defaultImage) {
        await ServiceCache.flush();
        await ServiceCache.cleanCache();
    }
    if (newConfig.environment.photoPath) {
        newConfig.environment.photoPath = path.normalize(newConfig.environment.photoPath);
    }
    // specific treatment (seo)
    if (oldConfig.environment.demoMode !== newConfig.environment.demoMode) {
        const seoService = require('./seo');
        if (newConfig.environment.demoMode) {
            console.log('DemoMode : removing sitemap.xml');
            await seoService.removeSitemap(); // Remove the sitemap.xml
        }
        console.log('DemoMode : changing robots.txt');
        /*
         * de Oui a Non (donc newConfig.environment.demoMode = false)  -> manageRobotsTxt(false)
         * de Non a Oui (donc newConfig.environment.demoMode = true)  -> manageRobotsTxt(true)
         */
        await seoService.manageRobotsTxt(!newConfig.environment.demoMode); // Ban robots.txt
    }
    return newConfig;
};

module.exports = {
    getConfig,
    saveEnvConfig,
    saveEnvFile,
    getConfigTheme,
    needRebuildAndRestart
};