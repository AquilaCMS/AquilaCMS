/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const moment                    = require('moment-business-days');
const axios                     = require('axios');
const {Products, Orders, Users} = require('../orm/models');
const serviceStats              = require('./stats');
const utils                     = require('../utils/utils');

/**
 * Adds a view to the product (synchronous)
 */
exports.setProductViews = function (product_id) {
    try {
        Products.findOneAndUpdate({_id: product_id}, {$inc: {'stats.views': 1}})
            .exec();
    } catch (error) {
        console.error(error);
    }
};

/**
 * Builds and sends statistics from previous days
 */
exports.sendMetrics = async function (licence, date) {
    const stats = await exports.getGlobaleStats(date);
    await axios.post('https://stats.aquila-cms.com/api/v2/metrics', {
        stats,
        licence
    });
    return 'Datas sent';
};

/**
 * Get the date of the first customer or the first order
 */
exports.getFirstDayMetrics = async function () {
    try {
        const User  = await Users.find().sort({createdAt: 1}).limit(1).lean();
        const Order = await Orders.find().sort({createdAt: 1}).limit(1).lean();
        if (User.length === 1 || Order.length === 1) {
            if (User[0].createdAt > Order[0].createdAt) {
                return Order[0].createdAt;
            }
            return User[0].createdAt;
        }
        return false;
    } catch (error) {
        console.error(error);
    }
};

/**
 * Generate a Statistic file
 */
exports.generateStatistics = function (data) {
    try {
        const model     = data.currentRoute;
        const csvFields = data.params && Object.keys(data.params).length > 0 ? Object.keys(data.params[0]) : ['No datas'];
        return utils.json2csv(data.params, csvFields, './exports', `export_${model}_${moment().format('YYYYMMDD')}.csv`);
    } catch (error) {
        console.error(error);
    }
};

/**
 * Get Globale Stats (home admin)
 */
exports.getGlobaleStats = async function (date) {
    let result;
    if (date) {
        result          = [];
        const dateStart = date;
        const date2     = new Date();
        const diffDays  = Math.ceil(Math.abs(date2 - date) / (1000 * 60 * 60 * 24)) - 1;
        let n           = 0;
        while (n < diffDays ) {
            const start = new Date(dateStart);
            start.setDate(start.getDate() + n);
            const end = new Date(dateStart);
            end.setDate(end.getDate() + n + 1);
            const res = await getGlobalStat('YESTERDAY', start, end);
            let empty = true;
            for (const prop in res) {
                if (res[prop] > 0) {
                    empty = false;
                    break;
                }
            }
            if (!empty) {
                res.date = start.toString();
                result.push(res);
            }
            n++;
        }
    } else {
        result = {
            yesterday : await getGlobalStat('YESTERDAY'),
            today     : await getGlobalStat('TODAY'),
            month     : await getGlobalStat('MONTH')
        };
    }

    return result;
};

/**
 * Get Globale Stat (home admin)
 */
