/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2022 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const path           = require('path');
const slash          = require('slash');
const fs             = require('fs');
const packageManager = require('./packageManager');
/* /!\ Ne pas faire de require sur des models pour ne pas casser l'ordre d'initilaisation des modeles avec les modules */

/**
 * Do a yarn install and compile the theme passed as a parameter or the current theme
 */
const themeInstallAndCompile = async (theme) => {
    try {
        const themeName = theme || global.envConfig.environment.currentTheme;
        await yarnInstall(themeName);
        await yarnBuildCustom(themeName);
    } catch (err) {
        console.error(err);
        throw new Error(err);
    }
};

/**
 * Do a yarn install
 */
const yarnInstall = async (themeName = '', devDependencies = false) => {
    const linkToTheme   = path.join(global.appRoot, 'themes', themeName);
    const pathToPackage = path.join(linkToTheme, 'package.json');
    const isExist       = fs.existsSync(pathToPackage);
    if (!isExist) {
        return {
            stdout : "No 'package.json' found - no yarn",
            stderr : "No 'package.json' found - no yarn"
        };
    }
    let command = 'yarn install --production=true';
    // If the NODE_ENV variable is not equal to 'production', yarn install will always install the devDependencies
    if (devDependencies === true || require('./server').dev) {
        command = 'yarn install --production=false';
    }
    const returnValues = await packageManager.execCmd(command, path.join(linkToTheme, '/'));
    return returnValues;
};

/**
 * Do a yarn run build
 */
const yarnBuildCustom = async (themeName = '') => {
    const linkToTheme = path.join(global.appRoot, 'themes', themeName);
    const pathToInit  = path.join(linkToTheme, 'themeInit.js');
    let returnValues;
    try {
        if (fs.existsSync(pathToInit)) {
            const process = require('process');
            process.chdir(linkToTheme); // protect require of the frontFrameWork
            const initFileOfConfig = require(pathToInit);
            if (typeof initFileOfConfig.build === 'function') {
                const appRoot         = slash(global.appRoot);
                const globalAppUrl    = global.envConfig.environment.appUrl;
                const globalEnvConfig = JSON.stringify({environment: {appUrl: globalAppUrl}}).replace(/"/g, '#') || '{}';
                returnValues          = await packageManager.execCmd(`node -e "global.appRoot = '${appRoot}'; global.envConfig = '${globalEnvConfig}'; require('${slash(pathToInit)}').build()"`, slash(path.join(linkToTheme, '/')));
                if (returnValues.stderr === '') {
                    console.log('Build command log : ', returnValues.stdout);
                } else {
                    returnValues.stdout = 'Build failed';
                    console.error(returnValues.stderr);
                }
                process.chdir(global.appRoot);
            } else {
                process.chdir(global.appRoot);
                returnValues = await yarnBuild(themeName);
            }
        } else {
            const pathToPackage = path.join(linkToTheme, 'package.json');
            const isExist       = fs.existsSync(pathToPackage);
            if (isExist) {
                returnValues = await yarnBuild(themeName);
            } else {
                returnValues = {
                    stdout : "No 'package.json' or 'themeInit.js' found - no build",
                    stderr : "No 'package.json' or 'themeInit.js' found - no build"
                };
            }
        }
    } catch (e) {
        console.error(e);
        returnValues = {
            stdout : 'Build failed',
            stderr : e
        };
    }
    if (!require('./server').dev) await require('../orm/models/configuration').findOneAndUpdate({}, {'environment.needRebuild': false});
    return returnValues;
};

/**
 * Do a yarn run build
 */
const yarnBuild = async (themeName = '') => {
    const linkToTheme  = path.join(global.appRoot, 'themes', themeName);
    const returnValues = await packageManager.execCmd('yarn run build', path.join(linkToTheme, '/'));
    return returnValues;
};

/**
 * Create a .yarnclean file to delete the contents of a node_modules folder
 */
const yarnDeleteNodeModulesContent = async (themeName = '') => {
    let returnValues;
    const linkToTheme = path.join(global.appRoot, 'themes', themeName);
    const themePath   = path.join(linkToTheme, '/');
    try {
        const createYarnCleanFile = await packageManager.execCmd('yarn autoclean --init', themePath);
        if (createYarnCleanFile) {
            const yarnCleanFilePath = path.join(themePath, '.yarnclean');
            fs.truncateSync(yarnCleanFilePath, 0);
            fs.writeFileSync(yarnCleanFilePath, '*');
            const deleteNodeModulesContent = await packageManager.execCmd('yarn autoclean --force', themePath);
            if (deleteNodeModulesContent) {
                returnValues = {stdout: `The contents of the ${themeName} node_modules folder has been deleted`};
            } else {
                returnValues = {
                    stdout : `Error when deleting the contents of the node_modules folder from ${themeName}`,
                    stderr : `Error when deleting the contents of the node_modules folder from ${themeName}`
                };
            }
        } else {
            returnValues = {
                stdout : 'Yarn autoclean --init command failed',
                stderr : 'Yarn autoclean --init command failed'
            };
        }
    } catch (e) {
        returnValues = {
            stdout : 'Node modules deletion failed',
            stderr : e
        };
    }
    return returnValues;
};

/**
 * @description loadThemeConfig
 * @param theme : String Theme selectionné
 */
const loadThemeInfo = (theme) => {
    const nameOfFile = 'themeInfo.json';
    const linkToFile = path.join(global.appRoot, 'themes', theme, nameOfFile);
    try {
        if (fs.existsSync(linkToFile)) {
            const config = require(linkToFile);
            return config;
        }
    } catch (e) {
        // e;
    }
    return null;
};
module.exports = {
    themeInstallAndCompile,
    yarnBuildCustom,
    yarnInstall,
    yarnBuild,
    yarnDeleteNodeModulesContent,
    loadThemeInfo
};