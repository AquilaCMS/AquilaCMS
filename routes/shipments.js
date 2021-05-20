/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {authentication, adminAuth} = require('../middleware/authentication');
const {securityForceActif}        = require('../middleware/security');
const ServiceShipment             = require('../services/shipment');
const {middlewareServer}          = require('../middleware');

module.exports = function (app) {
    app.post('/v2/shipments', securityForceActif(['active']), getShipments);
    app.post('/v2/shipment', securityForceActif(['active']), getShipment);
    app.post('/v2/shipments/filter', getShipmentsFilter);
    app.put('/v2/shipment', authentication, adminAuth, setShipment);
    app.delete('/v2/shipment/:id', authentication, adminAuth, deleteShipment);

    // Deprecated
    app.post('/v2/shipments/fee', middlewareServer.deprecatedRoute, getEstimatedFee);
};

/**
 * POST /api/v2/shipments
 * @summary Get shipments
 */
async function getShipments(req, res, next) {
    try {
        const {PostBody} = req.body;
        const result     = await ServiceShipment.getShipments(PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * POST /api/v2/shipment
 * @summary Get shipment
 */
async function getShipment(req, res, next) {
    try {
        const {PostBody} = req.body;
        const result     = await ServiceShipment.getShipment(PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * POST /api/v2/shipments/filter
 * @summary Get shipments for country and an order
 */
async function getShipmentsFilter(req, res, next) {
    try {
        const result = await ServiceShipment.getShipmentsFilter(req.body.cart, req.body.withCountry, req.body.PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * PUT /api/v2/shipment
 * @summary Set shipment
 */
async function setShipment(req, res, next) {
    try {
        const result = await ServiceShipment.setShipment(req.body._id, req.body);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * DELETE /api/v2/shipment/{id}
 * @summary Delete shipment
 */
async function deleteShipment(req, res, next) {
    try {
        const result = await ServiceShipment.deleteShipment(req.params.id);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

//= ====================================================================
//= ========================== Deprecated ==============================
//= ====================================================================

/**
 * Function to recover shipments according to the country and the weight of an order
 * @deprecated
 */
async function getEstimatedFee(req, res, next) {
    try {
        const result = await ServiceShipment.getEstimatedFee(req.body.cartId, req.body.shipmentId, req.body.countryCode);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}