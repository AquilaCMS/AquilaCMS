/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const path                    = require('path');
const url                     = require('url');
const {fs}                    = require('aql-utils');
const ServiceContacts         = require('../services/contacts');
const {getUploadDirectory}    = require('../utils/server');
const {adminAuthRight}        = require('../middleware/authentication');
const {modules: modulesUtils} = require('../utils');
const {multerUpload}          = require('../middleware/multer');

module.exports = function (app) {
    app.post('/v2/contacts', adminAuthRight('contacts'), getContacts);
    app.delete('/v2/contact/:id', adminAuthRight('contacts'), deleteContact);
    app.post('/v2/contact/:mode', multerUpload.any(), setContact);
};

/**
 * Retrieve all contact (or filter via the PostBody)
 */
async function getContacts(req, res, next) {
    try {
        return res.json(await ServiceContacts.getContacts(req.body));
    } catch (error) {
        return next(error);
    }
}

/**
 * Delete a contact
 */
async function deleteContact(req, res, next) {
    try {
        return res.json(await ServiceContacts.deleteContact(req.params.id));
    } catch (error) {
        return next(error);
    }
}

/**
 * Creation / edition of a contact
 */
async function setContact(req, res, next) {
    try {
        let finalPath    = '';
        const pathUpload = getUploadDirectory();
        const _body      = JSON.parse(JSON.stringify(req.body));
        _body.filesPath  = [];
        if (req.files) {
            for (let i = 0; i < req.files.length; i++) {
                const file      = req.files[i];
                const tmp_path  = path.resolve(file.path);
                const extension = path.extname(file.originalname);

                finalPath = 'mails/';

                let target_path_full = `${finalPath}${new Date().getTime()}_${file.originalname}`;

                target_path_full = await modulesUtils.modulesLoadFunctions('uploadFile', {
                    target_path : finalPath,
                    target_path_full,
                    file,
                    extension,
                    full        : true
                }, async () => {
                    target_path_full = path.resolve(pathUpload, target_path_full);

                    try {
                        await fs.copyRecursive(tmp_path, target_path_full);
                        await fs.deleteRecursive(tmp_path);
                    } catch (err) {
                        return next(err);
                    }

                    target_path_full   = target_path_full.replace(path.resolve(global.aquila.appRoot, pathUpload), '');
                    _body.filesPath[i] = url.resolve(global.aquila.envConfig.environment.appUrl, target_path_full);
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