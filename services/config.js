const diff                      = require('diff-arrays-of-objects');
const fs                        = require('../utils/fsp');
const serverUtils               = require('../utils/server');
const QueryBuilder              = require('../utils/QueryBuilder');
const encryption                = require('../utils/encryption');
const {Configuration, Products} = require("../orm/models");

const restrictedFields = [];
const defaultFields    = ['*'];
const queryBuilder     = new QueryBuilder(Configuration, restrictedFields, defaultFields);

const getConfig = async (req) => {
    let propertie = req.params.propertie;
    if (!req.params.propertie) {
        propertie = "environment";
    }
    if (req.params.action === propertie) {
        const _config = await Configuration.findOne({});
        try {
            if (
                propertie === "environment"
                    && _config[propertie]
                    && _config[propertie].mailPass !== undefined
                    && _config[propertie].mailPass !== ""
            ) {
                _config[propertie].mailPass = encryption.decipher(_config[propertie].mailPass);
            }
        } catch (err) {
            console.error(err);
        }
        if (propertie === "environment") {
            const cfg = {
                ..._config[propertie],
                nodeEnv            : serverUtils.getEnv("NODE_ENV"),
                databaseConnection : global.envFile.db
            };
            return cfg;
        }
        return _config[propertie];
    }
};

const getConfigV2 = async (key = null, PostBody = {filter: {_id: {$exists: true}}, structure: '*'}) => {
    const config = (await queryBuilder.findOne(PostBody)).toObject();
    if (key) {
        if (key === "taxerate") { return config.taxerate; }
        return {...config[key], databaseConnection: global.envFile.db};
    }
    return {...config, databaseConnection: global.envFile.db};
};

const getSiteName = async () => {
    require("../utils/utils").tmp_use_route("ConfigServices", "getSiteName");
    const _config = await Configuration.findOne({});
    return _config.environment.siteName;
};

const updateDBConnectionString = async (db) => {
    const aquila_env       = serverUtils.getEnv("AQUILA_ENV");
    let envFile            = await fs.readFile(global.envPath);
    envFile                = JSON.parse(envFile);
    envFile[aquila_env].db = db;
    global.envFile         = envFile[aquila_env];
    await fs.writeFile(global.envPath, JSON.stringify(envFile, null, 4));
};

const saveConfig = async (req) => {
    req.setTimeout(300000);
    const oldConfig = await Configuration.findOne({});
    if (
        req.body.environment
        && req.body.environment.mailPass !== undefined
        && req.body.environment.mailPass !== ""
    ) {
        try {
            req.body.environment.mailPass = encryption.cipher(req.body.environment.mailPass);
        } catch (err) {
            console.error(err);
        }
    }
    if (req.body.environment && req.body.environment.photoPath) {
        if (req.body.environment.photoPath.startsWith('/')) {
            req.body.environment.photoPath = req.body.environment.photoPath.substr(1);
        }
        if (req.body.environment.photoPath.endsWith('/')) {
            req.body.environment.photoPath = req.body.environment.photoPath.substring(0, req.body.environment.photoPath.length - 1);
        }
    }
    if (req.body.environment && req.body.environment.databaseConnection) {
        await updateDBConnectionString(req.body.environment.databaseConnection);
        delete req.body.environment.databaseConnection;
    }
    await Configuration.updateOne({}, req.body);

    // traitement spécifique
    if (req.body.environment && req.body.environment.demoMode) {
        const seoService = require("./seo");

        // Virer le sitemap.xml
        seoService.removeSitemap();

        // Interdire le robots.txt
        seoService.manageRobotsTxt(false);
    }

    // si le stockOrder a changé, en l'occurence pour les labels de stock, on applique les modif sur les produit possedant ces labels
    if (req.body.stockOrder) {
        const result = diff(
            JSON.parse(JSON.stringify(oldConfig.stockOrder.labels)),
            req.body.stockOrder.labels,
            '_id',
            {
                updatedValues : diff.updatedValues.second
            }
        );
        for (let i = 0; i < result.removed.length; i++) {
            await Products.updateMany({'stock.label': result.removed[i].code}, {'stock.label': null, 'stock.translation': undefined});
        }
        for (let i = 0; i < result.updated.length; i++) {
            await Products.updateMany({'stock.label': result.updated[i].code}, {'stock.translation': result.updated[i].translation});
        }
    }
};

module.exports = {
    getConfig,
    getConfigV2,
    getSiteName,
    saveConfig
};