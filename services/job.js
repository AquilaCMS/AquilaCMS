/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const Agenda       = require('agenda');
const axios        = require('axios');
const {fork}       = require('child_process');
const mongoose     = require('mongoose');
const moment       = require('moment');
const NSErrors     = require('../utils/errors/NSErrors');
const utils        = require('../utils/utils');
const errorMessage = require('../utils/translate/errors');

/** @type {Agenda} */
let agenda;

/**
 * Function to extract data from job
 * @param {Agenda.Job} job
 * @return {{typeApi: string, api: string, params: string, onMainThread: boolean, funcName: string, modulePath: string, httpMethod: string}}
 */
const extractDataFromJob = (job) => {
    let httpMethod;
    let typeApi        = 'service';
    let api            = job.attrs.data.api;
    const params       = job.attrs.data.params;
    const onMainThread = job.attrs.data.onMainThread !== false;
    const funcName     = api.substr(api.lastIndexOf('/') + 1);
    const modulePath   = api.substr(0, api.lastIndexOf('/'));

    if (api.startsWith('/services') || api.startsWith('/modules')) {
        if (api.endsWith('/')) api = api.substr(0, api.length - 1);
    } else {
        typeApi        = 'api';
        const {method} = job.attrs.data;
        httpMethod     = method.toLowerCase();
        if (!['get', 'post'].includes(httpMethod)) {
            const error_method = {job, error: NSErrors.JobNotSupportedRequestMethod};
            throw error_method;
        }
        if (!api.includes('://')) {
            if (api.startsWith('/')) api = api.substr(1);
            api = global.aquila.envConfig.environment.appUrl + api;
        }
        if (params && !utils.isJsonString(params)) {
            throw new Error(`Invalid JSON params for job ${job.attrs.name}`);
        }
    }

    return {typeApi, api, params, onMainThread, funcName, modulePath, httpMethod};
};

/**
 * Connect Agenda to mongodb
 */
