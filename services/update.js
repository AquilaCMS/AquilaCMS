const axios                    = require('axios');
const AdmZip                   = require('adm-zip');
const path                     = require('path');
const fsp                      = require('../utils/fsp');
const packageManager           = require('../utils/packageManager');
const {isProd}                 = require('../utils/server');
const {Modules, Configuration} = require('../orm/models');
const tmpPath                  = path.resolve('./uploads/temp');

/**
 * Compare local version with distant version
 */
const verifyingUpdate = async () => {
    const actualVersion = JSON.parse(fsp.readFileSync(path.resolve(global.appRoot, './package.json'))).version;

    // Créer le dossier /uploads/temp s'il n'existe pas
    if (!fsp.existsSync(tmpPath)) {
        fsp.mkdirSync(tmpPath, {recursive: true});
    }

    // Get online version
    const fileURL  = 'https://last-aquila.s3-eu-west-1.amazonaws.com/version.txt';
    const filePath = path.resolve(`${tmpPath}/version.txt`);
    let onlineVersion;
    try {
        await downloadURL(fileURL, filePath);
        onlineVersion = fsp.readFileSync(filePath).toString().replace('\n', '').trim();
    } catch (exc) {
        console.error(`Get ${fileURL} failed`);
    }
    return {
        version    : actualVersion,
        onlineVersion,
        needUpdate : actualVersion < onlineVersion
    };
};

const update = async () => {
    console.log('Update Aquila...');

    const _config   = await Configuration.findOne({});
    let maintenance = false;
    if (
        _config
        && _config.environment
        && _config.environment.autoMaintenance === true
        && _config.environment.maintenance === false
    ) {
        _config.environment.maintenance = true;
        maintenance                     = true;
        await Configuration.updateOne(
            {_id: _config._id},
            {$set: {environment: _config.environment}}
        );
    }

    const filePathV = path.resolve(`${tmpPath}/version.txt`);
    const version   = fsp.readFileSync(filePathV).toString().replace('\n', '').trim();

    const fileURL  = `https://last-aquila.s3-eu-west-1.amazonaws.com/Aquila-${version}.zip`;
    const filePath = `${tmpPath}//Aquila-${version}.zip`;
    let aquilaPath = './';

    const devMode = global.envFile.devMode;
    if (typeof devMode !== 'undefined') {
        aquilaPath = tmpPath;
    }

    // Télécharger le fichier
    try {
        console.log(`Downloading Aquila ${version}...`);
        await downloadURL(fileURL, filePath);
    } catch (exc) {
        console.error(`Get ${fileURL} failed`);
    }

    // Décompresser dossier temporaire
    try {
        console.log('Extracting archive...');
        const zip = new AdmZip(filePath);
        zip.extractAllTo(aquilaPath);
    } catch (exc) {
        console.error(`Unzip ${filePath} failed`);
    }

    // yarn install du aquila
    await packageManager.execCmd(`yarn install${isProd() ? ' --prod' : ''}`, './');
    const modules = await Modules.find({active: true});

    for (const module of modules) {
        if (module.packageDependencies && module.packageDependencies.api && module.packageDependencies.api.length > 0) {
            await packageManager.execCmd(`yarn add ${module.packageDependencies.api.join(' ')}`, './');
        }
    }

    if (
        _config
        && _config.environment
        && _config.environment.autoMaintenance === true
        && _config.environment.maintenance === true
        && maintenance === true
    ) {
        _config.environment.maintenance = false;
        await Configuration.updateOne(
            {_id: _config._id},
            {$set: {environment: _config.environment}}
        );
    }

    console.log('Aquila is updated !');
    await fsp.unlink(filePath);
    // Reboot
    return packageManager.restart();
};

/**
 * Download file from url to destination folder
 * @param {String | Buffer | URL} url
 * @param {String Buffer | | URL} dest
 */
async function downloadURL(url, dest) {
    const request = await axios({
        url,
        method       : 'GET',
        responseType : 'stream'
    });
    const file    = fsp.createWriteStream(dest);
    request.data.pipe(file);
    return new Promise((resolve, reject) => {
        file.on('finish', () => {
            file.close();
            resolve();
        });
        request.data.on('error', async (err) => {
            await fsp.unlink(dest);
            return reject(err);
        });
    });
}

module.exports = {
    verifyingUpdate,
    update
};