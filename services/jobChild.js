const path             = require('path');
const utilsDB          = require('../utils/database');
const NSErrors         = require('../utils/errors/NSErrors');
const {stringifyError} = require('../utils/utils');

/**
 * Init child process Globals and Database
 */
const initChildProcess = async () => {
    try {
        global.aquila = global.aquila ? global.aquila : JSON.parse(Buffer.from(process.argv[3], 'base64').toString('utf8'));
        await utilsDB.connect();
    } catch (err) {
        console.error(err);
        throw NSErrors.InitChildProcessError;
    }
};

/**
 * Self-executing function because it is called by the child_process.fork() method, which does not support calling a specific function in a file
 */
(async () => {
    try {
        await initChildProcess();
        const {funcName, modulePath, option} = JSON.parse(Buffer.from(process.argv[2], 'base64').toString('utf8'));
        const response                       = await require(path.join(global.aquila.appRoot, modulePath))[funcName](option);
        if (response) process.send(response);
        process.exit(0);
    } catch (error) {
        if (NSErrors[error.code]) {
            process.send(error);
        } else {
            process.send(stringifyError(error));
        }
        process.exit(1);
    }
})();