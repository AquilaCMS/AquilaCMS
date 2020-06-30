const ServiceBills                 = require('../services/bills');
const {authentication, adminAuth} = require("../middleware/authentication");
const ServiceAuth                  = require('../services/auth');

module.exports = function (app) {
    app.post("/v2/bills", getBills);
    app.post("/v2/bills/generatePDF", generatePDF);
    app.post("/v2/bills/fromOrder", authentication, adminAuth, orderToBill);
};

/**
 * Récupèration de toutes les factures
 */
async function getBills(req, res, next) {
    try {
        const PostBodyVerified = await ServiceAuth.validateUserIsAllowed(req.headers.authorization, req.baseUrl, req.body.PostBody, 'client');
        return res.status(200).json(await ServiceBills.getBills(PostBodyVerified));
    } catch (error) {
        return next(error);
    }
}

/**
 * Création d'une facture à partir d'une commande
 */
async function orderToBill(req, res, next) {
    try {
        return res.json(await ServiceBills.orderToBill(req.body.idOrder, req.body.isAvoir));
    } catch (error) {
        return next(error);
    }
}

/**
 * Génération d'un PDF
 */
async function generatePDF(req, res, next) {
    try {
        const PostBodyVerified = await ServiceAuth.validateUserIsAllowed(req.headers.authorization, req.baseUrl, req.body.PostBody, 'client');
        return await ServiceBills.generatePDF(PostBodyVerified, res);
    } catch (error) {
        return next(error);
    }
}
