const Agenda   = require('agenda');
const axios    = require('axios');
const mongoose = require('mongoose');
const NSErrors = require('../utils/errors/NSErrors');
const utils    = require('../utils/utils');

/** @type {Agenda} */
let agenda;

/**
 * Connect Agenda to mongodb
 */
const initAgendaDB = async () => {
    await new Promise((resolve) => {
        agenda = new Agenda({db: {address: global.envFile.db, options: {useUnifiedTopology: true}}}, async () => {
            let tAgendaJobs;
            try {
                tAgendaJobs = await agenda.jobs({'data.flag': 'system'});
            } catch (error) {
                console.error(error);
            }
            if (!tAgendaJobs) return;

            const tJobsName   = tAgendaJobs.map((job) => job.attrs.name);
            const tJobsSystem = [
                'Sitemap',
                'Segmentation cat',
                'Segmentation picto',
                'Canonicalisation',
                'Remove old carts',
                'Remove pending payment orders',
                'Cohérence produits',
                'Cohérence données',
                'Build stats',
                'Cache requests clean',
                'Clean cache',
                'Remove temp file',
                'Remove previews'
            ];
            for (let i = 0; i < tJobsSystem.length; i++) {
            // Si un job "system" n'existe pas en base de données alors on le crée
                if (!tJobsName.includes(tJobsSystem[i])) {
                    try {
                        if (tJobsSystem[i] === 'Sitemap') {
                            await setJob(undefined, tJobsSystem[0], '0 4 * * 6 *', '/services/seo/genSitemap', 'Génération du sitemap', 'service', 'system', '', true);
                        } else if (tJobsSystem[i] === 'Segmentation cat') {
                            await setJob(undefined, tJobsSystem[1], '0 2 * * * *', '/services/categories/execRules', 'Catégorisation automatique', 'service', 'system', '', true);
                        } else if (tJobsSystem[i] === 'Segmentation picto') {
                            await setJob(undefined, tJobsSystem[2], '0 3 * * * *', '/services/pictos/execRules', 'Pictorisation automatique', 'service', 'system', '', true);
                        } else if (tJobsSystem[i] === 'Canonicalisation') {
                            await setJob(undefined, tJobsSystem[3], '0 4 * * * *', '/services/categories/execCanonical', 'Genère les canonicals de chaque produit', 'service', 'system', '', true);
                        } else if (tJobsSystem[i] === 'Remove old carts') {
                            await setJob(undefined, tJobsSystem[4], '0 */4 * * *', '/services/cart/removeOldCarts', 'Suppression ancien panier', 'service', 'system', '', true);
                        } else if (tJobsSystem[i] === 'Remove pending payment orders') {
                            await setJob(undefined, tJobsSystem[5], '0 */4 * * *', '/services/orders/cancelOrders', 'Annulation des commandes en attente de paiement', 'service', 'system', '', true);
                        } else if (tJobsSystem[i] === 'Cohérence produits') {
                            await setJob(undefined, tJobsSystem[6], '0 1 * * * *', '/services/products/controlAllProducts', 'Script de cohérence des produits', 'service', 'system', '', true);
                        /* } else if (tJobsSystem[i] === 'Cohérence données') {
                        await setJob(undefined, tJobsSystem[7], '0 0 * * * *', '/services/admin/controlAllDatas', 'Script de cohérence des données', "service", 'system', '', true);
                    */ } else if (tJobsSystem[i] === 'Build stats') {
                            await setJob(undefined, tJobsSystem[8], '10 0 * * * *', '/services/stats/buildStats', 'Construction des stats de la veille', 'service', 'system', '', true);
                        } else if (tJobsSystem[i] === 'Cache requests clean') {
                            await setJob(undefined, tJobsSystem[9], '0 5 31 2 *', '/services/cache/flush', 'Vide le cache des requêtes', 'service', 'system', '', true);
                        } else if (tJobsSystem[i] === 'Clean cache') {
                            await setJob(undefined, tJobsSystem[10], '0 0 0 0 0', '/services/cache/cleanCache', 'Vide le cache des images', 'service', 'user', '', true, '');
                        } else if (tJobsSystem[i] === 'Remove temp file') {
                            await setJob(undefined, tJobsSystem[11], '0 1 * * 3', '/services/files/removeTempFile', 'Remove temporary files', 'service', 'user', '', true, '');
                        } else if (tJobsSystem[i] === 'Remove preview') {
                            await setJob(undefined, tJobsSystem[12], '0 0 0 0 0', '/services/devScripts/removePreviews', 'Remove previews', 'service', 'user', '', true, '');
                        }
                    } catch (error) {
                        console.error(error);
                    }
                }
            }

            // On define les jobs dans la collection agendaJob, les jobs ayant disabled = false seront lancés
            for (const job of await agenda.jobs({})) {
                try {
                    await defineJobOnStartUp(job);
                } catch (error) {
                    console.error(error);
                }
            }

            console.log('Scheduler started!');
        });
        agenda.defaultLockLifetime(1000);
        resolve();
    });
};