const initAgendaDB = async () => {
    console.log('Scheduler init : In progress...');
    await new Promise((resolve) => {
        agenda = new Agenda({db: {address: global.aquila.envFile.db, options: {useUnifiedTopology: true}}}, async () => {
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
                'Remove previews',
                'Mail to pending carts',
                'Delete orders\' failed payments',
                'RGPD bills',
                'RGPD users',
                'Jobs checks'
            ];
            for (let i = 0; i < tJobsSystem.length; i++) {
                // If a "system" job does not exist in the database then it is created
                if (!tJobsName.includes(tJobsSystem[i])) {
                    try {
                        if (tJobsSystem[i] === 'Sitemap') {
                            await setJob(undefined, tJobsSystem[0], '0 4 * * 6 *', '/services/seo/genSitemap', {en: 'Sitemap generations', fr: 'Génération du sitemap'}, 'service', 'system', '', true, '', false);
                        } else if (tJobsSystem[i] === 'Segmentation cat') {
                            await setJob(undefined, tJobsSystem[1], '0 2 * * * *', '/services/categories/execRules', {fr: 'Catégorisation automatique', en: 'Automatic categorization'}, 'service', 'system', '', true, '', false);
                        } else if (tJobsSystem[i] === 'Segmentation picto') {
                            await setJob(undefined, tJobsSystem[2], '0 3 * * * *', '/services/pictos/execRules', {fr: 'Segmentation automatique des pictogrammes', en: 'Automatic pictogram segmentation'}, 'service', 'system', '', true, '', false);
                        } else if (tJobsSystem[i] === 'Canonicalisation') {
                            await setJob(undefined, tJobsSystem[3], '0 4 * * * *', '/services/categories/execCanonical', {fr: 'Génère les canonicals de chaque produit', en: 'Generates the canonicals of each product'}, 'service', 'system', '', true, '', false);
                        } else if (tJobsSystem[i] === 'Remove old carts') {
                            await setJob(undefined, tJobsSystem[4], '0 */4 * * *', '/services/cart/removeOldCarts', {fr: 'Suppression des anciens panier', en: 'Deleting old carts'}, 'service', 'system', '', true, '', false);
                        } else if (tJobsSystem[i] === 'Remove pending payment orders') {
                            await setJob(undefined, tJobsSystem[5], '0 */4 * * *', '/services/orders/cancelOrders', {fr: 'Annulation des commandes en attente de paiement', en: 'Cancellation of orders awaiting payment'}, 'service', 'system', '', true, '', false);
                        } else if (tJobsSystem[i] === 'Cohérence produits') {
                            await setJob(undefined, tJobsSystem[6], '0 1 1 * *', '/services/products/controlAllProducts', {fr: 'Script de cohérence des produits', en: 'Product consistency script'}, 'service', 'system', '', true, '', false);
                        } else if (tJobsSystem[i] === 'Cohérence données') {
                            await setJob(undefined, tJobsSystem[7], '0 0 * * * *', '/services/admin/controlAllDatas', 'Script de cohérence des données', 'service', 'system', '', true, '', false);
                        } else if (tJobsSystem[i] === 'Build stats') {
                            await setJob(undefined, tJobsSystem[8], '10 0 * * * *', '/services/stats/buildStats', {fr: 'Construction des statistiques de la veille', en: 'Construction of the statistics of the previous day'}, 'service', 'system', '', true, '', false);
                        } else if (tJobsSystem[i] === 'Cache requests clean') {
                            await setJob(undefined, tJobsSystem[9], '0 */6 * * *', '/services/cache/flush', {fr: 'Vide le cache des requêtes', en: 'Clears the requests cache'}, 'service', 'system', '', true, '', true);
                        } else if (tJobsSystem[i] === 'Clean cache') {
                            await setJob(undefined, tJobsSystem[10], '0 */12 * * *', '/services/cache/cleanCache', {fr: 'Vide le cache des images', en: 'Clears the images cache'}, 'service', 'system', '', true, '', true);
                        } else if (tJobsSystem[i] === 'Remove temp file') {
                            await setJob(undefined, tJobsSystem[11], '0 1 * * 3', '/services/files/removeTempFile', {fr: 'Suppression des fichiers temporaires', en: 'Remove temporary files'}, 'service', 'system', '', true, '', false);
                        } else if (tJobsSystem[i] === 'Remove previews') {
                            await setJob(undefined, tJobsSystem[12], '0 */4 * * *', '/services/preview/removePreviews', {fr: 'Suppression des aperçus', en: 'Remove previews'}, 'service', 'system', '', true, '', false);
                        } else if (tJobsSystem[i] === 'Mail to pending carts') {
                            await setJob(undefined, tJobsSystem[13], '0 0 4 * * *', '/services/cart/mailPendingCarts', {fr: 'Relancer par mail les paniers en attente', en: 'Send mail to pending carts'}, 'service', 'system', '', true, '', true);
                        } else if (tJobsSystem[i] === 'Delete orders\' failed payments') {
                            await setJob(undefined, tJobsSystem[14], '0 */4 * * *', '/services/payments/deleteFailedPayment', {
                                fr : 'Supprime les anciens paiements echoués des anciennes commandes',
                                en : 'Remove failed payments from old orders'
                            }, 'service', 'system', '', true, '', false);
                        } else if (tJobsSystem[i] === 'RGPD bills') {
                            await setJob(undefined, tJobsSystem[15], '* * 1 * * *', '/services/rgpd/checkDateBills', {fr: 'Anonymise les factures de plus de 10 ans pour le RGPD', en: 'Anonymizes bills older than 10 years for RGPD'}, 'service', 'system', '', true, '', false);
                        } else if (tJobsSystem[i] === 'RGPD users') {
                            await setJob(undefined, tJobsSystem[16], '* * 1 * * *', '/services/rgpd/checkLastConnexion', {fr: 'Anonymise les utilisateurs inactifs de plus de 3 ans pour le RGPD', en: 'Anonymizes inactive users older than 3 years for RGPD'}, 'service', 'system', '', true, '', false);
                        } else if (tJobsSystem[i] === 'Jobs checks') {
                            await setJob(undefined, tJobsSystem[17], '0 0 1 * * *', '/services/job/checkJobsExecution', {fr: 'Verifie l\'execution des crons importants', en: 'Check execution result of important crons'}, 'service', 'system', '', true, '', true);
                        }
                    } catch (error) {
                        console.error(error);
                    }
                }
            }

            // Jobs are defined in the Job agenda collection, jobs with disabled = false will be launched
            for (const job of await agenda.jobs({})) {
                try {
                    await defineJobOnStartUp(job);
                    if (job.attrs.name === 'Jobs checks') {
                        await getPlayJob(job.attrs._id);
                    }
                } catch (error) {
                    console.error(error);
                }
            }

            console.log('Scheduler init : Done\x1b[32m \u2713 \x1b[0m');
        });
        agenda.defaultLockLifetime(1000);
        resolve();
    });
};

