const moment                    = require('moment-business-days');
const {Products, Orders, Users} = require("../orm/models");
const serviceStats              = require("./stats");
const utils                     = require("../utils/utils");

/**
 * Ajoute une vue au produit (synchrone)
 */
exports.setProductViews = function (product_id) {
    try {
        Products.findOneAndUpdate({_id: product_id}, {$inc: {"stats.views": 1}})
            .exec();
    } catch (error) {
        console.error(error);
    }
};

/**
 * Generate a Statistic file
 */
exports.generateStatistics = function (data) {
    try {
        const model = data.currentRoute;
        const csvFields = data.params && Object.keys(data.params).length > 0 ? Object.keys(data.params[0]) : ['Aucune donnee'];
        return utils.json2csv(data.params, csvFields, './exports', `export_${model}_${moment().format('YYYYMMDD')}.csv`);
    } catch (error) {
        console.error(error);
    }
};

/**
 * Get Globale Stats (accueil admin)
 */
exports.getGlobaleStats = async function () {
    const result = {
        yesterday : await getGlobalStat("YESTERDAY"),
        today     : await getGlobalStat("TODAY"),
        month     : await getGlobalStat("MONTH")
    };

    return result;
};

/**
 * Get Globale Stat (accueil admin)
 */
async function getGlobalStat(periode) {
    let datas           = {};
    let periodeStart    = moment({hour: 0, minute: 0, second: 0, millisecond: 0});
    let periodeEnd      = moment({hour: 0, minute: 0, second: 0, millisecond: 0}).add(1, 'days');

    if (periode === "MONTH") {
        periodeStart = periodeStart.add(-30, 'days');
    } else if (periode === "YESTERDAY") {
        periodeStart = periodeStart.add(-1, 'days');
        periodeEnd   = moment({hour: 0, minute: 0, second: 0, millisecond: 0});
    }

    const sPeriodeStart = periodeStart.toISOString();
    const sPeriodeEnd   = periodeEnd.toISOString();

    // --- Commande ---
    const allOrders = await Orders.find({
        creationDate : {
            $gte : sPeriodeStart,
            $lte : sPeriodeEnd
        },
        status : {
            $in : [
                // "PAYMENT_PENDING",
                "PAYMENT_RECEIPT_PENDING",
                "PAYMENT_CONFIRMATION_PENDING",
                "PAID",
                "PROCESSING",
                "PROCESSED", // Préparé. A ne pas à confondre avec Finished (Traité)
                "BILLED",
                "DELIVERY_PROGRESS",
                "DELIVERY_PARTIAL_PROGRESS",
                "FINISHED",
                // "CANCELING", // Pour éviter qu'une commande ne soit annulée deux fois (c'est une sorte de verrou)
                // "CANCELED",
                "RETURNED"
            ]
        }
    });

    let orderTotalAmount = 0;
    for ( let i = 0, _len = allOrders.length; i < _len; i++ ) {
        orderTotalAmount += allOrders[i].priceTotal.ati;
    }

    // --- Fréquentation ---
    let attendance       = 0;
    if (periode === "MONTH" || periode === "YESTERDAY") {
        const attendanceTab  = await serviceStats.getHistory("visit", periodeStart, periodeEnd, "$visit.date");
        for ( let i = 0, _len = attendanceTab.length; i < _len; i++ ) {
            attendance += attendanceTab[i].value;
        }
    } else { // if (periode === "TODAY") {
        const statsToday = await serviceStats.getStatstoday();
        if (statsToday != null && statsToday.visit) {
            attendance = statsToday.visit.length;
        }
    }

    datas = {
        nbOrder     : allOrders.length,
        averageCart : allOrders.length === 0 ? 0 : orderTotalAmount / allOrders.length,
        ca          : orderTotalAmount,
        transfo     : allOrders.length > 0 && attendance > 0 ? ((allOrders.length / attendance) * 100) : 0,
        attendance
    };

    return datas;
}

/**
 * Nombre de panier abandonné
 */
