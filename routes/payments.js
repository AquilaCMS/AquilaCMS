const path                        = require("path");
const {securityForceActif}        = require('../middleware/security');
const {authentication, adminAuth} = require("../middleware/authentication");
const {middlewareServer}          = require('../middleware');
const ServicePayment              = require('../services/payments');
const {Orders, PaymentMethods}    = require('../orm/models');
const NSErrors                    = require("../utils/errors/NSErrors");

module.exports = function (app) {
    app.post('/v2/paymentMethods', securityForceActif(["active"]), getPaymentMethods);
    app.post('/v2/paymentMethod', securityForceActif(["active"]), getPaymentMethod);
    app.put('/v2/paymentMethod', authentication, adminAuth, savePaymentMethod);
    app.post('/v2/payments/order', getOrdersPayments);
    app.post('/v2/payments/export', authentication, adminAuth, exportPayments);

    // Deprecated
    app.get('/payments', middlewareServer.deprecatedRoute, listPayments);
    app.get('/payments/:id', middlewareServer.deprecatedRoute, detailPayments);
    app.get('/payments/user/:idUser', middlewareServer.deprecatedRoute, getByClient);
    app.post('/payments/exportone', middlewareServer.deprecatedRoute, authentication, adminAuth, exportPaymentOne);
    app.get('/paymentMethods', middlewareServer.deprecatedRoute, listPaymentMethods);
    app.get('/paymentMethods/list/active', middlewareServer.deprecatedRoute, listActive);
    app.get('/paymentMethods/:id', middlewareServer.deprecatedRoute, detailPaymentMethods);
    app.get('/paymentMethods/byPos/:posId', middlewareServer.deprecatedRoute, getByPos);
    app.post('/paymentMethods', middlewareServer.deprecatedRoute, authentication, adminAuth, save);
    app.delete('/v2/paymentMethod/:_id', middlewareServer.deprecatedRoute, adminAuth, deletePaymentMethod); // Deprecated ? Ne devrait pas exister
};

async function getOrdersPayments(req, res, next) {
    try {
        res.json(await ServicePayment.getOrdersPayments(req.body.PostBody));
    } catch (err) {
        return next(err);
    }
}

