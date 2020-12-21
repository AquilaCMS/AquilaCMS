/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const moment                      = require('moment-business-days');
const {authentication, adminAuth} = require('../middleware/authentication');
const ServiceStatistics           = require('../services/statistics');

module.exports = function (app) {
    app.get('/v2/statistics/globale',              authentication, adminAuth, getGlobaleStats);
    app.get('/v2/statistics/sell/canceledCart',    authentication, adminAuth, getCanceledCart);
    app.get('/v2/statistics/sell/cag',             authentication, adminAuth, getCag);
    app.get('/v2/statistics/sell/capp',            authentication, adminAuth, getCapp);
    app.get('/v2/statistics/sell/nbOrder',         authentication, adminAuth, getNbOrder);
    app.get('/v2/statistics/customer/newCustomer', authentication, adminAuth, getNewCustomer);
    app.get('/v2/statistics/customer/topCustomer', authentication, adminAuth, getTopCustomer);
    app.post('/v2/statistics/generate',            authentication, adminAuth, generateStatistics);
};

/**
 * Generate Statistics file (admin)
 */
async function generateStatistics(req, res, next) {
    try {
        const result = await ServiceStatistics.generateStatistics(req.body);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Getting Globale Stats (accueil admin)
 */
async function getGlobaleStats(req, res, next) {
    try {
        const result = await ServiceStatistics.getGlobaleStats();
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Nombre de panier abandonné
 */
async function getCanceledCart(req, res, next) {
    try {
        const {periodeStart, periodeEnd} = convertDate(req.query.dateStart, req.query.dateEnd);
        const result                     = await ServiceStatistics.getCanceledCart(req.query.granularity, periodeStart, periodeEnd);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Chiffre d'affaire globale
 */
async function getCag(req, res, next) {
    try {
        const {periodeStart, periodeEnd} = convertDate(req.query.dateStart, req.query.dateEnd);
        const result                     = await ServiceStatistics.getCag(req.query.granularity, periodeStart, periodeEnd);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Chiffre d'affaire par produit
 */
async function getCapp(req, res, next) {
    try {
        const {periodeStart, periodeEnd} = convertDate(req.query.dateStart, req.query.dateEnd);
        const result                     = await ServiceStatistics.getCapp(req.query.granularity, periodeStart, periodeEnd);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Nombre de commande
 */
async function getNbOrder(req, res, next) {
    try {
        const {periodeStart, periodeEnd} = convertDate(req.query.dateStart, req.query.dateEnd);
        const result                     = await ServiceStatistics.getNbOrder(req.query.granularity, periodeStart, periodeEnd);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Getting top customers stats
 */
async function getTopCustomer(req, res, next) {
    try {
        const {periodeStart, periodeEnd} = convertDate(req.query.dateStart, req.query.dateEnd);
        const result                     = await ServiceStatistics.getTopCustomer(req.query.granularity, periodeStart, periodeEnd);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Getting new customers stats
 */
async function getNewCustomer(req, res, next) {
    try {
        const {periodeStart, periodeEnd} = convertDate(req.query.dateStart, req.query.dateEnd);
        const result                     = await ServiceStatistics.getNewCustomer(req.query.granularity, periodeStart, periodeEnd);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Return "moment" date
 */
function convertDate(dateStart, dateEnd) {
    const periodeStart = moment(dateStart, 'YYYY-MM-DD');
    const periodeEnd   = moment(dateEnd, 'YYYY-MM-DD');

    return {periodeStart, periodeEnd};
}