/**
 * Return jobs
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
 * Returns a job based on its _id
 * @param _id: document id
 */
const getJobById = async (_id) => {
    const jobs = await agenda.jobs({_id: mongoose.Types.ObjectId(_id)});
    if (!jobs.length) throw NSErrors.JobNotFound;
    return jobs[0];
};

/**
 * Allows you to define an agenda
 * @param name: job name
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
                    // Disabled the job if the request is bad and we save the result of the error
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
 * Service used to create or update the data of an existing job in the agendaJob collection
 * @param {string} _id : id of the cron, if empty then we create the job in agenda
 * @param {string} name if the name exists in the job collection then we run the cron (we set it)
 * @param {string} repeatInterval job execution frequency
 * @param {string} api api which must be called according to repeatInterval
 * @param {string} [comment=""] default value: "" - comment describing the job's task
 * @param {string} [method='service'] default value : 'get' - methode get/post/put/delete
 * @param {string} [flag='user'] default value : 'user' - if "system" then the user will not be able to edit
 * @param {string} [lastExecutionResult=""] default value : "" - the result of the last cron run
 * @param {boolean} [fromServer=false] default value : false - if setJob is executed by the server or by the client (from a route)
 * @param {string} [params=''] default value : "" - jobs data params
 * @param {boolean} [onMainThread=true] default value : true - if setJob is executed in the main thread or in a child thread
 */
