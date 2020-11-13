const moment                                    = require('moment-business-days');
const {StatsToday, StatsHistory, Configuration} = require('../orm/models');

/**
 * Permet de compter le nombre de panier supprimé
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
const getStatstoday = async () => {
    return StatsToday.findOne({});
};

/**
 * Ajout un visiteur (req) unique pour les stats de fréquentation
 */
const addUserVisitReq = (req) => {
    const ipClient = req.header('x-forwarded-for') || req.connection.remoteAddress;
    addUserVisitIP(ipClient);
};

/**
 * Ajout un visiteur (IP) unique pour les stats de fréquentation
 */
const addUserVisitIP = async (ipClient) => {
    try {
        const thisStat = await StatsToday.findOne();
        let existing   = -1;

        if (thisStat == null) {
            // Création de la collection si elle n'exite pas
            await StatsToday.updateOne({}, {visit: [], oldCart: 0}, {upsert: true, new: true});
        } else {
            // On récupère la donnée
            existing = thisStat.visit.indexOf(ipClient);
        }

        if (existing === -1) {
            // MAJ de la donnée
            await StatsToday.updateOne({}, {
                $push : {visit: {$each: [ipClient]}}
            },
            {upsert: true, new: true});
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
    // Passer les données du jour (statstoday) vers statshistory
    let dbToday;
    try {
        dbToday = await StatsToday.findOne({});
        if (dbToday) {
            await insertType('oldCart', dbToday.oldCart);
            await insertType('visit', dbToday.visit.length);
            // Reinit les datas du jours
            await StatsToday.findOneAndUpdate({}, {oldCart: 0, visit: []}, {upsert: true, new: true});
            const _config = await Configuration.findOne({});
            if (_config.environment.sendMetrics && _config.licence.registryKey) {
                // await ServiceStatistics.sendMetrics(_config.licence.registryKey);
            }
        }
    } catch (err) {
        console.error(err);
    }
    return 'OK';
};

/**
 * Ajoute les valeurs pour le jour dans history
 * @param {string} type visit || oldCart
 * @param {number} nb number to add in history for today
 */
async function insertType(type, nb) {
    try {
        const isoDate = moment({hour: 0, minute: 0, second: 0, millisecond: 0}).toISOString();
        const pushed  = {};
        pushed[type]  = {$each: [{date: isoDate, count: nb}]};
        await StatsHistory.updateOne({}, {$push: pushed}, {upsert: true, new: true});
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