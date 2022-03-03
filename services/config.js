/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
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
    const aquila_env = serverUtils.getEnv('AQUILA_ENV');
    let oldEnvFile   = await fs.readFile(global.envPath);
    oldEnvFile       = JSON.parse(oldEnvFile);
    if (!utils.isEqual(oldEnvFile[aquila_env], global.enFile)) {
        oldEnvFile[aquila_env] = global.envFile;
        global.envFile         = oldEnvFile[aquila_env];
        await fs.writeFile(global.envPath, JSON.stringify(oldEnvFile, null, 4));
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

const saveEnvConfig = async (body) => {
    const oldConfig = await Configuration.findOne({});
    if (typeof body.environment?.contentSecurityPolicy !== 'undefined') {
        const tempValueActive = body.environment.contentSecurityPolicy.active;
        if (typeof tempValueActive !== 'undefined' && typeof tempValueActive  !== 'undefined' ) {
            if (typeof tempValueActive === 'string') {
                if (tempValueActive === 'false') {
                    body.environment.contentSecurityPolicy.active = false;
                } else if (tempValueActive === 'true') {
                    body.environment.contentSecurityPolicy.active = true;
                }
            }
        }
        if (typeof body.environment.contentSecurityPolicy.values === 'undefined') {
            body.environment.contentSecurityPolicy.values = [];
        }
    }
    const {environment, stockOrder} = body;
    if (environment) {
        // compare two array
        const array2 = oldConfig.environment.contentSecurityPolicy.values.slice().sort();
        const array1 = environment.contentSecurityPolicy.values.slice().sort();
        const isSame = array1.length === array2.length && array1.every((value, index) =>  value === array2[index]);
        if (
            oldConfig.environment.appUrl !== environment.appUrl
            || oldConfig.environment.adminPrefix !== environment.adminPrefix
            || isSame === false
            || oldConfig.environment.contentSecurityPolicy.active !== environment.contentSecurityPolicy.active
        ) {
            body.needRestart = true;
        }
        if (environment.defaultImage !== oldConfig.defaultImage) {
            await ServiceCache.flush();
            await ServiceCache.cleanCache();
        }
        if (environment.photoPath) {
            environment.photoPath = path.normalize(environment.photoPath);
        }
        // specific treatment
        if (environment.demoMode) {
            const seoService = require('./seo');
            console.log('DemoMode : removing sitemap.xml');
            await seoService.removeSitemap(); // Remove the sitemap.xml
            console.log('DemoMode : changing robots.txt');
            await seoService.manageRobotsTxt(false); // Ban robots.txt
        }
    }

    // if the stockOrder has changed, in this case for the stock labels, we apply the changes to the product with these labels
    if (stockOrder) {
        const result = diff(
            JSON.parse(JSON.stringify(oldConfig.stockOrder.labels)),
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
    }
    const cfg        = await Configuration.findOneAndUpdate({}, {$set: body}, {new: true});
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

module.exports = {
    getConfig,
    saveEnvConfig,
    saveEnvFile,
    getConfigTheme,
    needRebuildAndRestart
};