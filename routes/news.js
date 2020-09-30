const {authentication, adminAuth} = require('../middleware/authentication');
const {securityForceFilter}       = require('../middleware/security');
const servicesNews                = require('../services/news');

module.exports = function (app) {
    app.post('/v2/site/news', securityForceFilter([{isVisible: true}]), getNews);
    app.post('/v2/site/new', securityForceFilter([{isVisible: true}]), getNew);
    app.put('/v2/site/new', authentication, adminAuth, saveNew);
    app.delete('/v2/site/new/:_id', authentication, adminAuth, deleteNew);
};

async function getNews(req, res, next) {
    try {
        const {PostBody} = req.body;
        res.json(await servicesNews.getNews(PostBody));
    } catch (err) {
        return next(err);
    }
}

async function getNew(req, res, next) {
    try {
        const {PostBody} = req.body;
        res.json(await servicesNews.getNew(PostBody));
    } catch (err) {
        return next(err);
    }
}

async function saveNew(req, res, next) {
    try {
        return res.json(await servicesNews.saveNew(req.body));
    } catch (err) {
        return next(err);
    }
}

async function deleteNew(req, res, next) {
    try {
        await servicesNews.deleteNew(req.params._id);
        return res.status(200).end();
    } catch (err) {
        return next(err);
    }
}
