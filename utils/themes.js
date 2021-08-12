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
const themeCompile = async (theme, newIsProd) => {
    try {
        const themeName            = theme || global.envConfig.environment.currentTheme;
        let installDevDependencies = !isProd;
        if (typeof newIsProd !== 'undefined' && newIsProd !== null && newIsProd === true) {
            installDevDependencies = true; // we force overriding
        }
        await yarnInstall(themeName, installDevDependencies);
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
    try {
        if (fs.existsSync(pathToInit)) {
            const process = require('process');
            process.chdir(linkToTheme); // protect require of the frontFrameWork
            const initFileOfConfig = require(pathToInit);
            if (typeof initFileOfConfig.build === 'function') {
                returnValues = await initFileOfConfig.build();
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
        returnValues = {
            stdout : 'Build failed',
            stderr : e
        };
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

/**
 * @description loadThemeConfig
 * @param theme : String Theme selectionné
 */
const loadInfoTheme = (theme) => {
    const nameOfFile = 'infoTheme.json';
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
    themeCompile,
    yarnBuildCustom,
    yarnInstall,
    yarnBuild,
    loadInfoTheme
};