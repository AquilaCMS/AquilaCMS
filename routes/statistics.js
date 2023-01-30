/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const moment            = require('moment-business-days');
const {adminAuthRight}  = require('../middleware/authentication');
const ServiceStatistics = require('../services/statistics');

module.exports = function (app) {
    app.get('/v2/statistics/globale',              adminAuthRight('statistics'), getGlobaleStats);
    app.get('/v2/statistics/sell/canceledCart',    adminAuthRight('statistics'), getCanceledCart);
    app.get('/v2/statistics/sell/cag',             adminAuthRight('statistics'), getCag);
    app.get('/v2/statistics/sell/capp',            adminAuthRight('statistics'), getCapp);
    app.get('/v2/statistics/sell/nbOrder',         adminAuthRight('statistics'), getNbOrder);
    app.get('/v2/statistics/customer/newCustomer', adminAuthRight('statistics'), getNewCustomer);
    app.get('/v2/statistics/customer/topCustomer', adminAuthRight('statistics'), getTopCustomer);
    app.post('/v2/statistics/generate',            adminAuthRight('statistics'), generateStatistics);
};

/**
 * POST /v2/statistics/generate
 * @summary Generate Statistics file (admin)
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
 * GET /api/v2/statistics/globale
 * @summary Getting Globale Stats (accueil admin)
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
 * GET /api/v2/statistics/sell/canceledCart
 * @summary Number of abandoned cart
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
 * GET /api/v2/statistics/sell/cag
 * @summary Global profit
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
 * GET /api/v2/statistics/sell/capp
 * @summary Profit by products
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
 * GET /api/v2/statistics/sell/nbOrder
 * @summary Number of orders
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
 * GET /api/v2/statistics/customer/topCustomer
 * @summary Getting top customers stats
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
 * GET /api/v2/statistics/customer/newCustomer
 * @summary Getting new customers stats
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

// Return "moment" date
function convertDate(dateStart, dateEnd) {
    const periodeStart = moment(dateStart, 'YYYY-MM-DD');
    const periodeEnd   = moment(dateEnd, 'YYYY-MM-DD');

    return {periodeStart, periodeEnd};
}