async function getGlobalStat(periode, dateStart, dateEnd) {
    let datas = {};
    let periodeStart;
    let periodeEnd;
    if (dateStart && dateEnd) {
        periodeStart = moment(dateStart);
        periodeEnd   = moment(dateEnd);
    } else {
        periodeStart = moment({hour: 0, minute: 0, second: 0, millisecond: 0});
        periodeEnd   = moment({hour: 0, minute: 0, second: 0, millisecond: 0}).add(1, 'days');
        if (periode === 'MONTH') {
            periodeStart = periodeStart.add(-30, 'days');
        } else if (periode === 'YESTERDAY') {
            periodeStart = periodeStart.add(-1, 'days');
            periodeEnd   = moment({hour: 0, minute: 0, second: 0, millisecond: 0});
        }
    }

    const sPeriodeStart = periodeStart.toISOString();
    const sPeriodeEnd   = periodeEnd.toISOString();

    const {orderStatuses} = require('./orders');
    // --- orders ---
    const allOrders = await Orders.find({
        createdAt : {
            $gte : sPeriodeStart,
            $lte : sPeriodeEnd
        },
        'historyStatus.status' : orderStatuses.PAID
    }).lean();

    let orderTotalAmount = 0; // prices for all orders
    let nbOrderPaid      = 0; // number of paid orders
    const nbOrderNotPaid = 0; // number of unpaid orders

    for ( let i = 0, _len = allOrders.length; i < _len; i++ ) {
        orderTotalAmount += allOrders[i].priceTotal.ati;
        nbOrderPaid++;
    }

    // --- frequenting ---
    let attendance = 0;
    let newClients;
    if (dateStart && dateEnd) {
        const attendanceTab = await serviceStats.getHistory('visit', periodeStart, periodeEnd, '$visit.date');
        for (let i = 0, _len = attendanceTab.length; i < _len; i++) {
            attendance += attendanceTab[i].value;
        }
        newClients = await exports.getNewCustomer('months', periodeStart, periodeEnd);
    } else {
        if (periode === 'MONTH' || periode === 'YESTERDAY') {
            const attendanceTab = await serviceStats.getHistory('visit', periodeStart, periodeEnd, '$visit.date');
            for (let i = 0, _len = attendanceTab.length; i < _len; i++) {
                attendance += attendanceTab[i].value;
            }
        } else { // periode === "TODAY"
            const statsToday = await serviceStats.getStatstoday();
            if (statsToday != null && statsToday.visit) {
                attendance = statsToday.visit.length;
            }
        }
        newClients = await exports.getNewCustomer(periode, periodeStart, periodeEnd);
    }

    // To long to calculate here, and don't need for global stats :
    // const articlesNumber = await exports.getCapp(periode, periodeStart, periodeEnd);

    datas = {
        nbOrder     : allOrders.length,
        averageCart : allOrders.length === 0 ? 0 : orderTotalAmount / allOrders.length,
        ca          : orderTotalAmount,
        transfo     : allOrders.length > 0 && attendance > 0 ? ((allOrders.length / attendance) * 100) : 0,
        // nbArticle   : articlesNumber.datasObject.length,
        newClient   : newClients.datasObject.length,
        attendance,
        nbOrderPaid,
        nbOrderNotPaid

    };

    return datas;
}

/**
 * Number of canceled cart
 */
exports.getCanceledCart = async function (granularity, periodeStart, periodeEnd) {
    const granularityQuery = {
        year : {$substr: ['$oldCart.date', 0, 4]}
    };
    if (granularity === 'month' || granularity === 'day') {
        granularityQuery.month = {$substr: ['$oldCart.date', 5, 2]};
    }
    if (granularity === 'day') {
        granularityQuery.day = {$substr: ['$oldCart.date', 8, 2]};
    }

    const attendanceTab = await serviceStats.getHistory('oldCart', periodeStart, periodeEnd, granularityQuery);
    let datas           = [];

    datas = pushDatas(attendanceTab, datas);

    return datas;
};

/**
 * Globale sales
 */
exports.getCag = async function (granularity, periodeStart, periodeEnd) {
    return statsForOrders({granularity,
        periodeStart,
        periodeEnd,
        sumGroup : '$priceTotal.ati'
    });
};

/**
 * Number of orders
 */
exports.getNbOrder = async function (granularity, periodeStart, periodeEnd) {
    return statsForOrders({granularity,
        periodeStart,
        periodeEnd,
        sumGroup : 1
    });
};

/**
 * sales by products
 */
exports.getCapp = async function (granularity, periodeStart, periodeEnd) {
    const datas = [];

    const allOrders = await Orders.find({
        createdAt : {
            $gte : periodeStart.toDate(),
            $lte : periodeEnd.toDate()
        }
    }).select({_id: 1, priceTotal: 1, items: 1}).populate(['items.id']).lean();

    const tabIDProduct = [];
    for ( let ii = 0; ii < allOrders.length; ii++ ) {
        for ( let i = 0, _len = allOrders[ii].items.length; i < _len; i++ ) {
            const currentItem = allOrders[ii].items[i];
            const currentId   = currentItem.code;

            // We can't use the images as they are, we will look for the actual image of the product (if it still exists)
            let link = '';
            if (currentItem.id && currentItem.id._id) {
                const realProduct = await require('./products').getProductById(currentItem.id._id);

                if (realProduct && realProduct.images[0]) {
                    link = `/images/products/100x100-50/${realProduct.images[0]._id}/${realProduct.images[0].url.split('/')[realProduct.images[0].url.split('/').length - 1]}`;
                }
            }

            if (!tabIDProduct.includes(currentId)) {
                datas.push({
                    c : [
                        {v: currentId}, // id
                        {v: currentItem.name}, //  name
                        {v: `<img src="${link}" class='stat-tableImg no-product-image' style='height:100px' />`},
                        {v: Math.round(currentItem.price.unit.et * 100) / 100}, // puht
                        {v: Math.round(currentItem.price.unit.ati * 100) / 100, f: `${Math.round(currentItem.price.unit.ati * 100) / 100} €`}, // puttc
                        {v: currentItem.quantity}, // nbordered
                        {v: Math.round(currentItem.price.unit.et * currentItem.quantity * 100) / 100}, // caht
                        {v: Math.round(currentItem.price.unit.ati * currentItem.quantity * 100) / 100} // cattc
                    ]
                });
                tabIDProduct.push(currentId);
            } else {
                const index = await tabIDProduct.indexOf(currentId);
                if (index === -1) { return; }
                const currentData = {
                    c : [
                        datas[index].c[0], // id
                        datas[index].c[1], //  name
                        datas[index].c[2], // photo
                        datas[index].c[3], // puht
                        datas[index].c[4], // puttc
                        {v: datas[index].c[5].v + currentItem.quantity}, // nbordered
                        {v: datas[index].c[6].v + (currentItem.price.unit.et * currentItem.quantity)}, // caht
                        {v: datas[index].c[7].v + (currentItem.price.unit.ati * currentItem.quantity)} // cattc
                    ]
                };
                datas[index]      = currentData;
            }
        }
    }

    return {datas, datasObject: allOrders};
};