/**
 * Retourne les jobs
 */
const getJobs = async () => {
    const jobs = await agenda.jobs();
    if (!jobs.length) throw NSErrors.JobNotFound;
    return jobs;
};

/**
 * Return a job by it's name (Used by modules)
 * @param {string} name - document's name
 * @return {Error | Null | Agenda.JobAttributesData}
 */
const getModuleJobByName = async (name) => {
    const jobs = await agenda.jobs({name});
    if (!jobs.length) return null;
    return jobs[0];
};

/**
 * Retourne un job en fonction de son _id
 * @param _id: id du document
 */
const getJobById = async (_id) => {
    const jobs = await agenda.jobs({_id: mongoose.Types.ObjectId(_id)});
    if (!jobs.length) throw NSErrors.JobNotFound;
    return jobs[0];
};

/**
 * Permet de définir un agenda
 * @param name: nom du job
 */
const agendaDefine = async (name) => {
    await new Promise((resolve) => {
        agenda.define(name, async (job, done) => {
            try {
                if (job.attrs.disabled === false) {
                    console.log(`${new Date()} -> Début du job ${job.attrs.name} -> ${job.attrs.data.method} -${job.attrs.data.api} `);
                    await execDefine(job);
                    console.log(`${new Date()} -> Fin du job ${job.attrs.name} -> ${job.attrs.data.method} -${job.attrs.data.api} `);
                }
                done();
            } catch (error) {
                if (error.error && error.error.code === 'job_not_supported_request_method') {
                    // On désactive le job si la requete passé en parametre est mauvaise et on save le resultat de l'erreur
                    error.job.disable();
                    error.job.attrs.data.lastExecutionResult = 'job_not_supported_request_method';
                    await error.job.save();
                    console.error(`job_not_supported_request_method: disabled_job_${error.job.attrs.name}`);
                } else {
                    console.error(`job_api_${error}`);
                }
                done();
            }
        });
        resolve();
    });
};

/**
 * Service permettant de créer ou mettre à jour les données d'un job existant dans la collection agendaJob
 * @param {string} _id : id du cron, si vide alors on crée le job dans agenda job
 * @param {string} name si le name existe dans la collection job alors on lance le cron (on le set)
 * @param {string} repeatInterval frequence d'execution du job
 * @param {string} api api qui doit être appelée en fonction de repeatInterval
 * @param {string} [comment=""] default value : "" - commentaire décrivant la tâche qu'execute le cron
 * @param {string} [method='service'] default value : 'get' - methode get/post/put/delete
 * @param {string} [flag='user'] default value : 'user' - si "system" alors l'utilisateur ne pourra pas l'éditer dans l'admin sinon il pourra
 * @param {string} [lastExecutionResult=""] default value : "" - le resultat du dernier run du cron
 * @param {boolean} [fromServer=false] default value : false - si setJob est executé par le serveur ou par le client (depuis une route)
 * @param {string} [params=''] default value : "" - jobs data params
 */