async function getPaymentMethods(req, res, next) {
    try {
        const {PostBody} = req.body;
        const result   = await ServicePayment.getPaymentMethods(PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

async function getPaymentMethod(req, res, next) {
    try {
        const {PostBody} = req.body;
        const result   = await ServicePayment.getPaymentMethod(PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

async function savePaymentMethod(req, res, next) {
    try {
        const result = await ServicePayment.savePaymentMethod(req.body);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

// @Deprecated ?
async function deletePaymentMethod(req, res, next) {
    console.warn("Legacy fct ?? : deletePaymentMethod()");
    try {
        const result = await ServicePayment.deletePaymentMethod(req.params._id);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

//= ====================================================================
//= ========================== Deprecated ==============================
//= ====================================================================

// @deprecated : utiliser la route generic
async function exportPayments(req, res, next) {
    // TODO : utiliser le service getOrdersPayments
    const {Parser} = require('json2csv');
    const fs = require('fs');
    const exportPath = path.join(await require('../utils/server').getUploadDirectory(), 'exports');
    const moment = require('moment');
    moment.locale(global.defaultLang);
    let conditions = {};
    const condAndArray = [];
    let partDate;

    if (req.body.dateStart) {
        partDate = req.body.dateStart.split('/');
        const startDate = new Date(partDate[2], partDate[1] - 1, partDate[0]);
        // conditions.payment.creationDate = { '$gt': startDate };
        condAndArray.push( {'payment.creationDate': {$gte: startDate}} );
    }
    if (req.body.dateEnd) {
        partDate = req.body.dateEnd.split('/');
        const endDate = new Date(partDate[2], partDate[1] - 1, partDate[0]);
        // conditions.payment.creationDate = { '$lt': endDate };
        condAndArray.push( {'payment.creationDate': {$lte: endDate}} );
    }

    if (condAndArray.length > 0) {
        conditions = {$and: condAndArray};
    }

    Orders.find(
        conditions,
        function (err, orders) {
            if (err) { return next(err); }

            // convert found users to not nested json
            const convOrders = [];

            orders.forEach(function (order) {
                if (order.payment.length > 0) {
                    order.payment.forEach(function (payment) {
                        let status = "Annulé";
                        if (payment.status === "DONE") {
                            status = "Effectue";
                        } else if (payment.status === "TODO") {
                            status = "A effectuer";
                        }
                        const u = {
                            Commande : order.number,
                            Client   : order.customer.email,
                            Date     : moment(payment.operationDate).format('L LT'),
                            Statut   : status,
                            Type     : payment.type === "debit" ? "Remboursement" : "Reglement",
                            Montant  : payment.amount
                        };
                        convOrders.push(u);
                    });
                }
            });

            let csvFields;
            if ( convOrders.length > 0 ) {
                csvFields = Object.keys(convOrders[0]);
            } else {
                csvFields = ["No data"];
            }
            try {
                const parser = new Parser({fields: csvFields, del: ';'});
                const csv = parser.parse(convOrders);
                if (err) console.log(err);

                if (!fs.existsSync(exportPath)) fs.mkdirSync(exportPath);
                fs.writeFile(`${exportPath}/file.csv`, csv, function (err) {
                    if (err) return next(err);
                    console.log('file saved');

                    res.download(`${exportPath}/file.csv`, "exportPayments.csv", function (err) {
                        if (err) {
                            // handle error, keep in mind the response may be partially-sent
                            // so check res.headerSent
                            console.error("download ko", err);
                            res.send(err);
                        }
                    });
                });
            } catch (e) {
                console.error(e);
            }
        }
    );
    // console.log("test export");
    // res.end();
}

/**
 * @deprecated
 * @param {Express.Request} req req
 * @param {Express.Response} res res
 * @param {Function} next next
 */
function getByClient(req, res, next) {
    Orders.find({_id_user: req.params.idUser}, function (err, orders) {
        if (err) { return next(err); }
        res.json(orders);
    });
}

/**
 * @deprecated
 * @param {Express.Request} req req
 * @param {Express.Response} res res
 * @param {Function} next next
 */
function listPayments(req, res, next) {
    Orders.find(null, function (err, orders) {
        if (err) { return next(err); }

        res.json(orders);
    });
}

/**
 * @deprecated
 * @param {Express.Request} req req
 * @param {Express.Response} res res
 * @param {Function} next next
 */
function detailPayments(req, res, next) {
    Orders.findOne({_id: req.params.id}, function (err, order) {
        if (err) { return next(err); }

        res.json(order);
    });
}

/**
 * @deprecated
 * @param {Express.Request} req req
 * @param {Express.Response} res res
 * @param {Function} next next
 */
async function exportPaymentOne(req, res, next) {
    const {Parser} = require('json2csv');
    const fs = require('fs');
    const exportPath = path.join(await require('../utils/server').getUploadDirectory(), 'exports');
    const moment = require('moment');
    moment.locale(global.defaultLang);

    const rData = JSON.parse(req.body.data);

    let status = "Annulé";
    if (rData.status === "DONE") {
        status = "Effectue";
    } else if (rData.status === "TODO") {
        status = "A effectuer";
    }

    const myData = [
        {field: 'Commande', value: rData.number},
        {field: 'Email', value: rData.customer.email},
        {field: 'Nom', value: `${rData.customer.firstname} ${rData.customer.lastname}`},
        {field: 'Creation', value: moment(rData.creationDate).format('L LT')},
        {field: 'Operation', value: moment(rData.operationDate).format('L LT')},
        {field: 'Statut', value: status},
        {field: 'Mode', value: rData.payment[0].mode},
        {field: 'Transaction', value: rData.payment[0].transactionId},
        {field: 'Montant', value: rData.payment[0].amount},
        {field: 'Comment', value: rData.comment}
    ];

    let csvFields;
    // csvFields = Object.keys(myData);
    if ( myData.length > 0 ) {
        csvFields = Object.keys(myData[0]);
    } else {
        csvFields = ["No data"];
    }

    try {
        const parser = new Parser({fields: csvFields, del: ';'});
        const csv = parser.parse({data: myData});

        if (!fs.existsSync(exportPath)) fs.mkdirSync(exportPath);
        fs.writeFile(`${exportPath}/file.csv`, csv, function (err) {
            if (err) return next(err);
            console.log('file saved');

            res.download(`${exportPath}/file.csv`, `exportPayment_${rData.transactionId}.csv`, function (err) {
                if (err) {
                    console.error("download ko", err);
                    res.send(err);
                }
            });
        });
    } catch (e) {
        console.error(e);
    }
}

/**
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 * @deprecated
 */
async function listPaymentMethods(req, res, next) {
    try {
        const _paymentMethods = await PaymentMethods.find(req.query, {details: 0});
        return res.send(_paymentMethods);
    } catch (err) {
        return next(err);
    }
}

/**
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 * @deprecated
 */
async function listActive(req, res, next) {
    try {
        const _paymentMethods = await PaymentMethods.find({active: true}, {details: 0});
        return res.json(_paymentMethods);
    } catch (err) {
        return next(err);
    }
}

/**
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 * @deprecated
 */
async function detailPaymentMethods(req, res, next) {
    try {
        await PaymentMethods.findOne({code: req.params.id});
        throw NSErrors.PaymentModeNotFound;
        // return res.send(_paymentMethod);
    } catch (err) {
        return next(err);
    }
}

/**
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 * @deprecated
 */
async function getByPos(req, res, next) {
    try {
        if (!PaymentMethods.schema.path('points_of_sale')) {
            throw NSErrors.ModuleNotFound;
        }
        const _paymentMethods = await PaymentMethods.find({
            active : true,
            $or    : [
                {all_points_of_sale: true},
                {points_of_sale: req.params.posId}
            ]
        });
        return res.send(_paymentMethods);
    } catch (error) {
        return next(error);
    }
}

/**
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 * @deprecated
 */
async function save(req, res, next) {
    try {
        if (req.body._id) {
            await PaymentMethods.updateOne({_id: req.body._id}, req.body);
            return res.end();
        }
        await PaymentMethods.create(req.body);
        return res.end();
    } catch (err) {
        return next(err);
    }
}
