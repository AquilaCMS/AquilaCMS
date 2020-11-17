const path         = require('path');
const spdy         = require('spdy');
const mongoose     = require('mongoose');
const {v4: uuidv4} = require('uuid');
const NSErrors     = require('./errors/NSErrors');
const fs           = require('./fsp');

/**
 * return current value of property
 * @returns {String} property
 */
const getEnv = (property) =>  {
    let env = process.env[property];
    if (!env && property === 'AQUILA_ENV') env = 'aquila';
    if (!env && property === 'NODE_ENV') env = 'production';
    return env;
};

/**
 * check if in prod or not
 * @returns {boolean}
 */
const isProd = () => {
    if (getEnv('NODE_ENV') === 'production') {
        return true;
    }
    return false;
};
/**
 * Get assign global.envFile if envFile exists else stay null
 */
const getOrCreateEnvFile = async () => {
    try {
        global.envPath = (await fs.readFile(path.join(global.appRoot, 'config/envPath'))).toString();
    } catch (err) {
        await fs.writeFile(path.join(global.appRoot, 'config/envPath'), 'config/env.json');
        global.envPath = path.join(global.appRoot, 'config/env.json');
    }

    try {
        let envFile;
        const envExample = await fs.readFile(path.join(global.appRoot, 'config/env.template.json'));
        if (await fs.access(path.resolve(global.envPath))) {
            envFile = await fs.readFile(global.envPath);
            envFile = JSON.parse(envFile);
            if (!envFile[getEnv('AQUILA_ENV')]) {
                console.error('no correct NODE_ENV specified, generating new env in env.json');
                const newEnv                  = generateNewEnv(envExample);
                envFile[getEnv('AQUILA_ENV')] = newEnv[getEnv('AQUILA_ENV')];
            }
            const merged                  = deepObjectVerification(envFile[getEnv('AQUILA_ENV')], JSON.parse(envExample)['{{environnement}}']);
            envFile[getEnv('AQUILA_ENV')] = merged;
        } else {
            envFile = generateNewEnv(envExample);
        }
        await fs.writeFile(global.envPath, JSON.stringify(envFile, null, 2));
        global.envFile = envFile[getEnv('AQUILA_ENV')];
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

const showAquilaLogo = () => {
    console.log(
        '\n\x1b[94m@@@@@@@@@@@@@@@@@@@@@@\x1b[34m(((((((((((((((\x1b[94m#&@@@@@@@@@@@@@@@@@@@@@@@@\n'
        + '\x1b[94m@@@@@@@@@@@@@@@@@&\x1b[34m(((((((((((((((((((((((((((\x1b[94m&@@@@@@@@@@@@@@@@@\n'
        + '\x1b[94m@@@@@@@@@@@@@@%\x1b[34m(((((((((((((((((((((((((((((((((\x1b[94m%@@@@@@@@@@@@@@\n'
        + '\x1b[94m@@@@@@@@@@@%\x1b[34m(((((((((((((((((((((((((((((((((((((((\x1b[94m%@@@@@@@@@@@\n'
        + '\x1b[94m@@@@@@@@@%\x1b[34m(((((((((((((((((((((((((((((((((((((((((((\x1b[94m%@@@@@@@@@\n'
        + '\x1b[94m@@@@@@@%\x1b[34m(((((((((((((((\x1b[33m/*,,,,,,,,,,,,,,,,,,*\x1b[34m(((((((((((\x1b[94m%@@@@@@@\n'
        + '\x1b[94m@@@@@@\x1b[34m((((((((((((\x1b[33m/,,,,,,,**\x1b[34m(((((((((((((((((((/*((((((((\x1b[94m@@@@@@\n'
        + '\x1b[94m@@@@&\x1b[34m(((((((((((\x1b[33m*,,,,,*/\x1b[34m((((((((((((((((((((((((((((((((((\x1b[94m&@@@@\n'
        + '\x1b[94m@@@%\x1b[34m(((((((((((\x1b[33m*,,,*(((((*,,,,,,,,,**/\x1b[34m(((((((((((((((((((((\x1b[94m%@@@\n'
        + '\x1b[94m@@%\x1b[34m(((((((((\x1b[33m*,,,,//,,/(((,,,,,,,,,,,,,,,,*\x1b[34m((((((((((((((((((\x1b[94m%@@\n'
        + '\x1b[94m@%\x1b[34m((((((((\x1b[33m,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,/\x1b[34m(((((((((((((((\x1b[94m%@\n'
        + '\x1b[94m@\x1b[34m(((((((\x1b[33m/,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,*\x1b[34m((((((((((((((\x1b[94m@\n'
        + '\x1b[94m#\x1b[34m(((((((\x1b[33m*,,,,**////*,,,,,,,,,,,,,,,,,,,,,,,,,,,,,*\x1b[34m((((((((((((\x1b[94m#\n'
        + '\x1b[34m(((((((((,((((((((((((((\x1b[33m*,,,,,,,,,,,,,,,,,,,,,,,,,,/\x1b[34m(((((((((((\n'
        + '\x1b[34m((((((((((((((((((((((((((\x1b[33m*,,,,,,,,,,,,,,,,,,,,,,,,,*\x1b[34m((((((((((\n'
        + '\x1b[34m(((((((((((((((((((((((((((\x1b[33m/,,,,,,,,,,,,,,,,,,,,,,,,,*\x1b[34m(((((((((\n'
        + '\x1b[34m(((((((((((((((((((((((((((((\x1b[33m*,,,,,,,,,,,,,,,,,,,,,,,,*\x1b[34m((((((((\n'
        + '\x1b[34m((((((((((((((((((((((((((((((\x1b[33m,,,,,,,,,,,,,,,,,,,,,,,,,/\x1b[34m(((((((\n'
        + '\x1b[34m(((((((((((((((((((((((((((((((\x1b[33m,,,,,,,,,,,,,,,,,,,,,,,,,\x1b[34m(((((((\n'
        + '\x1b[94m#\x1b[34m((((((((((((((((((((((((((((((\x1b[33m*,,,,,,,,,,,,,,,,,,,,,,,,/\x1b[34m(((((\x1b[94m#\n'
        + '\x1b[94m@\x1b[34m((((((((((((((((((((((((((((((\x1b[33m/,,,,,,,,,,,,,,,,,,,,,,,,/\x1b[34m(((((\x1b[94m@\n'
        + '\x1b[94m@#\x1b[34m((((((((((((((((((((((((((/(((\x1b[33m,,,,,,,,,,,,,,,,,,,,,,,,*\x1b[34m((((\x1b[94m#@\n'
        + '\x1b[94m@@#\x1b[34m(((((((((((((((((((((((\x1b[33m*,*\x1b[94m(((\x1b[33m,,,,,,,,,,,,,,,,,,,,,,,,/\x1b[34m(((\x1b[94m#@@\n'
        + '\x1b[94m@@@\x1b[34m((((((((((((((((((((\x1b[33m***,*\x1b[94m(((\x1b[33m/************************\x1b[34m((((\x1b[94m@@@\n'
        + '\x1b[94m@@@@\x1b[34m(((((((((((((((\x1b[33m********\x1b[94m((((\x1b[33m*************************\x1b[34m((\x1b[94m#@@@@\n'
        + '\x1b[94m@@@@@\x1b[33m*********************\x1b[94m(((((\x1b[33m************************\x1b[34m(((\x1b[94m@@@@@\n'
        + '\x1b[94m@@@@@@@\x1b[33m*****************/\x1b[94m(((((\x1b[33m/***********************/\x1b[34m(\x1b[94m@@@@@@@\n'
        + '\x1b[94m@@@@@@@@@\x1b[33m**************\x1b[94m(((((((\x1b[33m***********************/\x1b[94m@@@@@@@@@\n'
        + '\x1b[94m@@@@@@@@@@@\x1b[33m*********/\x1b[94m(((((((\x1b[33m/***********************\x1b[94m@@@@@@@@@@@\n'
        + '\x1b[94m@@@@@@@@@@@@@\x1b[33m****\x1b[94m((((((((((\x1b[33m***********************\x1b[94m@@@@@@@@@@@@@\n'
        + '\x1b[94m@@@@@@@@@@@@@@@@@((((((((\x1b[33m/*******************/\x1b[94m@@@@@@@@@@@@@@@@@\n'
        + '\x1b[94m@@@@@@@@@@@@@@@@@@@@@((\x1b[33m/*****************/\x1b[94m@@@@@@@@@@@@@@@@@@@@@',
        '\x1b[0m'
    );
};

const controlNodeVersion = () => {
    try {
        const version       = process.version.substring(1).split('.')[0]; // we delete the 'v' and split with the dot
        const versionMinUse = require('../package.json').engines.node.match(/\d+/)[0];        //
        let errorVersion    = '';
        if (version !== versionMinUse) {
            if (version < versionMinUse) errorVersion = 'low';
            if (version > versionMinUse) errorVersion = 'high';
            console.error(`Error in version of NODE. Your version (${process.version}) is too ${errorVersion}`);
        }
    } catch (error) {
        console.log('Error in Node control version');
    }
};

const logVersion = async () => {
    console.log(`%s@@ Mongoose version : ${mongoose.version}%s`, '\x1b[32m', '\x1b[0m');
    console.log(`%s@@ NodeJS version : ${process.version}%s`, '\x1b[32m', '\x1b[0m');
    console.log(`%s@@ Environment : ${getEnv('AQUILA_ENV')}%s`, '\x1b[32m', '\x1b[0m');
    if (global.envFile.db) {
        console.log(`%s@@ Database : ${global.envFile.db}%s`, '\x1b[32m', '\x1b[0m');
    }
    controlNodeVersion();
};

const startListening = async (server) => {
    if (global.envFile && global.envFile.ssl && global.envFile.ssl.key
        && global.envFile.ssl.cert && global.envFile.ssl.active
        && await fs.access(path.resolve(global.appRoot, global.envFile.ssl.key))
        && await fs.access(path.resolve(global.appRoot, global.envFile.ssl.cert))
    ) {
        spdy.createServer({
            key  : await fs.readFile(path.resolve(global.appRoot, global.envFile.ssl.key)),
            cert : await fs.readFile(path.resolve(global.appRoot, global.envFile.ssl.cert)),
            spdy : {
                protocols : ['h2', 'http1.1'],
                plain     : false,
                ssl       : true
            }
        }, server).listen(global.port, (err) => {
            if (err) throw err;
            console.log(`%sserver listening on port ${global.port} with HTTP/2%s`, '\x1b[32m', '\x1b[0m');
        });
    } else {
        server.listen(global.port, (err) => {
            if (err) throw err;
            console.log(`%sserver listening on port ${global.port} with HTTP/1.1%s`, '\x1b[32m', '\x1b[0m');
        });
    }
};

/**
 * Renvoie l'url de base de l'application terminée par un '/', ou '/' tout court si non rempli
 * @param {object} req request parameter from express
 * @returns {Object} an object containing the hostname, adminPrefix, analytics
 */
const getAppUrl = async (req) => {
    if (!req) {
        throw NSErrors.InvalidRequest;
    }
    const config = global.envConfig.environment;

    if (config.adminPrefix === undefined) {
        config.adminPrefix = 'admin';
    }

    return {
        appUrl      : `${req.protocol}://${req.get('host')}/`,
        adminPrefix : config.adminPrefix,
        analytics   : config.analytics
    };
};

const getUploadDirectory = () => {
    if (global.envConfig && global.envConfig.environment) {
        const {photoPath} = global.envConfig.environment;
        if (photoPath) return photoPath;
    }
    return 'uploads';
};

const generateNewEnv = (envExample) => {
    let env = envExample;
    env     = env.toString();
    env     = env.replace('{{environnement}}', getEnv('AQUILA_ENV'));
    env     = env.replace('{{secretKey}}', uuidv4());
    return JSON.parse(env);
};

const deepObjectVerification = (objectToVerify, objectBase) => {
    const other = {...objectBase};
    return Object.assign(other, {...objectToVerify});
};

module.exports = {
    getEnv,
    isProd,
    getOrCreateEnvFile,
    getUploadDirectory,
    showAquilaLogo,
    logVersion,
    startListening,
    getAppUrl
};