const setJob = async (_id, name, repeatInterval, api, comment = '', method = 'service', flag = 'user', lastExecutionResult = '', fromServer = false, params = '', onMainThread = true, isImportant = undefined) => {
    let query;
    if (_id) query = {_id: mongoose.Types.ObjectId(_id)};
    else query = {name};
    const jobs   = await agenda.jobs(query);
    const exists = !!jobs.length;
    if (exists && jobs[0].attrs.failReason) {
        // We reset the failReason
        jobs[0].attrs.failReason = '';
    }
    // definition of the task to be performed by the agenda
    await agendaDefine(name);

    const datas = {
        isImportant : isImportant === undefined && jobs[0] ? jobs[0].attrs.data.isImportant : isImportant
    };
    // We update the job
    if (exists) {
        // Allows you to calculate the next cron launch if an error occurs and nextRunAt becomes null following the error
        if (jobs[0].attrs.nextRunAt == null || jobs[0].attrs.repeatInterval !== repeatInterval) {
            jobs[0].repeatEvery(repeatInterval);
            jobs[0].attrs.lastRunAt      = new Date();
            jobs[0].attrs.lastFinishedAt = new Date();
            jobs[0].computeNextRunAt();
        }
        // If flag == system then we can only modify the repeatInterval. We get the information of the document jobs [0]
        if (jobs[0].attrs.data.flag === 'system') {
            // If the job is not created by the server then the modification of the system type job is not authorized
            // Take the old values
            if (!fromServer) {
                datas.name         = jobs[0].attrs.name;
                datas.api          = jobs[0].attrs.data.api;
                datas.comment      = jobs[0].attrs.data.comment;
                datas.method       = jobs[0].attrs.data.method;
                datas.flag         = jobs[0].attrs.data.flag;
                datas.params       = jobs[0].attrs.data.params;
                datas.onMainThread = jobs[0].attrs.data.onMainThread;
            } else {
                // If the server creates the job by calling the setJob service then we take lastExecutionResult
                // because it will not be passed as a parameter of the setJob, otherwise the lastExecutionResult will be deleted
                lastExecutionResult = jobs[0].attrs.data.lastExecutionResult;
            }
        } else {
            // If we change the name, it must be saved in the database before doing agenda.every so as not to create a new document
            jobs[0].attrs.name = name;
        }
        await jobs[0].save();
        // We must each time recreate the job so that "every" validates the new data entered by the user (cf: failReason if the repeatInterval is false)
        datas.api                 = api;
        datas.comment             = comment;
        datas.method              = method;
        datas.flag                = flag;
        datas.lastExecutionResult = lastExecutionResult;
        datas.params              = params;
        datas.onMainThread        = onMainThread;

        const oAgenda          = await agenda.every(repeatInterval, name, datas);
        oAgenda.attrs.disabled = jobs[0].attrs.disabled;
        return oAgenda;
    }
    // When creating an agenda
    const oAgenda = await agenda.every(repeatInterval, name, datas);
    // If there is an error we return the oAgenda: failReason will be filled, this is what allows us to display an error
    // on the front side if the user enters the wrong frequency
    oAgenda.disable();
    const foundJobsSaved = await oAgenda.save();
    // We deactivate the job -> during creation (disabled = false in the database)
    // the cron will not launch automatically, the user will have to launch it via the admin
    if (!foundJobsSaved) throw NSErrors.JobAgendaSaveError;
    // Call the on('start') function
    await agenda.start();
    return foundJobsSaved;
};

/**
 * Service used to create or update the data of an existing job in the agendaJob collection
 * @param job : object: the job in DB
 */
const defineJobOnStartUp = async (job) => {
    const {name, repeatInterval, disabled, data}                                               = job.attrs;
    const {api, comment, method, flag, lastExecutionResult, params, onMainThread, isImportant} = data;
    // definition of the task to be performed by the agenda
    await agendaDefine(name);
    // Create in the agendaJobs collection and add field (data, comment and flag)
    const oAgenda = await agenda.every(repeatInterval, name, {api, comment, method, flag, lastExecutionResult, params, onMainThread, isImportant});

    // If there is an error we return the oAgenda: failReason will be filled, this is what allows us to display an error
    // on the front side if the user set the wrong frequency
    if (disabled === false) oAgenda.enable();
    else oAgenda.disable();
    const foundJobsSaved = await oAgenda.save();
    if (!foundJobsSaved) throw NSErrors.JobAgendaSaveError;
    await agenda.start();
    return foundJobsSaved;
};

/**
 * Return the job just deleted
 * @param _id : job id
 */
const deleteJobById = async (_id) => {
    const query = {_id: mongoose.Types.ObjectId(_id)};
    const jobs  = await agenda.jobs(query);
    if (!jobs.length) throw NSErrors.JobNotFound;
    if (jobs[0].attrs.data.flag === 'system') throw NSErrors.JobAgendaCannotDeleteSystem;
    return agenda.cancel(query);
};

/**
 * Return the job just deleted /!\ We can with delete module of type 'system'
 * catr when deleting a module containing a cron, the cron of the module must be able to be deleted
 * @param name : job name
 */
const deleteModuleJobByName = async (name) => {
    const query = {name};
    const jobs  = await agenda.jobs(query);
    if (!jobs.length) throw NSErrors.JobNotFound;
    return agenda.cancel(query);
};

/**
 * Function allowing to activate a job and to put this job in active
 * @param {*} _id : job id in the agendaJob collection
 */
