const {authentication, adminAuth} = require("../middleware/authentication");
const {securityForceActif}        = require('../middleware/security');
const ServiceShipment             = require('../services/shipment');

module.exports = function (app) {
    app.post('/v2/shipments', securityForceActif(["active"]), getShipments);
    app.post('/v2/shipment', securityForceActif(["active"]), getShipment);
    app.post('/v2/shipments/filter', getShipmentsFilter);
    app.post('/v2/shipments/fee', getEstimatedFee);
    app.put("/v2/shipment", authentication, adminAuth, setShipment);
    app.delete("/v2/shipment/:id", authentication, adminAuth, deleteShipment);
};

/**
 * Fonction pour récupérer des shipments en fonction du PostBody
 */
async function getShipments(req, res, next) {
    try {
        const {PostBody} = req.body;
        const result   = await ServiceShipment.getShipments(PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Fonction pour récupérer un shipment en fonction du PostBody
 */
async function getShipment(req, res, next) {
    try {
        const {PostBody} = req.body;
        const result   = await ServiceShipment.getShipment(PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Fonction pour récupérer des shipments en fonction du pays et du poids d'une commande
 */
async function getShipmentsFilter(req, res, next) {
    try {
        const result = await ServiceShipment.getShipmentsFilter(req.body.cart, req.body.withoutCountry, req.body.PostBody);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Fonction pour récupérer des shipments en fonction du pays et du poids d'une commande
 */
async function getEstimatedFee(req, res, next) {
    try {
        const result = await ServiceShipment.getEstimatedFee(req.body.cartId, req.body.shipmentId, req.body.countryCode);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * Fonction pour ajouter ou mettre à jour un shipment
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
 * Fonction supprimant un shipment
 */
async function deleteShipment(req, res, next) {
    try {
        const result = await ServiceShipment.deleteShipment(req.params.id);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}