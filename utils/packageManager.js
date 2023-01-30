/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {spawn, exec, fork} = require('child_process');
const NSErrors            = require('./errors/NSErrors');

/**
 * @description Launch a command on the defined path
 * @param {string} cde Command to execute.
 * @param {string} path Path of the command.
 */
exports.execCmd = async function (cde, path = global.aquila.appRoot) {
    console.log(`%sExec command : ${cde} (Path : ${path})%s`, '\x1b[33m', '\x1b[0m');
    await aqlExec(cde, path);
};

/**
 * @description Launch a command on the defined path
 * @param {string} cde Command to execute.
 * @param {string} path Path of the command.
 */
exports.execCmdBase64 = async function (cde, objectsTab, path = global.aquila.appRoot) {
    console.log(`%sExec command base64 (Path : ${path})%s`, '\x1b[33m', '\x1b[0m');
    for (let i = 0; i < objectsTab.length; i++) {
        cde = cde.replace(`#OBJECT${i}#`, Buffer.from(JSON.stringify(objectsTab[i])).toString('base64'));
    }
    return new Promise((resolve, reject) => {
        exec(cde, {cwd: path, maxBuffer: 1024 * 500}, (err, stdout, stderr) => {
            if (err) {
                console.error(err);
                reject(err);
            }
            console.log('%sExec ended%s', '\x1b[33m', '\x1b[0m');
            resolve({stdout, stderr});
        });
    });
};

/**
 * @description Launch a command on the defined path
 * @param {string} cde Command to execute.
 * @param {string} path Path of the command.
 */
async function aqlExec(cde, path) {
    return new Promise((resolve, reject) => {
        exec(cde, {cwd: path, maxBuffer: 1024 * 500}, (err, stdout, stderr) => {
            if (err) {
                console.error(err);
                reject(err);
            }
            console.log('%sExec ended%s', '\x1b[33m', '\x1b[0m');
            resolve({stdout, stderr});
        });
    });
}

/**
 * @description Launch a shell command on the defined path
 * @param {string} cde Command to execute.
 * @param {array} param parameter of the cde.
 * @param {string} path Path of the command.
 */
exports.execSh = async function (cde, param = [], path = global.aquila.appRoot) {
    console.log(`%scommand : ${cde} with param : [${param}] (Path : ${path})%s`, '\x1b[33m', '\x1b[0m');
    return new Promise((resolve, reject) => {
        const cmd    = spawn(cde, [...param], {cwd: path, shell: true});
        const stdout = '';
        const stderr = '';
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
 * @description Launch a shell command on the defined path using fork
 * @param {string} cde Command to execute.
 * @param {array} param parameter of the cde.
 * @param {string} path Path of the command.
 */
exports.execCron = async function (modulePath, funcName, params, option) {
    let message     = '';
    const apiParams = {modulePath, funcName, option};
    return new Promise((resolve, reject) => {
        const cmd = fork(
            `${global.aquila.appRoot}/services/jobChild.js`,
            [Buffer.from(JSON.stringify(apiParams)).toString('base64'), Buffer.from(JSON.stringify(global.aquila)).toString('base64'), ...params],
            {cwd: global.aquila.appRoot, shell: true}
        );
        cmd.on('error', (err) => reject(err));
        cmd.on('message', (data) => {
            message = data;
        });
        cmd.on('close', (code) => resolve({code}));
    }).then(async (data) => {
        const error = data.code;
        return {
            message,
            ...(error === 1 && {error: typeof message === 'string' ? message : NSErrors[message.code] || NSErrors.JobError})
        };
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
