const path  = require('path');
const utils = require('../utils/utils');

(async () => {
    try {
        await utils.initDBandGlobalInChildProcess();
        const {funcName, modulePath, option} = JSON.parse(Buffer.from(process.argv[2], 'base64').toString('utf8'));
        const response                       = await require(path.join(global.aquila.appRoot, modulePath))[funcName](option);
        if (response) process.send({message: response});
        process.exit(0);
    } catch (error) {
        process.send({message: error});
        process.exit(1);
    }
})();