/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const npm            = require('npm');
const path           = require('path');
const packageManager = require('./packageManager');

/**
 * Init npm
 */
const npmLoad = (npmOptions = {}) => {
    return new Promise((resolve, reject) => {
        npm.load(npmOptions, (err, result) => {
            if (err) reject(err);
            resolve(result);
        });
    });
};

/**
 * execute a npm command
 * @param {string} cmd commmand name to execute
 * @param {string[]} cmdParams parameter
 * @returns {{result, result2, result3, result4}}
 */
const npmCommand = (cmd, cmdParams, theme = false) => {
    if (!theme) {
        return new Promise((resolve, reject) => {
            npm.commands[cmd](cmdParams, (err, result, result2, result3, result4) => {
                if (err) reject(err);
                resolve({result, result2, result3, result4});
            });
        });
    }
    return packageManager.execSh(`npm ${cmd}`, cmdParams, path.resolve(global.appRoot, 'themes', global.envConfig.environment.currentTheme));
};

module.exports = {
    npmLoad,
    npmCommand
};
