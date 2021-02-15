/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const ServiceBills                = require('../services/bills');
const {authentication, adminAuth} = require('../middleware/authentication');
const ServiceAuth                 = require('../services/auth');

module.exports = function (app) {
    app.post('/v2/bills', getBills);
    app.post('/v2/bills/generatePDF', generatePDF);
    app.post('/v2/bills/fromOrder', authentication, adminAuth, orderToBill);
};

/**
 * @api {post} /v2/bills Get bills
 * @apiName getBills
 * @apiGroup Bills
 * @apiVersion 2.0.0
 * @apiDescription Get all bills
 * @apiParam {String} lang Get the translation in the right language
 * @apiUse param_PostBody
 * @apiParamExample {js} Example usage:
    // Get the french pages for slug "mon_slug" with the default fields except one field "metadesc" :
    {"lang":"fr","PostBody":{"limit":1,"filter":{"translation.fr.slug":"mon_slug"},"structure":{"translation.fr.metaDesc":0}}}
 * @apiUse ErrorPostBody
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
 * @api {post} /v2/bills/fromOrder Generate bills from order
 * @apiName orderToBill
 * @apiGroup Bills
 * @apiVersion 2.0.0
 * @apiDescription Création d'une facture à partir d'une commande
 * @apiParam {Number} idOrder id of the order
 * @apiParam {Boolean} isAvoir Is a credit on the invoice `default: false`
 * @apiParamExample {json} Example usage:
    {
        idOrder: '',
        isAvoir: false
    }
 * @apiUse BillSchema
 * @apiSuccess null
 * @apiError {Object} InvoiceAlreadyExists Invoice already exists.
 */
async function orderToBill(req, res, next) {
    try {
        return res.json(await ServiceBills.orderToBill(req.body.idOrder, req.body.isAvoir));
    } catch (error) {
        return next(error);
    }
}

/**
 * @api {post} /v2/bills/generatePDF generate PDF from Bill
 * @apiName generatePDF
 * @apiGroup Bills
 * @apiVersion 2.0.0
 * @apiDescription Génération d'un PDF
 * @apiParam {String} lang Get the translation in the right language
 * @apiUse param_PostBody
 * @apiParamExample {js} Example usage:
    // Get the french pages for slug "mon_slug" with the default fields except one field "metadesc" :
    {"lang":"fr","PostBody":{"limit":1,"filter":{"translation.fr.slug":"mon_slug"},"structure":{"translation.fr.metaDesc":0}}}
 * @apiUse ErrorPostBody
 */
async function generatePDF(req, res, next) {
    try {
        const PostBodyVerified = await ServiceAuth.validateUserIsAllowed(req.headers.authorization, req.baseUrl, req.body.PostBody, 'client');
        const response         = await ServiceBills.generatePDF(PostBodyVerified);
        return response.pipe(res);
    } catch (error) {
        return next(error);
    }
}
