const fs                          = require('fs');
const path                        = require('path');
const {exec}                      = require('child_process');
const {authentication, adminAuth} = require('../middleware/authentication');
const ServiceAuth                 = require('../services/auth');
const rgpdServices                = require('../services/rgpd');
const {Modules}                   = require('../orm/models');
const NSErrors                    = require('../utils/errors/NSErrors');
const appdirname                  = path.dirname(require.main.filename);

module.exports = function (app) {
    app.get('/v2/rgpd/export/:id', authentication, exportData);
    app.post('/v2/rgpd/copyAndAnonymizeDatabase', authentication, adminAuth, copyAndAnonymizeDatabase);
    app.delete('/v2/rgpd/deleteUser/:id', authentication, deleteUserDatas);
    app.get('/v2/rgpd/anonymizeUser/:id', authentication, anonymizeUser);
    app.post('/v2/rgpd/dumpAnonymizedDatabase', authentication, adminAuth, dumpAnonymizedDatabase);
};

/**
 * Fonction retournant un fichier contenant toutes les données d'un utilisateur au format JSON dans un fichier txt
 */
async function exportData(req, res, next) {
    const userVerified = await ServiceAuth.validateUserAuthWithoutPostBody(req.headers.authorization, req.params.id);
    if (userVerified) {
        try {
            // On récupère les infos de l'user, ses commandes et ses factures
            const userData  = await rgpdServices.getUserById(userVerified);
            const orders    = await rgpdServices.getOrdersByUser(userVerified);
            const bills     = await rgpdServices.getBillsByUser(userVerified);
            const carts     = await rgpdServices.getCartsByUser(userVerified);
            const reviews   = await rgpdServices.getReviewsByUser(userVerified);
            let modulesData = '';

            const _modules = await Modules.find({active: true});
            if (_modules.length >= 0) {
                for (const module of _modules) {
                    await new Promise(async (resolve, reject) => {
                        if (fs.existsSync(`${appdirname}/modules/${module.name}/rgpd.js`)) {
                            const rgpd   = require(`${appdirname}/modules/${module.name}/rgpd.js`);
                            const data   = await rgpd.exportData(userData, resolve, reject);
                            modulesData += `\n\n${module.name} :\n`;
                            modulesData += JSON.stringify(data, null, 4).replace(/,\n/g, '\n').replace(/""/g, '\'\'').replace(/["]+/g, '');
                        }
                        resolve();
                    });
                }
            }

            // Traitement des données (mise en forme, suppression du password, isAdmin et __v)
            delete userData.password;
            delete userData.isAdmin;
            delete userData.__v;

            // Création du fichier dynamique pour télécharger
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
 * Création d'une base de données anonymisée
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
 * Dump d'une base de données anonymisée
 */
async function dumpAnonymizedDatabase(req, res, next) {
    try {
        res.set({'content-type': 'application/gzip'});
        await rgpdServices.copyDatabase(async () => {
            let uri = global.envFile.db;
            // Gestion des replicaSet
            if (uri.includes('replicaSet')) {
                uri = uri.replace('?', '_anonymized?');
            } else {
                uri += '_anonymized';
            }
            const pathUpload = require('../utils/server').getUploadDirectory();
            try {
                await dump(`mongodump --uri "${uri}" --gzip --archive=./${pathUpload}/temp/database_dump.gz`);
            } catch (err) {
                console.error(err);
            }
            // Suppression de la bdd copy
            await rgpdServices.dropDatabase();
            // Téléchargement du fichier dump
            return res.download(`./${pathUpload}/temp/database_dump.gz`);
        });
    } catch (error) {
        return next(error);
    }
}

function dump(cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, (error, stdout/* , stderr */) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(stdout);
        });
    });
}

/**
 * Suppression de toutes les données utilisateur
 */
async function deleteUserDatas(req, res, next) {
    let userVerified = null;
    try {
        userVerified = await ServiceAuth.validateUserAuthWithoutPostBody(req.headers.authorization, req.params.id);
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
 * Anonymise les données d'un utilisateur
 */
async function anonymizeUser(req, res, next) {
    let userVerified = null;
    try {
        userVerified = await ServiceAuth.validateUserAuthWithoutPostBody(req.headers.authorization, req.params.id);
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