const getPlayJob = async (_id) => {
    const foundJobs = await agenda.jobs({_id: mongoose.Types.ObjectId(_id)});
    if (foundJobs.length !== 1) throw NSErrors.JobNotFound;
    // Activate the job we found in the agendaJob
    foundJobs[0].enable();
    // Save the job in the agendaJob collection
    const foundJobsSaved = await foundJobs[0].save();
    if (!foundJobsSaved) throw NSErrors.JobAgendaSaveError;
    return foundJobsSaved;
};

/**
 * Function allowing to activate a job and launch it directly
 * @param {string} _id : job id in the agendaJob collection
 * @return {Agenda.Job} cron job
 */
const getPlayImmediateJob = async (_id, option, lang) => {
    const foundJobs = await agenda.jobs({_id: mongoose.Types.ObjectId(_id)});
    const job       = foundJobs[0];
    try {
        if (foundJobs.length !== 1) throw NSErrors.JobNotFound;
        console.log(`${new Date()} -> Immediate - Start job ${job.attrs.name} -> ${job.attrs.data.method} -${job.attrs.data.api} `);
        const start              = new Date();
        job.attrs.lastRunAt      = start;
        job.attrs.lastFinishedAt = start;
        if (option.option) {
            await execDefine(job, option.option);
        } else {
            await execDefine(job);
        }
        console.log(`${new Date()} -> Immediate - End job ${job.attrs.name} -> ${job.attrs.data.method} -${job.attrs.data.api} `);
        return job;
    } catch (err) {
        let sError = `${new Date()} -> Immediate - End job`;
        if (foundJobs && job && job.attrs && job.attrs.data) {
            sError += ` with error ${job.attrs.name} -> ${job.attrs.data.method} -${job.attrs.data.api} `;
        }
        console.error(sError);
        if (err.error && err.error.code) {
            console.error(`Error -> ${err.error.code.toString()}`);
        }

        err.message = errorMessage[err.code] ? errorMessage[err.code][lang] : err.message;

        throw err;
    }
};

const execDefineService = async (modulePath, funcName, option) => {
    const response = await require(`..${modulePath}`)[funcName](option);
    return JSON.stringify(response, null, 2);
};

const execDefineServiceOnChildProcess = async (modulePath, funcName, params, option) => {
    const execCronInThread = async (modulePath, funcName, params, option) => {
        let message     = '';
        const apiParams = {modulePath, funcName, option};
        return new Promise((resolve, reject) => {
            const cmd = fork(
                `${global.aquila.appRoot}/services/jobChild.js`,
                [Buffer.from(JSON.stringify(apiParams)).toString('base64'), Buffer.from(JSON.stringify(global.aquila)).toString('base64'), ...(params || [])],
                {cwd: global.aquila.appRoot, shell: true}
            );
            cmd.on('error', (err) => reject(err));
            cmd.on('message', (data) => {
                message = data;
            });
            cmd.on('close', (code) => resolve({code}));
        }).then(async (data) => {
            const error = data.code;
            return {
                message,
                ...(error === 1 && {error: typeof message === 'string' ? message : NSErrors[message.code] || NSErrors.JobError})
            };
        });
    };

    const response = await execCronInThread(modulePath, funcName, params, option);
    if (response.error) throw response.error;
    return typeof response.message === 'string' ? response.message : JSON.stringify(response.message, null, 2);
};

const execDefineAPI = async (httpMethod, api, params) => {
    const response = await axios({
        method : httpMethod.toUpperCase(),
        url    : api,
        ...(params && {data: params})
    });
    return JSON.stringify(response.data, null, 2);
};

/**
 * Function called in agendaDefine and getPlayImmediateJob
 * @param {Agenda.Job} job cron job
 * @param {Agenda.JobAttributesData} job.attrs
 * @param {Object} job.attrs.data
 * @param {string} job.attrs.api
 * @param {string} job.attrs.params
 */
