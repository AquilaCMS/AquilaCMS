/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const moment                                    = require('moment-business-days');
const {StatsToday, StatsHistory, Configuration} = require('../orm/models');
const ServiceStatistics                         = require('./statistics');

/**
 * Count the number of deleted baskets
 */
const addOldCart = async (cartNb) => {
    try {
        await StatsToday.findOneAndUpdate({}, {$inc: {oldCart: cartNb}}, {upsert: true, new: true});
    } catch (error) {
        console.error(error);
    }
};

/**
 * Get Stats for today
 */
const getStatstoday = async () => StatsToday.findOne({});

/**
 * Add a unique visitor (req) for the traffic stats
 */
const addUserVisitReq = (req) => {
    const ipClient = req.header('x-forwarded-for') || req.connection.remoteAddress;
    addUserVisitIP(ipClient);
};

/**
 * Add a unique visitor (IP) for traffic statistics
 */
const addUserVisitIP = async (ipClient) => {
    try {
        const thisStat = await StatsToday.findOne();
        let existing   = -1;

        if (thisStat == null) {
            // Creation of the collection if it does not exist
            await StatsToday.updateOne({}, {visit: [], oldCart: 0}, {upsert: true, new: true});
        } else {
            // Get the data
            existing = thisStat.visit.indexOf(ipClient);
        }

        if (existing === -1) {
            // Update data
            await StatsToday.updateOne(
                {},
                {
                    $push : {visit: {$each: [ipClient]}}
                },
                {upsert: true, new: true}
            );
        }
    } catch (error) {
        console.error(error);
    }
};

/**
 * Get statshistory for type
 * @param {string} type visit || oldCart
 */
const getHistory = async (type, periodeStart, periodeEnd, granularityQuery) => {
    const isoPeriodeStart = periodeStart.toISOString();
    const isoPeriodeEnd   = periodeEnd.toISOString();
    return StatsHistory.aggregate([
        {$project: {[type]: 1}},
        {$unwind: `$${type}`},
        {$match : {
            [`${type}.date`] : {
                $gte : isoPeriodeStart,
                $lte : isoPeriodeEnd
            }}},
        {$group : {_id   : granularityQuery,
            value : {$sum: `$${type}.count`}}
        },
        {$sort: {_id: 1}}
    ]);
};

/**
 * Build stats (today to history) (cron)
 */
const buildStats = async () => {
    let dbToday;
    let result = 'OK';
    try {
        dbToday = await StatsToday.findOne({});
        if (dbToday) {
            await insertType('oldCart', dbToday.oldCart);
            await insertType('visit', dbToday.visit.length);
            // Reinit datas of the day
            await StatsToday.findOneAndUpdate({}, {oldCart: 0, visit: []}, {upsert: true, new: true});
            const _config = await Configuration.findOne({});
            if (_config.environment.sendMetrics.active && _config.licence.registryKey) {
                if (!_config.environment.sendMetrics.lastSent) {
                    let date                                 = await ServiceStatistics.getFirstDayMetrics();
                    date                                     = `${(date.getMonth() > 8) ? (date.getMonth() + 1) : (`0${date.getMonth() + 1}`)}/${(date.getDate() > 9) ? date.getDate() : (`0${date.getDate()}`)}/${date.getFullYear()}`;
                    _config.environment.sendMetrics.lastSent = moment(date, 'MM/DD/YYYY').set({hour: 0, minute: 0, second: 0, millisecond: 0});
                } else {
                    if (_config.environment.sendMetrics.lastSent > moment({hour: 0, minute: 0, second: 0, millisecond: 0})) {
                        result = `OK - Metrics already sent ${_config.environment.sendMetrics.lastSent}`;
                        return result;
                    }
                    _config.environment.sendMetrics.lastSent.setHours(0, 0, 0);
                    const date                               = `${(_config.environment.sendMetrics.lastSent.getMonth() > 8) ? (_config.environment.sendMetrics.lastSent.getMonth() + 1) : (`0${_config.environment.sendMetrics.lastSent.getMonth() + 1}`)}/${(_config.environment.sendMetrics.lastSent.getDate() > 9) ? _config.environment.sendMetrics.lastSent.getDate() : (`0${_config.environment.sendMetrics.lastSent.getDate()}`)}/${_config.environment.sendMetrics.lastSent.getFullYear()}`;
                    _config.environment.sendMetrics.lastSent = moment(date, 'DD/MM/YYYY').set({hour: 0, minute: 0, second: 0, millisecond: 0});
                }
                try {
                    const response = await ServiceStatistics.sendMetrics(_config.licence.registryKey, _config.environment.sendMetrics.lastSent);
                    if (!response) {
                        result = 'OK - But Metrics not sent';
                    } else {
                        _config.environment.sendMetrics.lastSent = new Date();
                        await _config.save();
                        result = `OK - Metrics sent ${_config.environment.sendMetrics.lastSent}`;
                    }
                } catch (error) {
                    console.error(error);
                    return `Ok - But metrics not sent : ${error}`;
                }
            }
        }
    } catch (err) {
        console.error(err);
    }
    return result;
};

/**
 * Adds the values for the day in history
 * @param {string} type visit || oldCart
 * @param {number} nb number to add in history for today
 */
async function insertType(type, nb) {
    try {
        const isoDate = moment({hour: 0, minute: 0, second: 0, millisecond: 0}).toISOString();
        const pushed  = {};
        pushed[type]  = {$each: [{date: isoDate, count: nb}]};
        // Check if stats exists for this day
        const todayExist = await StatsHistory.findOne({'visit.date': isoDate}).lean();
        if (!todayExist) {
            await StatsHistory.updateOne({}, {$push: pushed}, {upsert: true, new: true});
        }
    } catch (error) {
        console.error(error);
    }
}

module.exports = {
    addOldCart,
    getStatstoday,
    addUserVisitReq,
    addUserVisitIP,
    getHistory,
    buildStats,
    insertType
};