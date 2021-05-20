/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const path                        = require('path');
const {authentication, adminAuth} = require('../middleware/authentication');
const mediasServices              = require('../services/medias');
const NSErrors                    = require('../utils/errors/NSErrors');

module.exports = function (app) {
    app.post('/v2/medias', authentication, adminAuth, listMedias);
    app.post('/v2/media', getMedia);
    app.put('/v2/media', authentication, adminAuth, saveMedia);
    app.delete('/v2/media/:_id', authentication, adminAuth, removeMedia);
    app.post('/v2/medias/upload', authentication, adminAuth, uploadFiles);
    app.get('/v2/medias/groups', getMediasGroups);
    app.get('/v2/medias/groupsImg', getMediasGroupsImg);
    app.get('/v2/medias/download/documents', authentication, adminAuth, downloadAllDocuments);
    app.post('/v2/medias/download/documents', authentication, adminAuth, uploadAllDocuments);
    app.post('/v2/medias/download/medias', authentication, adminAuth, uploadAllMedias);
};

/**
 * Route list medias V2
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 */
async function listMedias(req, res, next) {
    try {
        const result = await mediasServices.listMedias(req.body.PostBody);
        return res.json(result);
    } catch (error) {
        next(error);
    }
}

/**
 * Route get single media V2
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 */
async function getMedia(req, res, next) {
    try {
        const result = await mediasServices.getMedia(req.body.PostBody);
        return res.json(result);
    } catch (error) {
        next(error);
    }
}

/**
 * Route save media V2
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 */
async function saveMedia(req, res, next) {
    try {
        const result = await mediasServices.saveMedia(req.body.media);
        return res.json(result);
    } catch (error) {
        next(error);
    }
}

/**
 * Route remove media V2
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 */
async function removeMedia(req, res, next) {
    try {
        const result = await mediasServices.removeMedia(req.params._id);
        return res.json(result);
    } catch (error) {
        next(error);
    }
}

async function uploadFiles(req, res, next) {
    try {
        const {body, files} = req;
        return res.json(await mediasServices.uploadFiles(body, files));
    } catch (err) {
        return next(err);
    }
}

/**
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 */
async function getMediasGroups(req, res, next) {
    try {
        const result = await mediasServices.getMediasGroups(req.query.query);
        return res.json(result);
    } catch (error) {
        next(error);
    }
}

/**
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 */
async function getMediasGroupsImg(req, res, next) {
    try {
        const filter = {
            $or : [{extension: '.jpg'}, {extension: '.png'}]
        };
        const result = await mediasServices.getMediasGroups(req.query.query, filter);
        return res.json(result);
    } catch (error) {
        next(error);
    }
}

/**
 * @description Upload zip with all medias
 */
async function uploadAllMedias(req, res, next) {
    if (path.extname(req.files[0].originalname) === '.zip') {
        try {
            mediasServices.uploadAllMedias(req.files[0], req.body.insertDB === 'true');
            res.json({name: req.files[0].originalname});
        } catch (exc) {
            next(exc);
        }
    } else {
        next(NSErrors.InvalidFile);
    }
}

/* **************** Documents **************** *

/**
 * Allows you to download a zip containing all the "upload" folder
 */
async function downloadAllDocuments(req, res, next) {
    try {
        const result = await mediasServices.downloadAllDocuments(req.body);

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-disposition', 'attachment; filename=medias.zip');
        res.write(result, 'binary');
        res.end();
    } catch (error) {
        return next(error);
    }
}
/**
 * Allows you to upload a zip containing all the "upload" folder
 */
async function uploadAllDocuments(req, res, next) {
    if (path.extname(req.files[0].originalname) === '.zip') {
        try {
            mediasServices.uploadAllDocuments(req.files[0]);
            res.json({name: req.files[0].originalname});
        } catch (exc) {
            next(exc);
        }
    } else {
        next(NSErrors.InvalidFile);
    }
}
