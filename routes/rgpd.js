/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const path                        = require('path');
const {fs}                        = require('aql-utils');
const {authentication, adminAuth} = require('../middleware/authentication');
const ServiceAuth                 = require('../services/auth');
const rgpdServices                = require('../services/rgpd');
const {Modules}                   = require('../orm/models');
const NSErrors                    = require('../utils/errors/NSErrors');
const appdirname                  = path.dirname(require.main.filename);

module.exports = function (app) {
    app.get('/v2/rgpd/export/:id', authentication, exportData);
    app.post('/v2/rgpd/copyAndAnonymizeDatabase', adminAuth, copyAndAnonymizeDatabase);
    app.delete('/v2/rgpd/deleteUser/:id', authentication, deleteUserDatas);
    app.get('/v2/rgpd/anonymizeUser/:id', authentication, anonymizeUser);
    app.post('/v2/rgpd/dumpAnonymizedDatabase', adminAuth, dumpAnonymizedDatabase);
};

/**
 * Function returning a file containing all the data of a user in JSON format in a txt file
 */
async function exportData(req, res, next) {
    const userVerified = await ServiceAuth.validateUserAuthWithoutPostBody(req.info, req.params.id);
    if (userVerified) {
        try {
            // We retrieve the user's information, their orders and invoices
            const userData  = await rgpdServices.getUserById(userVerified);
            const orders    = await rgpdServices.getOrdersByUser(userVerified);
            const bills     = await rgpdServices.getBillsByUser(userVerified);
            const carts     = await rgpdServices.getCartsByUser(userVerified);
            const reviews   = await rgpdServices.getReviewsByUser(userVerified);
            let modulesData = '';

            const _modules = await Modules.find({active: true});
            for (const module of _modules) {
                await new Promise(async (resolve, reject) => {
                    if (await fs.hasAccess(`${appdirname}/modules/${module.name}/rgpd.js`)) {
                        const rgpd   = require(`${appdirname}/modules/${module.name}/rgpd.js`);
                        const data   = await rgpd.exportData(userData, resolve, reject);
                        modulesData += `\n\n${module.name} :\n`;
                        modulesData += JSON.stringify(data, null, 4).replace(/,\n/g, '\n').replace(/""/g, '\'\'').replace(/["]+/g, '');
                    }
                    resolve();
                });
            }

            // Data processing (formatting, deletion of password, isAdmin and __v)
            delete userData.password;
            delete userData.isAdmin;
            delete userData.__v;

            // Creation of dynamic file to download
            res.setHeader('Content-disposition', 'attachment; filename=export_data.txt');
            res.setHeader('Content-type', 'text/plain');
            res.charset = 'UTF-8';
            res.write('Utilisateur :\n');
            res.write(JSON.stringify(userData, null, 4).replace(/,\n/g, '\n').replace(/""/g, '\'\'').replace(/["]+/g, ''));
            res.write('\n\nCommandes :\n');
            res.write(JSON.stringify(orders, null, 4).replace(/,\n/g, '\n').replace(/""/g, '\'\'').replace(/["]+/g, ''));
            res.write('\n\nFactures :\n');
            res.write(JSON.stringify(bills, null, 4).replace(/,\n/g, '\n').replace(/""/g, '\'\'').replace(/["]+/g, ''));
            res.write('\n\nPaniers :\n');
            res.write(JSON.stringify(carts, null, 4).replace(/,\n/g, '\n').replace(/""/g, '\'\'').replace(/["]+/g, ''));
            res.write('\n\nAvis :\n');
            res.write(JSON.stringify(reviews, null, 4).replace(/,\n/g, '\n').replace(/""/g, '\'\'').replace(/["]+/g, ''));
            res.write(modulesData);
            return res.end();
        } catch (error) {
            return next(error);
        }
    }
    throw NSErrors.AccessUnauthorized;
}

/**
 * Creation of an anonymized database
 */
async function copyAndAnonymizeDatabase(req, res, next) {
    try {
        await rgpdServices.copyDatabase();
        return res.end();
    } catch (error) {
        return next(error);
    }
}

/**
 * Dump an anonymized database
 */
async function dumpAnonymizedDatabase(req, res, next) {
    try {
        const result = await rgpdServices.dumpAnonymizedDatabase(req.body);

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-disposition', 'attachment; filename=medias.zip');
        res.write(result, 'binary');
        res.end();
    } catch (error) {
        return next(error);
    }
}

/**
 * Delete all user data
 */
async function deleteUserDatas(req, res, next) {
    let userVerified = null;
    try {
        userVerified = await ServiceAuth.validateUserAuthWithoutPostBody(req.info, req.params.id);
    } catch (err) {
        throw NSErrors.AccessUnauthorized;
    }

    if (userVerified) {
        try {
            await rgpdServices.deleteUserDatas(userVerified);
            return res.send('success');
        } catch (error) {
            return next(error);
        }
    }
}

/**
 * Anonymizes a user's data
 */
async function anonymizeUser(req, res, next) {
    let userVerified = null;
    try {
        userVerified = await ServiceAuth.validateUserAuthWithoutPostBody(req.info, req.params.id);
    } catch (err) {
        throw NSErrors.AccessUnauthorized;
    }

    if (userVerified) {
        try {
            await rgpdServices.anonymizeUserDatas(userVerified);
            return res.send('success');
        } catch (error) {
            return next(error);
        }
    }
}