const execDefine = async (job, option) => {
    let finalError;
    const {api, params, onMainThread, funcName, modulePath, typeApi, httpMethod} = extractDataFromJob(job);

    let lastExecutionResult = '';
    try {
        if (typeApi === 'service') {
            if (onMainThread) {
                lastExecutionResult = await execDefineService(modulePath, funcName, option);
            } else {
                lastExecutionResult = await execDefineServiceOnChildProcess(modulePath, funcName, params, option);
            }
        } else {
            lastExecutionResult = await execDefineAPI(httpMethod, api, params);
        }
    } catch (error) {
        finalError          = NSErrors[error.code] || NSErrors.JobError;
        finalError.message  = errorMessage[finalError.code] ? errorMessage[finalError.code].en : '';
        lastExecutionResult = `Job execution failed: ${typeof error === 'string' ? error : utils.stringifyError(finalError, null, 2)}`;
        console.log(`${new Date()} -> Error job ${job.attrs.name} -> ${finalError.message}`);
    }
    job.attrs.data.lastExecutionResult = lastExecutionResult;
    await job.save();
    if (finalError) throw finalError;
};

/**
 * Function allowing to deactivate the execution of a job
 * @param {string} _id: job id in the agendaJob collection
 */
const getPauseJob = async (_id) => {
    const foundJobs = await agenda.jobs({_id: mongoose.Types.ObjectId(_id)});
    if (foundJobs.length !== 1) throw NSErrors.JobNotFound;
    // We disable the job we found in the agendaJob collection
    foundJobs[0].disable();
    const foundJobsSaved = await foundJobs[0].save();
    if (!foundJobsSaved) throw NSErrors.JobAgendaSaveError;
    return foundJobsSaved;
};

const checkJobsExecution = async () => {
    const jobs = await agenda.jobs({'data.isImportant': true});

    moment.locale('fr');

    let jobStatus = '';
    for (const job of jobs) {
        const nextRunAt      = job.attrs.nextRunAt;
        const lastFinishedAt = job.attrs.lastFinishedAt;

        // If the job has never been activated once
        if (!nextRunAt) {
            console.error(`[cron] Alert! Job ${job.attrs.name} has never been activated !`);
            jobStatus += `[cron] Alert! Job ${job.attrs.name} has never been activated !<br/>`;

        // If the job is disabled and the next execution date has already passed
        } else if (moment(nextRunAt).isBefore(moment()) && job.attrs.disabled) {
            console.error(`[cron] Alert! Job ${job.attrs.name} has not launched since ${nextRunAt} because it is inactive !`);
            jobStatus += `[cron] Alert! Job ${job.attrs.name} has not launched since ${moment(nextRunAt).format('LLL')} because it is inactive !<br/>`;

        // If the job is enabled and the next execution date has already passed
        } else if (moment(nextRunAt).isBefore(moment()) && !job.attrs.disabled) {
            console.error(`[cron] Alert! Job ${job.attrs.name} has not launched since ${nextRunAt}, even though it is active !`);
            jobStatus += `[cron] Alert! Job ${job.attrs.name} has not launched since ${moment(nextRunAt).format('LLL')}, even though it is active !<br/>`;

        // If job is disabled but the next execution date has not yet been passed
        } else if (job.attrs.disabled) {
            console.error(`[cron] Be careful! Job ${job.attrs.name} (not launched since ${lastFinishedAt}), is currently deactivated and its next run is scheduled for ${nextRunAt} !`);
            jobStatus += `[cron] Be careful! Job ${job.attrs.name} (not launched since ${moment(lastFinishedAt).format('LLL')}), is currently deactivated and its next run is scheduled for ${nextRunAt} !<br/>`;
        }
    }

    if (jobStatus.length > 0 && global.aquila.envFile.logs.alertMails) await notifyJobChecker(jobStatus);

    return jobStatus;
};

const notifyJobChecker = async (jobResult) => {
    try {
        const {Users}     = require('../orm/models');
        const admins      = await Users.find({isAdmin: true});
        const ServiceMail = require('./mail');
        for (const admin of admins) {
            await ServiceMail.sendMailCheckJobs(
                admin.email,
                jobResult,
                admin.preferredLanguage
            );
        }
    } catch (err) {
        console.error('Envoi de mail echoué: ', err.message);
    }
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
    getPauseJob,
    checkJobsExecution,
    notifyJobChecker
};