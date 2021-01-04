/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {authentication, adminAuth} = require('../middleware/authentication');
const ServiceMailType             = require('../services/mailType');

module.exports = function (app) {
    app.get('/v2/mail_types', authentication, adminAuth, getMailTypes);
    app.get('/v2/mail_type/:code', authentication, adminAuth, getMailType);
    app.put('/v2/mail_type', authentication, adminAuth, setMailType);
};

/**
 * Permet de recupérer les configurations des mails dans la collection mail
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 */
async function getMailTypes(req, res, next) {
    try {
        const result = await ServiceMailType.getMailTypes();
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Permet de recupérer les configurations des mails dans la collection mail
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 */
async function getMailType(req, res, next) {
    try {
        const result = await ServiceMailType.getMailType(req.params.code);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Permet de modifier une configuration d'un mail dans la collection mail
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 */
async function setMailType(req, res, next) {
    try {
        const result = await ServiceMailType.setMailType(req.body, req.body._id);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}