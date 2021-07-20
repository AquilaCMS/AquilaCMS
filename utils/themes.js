/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const path           = require('path');
const nextBuild      = require('next/dist/build').default;
const packageManager = require('./packageManager');
const modulesUtils   = require('./modules');
const {isProd}       = require('./server');

/**
 * Compile the current theme
 */
const themeCompile = async (theme, type, newIsProd) => {
    try {
        theme                      = theme || global.envConfig.environment.currentTheme;
        const pathToTheme          = path.join(global.appRoot, 'themes', theme);
        let installDevDependencies = !isProd;
        if (typeof newIsProd !== 'undefined' && newIsProd !== null && newIsProd === true) {
            installDevDependencies = true; // we force overriding
        }
        await yarnInstall(theme, installDevDependencies);
        if (typeof type === 'undefined' || type === null || type === 'next') {
            await nextBuild(pathToTheme);
        } else {
            await yarnBuild(theme);
        }
    } catch (err) {
        console.error(err);
        throw new Error(err);
    }
};

/**
 * Set current theme at startup from envFile.currentTheme
 */
const loadTheme = async () => {
    await modulesUtils.createListModuleFile();
    await modulesUtils.displayListModule();

    // Language with i18n
    let i18nInstance = null;
    let ns           = null;
    try {
        const pathToI18n = path.join(global.appRoot, 'themes', global.envConfig.environment.currentTheme, 'i18n');
        const oI18n      = require(pathToI18n);
        i18nInstance     = oI18n.i18nInstance;
        ns               = oI18n.ns;
    } catch (error) {
        console.error(error);
    }

    return {i18nInstance, ns};
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
const yarnBuild = async (themeName = '') => {
    const linkToTheme  = path.join(global.appRoot, 'themes', themeName);
    const returnValues = await packageManager.execCmd('yarn run build', path.join(linkToTheme, '/'));
    return returnValues;
};

module.exports = {
    themeCompile,
    loadTheme,
    yarnInstall,
    yarnBuild
};