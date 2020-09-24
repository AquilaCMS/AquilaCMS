const diff                      = require('diff-arrays-of-objects');
const path                      = require('path');
const fs                        = require('../utils/fsp');
const serverUtils               = require('../utils/server');
const QueryBuilder              = require('../utils/QueryBuilder');
const encryption                = require('../utils/encryption');
const utils                     = require('../utils/utils');
const {Configuration, Products} = require('../orm/models');

const restrictedFields = [];
const defaultFields    = ['*'];
const queryBuilder     = new QueryBuilder(Configuration, restrictedFields, defaultFields);

const getConfig = async (action, propertie) => {
    if (!propertie) {
        propertie = 'environment';
    }
    if (action === propertie) {
        const _config = await Configuration.findOne({});
        try {
            if (
                propertie === 'environment'
                    && _config[propertie]
                    && _config[propertie].mailPass !== undefined
                    && _config[propertie].mailPass !== ''
            ) {
                _config[propertie].mailPass = encryption.decipher(_config[propertie].mailPass);
            }
        } catch (err) {
            console.error(err);
        }
        if (propertie === 'environment') {
            const cfg = {
                ..._config[propertie],
                nodeEnv            : serverUtils.getEnv('NODE_ENV'),
                databaseConnection : global.envFile.db
            };
            return cfg;
        }
        return _config[propertie];
    }
};

const getConfigV2 = async (key = null, PostBody = {filter: {_id: {$exists: true}}, structure: '*'}, user = null) => {
    PostBody = {filter: {_id: {$exists: true}}, structure: '*', ...PostBody};
    let isAdmin = true;
    if (!user) {
        if (!user || !user.isAdmin) {
            isAdmin = false;
            PostBody.structure = undefined;
            queryBuilder.defaultFields = [];
            queryBuilder.restrictedFields = [
                'environment.adminPrefix',
                'environment.authorizedIPs',
                'environment.mailHost',
                'environment.mailPass',
                'environment.mailPort',
                'environment.mailUser',
                'environment.overrideSendTo',
                'environment.port',
                'licence'
            ];
        }
    }
    const config = (await queryBuilder.findOne(PostBody)).toObject();
    if (config.environment) {
        if (isAdmin) {
            config.environment = {
                ...config.environment,
                ssl : global.envFile.ssl || {
                    active : false,
                    cert   : '',
                    key    : ''
                },
                databaseConnection : global.envFile.db
            };
            config.environment.ssl.cert = path.basename(config.environment.ssl.cert);
            config.environment.ssl.key = path.basename(config.environment.ssl.key);
        }
        if (config.environment.mailPass) {
            try {
                config.environment.mailPass = encryption.decipher(config.environment.mailPass);
            // eslint-disable-next-line no-empty
            } catch (err) {}
        }
    }
    let data = config;
    if (key) {
        data = {...config[key]};
        if (Array.isArray(config[key])) {
            data = config[key];
        }
    }
    return data;
};

const getSiteName = async () => {
    require('../utils/utils').tmp_use_route('ConfigServices', 'getSiteName');
    const _config = await Configuration.findOne({}, {'environment.siteName': 1});
    return _config.environment.siteName;
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
                        await fs.copyRecursiveSync(
                            path.resolve(file.destination, file.filename),
                            path.resolve(global.appRoot, 'config/ssl', file.originalname),
                            true
                        );
                        global.envFile.ssl[file.fieldname] = `config/ssl/${file.originalname}`;
                    } catch (err) {
                        console.error(err);
                    }
                }
            }
        }
        if (
            environment.databaseConnection
            && environment.databaseConnection !== global.envFile.db
        ) {
            global.envFile.db = environment.databaseConnection;
        }
        if (environment.ssl && environment.ssl.active) {
            global.envFile.ssl.active = Boolean(environment.ssl.active);
        }
        await updateEnvFile();
        delete environment.databaseConnection;
    }
};

const saveEnvConfig = async (body) => {
    const oldConfig = await Configuration.findOne({});
    const {environment, stockOrder} = body;
    if (environment) {
        if (environment.mailPass !== undefined && environment.mailPass !== '') {
            try {
                environment.mailPass = encryption.cipher(environment.mailPass);
            } catch (err) {
                console.error(err);
            }
        } // ./uploads/__custom/cbo
        if (environment.photoPath) {
            environment.photoPath = environment.photoPath
                .replace(/^.?(\\\\|\\|\/?)/, '')
                .replace(/(\\\\|\\|\/?)$/, '');
        }
        await updateEnvFile();
        delete environment.databaseConnection;
        // traitement spécifique
        if (environment.demoMode) {
            const seoService = require('./seo');
            seoService.removeSitemap(); // Supprime le sitemap.xml
            seoService.manageRobotsTxt(false); // Interdire le robots.txt
        }
    }

    // si le stockOrder a changé, en l'occurence pour les labels de stock,
    // on applique les modif sur les produit possedant ces labels
    if (stockOrder) {
        const result = diff(
            JSON.parse(JSON.stringify(oldConfig.stockOrder.labels)),
            stockOrder.labels,
            '_id',
            {
                updatedValues : diff.updatedValues.second
            }
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
    await Configuration.updateOne({}, body);
};

module.exports = {
    getConfig,
    getConfigV2,
    getSiteName,
    saveEnvConfig,
    saveEnvFile
};