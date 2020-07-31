const path            = require('path');
const url             = require('url');
const ServiceContacts = require('../services/contacts');
const {
    authentication,
    adminAuth
}                     = require('../middleware/authentication');
const {
    fsp,
    captchaValidation,
    modules: modulesUtils
}                     = require('../utils');

module.exports = function (app) {
    app.post('/v2/contacts', authentication, adminAuth, getContacts);
    app.post('/v2/contact/:mode', captchaValidation, setContact);
};

/**
 * Récupèration de toutes les contact (ou filtrer via le PostBody)
 */
async function getContacts(req, res, next) {
    try {
        return res.json(await ServiceContacts.getContacts(req.body));
    } catch (error) {
        return next(error);
    }
}

/**
 * Création/edition d'un contact
 */
async function setContact(req, res, next) {
    try {
        let finalPath    = '';
        const pathUpload = require('../utils/server').getUploadDirectory();
        const _body      = JSON.parse(JSON.stringify(req.body));
        _body.filesPath  = [];
        if (req.files) {
            const pathFinal = `${pathUpload}/`;

            for (let i = 0; i < req.files.length; i++) {
                const file      = req.files[i];
                const tmp_path  = file.path;
                const extension = path.extname(file.originalname);

                finalPath = 'mails/';

                let target_path_full = path.join(finalPath, `${new Date().getTime()}_${file.originalname}`);

                target_path_full = await modulesUtils.modulesLoadFunctions('uploadFile', {
                    target_path : finalPath,
                    target_path_full,
                    file,
                    extension,
                    full        : true
                }, async () => {
                    target_path_full = path.join(pathFinal, target_path_full);

                    try {
                        await fsp.copyRecursiveSync(tmp_path, target_path_full);
                        await fsp.deleteRecursiveSync(tmp_path);
                    } catch (err) {
                        return next(err);
                    }

                    target_path_full   = target_path_full.replace(pathFinal, '');
                    _body.filesPath[i] = url.resolve(global.envConfig.environment.appUrl, target_path_full.replace(pathFinal.replace('./', ''), ''));
                    return _body.filesPath[i];
                });

                if (finalPath !== '') {
                    _body.filesPath[i] = target_path_full.split(pathUpload)[1] || target_path_full.split(pathUpload)[0];
                }
            }
        } else {
            if (finalPath !== '') {
                _body.filesPath[0] = finalPath.split(pathUpload)[1];
            }
        }
        return res.json(await ServiceContacts.setContact(_body, req.params.mode));
    } catch (error) {
        return next(error);
    }
}