const setJob = async (_id, name, repeatInterval, api, comment = '', method = 'service', flag = 'user', lastExecutionResult = '', fromServer = false, params = '') => {
    let query;
    if (_id) query = {_id: mongoose.Types.ObjectId(_id)};
    else query = {name};
    const jobs   = await agenda.jobs(query);
    const exists = !!jobs.length;
    if (exists && jobs[0].attrs.failReason) {
        // On réinitialise le failReason
        jobs[0].attrs.failReason = '';
    }
    // définition de la tâche que devra executer l'agenda
    await agendaDefine(name);
    // On met a jour le job
    if (exists) {
        // Permet de calculer le prochain lancement du cron si une erreur survient et que nextRunAt devient null suite a l'erreur
        if (jobs[0].attrs.nextRunAt == null || jobs[0].attrs.repeatInterval !== repeatInterval) {
            jobs[0].repeatEvery(repeatInterval);
            jobs[0].attrs.lastRunAt      = new Date();
            jobs[0].attrs.lastFinishedAt = new Date();
            jobs[0].computeNextRunAt();
        }
        // Si flag == system alors on ne peut modifier que le repeatInterval. On recupére donc les informations du document jobs[0]
        if (jobs[0].attrs.data.flag === 'system') {
            // Si le job n'est pas créé par le serveur alors on autorise pas la modification du job de type system
            // On reprend donc les anciennes valeurs
            if (!fromServer) {
                name    = jobs[0].attrs.name;
                api     = jobs[0].attrs.data.api;
                comment = jobs[0].attrs.data.comment;
                method  = jobs[0].attrs.data.method;
                flag    = jobs[0].attrs.data.flag;
                params  = jobs[0].attrs.data.params;
            } else {
                // Si le serveur créé le job en appelant le service setJob alors on reprend lastExecutionResult
                // car il ne sera pas passé en parametre du setJob, sans ca le lastExecutionResult sera effacé
                lastExecutionResult = jobs[0].attrs.data.lastExecutionResult;
            }
        } else {
            // Si on change le name il faut l'enregistrer dans la BDD avant de faire agenda.every afin de ne pas créer un nouveau document
            jobs[0].attrs.name = name;
        }
        await jobs[0].save();
        // Nous devons a chaque fois recréer le job afin que "every" valide les nouvelles data saisies par l'utilisateur (cf:failReason si le repeatInterval est faux)
        const oAgenda          = await agenda.every(repeatInterval, name, {api, comment, method, flag, lastExecutionResult, params});
        oAgenda.attrs.disabled = jobs[0].attrs.disabled;
        return oAgenda;
    }
    // Lors de la création d'un agenda
    const oAgenda = await agenda.every(repeatInterval, name, {api, comment, method, flag, lastExecutionResult, params});
    // Si il y a une erreur on renvoie l'oAgenda: failReason sera rempli, c'est ce qui nous permet d'afficher une erreur
    // coté front si l'utilisateur entre une mauvaise frequence
    oAgenda.disable();
    const foundJobsSaved = await oAgenda.save();
    // On le désactive le job -> lors de la création (disabled = false dans la base de données)
    // le cron ne se lancera pas automatiquement, l'utilisateur devra le lancer via l'admin
    if (!foundJobsSaved) throw NSErrors.JobAgendaSaveError;
    // Va appeler la fonction on('start')
    await agenda.start();
    return foundJobsSaved;
};

/**
 * Service permettant de créer ou mettre à jour les données d'un job existant dans la collection agendaJob
 * @param job : object : le job en BDD
 */
const defineJobOnStartUp = async (job) => {
    const {name, repeatInterval, disabled, data}                    = job.attrs;
    const {api, comment, method, flag, lastExecutionResult, params} = data;
    // définition de la tâche que devra executer l'agenda
    await agendaDefine(name);
    // création dans la collection agendaJobs du document et ajout dans data des champs api, comment et flag
    const oAgenda = await agenda.every(repeatInterval, name, {api, comment, method, flag, lastExecutionResult, params});
    // Si il y a une erreur on renvoie l'oAgenda: failReason sera rempli, c'est ce qui nous permet d'afficher une erreur
    // coté front si l'utilisateur entre une mauvaise frequence
    if (disabled === false) oAgenda.enable();
    else oAgenda.disable();
    const foundJobsSaved = await oAgenda.save();
    if (!foundJobsSaved) throw NSErrors.JobAgendaSaveError;
    await agenda.start();
    return foundJobsSaved;
};

/**
 * Retourne le job venant d'étre supprimé
 * @param _id : id du job
 */
const deleteJobById = async (_id) => {
    const query = {_id: mongoose.Types.ObjectId(_id)};
    const jobs  = await agenda.jobs(query);
    if (!jobs.length) throw NSErrors.JobNotFound;
    if (jobs[0].attrs.data.flag === 'system') throw NSErrors.JobAgendaCannotDeleteSystem;
    return agenda.cancel(query);
};

/**
 * Retourne le job venant d'étre supprimé /!\ nous pouvons avec cette fonction supprimer des
 * module de type 'system' catr lors de la suppression d'un module contenant un cron, le cron du module doit pouvoir
 * être supprimé
 * @param name : nom du job
 */
const deleteModuleJobByName = async (name) => {
    const query = {name};
    const jobs  = await agenda.jobs(query);
    if (!jobs.length) throw NSErrors.JobNotFound;
    return agenda.cancel(query);
};

/**
 * Fonction permettant d'activer un job se trouvant dans la collection agendaJob et de mettre ce job en actif
 * @param {*} _id : id du job dans la collection agendaJob
 */
const getPlayJob = async (_id) => {
    const foundJobs = await agenda.jobs({_id: mongoose.Types.ObjectId(_id)});
    if (foundJobs.length !== 1) throw NSErrors.JobNotFound;
    // On active le job que l'on a trouvé dans la collection agendaJob
    foundJobs[0].enable();
    // On sauvegarde le job dans la collection agendaJob
    const foundJobsSaved = await foundJobs[0].save();
    if (!foundJobsSaved) throw NSErrors.JobAgendaSaveError;
    return foundJobsSaved;
};

