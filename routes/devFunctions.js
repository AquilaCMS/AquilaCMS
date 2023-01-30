/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {adminAuth}          = require('../middleware/authentication');
const servicesDevFunctions = require('../services/devFunctions');
const {Configuration}      = require('../orm/models');

module.exports = function (app) {
    app.get('/encryption/cipher', adminAuth, cipherPasswords);
    app.get('/createModelData', createModelData);
};
async function createModelData(req, res, next) {
    try {
        await servicesDevFunctions.createModelData();
        res.status(200).end();
    } catch (err) {
        return next(err);
    }
}

async function cipherPasswords(req, res, next) {
    console.log(new Date(), 'Encryption in progress');
    try {
        const _config = global.aquila.envConfig;

        if (_config.environment && _config.environment.mailPass !== undefined && _config.environment.mailPass !== '') {
            const goodPassword = _config.environment.mailPass;
            // Temporary change password (to bad password for encryption requirement)
            _config.environment.mailPass = `${_config.environment.mailPass}_BAD`;
            await Configuration.updateOne({_id: _config._id}, {$set: {environment: _config.environment}});

            _config.environment.mailPass = goodPassword;
            await Configuration.updateOne({_id: _config._id}, {$set: {environment: _config.environment}});
            console.log(new Date(), 'Encryption complete');
            return res.send(true);
        }
        return res.send(false);
    } catch (err) {
        return next(err);
    }
}
