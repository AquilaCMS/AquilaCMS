/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const ServiceNewsletter = require('../services/newsletter');

module.exports = function (app) {
    app.post('/v2/newsletters', getNewsletters);
    app.post('/v2/newsletter', getNewsletter);
    app.post('/v2/newsletters/distinct', getDistinctNewsletters);
    app.get('/v2/newsletter/:email', getNewsletterByEmail);
    app.post('/v2/newsletter/:email', setStatusNewsletterByEmail);
};

async function getNewsletters(req, res, next) {
    try {
        const result = await ServiceNewsletter.getNewsletters(req.body.PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

async function getNewsletter(req, res, next) {
    try {
        const result = await ServiceNewsletter.getNewsletter(req.body.PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

async function getDistinctNewsletters(req, res, next) {
    try {
        const result = await ServiceNewsletter.getDistinctNewsletters(req.body.PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

 /**
 * GET /api/v2/newsletter/{email}
 * @tags Newsletter
 * @summary Get subscribing for this email
 * @param {string} email.path.required - email to subscribe
 */
async function getNewsletterByEmail(req, res, next) {
    try {
        const result = await ServiceNewsletter.getNewsletterByEmail(req.params.email);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

 /**
 * POST /api/v2/newsletter/{email}
 * @tags Newsletter
 * @summary Subscribe to a newsletter
 * @param {string} email.path.required - email to subscribe
 */
async function setStatusNewsletterByEmail(req, res, next) {
    try {
        const result = await ServiceNewsletter.setStatusNewsletterByEmail(req.params.email, req.body);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
