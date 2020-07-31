const {News}            = require('../orm/models');
const {authentication, adminAuth} = require('../middleware/authentication');
const {securityForceFilter} = require('../middleware/security');
const {middlewareServer} = require('../middleware');
const servicesNews      = require('../services/news');
const mediasUtils       = require('../utils/medias');

module.exports = function (app) {
    app.post('/v2/site/news', securityForceFilter([{isVisible: true}]), getNews);
    app.post('/v2/site/new', securityForceFilter([{isVisible: true}]), getNew);
    app.put('/v2/site/new', authentication, adminAuth, saveNew);
    app.delete('/v2/site/new/:_id', authentication, adminAuth, deleteNew);

    // Deprecated
    app.get('/site/news', middlewareServer.deprecatedRoute, list);
    app.get('/site/news/:_id', middlewareServer.deprecatedRoute, detail);
    app.post('/site/news', middlewareServer.deprecatedRoute, authentication, adminAuth, save);
    app.put('/site/news', middlewareServer.deprecatedRoute, authentication, adminAuth, update);
    app.delete('/site/news/image/:_id', middlewareServer.deprecatedRoute, authentication, adminAuth, removeImage);
    app.delete('/site/news/:_id', middlewareServer.deprecatedRoute, authentication, adminAuth, remove);
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

//= ====================================================================
//= ========================== Deprecated ==============================
//= ====================================================================

/**
 * @deprecated
 * @param {Express.Request} req req
 * @param {Express.Response} res res
 * @param {Function} next next
 */
async function list(req, res, next) {
    try {
        const result = await News.find({}).sort({createdAt: -1});
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * @deprecated
 * @param {Express.Request} req req
 * @param {Express.Response} res res
 * @param {Function} next next
 */
async function detail(req, res, next) {
    try {
        res.send(await News.findOne({_id: req.params._id}));
    } catch (err) {
        return next(err);
    }
}

/**
 * @deprecated
 * @param {Express.Request} req req
 * @param {Express.Response} res res
 * @param {Function} next next
 */
async function save(req, res, next) {
    try {
        res.json(await News.create(req.body));
    } catch (err) {
        return next(err);
    }
}

/**
 * @deprecated
 * @param {Express.Request} req req
 * @param {Express.Response} res res
 * @param {Function} next next
 */
async function removeImage(req, res, next) {
    try {
        const {_id} = req.params;
        const oNews = await News.findOne({_id});
        await mediasUtils.deleteFile(oNews.img);
        // On supprime ensuite le lien de l'image en bdd
        const result = await News.findOneAndUpdate({_id}, {img: ''}, {new: true});
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * @deprecated
 * @param {Express.Request} req req
 * @param {Express.Response} res res
 * @param {Function} next next
 */
async function remove(req, res, next) {
    const oNews = await News.findOne({_id: req.params._id});
    await mediasUtils.deleteFile(oNews.img);
    try {
        await News.deleteOne({_id: req.params._id});
        res.end();
    } catch (err) {
        return next(err);
    }
}

/**
 * @deprecated
 * @param {Express.Request} req req
 * @param {Express.Response} res res
 * @param {Function} next next
 */
async function update(req, res, next) {
    try {
        const _new = await News.findOneAndUpdate({_id: req.body._id}, req.body, {new: true});
        res.json(_new);
    } catch (err) {
        return next(err);
    }
}
