/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {adminAuthRight} = require('../middleware/authentication');
const ServiceMail      = require('../services/mail');

module.exports = function (app) {
    app.post('/v2/mails', adminAuthRight('mails'), getMails);
    app.get('/v2/mail/:_id', adminAuthRight('mails'), getMail);
    app.get('/v2/mail/activation/account/sent/:user_id/:lang?', sendMailActivationAccount);
    app.put('/v2/mail', adminAuthRight('mails'), setMail);
    app.put('/v2/mail/removePdf', adminAuthRight('mails'), removePdf);
    app.post('/v2/mail/form/:lang?', sendContact);
    app.delete('/v2/mail/:_id', adminAuthRight('mails'), deleteMail);
    app.post('/v2/mail/test', adminAuthRight('mails'), sendTestEmail);
    app.post('/v2/mail/error', sendErrorMail);
};

async function sendTestEmail(req, res, next) {
    try {
        let result;
        if (req.body.values === 'Email Test') {
            result = await ServiceMail.sendMailTestConfig(req.body.mail, req.body.values, req.body.lang);
        } else {
            result = await ServiceMail.sendMailTest(req.body.mail, req.body.values, req.body.lang);
        }
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

async function removePdf(req, res, next) {
    try {
        const result = await ServiceMail.removePdf(req.body.mail, req.body.path);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Allows you to retrieve mails in the mail collection
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 */
async function getMails(req, res, next) {
    try {
        const result = await ServiceMail.getMails(req.body.PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
/**
 * Allows you to retrieve an email according to its _id
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 */
async function getMail(req, res, next) {
    try {
        const result = await ServiceMail.getMail(req.params._id);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
async function sendMailActivationAccount(req, res, next) {
    try {
        const {user_id, lang} = req.params;
        const result          = await ServiceMail.sendMailActivationAccount(user_id, lang);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Allows you to modify an email in the mail collection
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 */
async function setMail(req, res, next) {
    try {
        const result = await ServiceMail.setMail(req.body, req.body._id);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
/**
 * Delete the email whose _id is passed in parameter
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 */
async function deleteMail(req, res, next) {
    try {
        const result = await ServiceMail.deleteMail(req.params._id);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Send the information of a contact form by email
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 */
async function sendContact(req, res, next) {
    try {
        const result = await ServiceMail.sendContact(req.body, req.params.lang);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Send an email error
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 */
async function sendErrorMail(req, res, next) {
    try {
        console.error('sendErrorMail', req.body);
        const result = await ServiceMail.sendErrorMail(req.body);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}