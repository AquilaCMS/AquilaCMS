/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const path           = require('path');
const fs             = require('fs');
const packageManager = require('./packageManager');
const {isProd}       = require('./server');

/**
 * Compile the current theme
 */
const themeCompile = async (pathToInit, type, newIsProd) => {
    try {
        const theme                = global.envConfig.environment.currentTheme;
        let installDevDependencies = !isProd;
        if (typeof newIsProd !== 'undefined' && newIsProd !== null && newIsProd === true) {
            installDevDependencies = true; // we force overriding
        }
        await yarnInstall(theme, installDevDependencies);
        await yarnBuildCustom(theme);
    } catch (err) {
        console.error(err);
        throw new Error(err);
    }
};

/**
 * Do a yarn install
 */
const yarnInstall = async (themeName = '', devDependencies = false) => {
    const linkToTheme = path.join(global.appRoot, 'themes', themeName);
    let command       = 'yarn install --production=true';
    if (devDependencies === true) {
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
    if (fs.existsSync(pathToInit)) {
        const initFileOfConfig = require(pathToInit);
        if (typeof initFileOfConfig.build === 'function') {
            returnValues = await initFileOfConfig.build();
        } else {
            returnValues = await yarnBuild(themeName);
        }
    } else {
        returnValues = await yarnBuild(themeName);
    }
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
module.exports = {
    themeCompile,
    yarnBuildCustom,
    yarnInstall,
    yarnBuild
};