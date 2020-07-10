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

async function getNewsletterByEmail(req, res, next) {
    try {
        const result = await ServiceNewsletter.getNewsletterByEmail(req.params.email);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

async function setStatusNewsletterByEmail(req, res, next) {
    try {
        const result = await ServiceNewsletter.setStatusNewsletterByEmail(req.params.email, req.body);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
