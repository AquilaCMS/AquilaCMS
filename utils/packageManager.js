/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2022 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {spawn, exec} = require('child_process');

/**
 * @description Launch a command on the defined path
 * @param {string} cde Command to execute.
 * @param {string} path Path of the command.
 */
exports.execCmd = async function (cde, path = global.appRoot) {
    console.log(`%scommand : ${cde} (Path : ${path})%s`, '\x1b[33m', '\x1b[0m');
    return new Promise((resolve, reject) => {
        exec(cde, {cwd: path, maxBuffer: 1024 * 500}, (err, stdout, stderr) => {
            if (err) {
                console.error(err);
                reject(err);
            }
            console.log(`%scommand : ${cde} ended%s`, '\x1b[33m', '\x1b[0m');
            resolve({stdout, stderr});
        });
    });
};

/**
 * @description Launch a shell command on the defined path
 * @param {string} cde Command to execute.
 * @param {array} param parameter of the cde.
 * @param {string} path Path of the command.
 */
exports.execSh = async function (cde, param = [], path = global.appRoot) {
    console.log(`%scommand : ${cde} with param : [${param}] (Path : ${path})%s`, '\x1b[33m', '\x1b[0m');
    return new Promise((resolve, reject) => {
        let cmd;
        if (process.platform === 'win64' || process.platform === 'win32') {
            cmd = spawn(cde, [...param], {cwd: path, shell: true});
        } else {
            cmd = spawn(cde, [...param], {cwd: path, shell: true});
        }

        let stdout = '';
        let stderr = '';
        cmd.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        cmd.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        cmd.on('error', (err) => {
            reject(err);
        });
        cmd.on('close', (code, signal) => {
            console.log(`%scommand : ${cde} with params : [${param}] ended%s`, '\x1b[33m', '\x1b[0m');
            resolve({code, signal, stdout, stderr});
        });
    });
};

/**
 * Restart server and if an error occur
 * return it as a callback
 * @param {Function} cb
 * @returns {Error} err
 * @returns {string} ManualRestart | success
 */
exports.restart = function () {
    console.log('Restarting server...');
    const pm2 = require('pm2');
    return new Promise((resolve, reject) => {
        // Connect or launch PM2
        pm2.connect(function (error) {
            if (error) return reject(error);
            // Start a script on the current folder
            pm2.restart('server.js', function (err) {
                if (err) {
                    // There is no PM2 installed, we do not raise an explicit error (reject)
                    if (err.message === 'process or namespace not found') {
                        console.error('Please restart manually');
                        return resolve('ManualRestart');
                    }
                    return reject(err);
                }
                return resolve('success');
            });
        });
    });
};
