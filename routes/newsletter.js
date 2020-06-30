const ServiceNewsletter = require('../services/newsletter');

module.exports = function (app) {
    app.get('/v2/newsletter/:email', getNewsletter);
    app.post('/v2/newsletter/:email', setStatusNewsletter);
};

async function getNewsletter(req, res, next) {
    try {
        const result = await ServiceNewsletter.getNewsletter(req.params.email);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

async function setStatusNewsletter(req, res, next) {
    try {
        const result = await ServiceNewsletter.setStatusNewsletter(req.params.email, req.body);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
