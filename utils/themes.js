/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const path                     = require('path');
const slash                    = require('slash');
const fs                       = require('fs');
const {execCmd, execCmdBase64} = require('aql-utils');
/* /!\ Do not require models so as not to break the order of initiation of models with modules */

/**
 * Do a yarn install and compile the theme passed as a parameter or the current theme
 */
const themeInstallAndCompile = async (theme) => {
    try {
        const pathToTheme = path.join(global.aquila.appRoot, 'themes', theme, '/');
        if (fs.existsSync(pathToTheme)) {
            const themeName = theme || global.aquila.envConfig.environment.currentTheme;
            await yarnInstall(themeName);
            await yarnBuildCustom(themeName);
        } else {
            console.error(`Can't access to ${pathToTheme}`);
            console.log('Example of use: `npm run build my_theme_folder`');
        }
    } catch (err) {
        console.error(err);
        throw new Error(err);
    }
};

/**
 * Do a yarn install
 */
const yarnInstall = async (themeName = ''/* , devDependencies = false */) => {
    const linkToTheme   = path.join(global.aquila.appRoot, 'themes', themeName);
    const pathToPackage = path.join(linkToTheme, 'package.json');
    const isExist       = fs.existsSync(pathToPackage);
    if (!isExist) {
        return {
            stdout : "No 'package.json' found - no yarn",
            stderr : "No 'package.json' found - no yarn"
        };
    }

    const returnValues = await execCmd('yarn install', path.join(linkToTheme, '/'));
    return returnValues;
};

/**
 * Do a yarn run build
 */
const yarnBuildCustom = async (themeName = '') => {
    const pathToTheme = path.join(global.aquila.appRoot, 'themes', themeName);
    const pathToInit  = path.join(pathToTheme, 'themeInit.js');
    let returnValues;
    try {
        if (fs.existsSync(pathToInit)) {
            const process = require('process');
            process.chdir(pathToTheme); // protect require of the frontFrameWork
            const initFileOfConfig = require(pathToInit);
            if (typeof initFileOfConfig.build === 'function') {
                returnValues = await execThemeFile(pathToInit, 'build()', pathToTheme);
                console.log(returnValues.stdout);
                console.error(returnValues.stderr);

                process.chdir(global.aquila.appRoot);
            } else {
                process.chdir(global.aquila.appRoot);
                returnValues = await yarnBuild(themeName);
            }
        } else {
            const pathToPackage = path.join(pathToTheme, 'package.json');
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
    const linkToTheme  = path.join(global.aquila.appRoot, 'themes', themeName);
    const returnValues = await execCmd('yarn run build', path.join(linkToTheme, '/'));
    return returnValues;
};

/**
 * Create a .yarnclean file to delete the contents of a node_modules folder
 */
const yarnDeleteNodeModulesContent = async (themeName = '') => {
    let returnValues;
    const linkToTheme = path.join(global.aquila.appRoot, 'themes', themeName);
    const themePath   = path.join(linkToTheme, '/');
    try {
        const createYarnCleanFile = await execCmd('yarn autoclean --init', themePath);
        if (createYarnCleanFile) {
            const yarnCleanFilePath = path.join(themePath, '.yarnclean');
            fs.truncateSync(yarnCleanFilePath, 0);
            fs.writeFileSync(yarnCleanFilePath, '*');
            const deleteNodeModulesContent = await execCmd('yarn autoclean --force', themePath);
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
    const linkToFile = path.join(global.aquila.appRoot, 'themes', theme, nameOfFile);
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

/**
 * @description execThemeFile
 * @param pathToFile : path to the file that contains the function to call
 * @param functionToCall : the function to call
 * @param pathToTheme : path the root of the theme
 */
const execThemeFile = async (pathToFile, functionToCall, pathToTheme) => {
    const appRoot = global.aquila.appRoot;
    slash(global.aquila.appRoot);
    const objectsTab      = [global.aquila];
    const returnValues    = await execCmdBase64(`node -e "global.aquila = '#OBJECT0#'; require('${slash(pathToFile)}').${functionToCall}"`, objectsTab, slash(path.join(pathToTheme, '/')));
    global.aquila.appRoot = appRoot;
    return returnValues;
};

module.exports = {
    themeInstallAndCompile,
    yarnBuildCustom,
    yarnInstall,
    yarnBuild,
    yarnDeleteNodeModulesContent,
    loadThemeInfo,
    execThemeFile
};