/**
 * Fonction permettant d'activer un job et de le lancer directement
 * @param {string} _id : id du job dans la collection agendaJob
 * @return {Agenda.Job} cron job
 */
const getPlayImmediateJob = async (_id) => {
    const foundJobs = await agenda.jobs({_id: mongoose.Types.ObjectId(_id)});
    try {
        if (foundJobs.length !== 1) throw NSErrors.JobNotFound;
        console.log(`${new Date()} -> Immediate - Début du job ${foundJobs[0].attrs.name} -> ${foundJobs[0].attrs.data.method} -${foundJobs[0].attrs.data.api} `);
        const start                       = new Date();
        foundJobs[0].attrs.lastRunAt      = start;
        foundJobs[0].attrs.lastFinishedAt = start;
        await execDefine(foundJobs[0]);
        console.log(`${new Date()} -> Immediate - Fin du job ${foundJobs[0].attrs.name} -> ${foundJobs[0].attrs.data.method} -${foundJobs[0].attrs.data.api} `);
        return foundJobs[0];
    } catch (err) {
        console.log(`${new Date()} -> Immediate - Fin du job avec erreur ${foundJobs[0].attrs.name} -> ${foundJobs[0].attrs.data.method} -${foundJobs[0].attrs.data.api} `);
        throw err;
    }
};

/**
 * Fonction appelée dans agendaDefine et getPlayImmediateJob
 * @param {Agenda.Job} job cron job
 * @param {Agenda.JobAttributesData} job.attrs
 * @param {Object} job.attrs.data
 * @param {string} job.attrs.api
 * @param {string} job.attrs.params
 */
async function execDefine(job) {
    let api       = job.attrs.data.api;
    const params  = job.attrs.data.params;
    let errorData = null;
    let result;
    // Nous devons appeler directement un service sans passer par une API
    if (api.startsWith('/services') || api.startsWith('/modules')) {
        try {
            if (api.endsWith('/')) api = api.substr(0, api.length - 1);
            const funcName   = api.substr(api.lastIndexOf('/') + 1);
            const modulePath = api.substr(0, api.lastIndexOf('/'));
            try {
                result = await require(`..${modulePath}`)[funcName]();
            } catch (error) {
                // Si le service retourne une erreur alors nous devons l'écrire dans job.attrs.data.lastExecutionResult et
                // le sauvegarder afin d'avoir une erreur persistante coté front
                if (!error.code) result = error;
                if (error.code) result = (error && error.translations && error.translations.fr) ? error.translations.fr : error;
                errorData = error;
            }
            // Permet de recupérer la reponse de la fonction
            job.attrs.data.lastExecutionResult = JSON.stringify(result, null, 2);
        } catch (error) {
            if (error.code !== 'MODULE_NOT_FOUND') throw error;
            throw error;
        }
    } else {
        const {method}   = job.attrs.data;
        const httpMethod = method.toLowerCase();
        if (!['get', 'post'].includes(httpMethod)) {
            const error_method = {job, error: NSErrors.JobNotSupportedRequestMethod};

            throw error_method;
        }
        if (!api.includes('://')) {
            // API est donc de format /api/monapi
            // On supprimer le '/'
            if (api.startsWith('/')) api = api.substr(1);
            api = global.envConfig.environment.appUrl + api;
        }
        if (!utils.IsJsonString(params)) {
            throw new Error(`Invalid JSON params for job ${job.attrs.name}`);
        }
        result = await axios[httpMethod](api, JSON.parse(params));
        // Permet de recupérer la réponse de l'api
        job.attrs.data.lastExecutionResult = JSON.stringify(result.data);
    }
    await job.save();
    if (errorData !== null) throw errorData;
}

/**
 * Fonction permettant de désactiver l'execution d'un job se trouvant dans la collection agendaJob
 * @param {string} _id: id du job dans la collection agendaJob
 */
const getPauseJob = async (_id) => {
    const foundJobs = await agenda.jobs({_id: mongoose.Types.ObjectId(_id)});
    if (foundJobs.length !== 1) throw NSErrors.JobNotFound;
    // On désactive le job que l'on a trouvé dans la collection agendaJob
    foundJobs[0].disable();
    const foundJobsSaved = await foundJobs[0].save();
    if (!foundJobsSaved) throw NSErrors.JobAgendaSaveError;
    return foundJobsSaved;
};

module.exports = {
    initAgendaDB,
    getJobs,
    getModuleJobByName,
    getJobById,
    setJob,
    defineJobOnStartUp,
    deleteJobById,
    deleteModuleJobByName,
    getPlayJob,
    getPlayImmediateJob,
    getPauseJob
};