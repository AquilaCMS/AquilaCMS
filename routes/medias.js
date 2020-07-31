const path                        = require('path');
const {authentication, adminAuth} = require('../middleware/authentication');
const {middlewareServer}          = require('../middleware');
const mediasServices              = require('../services/medias');
const utils                       = require('../utils/utils');
const mediasUtils                 = require('../utils/medias');
const NSErrors                    = require('../utils/errors/NSErrors');
const {Medias}                    = require('../orm/models');

module.exports = function (app) {
    app.post('/v2/medias', authentication, adminAuth, listMedias);
    app.post('/v2/media', getMedia);
    app.put('/v2/media', authentication, adminAuth, saveMedia);
    app.delete('/v2/media/:_id', authentication, adminAuth, removeMedia);
    app.post('/v2/medias/upload', uploadFiles);
    app.get('/v2/medias/groups', getMediasGroups);
    app.get('/v2/medias/download/documents', authentication, adminAuth, downloadAllDocuments);
    app.post('/v2/medias/download/documents', authentication, adminAuth, uploadAllDocuments);
    app.post('/v2/medias/download/medias', authentication, adminAuth, uploadAllMedias);

    // Deprecated
    app.get('/medias', middlewareServer.deprecatedRoute, list);
    app.post('/medias', middlewareServer.deprecatedRoute, save);
    app.delete('/medias/:id', middlewareServer.deprecatedRoute, remove);
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
        const result = await mediasServices.getMediasGroups();
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
 * Permet de télécharger un zip contenant tous le dossier "upload"
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
 * Permet d'uploader un zip contenant tous le dossier "upload"
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

//= =======================================================================
//= ============================= Deprecated ==============================
//= =======================================================================

/**
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 * @deprecated
 */
async function list(req, res, next) {
    try {
        const medias = await Medias.find(null);
        res.json(medias);
    } catch (err) {
        return next(err);
    }
}

/**
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 * @deprecated
 */
async function save(req, res, next) {
    const data = req.body;
    try {
        if (data.link && data.link !== '') {
            const media = await Medias.findOneAndUpdate({link: data.link}, data);
            res.json(media);
        } else {
            data.name = utils.slugify(data.name);
            const media = await Medias.create(data);
            res.json(media);
        }
    } catch (err) {
        return next(err);
    }
}

/**
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 * @deprecated
 */
const remove = async (req, res, next) => {
    try {
        const media = await Medias.findById(req.params.id);
        if (!media) throw NSErrors.MediaNotFound;

        if (media.link) {
            await mediasUtils.deleteFile(media.link);
            require('../services/cache').deleteCacheImage('medias', {filename: path.basename(media.link).split('.')[0]});
        }
        await media.remove();
        return res.end();
    } catch (err) {
        return next(err);
    }
};
