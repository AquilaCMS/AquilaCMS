/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const URL                   = require('url');
const {adminAuthRight}      = require('../middleware/authentication');
const {securityForceFilter} = require('../middleware/security');
const servicesNews          = require('../services/news');
const ServicesPreview       = require('../services/preview');
const {NewsPreview}         = require('../orm/models');

module.exports = function (app) {
    app.post('/v2/site/news', securityForceFilter([{isVisible: true}]), getNews);
    app.post('/v2/site/new', securityForceFilter([{isVisible: true}]), getNew);
    app.post('/v2/site/news/tags', securityForceFilter([{isVisible: true}]), getNewsTags);
    app.put('/v2/site/new', adminAuthRight('articles'), saveNew);
    app.post('/v2/site/preview', adminAuthRight('articles'), previewNew);
    app.delete('/v2/site/new/:_id', adminAuthRight('articles'), deleteNew);
};

/**
 * POST /api/v2/site/news
 * @summary News list
 */
async function getNews(req, res, next) {
    try {
        const {PostBody} = req.body;
        res.json(await servicesNews.getNews(PostBody));
    } catch (err) {
        return next(err);
    }
}

/**
 * POST /api/v2/site/new
 * @summary News details
 */
async function getNew(req, res, next) {
    try {
        const {PostBody} = req.body;

        if (req.query.preview) {
            res.json(await ServicesPreview.getNewPreviewById(req.query.preview));
        } else {
            res.json(await servicesNews.getNew(PostBody));
        }
    } catch (err) {
        return next(err);
    }
}

/**
 * POST /api/v2/site/getNewsTags
 * @summary Get news tags
 */
async function getNewsTags(req, res, next) {
    try {
        const {PostBody} = req.body;
        const result     = await servicesNews.getNewsTags(PostBody.filter.tags, PostBody.filter.lang);
        return res.json({datas: result});
    } catch (error) {
        return next(error);
    }
}

/**
 * PUT /api/v2/site/new
 * @summary Set new
 */
async function saveNew(req, res, next) {
    try {
        await ServicesPreview.deleteNewPreview(req.body.code);
        if (req.body.pervImage) await servicesNews.deleteImage(req.body.pervImage);
        return res.json(await servicesNews.saveNew(req.body));
    } catch (err) {
        return next(err);
    }
}

/**
 * DELETE /api/v2/site/new/{_id}
 * @summary Delete new
 */
async function deleteNew(req, res, next) {
    try {
        await servicesNews.deleteNew(req.params._id);
        return res.status(200).end();
    } catch (err) {
        return next(err);
    }
}

async function previewNew(req, res, next) {
    try {
        let preview  = {};
        const exists = await NewsPreview.findOne({_id: req.body._id});
        if (exists) {
            preview = await NewsPreview.findOneAndUpdate({_id: req.body._id}, req.body, {new: true});
        } else {
            preview = await NewsPreview.create(req.body);
        }
        const _config = (await require('../orm/models/configuration').find({}))[0];
        if (req.body.lang) {
            return res.json({url: URL.resolve(_config.environment.appUrl, `/${req.body.lang}/blog/${preview.translation[req.body.lang].slug}?preview=${preview._id}`)});
        }
        const lang = await require('../orm/models/languages').findOne({defaultLanguage: true});
        return res.json({url: URL.resolve(_config.environment.appUrl, `/blog/${preview.translation[lang ? lang.code : Object.keys(preview.translation)[0]].slug}?preview=${preview._id}`)});
    } catch (err) {
        next(err);
    }
}