/**
 * Get top customers stats
 */
exports.getTopCustomer = async function (granularity, periodeStart, periodeEnd) {
    let datas = [];

    const allOrders = await Orders.aggregate([
        {$match : {
            createdAt : {
                $gte : periodeStart.toDate(),
                $lte : periodeEnd.toDate()
            }
        }},
        {$group : {_id   : '$customer.email',
            value : {$sum: '$priceTotal.ati'}}
        },
        {$sort: {value: -1}}
    ]);

    datas = pushDatas(allOrders, datas, true);

    return {datas, datasObject: allOrders};
};

/**
 * Get new customers stats
 */
exports.getNewCustomer = async function (granularity, periodeStart, periodeEnd) {
    return statsForClients({granularity,
        periodeStart,
        periodeEnd,
        sumGroup : 1
    });
};

/**
 * Query database with aggregate for Orders
 */
async function statsForOrders({granularity, periodeStart, periodeEnd, sumGroup}) {
    const {orderStatuses} = require('./orders');
    let datas             = [];

    const granularityQuery = {
        year : {$year: '$createdAt'}
    };
    if (granularity === 'month' || granularity === 'day') {
        granularityQuery.month = {$month: '$createdAt'};
    }
    if (granularity === 'day') {
        granularityQuery.day = {$dayOfMonth: '$createdAt'};
    }

    const allOrders = await Orders.aggregate([
        {$match : {
            createdAt : {
                $gte : periodeStart.toDate(),
                $lte : periodeEnd.toDate()
            },
            'historyStatus.status' : orderStatuses.PAID
        }},
        {$group : {_id   : granularityQuery,
            value : {$sum: sumGroup}}
        },
        {$sort: {_id: 1}}
    ]);

    datas = pushDatas(allOrders, datas);

    return {datas, datasObject: allOrders};
}

/**
 * Query database with aggregate for Clients
 */
async function statsForClients({granularity, periodeStart, periodeEnd, sumGroup}) {
    let datas = [];

    const granularityQuery = {
        year : {$year: '$createdAt'}
    };
    if (granularity === 'month' || granularity === 'day') {
        granularityQuery.month = {$month: '$createdAt'};
    }
    if (granularity === 'day') {
        granularityQuery.day = {$dayOfMonth: '$createdAt'};
    }

    const allUsers = await Users.aggregate([
        {$match : {
            createdAt : {
                $gte : periodeStart.toDate(),
                $lte : periodeEnd.toDate()
            }
        }},
        {$group : {_id   : granularityQuery,
            value : {$sum: sumGroup}}
        },
        {$sort: {_id: 1}}
    ]);

    datas = pushDatas(allUsers, datas);

    return {datas, datasObject: allUsers};
}

function pushDatas(tab, datas, take_id = false) {
    for ( let i = 0, _len = tab.length; i < _len; i++ ) {
        const thisDate = moment(`${tab[i]._id.year}/${tab[i]._id.month}/${tab[i]._id.day}`, 'YYYY-MM-DD').toDate();
        datas.push({
            c : [
                {v: take_id ? tab[i]._id : thisDate},
                {v: tab[i].value}
            ]
        });
    }
    return datas;
}