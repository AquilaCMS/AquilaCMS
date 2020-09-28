const path                        = require('path');
const {securityForceActif}        = require('../middleware/security');
const {authentication, adminAuth} = require('../middleware/authentication');
const ServicePayment              = require('../services/payments');
const {Orders}                    = require('../orm/models');

module.exports = function (app) {
    app.post('/v2/paymentMethods', securityForceActif(['active']), getPaymentMethods);
    app.post('/v2/paymentMethod', securityForceActif(['active']), getPaymentMethod);
    app.put('/v2/paymentMethod', authentication, adminAuth, savePaymentMethod);
    app.post('/v2/payments/order', getOrdersPayments);
    app.post('/v2/payments/export', authentication, adminAuth, exportPayments);
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
        const result     = await ServicePayment.getPaymentMethods(PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

async function getPaymentMethod(req, res, next) {
    try {
        const {PostBody} = req.body;
        const result     = await ServicePayment.getPaymentMethod(PostBody);
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

//= ====================================================================
//= ========================== Deprecated ==============================
//= ====================================================================

// @deprecated : utiliser la route generic
async function exportPayments(req, res, next) {
    // TODO : utiliser le service getOrdersPayments
    const {Parser}   = require('json2csv');
    const fs         = require('fs');
    const exportPath = path.join(await require('../utils/server').getUploadDirectory(), 'exports');
    const moment     = require('moment');
    moment.locale(global.defaultLang);
    let conditions     = {};
    const condAndArray = [];
    let partDate;

    if (req.body.dateStart) {
        partDate        = req.body.dateStart.split('/');
        const startDate = new Date(partDate[2], partDate[1] - 1, partDate[0]);
        // conditions.payment.creationDate = { '$gt': startDate };
        condAndArray.push( {'payment.creationDate': {$gte: startDate}} );
    }
    if (req.body.dateEnd) {
        partDate      = req.body.dateEnd.split('/');
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
                        let status = 'Annulé';
                        if (payment.status === 'DONE') {
                            status = 'Effectue';
                        } else if (payment.status === 'TODO') {
                            status = 'A effectuer';
                        }
                        const u = {
                            Commande : order.number,
                            Client   : order.customer.email,
                            Date     : moment(payment.operationDate).format('L LT'),
                            Statut   : status,
                            Type     : payment.type === 'debit' ? 'Remboursement' : 'Reglement',
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
                csvFields = ['No data'];
            }
            try {
                const parser = new Parser({fields: csvFields, del: ';'});
                const csv    = parser.parse(convOrders);
                if (err) console.log(err);

                if (!fs.existsSync(exportPath)) fs.mkdirSync(exportPath);
                fs.writeFile(`${exportPath}/file.csv`, csv, function (err) {
                    if (err) return next(err);
                    console.log('file saved');

                    res.download(`${exportPath}/file.csv`, 'exportPayments.csv', function (err) {
                        if (err) {
                            // handle error, keep in mind the response may be partially-sent
                            // so check res.headerSent
                            console.error('download ko', err);
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
