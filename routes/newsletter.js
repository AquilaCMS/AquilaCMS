/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const ServiceNewsletter = require('../services/newsletter');
const {adminAuth}       = require('../middleware/authentication');

module.exports = function (app) {
    app.post('/v2/newsletters', adminAuth, getNewsletters);
    app.post('/v2/newsletter', adminAuth, getNewsletter);
    app.post('/v2/newsletters/distinct', adminAuth, getDistinctNewsletters);
    app.get('/v2/newsletter/:email', adminAuth, getNewsletterByEmail);
    app.post('/v2/newsletter/:email', adminAuth, setStatusNewsletterByEmail);
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
 * @summary Get subscribing for this email
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
 * @summary Subscribe to a newsletter
 */
async function setStatusNewsletterByEmail(req, res, next) {
    try {
        const result = await ServiceNewsletter.setStatusNewsletterByEmail(req.params.email, req.body);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