exports.getCanceledCart = async function (granularity, periodeStart, periodeEnd) {
    const granularityQuery = {
        year : {$substr: ["$oldCart.date", 0, 4]}// {$year: "$oldCart.date"}
    };
    if (granularity === "month" || granularity === "day") {
        granularityQuery.month = {$substr: ["$oldCart.date", 5, 2]};// {$month: "$oldCart.date"};
    }
    if (granularity === "day") {
        granularityQuery.day = {$substr: ["$oldCart.date", 8, 2]};// {$dayOfMonth: "$oldCart.date"};
    }

    const attendanceTab  = await serviceStats.getHistory("oldCart", periodeStart, periodeEnd, granularityQuery);
    let datas = [];

    datas = pushDatas(attendanceTab, datas);

    return datas;
};

/**
 * Chiffre d'affaire globale
 */
exports.getCag = async function (granularity, periodeStart, periodeEnd) {
    return statsForOrders({granularity,
        periodeStart,
        periodeEnd,
        statusMatch : {
            $nin : [
                "CANCELING", // Pour éviter qu'une commande ne soit annulée deux fois (c'est une sorte de verrou)
                "CANCELED"
            ]
        },
        sumGroup : "$priceTotal.ati"
    });
};

/**
 * Nombre de commande
 */
exports.getNbOrder = async function (granularity, periodeStart, periodeEnd) {
    return statsForOrders({granularity,
        periodeStart,
        periodeEnd,
        statusMatch : {
            $nin : [
                "CANCELING", // Pour éviter qu'une commande ne soit annulée deux fois (c'est une sorte de verrou)
                "CANCELED"
            ]
        },
        sumGroup : 1
    });
};

/**
 * Chiffre d'affaire par produit
 */
exports.getCapp = async function (granularity, periodeStart, periodeEnd) {
    const datas = [];

    const allOrders = await Orders.find({
        creationDate : {
            $gte : periodeStart.toDate(),
            $lte : periodeEnd.toDate()
        }
    }).select({_id: 1, priceTotal: 1, items: 1, status: 1}).populate(['items.id']).lean();

    const tabIDProduct = [];
    for ( let ii = 0; ii < allOrders.length; ii++ ) {
        for ( let i = 0, _len = allOrders[ii].items.length; i < _len; i++ ) {
            const currentItem = allOrders[ii].items[i];
            const currentId = currentItem.code;

            // On ne peut pas utiliser les images tel quel, on va chercher l'image actuelle du produit (s'il existe encore)
            const realProduct = await require("./products").getProductById(currentItem._id);
            let link = "";
            if (realProduct) {
                link = `/images/products/100x100-50/${realProduct.images[0]._id}/${realProduct.images[0].url.split('/')[realProduct.images[0].url.split('/').length - 1]}`;
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
                datas[index] = currentData;
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
            creationDate : {
                $gte : periodeStart.toDate(),
                $lte : periodeEnd.toDate()
            }
        }},
        {$group : {_id   : "$customer.email",
            value : {$sum: "$priceTotal.ati"}}
        },
        {$sort: {value: -1}}
    ]);

    datas = pushDatas(allOrders, datas);

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
async function statsForOrders({granularity, periodeStart, periodeEnd, statusMatch, sumGroup}) {
    let datas = [];

    const granularityQuery = {
        year : {$year: "$creationDate"}
    };
    if (granularity === "month" || granularity === "day") {
        granularityQuery.month = {$month: "$creationDate"};
    }
    if (granularity === "day") {
        granularityQuery.day = {$dayOfMonth: "$creationDate"};
    }

    const allOrders = await Orders.aggregate([
        {$match : {
            creationDate : {
                $gte : periodeStart.toDate(),
                $lte : periodeEnd.toDate()
            },
            status : statusMatch
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
        year : {$year: "$creationDate"}
    };
    if (granularity === "month" || granularity === "day") {
        granularityQuery.month = {$month: "$creationDate"};
    }
    if (granularity === "day") {
        granularityQuery.day = {$dayOfMonth: "$creationDate"};
    }

    const allUsers = await Users.aggregate([
        {$match : {
            creationDate : {
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

function pushDatas(tab, datas) {
    for ( let i = 0, _len = tab.length; i < _len; i++ ) {
        const thisDate = moment(`${tab[i]._id.year}/${tab[i]._id.month}/${tab[i]._id.day}`, "YYYY-MM-DD").toDate();
        datas.push({
            c : [
                {v: thisDate},
                {v: tab[i].value}
            ]
        });
    }
    return datas;
}