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
