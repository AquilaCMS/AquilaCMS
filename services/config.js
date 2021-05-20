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
const fs                        = require('../utils/fsp');
const serverUtils               = require('../utils/server');
const QueryBuilder              = require('../utils/QueryBuilder');
const utils                     = require('../utils/utils');
const {Configuration, Products} = require('../orm/models');

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
    const oldConfig                 = await Configuration.findOne({});
    const {environment, stockOrder} = body;
    if (environment) {
        if (
            oldConfig.environment.appUrl !== environment.appUrl
            || oldConfig.environment.adminPrefix !== environment.adminPrefix
            || oldConfig.environment.contentSecurityPolicy.values !== environment.contentSecurityPolicy.values
            || oldConfig.environment.contentSecurityPolicy.active !== environment.contentSecurityPolicy.active
        ) {
            body.needRestart = true;
        }
        if (environment.photoPath) {
            environment.photoPath = path.normalize(environment.photoPath);
        }
        // specific treatment
        if (environment.demoMode) {
            const seoService = require('./seo');
            await seoService.removeSitemap(); // Remove the sitemap.xml
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
    await Configuration.updateOne({}, {$set: body});
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

module.exports = {
    getConfig,
    saveEnvConfig,
    saveEnvFile,
    getConfigTheme
};