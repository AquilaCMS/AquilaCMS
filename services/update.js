/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const axios                  = require('axios');
const AdmZip                 = require('adm-zip');
const path                   = require('path');
const {fs, execCmd, restart} = require('aql-utils');
const logger                 = require('../utils/logger');
const {Configuration}        = require('../orm/models');
const tmpPath                = path.resolve('./uploads/temp');
const packageJSONPath        = path.resolve(global.aquila.appRoot, 'package.json');

/**
 * Compare local version with distant version
 */
const verifyingUpdate = async () => {
    const actualVersion = JSON.parse(fs.readFileSync(packageJSONPath)).version;

    // Create the /uploads/temp folder if it doesn't exist
    if (!fs.existsSync(tmpPath)) {
        fs.mkdirSync(tmpPath, {recursive: true});
    }

    // Get online version
    const fileURL  = 'https://last-aquila.s3-eu-west-1.amazonaws.com/version.txt';
    const filePath = path.resolve(`${tmpPath}/version.txt`);
    let onlineVersion;
    try {
        await downloadURL(fileURL, filePath);
        onlineVersion = fs.readFileSync(filePath).toString().replace('\n', '').trim();
    } catch (exc) {
        logger.error(`Get ${fileURL} failed`);
    }
    return {
        version    : actualVersion,
        onlineVersion,
        needUpdate : actualVersion < onlineVersion
    };
};

async function checkChanges() {
    const status = await execCmd('git status -uno');
    console.log(status);
    if (status.stderr !== '') {
        return {type: 'error', message: status.stderr};
    }
    return {message: status.stdout};
}

const updateGithub = async () => {
    await setMaintenance(true);
    try {
        await execCmd('git reset --hard');
        await execCmd('git clean -fd');
        await execCmd('git pull');
        await setMaintenance(false);
        console.log('Aquila is updated !');
        return restart();
    } catch (error) {
        logger.error(error.message);
        return error;
    }
};

const update = async () => {
    console.log('Update Aquila...');

    await setMaintenance(true);

    const filePathV = path.resolve(`${tmpPath}/version.txt`);
    const version   = fs.readFileSync(filePathV).toString().replace('\n', '').trim();

    const fileURL  = `https://last-aquila.s3-eu-west-1.amazonaws.com/Aquila-${version}.zip`;
    const filePath = `${tmpPath}//Aquila-${version}.zip`;

    // Download the file
    try {
        console.log(`Downloading Aquila ${version}...`);
        await downloadURL(fileURL, filePath);
    } catch (err) {
        logger.error(`Get ${fileURL} failed`);
    }

    const oldPackageJSON = JSON.parse(await fs.readFile(packageJSONPath));
    const workspaces     = oldPackageJSON.workspaces;

    try {
        console.log('Extracting archive...');
        const zip        = new AdmZip(filePath);
        const aquilaPath = global.envFile.devMode ? tmpPath : './';
        zip.extractAllTo(aquilaPath, true);
    } catch (err) {
        logger.error(`Unzip ${filePath} failed`);
    }
    const packageJSON              = JSON.parse(await fs.readFile(packageJSONPath));
    packageJSON.package.workspaces = workspaces;
    await fs.writeFile(packageJSONPath, JSON.stringify(packageJSON, null, 2));

    await execCmd('yarn install');

    await fs.unlink(filePath);
    await setMaintenance(false);

    console.log('Aquila is updated !');
    // Reboot
    return restart();
};

/**
 * Download file from url to destination folder
 * @param {String | Buffer | URL} url
 * @param {String | Buffer | URL} dest
 */
async function downloadURL(url, dest) {
    const request = await axios({
        url,
        method       : 'GET',
        responseType : 'stream'
    });
    const file    = fs.createWriteStream(dest);
    request.data.pipe(file);
    return new Promise((resolve, reject) => {
        file.on('finish', () => {
            file.close();
            resolve();
        });
        request.data.on('error', async (err) => {
            await fs.unlink(dest);
            return reject(err);
        });
    });
}

/**
 * Set in maintenance mode (no front is delivered)
 * @param {boolean} isInMaintenance Maintenance status to set
 */
const setMaintenance = async (isInMaintenance) =>  {
    const configuration = await Configuration.findOne({});

    if (configuration && configuration.environment && configuration.environment.autoMaintenance) {
        configuration.environment.maintenance = isInMaintenance;
        await configuration.save();
    }
};

const checkGithub = async () => {
    const git = {
        exist : false
    };
    if (fs.existsSync(path.resolve('./.git'), {recursive: true})) {
        git.exist = true;
    }
    return git;
};

module.exports = {
    verifyingUpdate,
    update,
    setMaintenance,
    checkGithub,
    updateGithub,
    checkChanges
};
