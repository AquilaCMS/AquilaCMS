const {authentication, adminAuth} = require("../middleware/authentication");
const encryption                  = require('../utils/encryption');
const servicesDevScripts          = require("../services/devScripts");
const {Configuration}             = require("../orm/models");

module.exports = function (app) {
    app.get("/encryption/cipher", authentication, adminAuth, cipherPasswords);
    app.get("/createModelData", authentication, adminAuth, createModelData);
};
async function createModelData(req, res, next) {
    try {
        await servicesDevScripts.createModelData();
        res.status(200).end();
    } catch (err) {
        return next(err);
    }
}

async function cipherPasswords(req, res, next) {
    console.log(new Date(), "Chiffrement en cours");
    try {
        const _config = global.envConfig;

        if (_config.environment && _config.environment.mailPass !== undefined && _config.environment.mailPass !== "") {
            _config.environment.mailPass = encryption.cipher(_config.environment.mailPass);

            await Configuration.updateOne({_id: _config._id}, {$set: {environment: _config.environment}});
            console.log(new Date(), "Chiffrement terminé");
            return res.send(true);
        }
        return res.send(false);
    } catch (err) {
        return next(err);
    }
}
