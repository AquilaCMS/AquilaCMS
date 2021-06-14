/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {authentication, adminAuth} = require('../middleware/authentication');
const ServiceJob                  = require('../services/job');

module.exports = function (app) {
    app.get('/v2/jobs', authentication, adminAuth, getJobs);
    app.get('/v2/job/:_id', authentication, adminAuth, getJobById);
    app.get('/v2/job/play/:_id', authentication, adminAuth, getPlayJob);
    app.get('/v2/job/play/immediate/:_id', authentication, adminAuth, getPlayImmediateJob);
    app.get('/v2/job/pause/:_id', authentication, adminAuth, getPauseJob);
    app.put('/v2/job', authentication, adminAuth, setJob);
    app.delete('/v2/job/:_id', authentication, adminAuth, deleteJob);
};

/**
 * Function returning jobs
 */
async function getJobs(req, res, next) {
    try {
        const result = await ServiceJob.getJobs();
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Function returning a job according to its _id
 */
async function getJobById(req, res, next) {
    try {
        const result = await ServiceJob.getJobById(req.params._id);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Function allowing to pass a job in active mode = true in the collection agendaJob
 */
async function getPlayJob(req, res, next) {
    try {
        const result = await ServiceJob.getPlayJob(req.params._id);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Function allowing to pass a job in active mode = true in the collection agendaJob
 * @param {Express.Request} req request
 * @param {Object} req.params params of request
 * @param {string} req.params._id job id in database
 * @param {Express.Response} res response
 * @param {function} next express callback
 * @return {Agenda.Job} cron job
 * @return {Error} return all error to expressErrorHandler
 */
async function getPlayImmediateJob(req, res, next) {
    req.setTimeout(300000);
    try {
        const result = await ServiceJob.getPlayImmediateJob(req.params._id, req.query);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Function allowing to pass a job in active mode = false in the collection agendaJob
 * @param {Express.Request} req request
 * @param {Object} req.params params of request
 * @param {string} req.params._id job id in database
 * @param {Express.Response} res response
 * @param {function} next express callback
 * @return {Agenda.Job} cron job
 * @return {Error} return all error to expressErrorHandler
 */
async function getPauseJob(req, res, next) {
    try {
        const result = await ServiceJob.getPauseJob(req.params._id);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Function used to set a job in the jobs and agendaJobs table
 */
async function setJob(req, res, next) {
    try {
        const {_id, name, repeatInterval, data}                         = req.body;
        const {api, comment, method, flag, lastExecutionResult, params} = data;
        const result                                                    = await ServiceJob.setJob(_id, name, repeatInterval, api, comment, method, flag, lastExecutionResult, false, params);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
/**
 * Function used to delete a job in the jobs and agendaJobs table
 */
async function deleteJob(req, res, next) {
    try {
        const result = await ServiceJob.deleteJobById(req.params._id);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}
